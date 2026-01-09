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
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const mockReadings = [
  { id: "1", level: 78, date: "2024-01-15", photo: true },
  { id: "2", level: 82, date: "2024-01-08", photo: true },
  { id: "3", level: 88, date: "2024-01-01", photo: true },
  { id: "4", level: 95, date: "2023-12-25", photo: false },
  { id: "5", level: 100, date: "2023-12-18", photo: true },
];

const chartData = mockReadings.map((r) => ({
  date: new Date(r.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
  level: r.level,
})).reverse();

export default function Gas() {
  const [isNewReadingOpen, setIsNewReadingOpen] = useState(false);
  const latestReading = mockReadings[0];
  
  const weeklyConsumption = 4;
  const estimatedDaysRemaining = Math.round((latestReading.level / weeklyConsumption) * 7);

  const getLevelStatus = (level: number) => {
    if (level >= 50) return "ok";
    if (level >= 25) return "atenção";
    return "alerta";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gás"
        description="Monitoramento do nível e consumo de gás"
        backHref="/"
        actions={
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
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="level">Nível Atual (%)</Label>
                  <Input id="level" type="number" placeholder="78" data-testid="input-gas-level" />
                </div>
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
                <div className="grid gap-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea id="notes" placeholder="Observações adicionais..." data-testid="input-gas-notes" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewReadingOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setIsNewReadingOpen(false)} data-testid="button-save-gas-reading">
                  Salvar Leitura
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Nível Atual"
          value={`${latestReading.level}%`}
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
          value={new Date(latestReading.date).toLocaleDateString("pt-BR")}
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
                      stroke="hsl(35, 90%, 50%)"
                      fill="hsl(35, 90%, 50%)"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Histórico de Leituras
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockReadings.map((reading, index) => {
                  const prevReading = mockReadings[index + 1];
                  const change = prevReading ? prevReading.level - reading.level : 0;
                  
                  return (
                    <div
                      key={reading.id}
                      className="flex items-center justify-between p-3 rounded-lg hover-elevate"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
                          <Flame className="h-5 w-5 text-orange-500" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {new Date(reading.date).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {reading.photo && (
                              <Badge variant="outline" className="text-xs">
                                <Camera className="mr-1 h-3 w-3" />
                                Foto
                              </Badge>
                            )}
                            {change > 0 && (
                              <span className="text-red-500">-{change}%</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{reading.level}%</p>
                        <Progress value={reading.level} className="mt-1 h-2 w-20" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Nível Atual
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <GaugeChart
                value={latestReading.level}
                label="Disponível"
                color={getLevelStatus(latestReading.level) === "ok" ? "amber" : getLevelStatus(latestReading.level) === "atenção" ? "amber" : "red"}
                size="lg"
              />
              <div className="mt-4 w-full">
                <Progress value={latestReading.level} className="h-4" />
                <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                  <span>Vazio</span>
                  <span>Cheio</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {latestReading.level < 30 && (
            <Card className="border-red-500/50 bg-red-500/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/20">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-medium text-red-600 dark:text-red-400">
                      Nível Baixo
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      O nível de gás está abaixo de 30%. Agende o reabastecimento.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-orange-500/50 bg-orange-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500/20">
                  <Flame className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="font-medium text-orange-600 dark:text-orange-400">
                    Previsão de Reabastecimento
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Com o consumo atual, estima-se que o gás dure mais{" "}
                    <strong>{estimatedDaysRemaining} dias</strong>.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
