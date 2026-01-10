import { useState } from "react";
import { Flame, Plus, Camera, TrendingDown, Calendar, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { GaugeChart } from "@/components/gauge-chart";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { GasReading } from "@shared/schema";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const gasFormSchema = z.object({
  level: z.coerce.number().min(0).max(100),
  notes: z.string().optional(),
});

export default function Gas() {
  const [isNewReadingOpen, setIsNewReadingOpen] = useState(false);
  const { canEdit, dbUserId } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof gasFormSchema>>({
    resolver: zodResolver(gasFormSchema),
    defaultValues: {
      level: 0,
      notes: "",
    },
  });

  const { data: readings = [], isLoading } = useQuery<GasReading[]>({
    queryKey: ["/api/gas"],
  });

  const createReadingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof gasFormSchema>) => {
      return apiRequest("POST", "/api/gas", {
        level: data.level,
        percentAvailable: data.level,
        notes: data.notes || null,
        photo: null,
        recordedBy: dbUserId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Leitura registrada com sucesso!" });
      setIsNewReadingOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao registrar leitura", description: error.message, variant: "destructive" });
    },
  });

  const latestReading = readings[0];
  const currentLevel = latestReading?.level ?? 0;
  
  const weeklyConsumption = readings.length >= 2 
    ? Math.abs((readings[0]?.level ?? 0) - (readings[1]?.level ?? 0))
    : 4;
  const estimatedDaysRemaining = weeklyConsumption > 0 
    ? Math.round((currentLevel / weeklyConsumption) * 7) 
    : 0;

  const chartData = readings.slice(0, 10).map((r) => ({
    date: r.createdAt ? new Date(r.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "",
    level: r.level,
  })).reverse();

  const getLevelStatus = (level: number) => {
    if (level >= 50) return "ok";
    if (level >= 25) return "atenção";
    return "alerta";
  };

  const onSubmit = (data: z.infer<typeof gasFormSchema>) => {
    createReadingMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gás"
        description="Monitoramento do nível e consumo de gás"
        backHref="/"
        actions={
          canEdit && (
            <Dialog open={isNewReadingOpen} onOpenChange={setIsNewReadingOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-gas-reading">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Leitura
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Registrar Leitura de Gás</DialogTitle>
                  <DialogDescription>
                    Insira o nível atual e tire uma foto do medidor.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nível Atual (%)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="78" data-testid="input-gas-level" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid gap-2">
                      <Label>Foto do Medidor</Label>
                      <div className="flex items-center justify-center rounded-lg border-2 border-dashed p-6">
                        <div className="text-center">
                          <Camera className="mx-auto h-8 w-8 text-muted-foreground" />
                          <p className="mt-2 text-sm text-muted-foreground">
                            Tire uma foto ou faça upload
                          </p>
                        </div>
                      </div>
                    </div>
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Observações adicionais..." data-testid="input-gas-notes" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsNewReadingOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createReadingMutation.isPending} data-testid="button-save-gas-reading">
                        {createReadingMutation.isPending ? "Salvando..." : "Salvar Leitura"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Nível Atual"
          value={`${currentLevel}%`}
          icon={Flame}
          color="amber"
          testId="stat-gas-level"
        />
        <StatCard
          title="Consumo Semanal"
          value={`${weeklyConsumption}%`}
          icon={TrendingDown}
          color="blue"
          testId="stat-gas-consumption"
        />
        <StatCard
          title="Autonomia Estimada"
          value={estimatedDaysRemaining}
          unit="dias"
          icon={Calendar}
          color="green"
          testId="stat-gas-autonomy"
        />
        <StatCard
          title="Última Leitura"
          value={latestReading?.createdAt ? new Date(latestReading.createdAt).toLocaleDateString("pt-BR") : "-"}
          icon={Calendar}
          color="purple"
          testId="stat-gas-last-reading"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Histórico de Níveis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [`${value}%`, 'Nível']}
                      />
                      <Area
                        type="monotone"
                        dataKey="level"
                        stroke="hsl(var(--chart-1))"
                        fill="hsl(var(--chart-1))"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Nenhuma leitura registrada
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-base font-semibold">Histórico de Leituras</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {readings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Nenhuma leitura registrada</p>
                ) : (
                  readings.slice(0, 5).map((reading) => (
                    <div key={reading.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          getLevelStatus(reading.level) === "ok" ? "bg-emerald-500/10" :
                          getLevelStatus(reading.level) === "atenção" ? "bg-amber-500/10" : "bg-red-500/10"
                        }`}>
                          <Flame className={`h-5 w-5 ${
                            getLevelStatus(reading.level) === "ok" ? "text-emerald-600" :
                            getLevelStatus(reading.level) === "atenção" ? "text-amber-600" : "text-red-600"
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium">{reading.level}%</p>
                          <p className="text-sm text-muted-foreground">
                            {reading.createdAt ? new Date(reading.createdAt).toLocaleDateString("pt-BR") : "-"}
                          </p>
                        </div>
                      </div>
                      <Badge variant={
                        getLevelStatus(reading.level) === "ok" ? "default" :
                        getLevelStatus(reading.level) === "atenção" ? "secondary" : "destructive"
                      }>
                        {getLevelStatus(reading.level)}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Nível do Tanque</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <GaugeChart value={currentLevel} max={100} label="Nível" unit="%" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Alertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentLevel < 25 ? (
                  <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" />
                      <div>
                        <p className="font-medium text-red-600">Nível Crítico!</p>
                        <p className="text-sm text-muted-foreground">
                          Agendar reabastecimento com urgência.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : currentLevel < 50 ? (
                  <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                      <div>
                        <p className="font-medium text-amber-600">Atenção</p>
                        <p className="text-sm text-muted-foreground">
                          Considere agendar reabastecimento.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-3">
                    <div className="flex items-start gap-2">
                      <Flame className="mt-0.5 h-4 w-4 text-emerald-600" />
                      <div>
                        <p className="font-medium text-emerald-600">Nível Normal</p>
                        <p className="text-sm text-muted-foreground">
                          Nenhuma ação necessária.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Informações do Fornecedor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fornecedor</span>
                <span className="font-medium">Ultragaz</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Telefone</span>
                <span className="font-medium">(48) 3333-4444</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Próx. Reabast.</span>
                <span className="font-medium">Sob demanda</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
