import { useState } from "react";
import { Zap, Plus, AlertTriangle, Check, Clock, Calendar } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { EnergyEvent } from "@shared/schema";

const energyFormSchema = z.object({
  status: z.enum(["ok", "falta de energia", "meia fase"]),
  description: z.string().min(1, "Descrição é obrigatória"),
});

export default function Energy() {
  const [isNewEventOpen, setIsNewEventOpen] = useState(false);
  const { canEdit, dbUserId } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof energyFormSchema>>({
    resolver: zodResolver(energyFormSchema),
    defaultValues: {
      status: "ok",
      description: "",
    },
  });

  const { data: events = [], isLoading } = useQuery<EnergyEvent[]>({
    queryKey: ["/api/energy"],
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: z.infer<typeof energyFormSchema>) => {
      return apiRequest("POST", "/api/energy", {
        status: data.status,
        description: data.description,
        recordedBy: dbUserId || null,
        resolvedAt: data.status === "ok" ? new Date().toISOString() : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/energy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Ocorrência registrada com sucesso!" });
      setIsNewEventOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao registrar ocorrência", description: error.message, variant: "destructive" });
    },
  });

  const latestEvent = events[0];
  const currentStatus = latestEvent?.status || "ok";
  const totalOutages = events.filter((e) => e.status !== "ok").length;
  const lastOutage = events.find((e) => e.status !== "ok");

  const onSubmit = (data: z.infer<typeof energyFormSchema>) => {
    createEventMutation.mutate(data);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ok":
        return <Check className="h-5 w-5 text-emerald-500" />;
      case "falta de energia":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "meia fase":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default:
        return <Zap className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ok":
        return "bg-emerald-500/10";
      case "falta de energia":
        return "bg-red-500/10";
      case "meia fase":
        return "bg-amber-500/10";
      default:
        return "bg-muted";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ok":
        return "Energia OK";
      case "falta de energia":
        return "Falta de Energia";
      case "meia fase":
        return "Meia Fase";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Energia"
        description="Monitoramento do status de energia e ocorrências"
        backHref="/"
        actions={
          canEdit && (
            <Dialog open={isNewEventOpen} onOpenChange={setIsNewEventOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-energy-event">
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar Ocorrência
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Registrar Ocorrência de Energia</DialogTitle>
                  <DialogDescription>
                    Registre eventos relacionados ao fornecimento de energia.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-energy-status">
                                <SelectValue placeholder="Selecione o status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ok">Energia OK</SelectItem>
                              <SelectItem value="falta de energia">Falta de Energia</SelectItem>
                              <SelectItem value="meia fase">Meia Fase</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descreva a ocorrência..."
                              data-testid="input-energy-description"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsNewEventOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createEventMutation.isPending} data-testid="button-save-energy-event">
                        {createEventMutation.isPending ? "Registrando..." : "Registrar"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <Card
        className={`${
          currentStatus === "ok"
            ? "border-emerald-500/50 bg-emerald-500/5"
            : currentStatus === "falta de energia"
            ? "border-red-500/50 bg-red-500/5"
            : "border-amber-500/50 bg-amber-500/5"
        }`}
      >
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full ${
                currentStatus === "ok"
                  ? "bg-emerald-500/20"
                  : currentStatus === "falta de energia"
                  ? "bg-red-500/20"
                  : "bg-amber-500/20"
              }`}
            >
              {currentStatus === "ok" ? (
                <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle
                  className={`h-8 w-8 ${
                    currentStatus === "falta de energia"
                      ? "text-red-600 dark:text-red-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                />
              )}
            </div>
            <div>
              <h2
                className={`text-2xl font-bold ${
                  currentStatus === "ok"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : currentStatus === "falta de energia"
                    ? "text-red-600 dark:text-red-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {getStatusLabel(currentStatus)}
              </h2>
              <p className="text-muted-foreground">
                {latestEvent?.createdAt
                  ? `Atualizado em ${new Date(latestEvent.createdAt).toLocaleString("pt-BR")}`
                  : "Nenhum registro"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Status Atual"
          value={getStatusLabel(currentStatus)}
          icon={currentStatus === "ok" ? Check : AlertTriangle}
          color={currentStatus === "ok" ? "green" : currentStatus === "falta de energia" ? "red" : "amber"}
          testId="stat-energy-status"
        />
        <StatCard
          title="Ocorrências (30 dias)"
          value={totalOutages}
          icon={AlertTriangle}
          color="amber"
          testId="stat-outages"
        />
        <StatCard
          title="Última Ocorrência"
          value={lastOutage?.createdAt ? new Date(lastOutage.createdAt).toLocaleDateString("pt-BR") : "-"}
          icon={Calendar}
          color="purple"
          testId="stat-last-outage"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Histórico de Ocorrências
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <EmptyState
              icon={Zap}
              title="Nenhuma ocorrência registrada"
              description="O histórico de energia aparecerá aqui."
            />
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`flex items-center justify-between rounded-lg border p-4 ${getStatusColor(event.status)}`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        event.status === "ok"
                          ? "bg-emerald-500/20"
                          : event.status === "falta de energia"
                          ? "bg-red-500/20"
                          : "bg-amber-500/20"
                      }`}
                    >
                      {getStatusIcon(event.status)}
                    </div>
                    <div>
                      <p className="font-medium">{event.description}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{event.createdAt ? new Date(event.createdAt).toLocaleString("pt-BR") : "-"}</span>
                        {event.resolvedAt && event.status !== "ok" && (
                          <>
                            <span>→</span>
                            <span>Resolvido: {new Date(event.resolvedAt).toLocaleString("pt-BR")}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={
                      event.status === "ok"
                        ? "default"
                        : event.status === "falta de energia"
                        ? "destructive"
                        : "secondary"
                    }
                    className={
                      event.status === "ok"
                        ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                        : ""
                    }
                  >
                    {getStatusLabel(event.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
