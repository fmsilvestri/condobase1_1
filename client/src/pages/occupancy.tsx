import { useState } from "react";
import { Users, Home, Building2, Droplets, Flame, Zap, Edit, Calculator } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const mockOccupancy = {
  totalUnits: 52,
  occupiedUnits: 48,
  vacantUnits: 4,
  averagePeoplePerUnit: 2.8,
  estimatedPopulation: 134,
  avgWaterConsumption: 150,
  avgGasConsumption: 30,
  avgEnergyConsumption: 180,
};

const occupancyData = [
  { name: "Ocupadas", value: mockOccupancy.occupiedUnits, color: "hsl(142, 70%, 45%)" },
  { name: "Vazias", value: mockOccupancy.vacantUnits, color: "hsl(0, 0%, 70%)" },
];

const consumptionData = [
  {
    name: "Água",
    perPerson: mockOccupancy.avgWaterConsumption,
    total: mockOccupancy.avgWaterConsumption * mockOccupancy.estimatedPopulation,
    unit: "L/dia",
    color: "hsl(200, 70%, 50%)",
  },
  {
    name: "Gás",
    perPerson: mockOccupancy.avgGasConsumption,
    total: mockOccupancy.avgGasConsumption * mockOccupancy.estimatedPopulation,
    unit: "kg/mês",
    color: "hsl(35, 90%, 50%)",
  },
  {
    name: "Energia",
    perPerson: mockOccupancy.avgEnergyConsumption,
    total: mockOccupancy.avgEnergyConsumption * mockOccupancy.estimatedPopulation,
    unit: "kWh/mês",
    color: "hsl(50, 90%, 50%)",
  },
];

export default function Occupancy() {
  const [isEditOpen, setIsEditOpen] = useState(false);

  const occupancyRate = Math.round(
    (mockOccupancy.occupiedUnits / mockOccupancy.totalUnits) * 100
  );

  const waterCapacity = 50000;
  const dailyWaterConsumption =
    mockOccupancy.avgWaterConsumption * mockOccupancy.estimatedPopulation;
  const waterAutonomy = Math.round(waterCapacity / dailyWaterConsumption);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ocupação & População"
        description="Dados de ocupação e consumo estimado do condomínio"
        backHref="/"
        actions={
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-edit-occupancy">
                <Edit className="mr-2 h-4 w-4" />
                Editar Dados
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Atualizar Dados de Ocupação</DialogTitle>
                <DialogDescription>
                  Atualize as informações de ocupação do condomínio.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="total">Total de Unidades</Label>
                    <Input
                      id="total"
                      type="number"
                      defaultValue={mockOccupancy.totalUnits}
                      data-testid="input-total-units"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="occupied">Unidades Ocupadas</Label>
                    <Input
                      id="occupied"
                      type="number"
                      defaultValue={mockOccupancy.occupiedUnits}
                      data-testid="input-occupied-units"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="avgPeople">Média de Pessoas por Unidade</Label>
                  <Input
                    id="avgPeople"
                    type="number"
                    step="0.1"
                    defaultValue={mockOccupancy.averagePeoplePerUnit}
                    data-testid="input-avg-people"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="water">Água (L/pessoa/dia)</Label>
                    <Input
                      id="water"
                      type="number"
                      defaultValue={mockOccupancy.avgWaterConsumption}
                      data-testid="input-water-consumption"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="gas">Gás (kg/pessoa/mês)</Label>
                    <Input
                      id="gas"
                      type="number"
                      defaultValue={mockOccupancy.avgGasConsumption}
                      data-testid="input-gas-consumption"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="energy">Energia (kWh/pessoa/mês)</Label>
                    <Input
                      id="energy"
                      type="number"
                      defaultValue={mockOccupancy.avgEnergyConsumption}
                      data-testid="input-energy-consumption"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setIsEditOpen(false)} data-testid="button-save-occupancy">
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Unidades"
          value={mockOccupancy.totalUnits}
          icon={Building2}
          color="blue"
          testId="stat-total-units"
        />
        <StatCard
          title="Unidades Ocupadas"
          value={mockOccupancy.occupiedUnits}
          icon={Home}
          color="green"
          testId="stat-occupied-units"
        />
        <StatCard
          title="População Estimada"
          value={mockOccupancy.estimatedPopulation}
          unit="pessoas"
          icon={Users}
          color="purple"
          testId="stat-population"
        />
        <StatCard
          title="Taxa de Ocupação"
          value={`${occupancyRate}%`}
          icon={Building2}
          color="cyan"
          testId="stat-occupancy-rate"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Distribuição de Ocupação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={occupancyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {occupancyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-center">
              <div className="rounded-lg bg-emerald-500/10 p-4">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {mockOccupancy.occupiedUnits}
                </p>
                <p className="text-sm text-muted-foreground">Ocupadas</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-2xl font-bold">{mockOccupancy.vacantUnits}</p>
                <p className="text-sm text-muted-foreground">Vazias</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Consumo Estimado por Pessoa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={consumptionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} width={60} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value} ${props.payload.unit}`,
                      'Consumo por pessoa',
                    ]}
                  />
                  <Bar dataKey="perPerson" radius={[0, 4, 4, 0]}>
                    {consumptionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                <Droplets className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Consumo Diário de Água</p>
                <p className="text-2xl font-bold">
                  {dailyWaterConsumption.toLocaleString()} <span className="text-sm font-normal">L</span>
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Autonomia estimada</span>
                <span className="font-medium">{waterAutonomy} dias</span>
              </div>
              <Progress value={(waterAutonomy / 10) * 100} className="mt-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10">
                <Flame className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Consumo Mensal de Gás</p>
                <p className="text-2xl font-bold">
                  {(mockOccupancy.avgGasConsumption * mockOccupancy.estimatedPopulation).toLocaleString()}{" "}
                  <span className="text-sm font-normal">kg</span>
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Média por unidade</span>
                <span className="font-medium">
                  {Math.round(
                    (mockOccupancy.avgGasConsumption * mockOccupancy.averagePeoplePerUnit)
                  )}{" "}
                  kg
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/10">
                <Zap className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Consumo Mensal de Energia</p>
                <p className="text-2xl font-bold">
                  {(mockOccupancy.avgEnergyConsumption * mockOccupancy.estimatedPopulation).toLocaleString()}{" "}
                  <span className="text-sm font-normal">kWh</span>
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Média por unidade</span>
                <span className="font-medium">
                  {Math.round(
                    (mockOccupancy.avgEnergyConsumption * mockOccupancy.averagePeoplePerUnit)
                  )}{" "}
                  kWh
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
