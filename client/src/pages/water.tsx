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
  { date: "10/01", level: 92, volume: 46000 },
  { date: "11/01", level: 88, volume: 44000 },
  { date: "12/01", level: 85, volume: 42500 },
  { date: "13/01", level: 95, volume: 47500 },
  { date: "14/01", level: 90, volume: 45000 },
  { date: "15/01", level: 85, volume: 42500 },
];

const tanks = [
  { id: "1", name: "Caixa d'Água Superior", capacity: 30000, level: 85, location: "Cobertura" },
  { id: "2", name: "Cisterna Principal", capacity: 20000, level: 78, location: "Subsolo" },
];

export default function Water() {
  const [isNewReadingOpen, setIsNewReadingOpen] = useState(false);
  const { canEdit } = useAuth();

  const totalCapacity = tanks.reduce((sum, t) => sum + t.capacity, 0);
  const totalVolume = tanks.reduce((sum, t) => sum + (t.capacity * t.level) / 100, 0);
  const averageLevel = Math.round((totalVolume / totalCapacity) * 100);

  const estimatedDailyConsumption = 5000;
  const autonomyDays = Math.round(totalVolume / estimatedDailyConsumption);

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
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="tank">Reservatório</Label>
                    <Select>
                      <SelectTrigger data-testid="select-tank">
                        <SelectValue placeholder="Selecione o reservatório" />
                      </SelectTrigger>
                      <SelectContent>
                        {tanks.map((tank) => (
                          <SelectItem key={tank.id} value={tank.id}>
                            {tank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="level">Nível (%)</Label>
                      <Input id="level" type="number" placeholder="85" data-testid="input-water-level" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="quality">Qualidade</Label>
                      <Select>
                        <SelectTrigger data-testid="select-quality">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="boa">Boa</SelectItem>
                          <SelectItem value="regular">Regular</SelectItem>
                          <SelectItem value="ruim">Ruim</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea id="notes" placeholder="Observações adicionais..." data-testid="input-water-notes" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewReadingOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => setIsNewReadingOpen(false)} data-testid="button-save-water-reading">
                    Salvar Leitura
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Nível Médio"
          value={`${averageLevel}%`}
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
          value="Normal"
          icon={Check}
          color="green"
          testId="stat-casan"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Reservatórios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {tanks.map((tank) => (
                <div key={tank.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{tank.name}</p>
                      <p className="text-sm text-muted-foreground">{tank.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{tank.level}%</p>
                      <p className="text-sm text-muted-foreground">
                        {Math.round((tank.capacity * tank.level) / 1000)}k / {tank.capacity / 1000}k L
                      </p>
                    </div>
                  </div>
                  <Progress
                    value={tank.level}
                    className="h-3"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Histórico de Níveis - Últimos 6 Dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockReadings}>
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
                      stroke="hsl(200, 70%, 50%)"
                      fill="hsl(200, 70%, 50%)"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Nível Total
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <GaugeChart
                value={averageLevel}
                label="Capacidade"
                color={averageLevel >= 70 ? "blue" : averageLevel >= 40 ? "amber" : "red"}
                size="lg"
              />
              <div className="mt-4 grid w-full grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{Math.round(totalVolume / 1000)}k</p>
                  <p className="text-sm text-muted-foreground">Litros Disponíveis</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalCapacity / 1000}k</p>
                  <p className="text-sm text-muted-foreground">Capacidade Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Qualidade da Água
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-medium">Potabilidade</span>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    Aprovada
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-medium">Limpeza</span>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    Em dia
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/50 bg-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                  <Droplets className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-blue-600 dark:text-blue-400">
                    Consumo Estimado
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    ~{estimatedDailyConsumption.toLocaleString()} litros/dia baseado na
                    ocupação atual de 48 unidades.
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
