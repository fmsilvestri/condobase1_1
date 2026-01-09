import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Waves, Plus, Camera, TrendingUp, Clock, Loader2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ReadingCard } from "@/components/reading-card";
import { GaugeChart } from "@/components/gauge-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PoolReading } from "@shared/schema";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const poolReadingFormSchema = z.object({
  ph: z.coerce.number().min(0).max(14),
  chlorine: z.coerce.number().min(0).max(10),
  alkalinity: z.coerce.number().min(0).max(500),
  calciumHardness: z.coerce.number().min(0).max(1000),
  temperature: z.coerce.number().min(0).max(50),
  notes: z.string().optional(),
});

export default function Pool() {
  const [isNewReadingOpen, setIsNewReadingOpen] = useState(false);
  const { toast } = useToast();
  const { canEdit } = useAuth();

  const { data: readings = [], isLoading } = useQuery<PoolReading[]>({
    queryKey: ["/api/pool"],
  });

  const form = useForm<z.infer<typeof poolReadingFormSchema>>({
    resolver: zodResolver(poolReadingFormSchema),
    defaultValues: {
      ph: 7.2,
      chlorine: 2.5,
      alkalinity: 120,
      calciumHardness: 250,
      temperature: 28,
      notes: "",
    },
  });

  const createReadingMutation = useMutation({
    mutationFn: (data: z.infer<typeof poolReadingFormSchema>) =>
      apiRequest("POST", "/api/pool", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pool"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Leitura registrada com sucesso!" });
      setIsNewReadingOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Erro ao registrar leitura", variant: "destructive" });
    },
  });

  const latestReading = readings[0];

  const getPhStatus = (ph: number): "ok" | "atenção" | "alerta" => {
    if (ph >= 7.2 && ph <= 7.6) return "ok";
    if (ph >= 6.8 && ph < 7.2 || ph > 7.6 && ph <= 8.0) return "atenção";
    return "alerta";
  };

  const getChlorineStatus = (cl: number): "ok" | "atenção" | "alerta" => {
    if (cl >= 1.0 && cl <= 3.0) return "ok";
    if (cl >= 0.5 && cl < 1.0 || cl > 3.0 && cl <= 4.0) return "atenção";
    return "alerta";
  };

  const chartData = readings.slice(0, 7).map((r) => ({
    date: r.createdAt ? new Date(r.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "-",
    pH: r.ph,
    Cloro: r.chlorine,
    Temp: r.temperature,
  })).reverse();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-80" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Piscina & Qualidade"
        description="Monitoramento de pH, cloro e parâmetros da água"
        backHref="/"
        actions={
          canEdit && (
            <Dialog open={isNewReadingOpen} onOpenChange={setIsNewReadingOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-reading">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Leitura
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Registrar Leitura da Piscina</DialogTitle>
                  <DialogDescription>
                    Insira os valores medidos e tire uma foto do kit de testes.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => createReadingMutation.mutate(data))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="ph"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>pH</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" {...field} data-testid="input-ph" />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">Ideal: 7.2 - 7.6</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="chlorine"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cloro (ppm)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" {...field} data-testid="input-chlorine" />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">Ideal: 1.0 - 3.0</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="alkalinity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Alcalinidade (ppm)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} data-testid="input-alkalinity" />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">Ideal: 80 - 120</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="calciumHardness"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dureza Cálcica (ppm)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} data-testid="input-calcium" />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">Ideal: 200 - 400</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="temperature"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Temperatura (°C)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" {...field} data-testid="input-temperature" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Observações adicionais..." {...field} data-testid="input-notes" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsNewReadingOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createReadingMutation.isPending} data-testid="button-save-reading">
                        {createReadingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Leitura
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      {!latestReading ? (
        <Card className="p-8 text-center">
          <Waves className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Nenhuma leitura registrada</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Registre a primeira leitura de qualidade da piscina.
          </p>
          <Button className="mt-4" onClick={() => setIsNewReadingOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Leitura
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <CardTitle className="text-base font-semibold">
                  Leitura Atual
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {latestReading.createdAt ? new Date(latestReading.createdAt).toLocaleString("pt-BR") : "-"}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <ReadingCard
                    label="pH"
                    value={latestReading.ph}
                    status={getPhStatus(latestReading.ph)}
                    ideal="7.2 - 7.6"
                    testId="reading-ph"
                  />
                  <ReadingCard
                    label="Cloro"
                    value={latestReading.chlorine}
                    unit="ppm"
                    status={getChlorineStatus(latestReading.chlorine)}
                    ideal="1.0 - 3.0 ppm"
                    testId="reading-chlorine"
                  />
                  <ReadingCard
                    label="Temperatura"
                    value={latestReading.temperature}
                    unit="°C"
                    status="ok"
                    testId="reading-temperature"
                  />
                  <ReadingCard
                    label="Alcalinidade"
                    value={latestReading.alkalinity}
                    unit="ppm"
                    status="ok"
                    ideal="80 - 120 ppm"
                    testId="reading-alkalinity"
                  />
                  <ReadingCard
                    label="Dureza Cálcica"
                    value={latestReading.calciumHardness}
                    unit="ppm"
                    status="ok"
                    ideal="200 - 400 ppm"
                    testId="reading-calcium"
                  />
                </div>
              </CardContent>
            </Card>

            {chartData.length > 1 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Histórico
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="pH" stroke="hsl(200, 70%, 50%)" strokeWidth={2} dot={{ fill: 'hsl(200, 70%, 50%)', strokeWidth: 2 }} />
                        <Line type="monotone" dataKey="Cloro" stroke="hsl(170, 70%, 45%)" strokeWidth={2} dot={{ fill: 'hsl(170, 70%, 45%)', strokeWidth: 2 }} />
                        <Line type="monotone" dataKey="Temp" stroke="hsl(30, 80%, 50%)" strokeWidth={2} dot={{ fill: 'hsl(30, 80%, 50%)', strokeWidth: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Indicadores Visuais
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-6">
                <div className="text-center">
                  <GaugeChart
                    value={latestReading.ph}
                    max={14}
                    label="pH"
                    unit=""
                    color={getPhStatus(latestReading.ph) === "ok" ? "green" : getPhStatus(latestReading.ph) === "atenção" ? "amber" : "red"}
                  />
                  <p className="mt-2 text-sm text-muted-foreground">Ideal: 7.2 - 7.6</p>
                </div>
                <div className="text-center">
                  <GaugeChart
                    value={latestReading.chlorine}
                    max={5}
                    label="Cloro"
                    unit="ppm"
                    color={getChlorineStatus(latestReading.chlorine) === "ok" ? "cyan" : "amber"}
                  />
                  <p className="mt-2 text-sm text-muted-foreground">Ideal: 1.0 - 3.0 ppm</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Histórico de Leituras
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {readings.slice(0, 5).map((reading) => (
                    <div key={reading.id} className="flex items-center justify-between rounded-lg p-2 hover-elevate" data-testid={`reading-history-${reading.id}`}>
                      <div>
                        <p className="text-sm font-medium">
                          pH {reading.ph} • Cl {reading.chlorine} ppm
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {reading.createdAt ? new Date(reading.createdAt).toLocaleDateString("pt-BR") : "-"}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          getPhStatus(reading.ph) === "ok"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }
                      >
                        {getPhStatus(reading.ph) === "ok" ? "OK" : "Atenção"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
