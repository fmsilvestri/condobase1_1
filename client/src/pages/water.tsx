import { useState } from "react";
import { Droplets, Plus, TrendingUp, Clock, AlertTriangle, Check } from "lucide-react";
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
import type { WaterReading } from "@shared/schema";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const waterFormSchema = z.object({
  tankLevel: z.coerce.number().min(0).max(100),
  quality: z.enum(["boa", "regular", "ruim"]),
  casanStatus: z.enum(["normal", "interrompido", "baixa pressão"]).optional(),
  notes: z.string().optional(),
});

export default function Water() {
  const [isNewReadingOpen, setIsNewReadingOpen] = useState(false);
  const { canEdit, dbUserId } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof waterFormSchema>>({
    resolver: zodResolver(waterFormSchema),
    defaultValues: {
      tankLevel: 0,
      quality: "boa",
      casanStatus: "normal",
      notes: "",
    },
  });

  const { data: readings = [], isLoading } = useQuery<WaterReading[]>({
    queryKey: ["/api/water"],
  });

  const createReadingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof waterFormSchema>) => {
      const totalCapacity = 50000;
      const volumeAvailable = (data.tankLevel / 100) * totalCapacity;
      const estimatedDailyConsumption = 5000;
      const estimatedAutonomy = volumeAvailable / estimatedDailyConsumption;
      
      return apiRequest("POST", "/api/water", {
        tankLevel: data.tankLevel,
        quality: data.quality,
        volumeAvailable: volumeAvailable,
        estimatedAutonomy: estimatedAutonomy,
        casanStatus: data.casanStatus || "normal",
        notes: data.notes || null,
        recordedBy: dbUserId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/water"] });
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
  const currentLevel = latestReading?.tankLevel ?? 0;
  const totalCapacity = 50000;
  const totalVolume = (currentLevel / 100) * totalCapacity;
  const estimatedDailyConsumption = 5000;
  const autonomyDays = Math.round(totalVolume / estimatedDailyConsumption);

  const chartData = readings.slice(0, 10).map((r) => ({
    date: r.createdAt ? new Date(r.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "",
    level: r.tankLevel,
    volume: r.volumeAvailable,
  })).reverse();

  const onSubmit = (data: z.infer<typeof waterFormSchema>) => {
    createReadingMutation.mutate(data);
  };

  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case "boa":
        return <Badge className="bg-emerald-500/10 text-emerald-600">Boa</Badge>;
      case "regular":
        return <Badge className="bg-amber-500/10 text-amber-600">Regular</Badge>;
      case "ruim":
        return <Badge variant="destructive">Ruim</Badge>;
      default:
        return <Badge variant="secondary">{quality}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Água & Reservatórios"
        description="Monitoramento de níveis e qualidade da água"
        backHref="/"
        actions={
          canEdit && (
            <Dialog open={isNewReadingOpen} onOpenChange={setIsNewReadingOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-water-reading">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Leitura
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Registrar Leitura de Água</DialogTitle>
                  <DialogDescription>
                    Atualize os níveis dos reservatórios e a qualidade da água.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="tankLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nível do Reservatório (%)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="85" data-testid="input-water-level" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="quality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Qualidade da Água</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-quality">
                                <SelectValue placeholder="Selecione a qualidade" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="boa">Boa</SelectItem>
                              <SelectItem value="regular">Regular</SelectItem>
                              <SelectItem value="ruim">Ruim</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="casanStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status CASAN</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-casan">
                                <SelectValue placeholder="Selecione o status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="interrompido">Interrompido</SelectItem>
                              <SelectItem value="baixa pressão">Baixa Pressão</SelectItem>
                            </SelectContent>
                          </Select>
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
                            <Textarea placeholder="Observações adicionais..." data-testid="input-water-notes" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsNewReadingOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createReadingMutation.isPending} data-testid="button-save-water-reading">
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
          title="Nível Médio"
          value={`${currentLevel}%`}
          icon={Droplets}
          color="blue"
          testId="stat-water-level"
        />
        <StatCard
          title="Volume Disponível"
          value={`${Math.round(totalVolume / 1000)}k`}
          unit="L"
          icon={Droplets}
          color="cyan"
          testId="stat-water-volume"
        />
        <StatCard
          title="Autonomia Estimada"
          value={autonomyDays}
          unit="dias"
          icon={Clock}
          color="green"
          testId="stat-autonomy"
        />
        <StatCard
          title="Status CASAN"
          value={latestReading?.casanStatus === "normal" ? "Normal" : latestReading?.casanStatus || "Normal"}
          icon={latestReading?.casanStatus === "normal" || !latestReading?.casanStatus ? Check : AlertTriangle}
          color={latestReading?.casanStatus === "normal" || !latestReading?.casanStatus ? "green" : "amber"}
          testId="stat-casan"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
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
                        formatter={(value: number, name: string) => [
                          name === 'level' ? `${value}%` : `${value}L`,
                          name === 'level' ? 'Nível' : 'Volume'
                        ]}
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
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                          <Droplets className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{reading.tankLevel}% - {Math.round(reading.volumeAvailable / 1000)}k L</p>
                          <p className="text-sm text-muted-foreground">
                            {reading.createdAt ? new Date(reading.createdAt).toLocaleDateString("pt-BR") : "-"}
                          </p>
                        </div>
                      </div>
                      {getQualityBadge(reading.quality)}
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
              <CardTitle className="text-base font-semibold">Nível do Reservatório</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <GaugeChart value={currentLevel} max={100} label="Nível" unit="%" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Qualidade da Água</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className={`inline-flex h-20 w-20 items-center justify-center rounded-full ${
                  latestReading?.quality === "boa" ? "bg-emerald-500/10" :
                  latestReading?.quality === "regular" ? "bg-amber-500/10" : "bg-red-500/10"
                }`}>
                  <Droplets className={`h-10 w-10 ${
                    latestReading?.quality === "boa" ? "text-emerald-600" :
                    latestReading?.quality === "regular" ? "text-amber-600" : "text-red-600"
                  }`} />
                </div>
                <p className="mt-4 text-2xl font-bold capitalize">{latestReading?.quality || "Boa"}</p>
                <p className="text-sm text-muted-foreground">Última verificação</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentLevel < 30 ? (
                  <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" />
                      <div>
                        <p className="font-medium text-red-600">Nível Crítico!</p>
                        <p className="text-sm text-muted-foreground">
                          Verificar abastecimento.
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
                          Nível abaixo do ideal.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-3">
                    <div className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                      <div>
                        <p className="font-medium text-emerald-600">Nível Normal</p>
                        <p className="text-sm text-muted-foreground">
                          Tudo funcionando bem.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
