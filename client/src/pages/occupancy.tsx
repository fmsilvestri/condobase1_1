import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, Home, Building2, Droplets, Flame, Zap, Edit, Calculator, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { OccupancyData } from "@shared/schema";
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

const occupancyFormSchema = z.object({
  totalUnits: z.coerce.number().min(1, "Total de unidades é obrigatório"),
  occupiedUnits: z.coerce.number().min(0, "Unidades ocupadas é obrigatório"),
  averagePeoplePerUnit: z.coerce.number().min(0.1, "Média de pessoas é obrigatório"),
  avgWaterConsumption: z.coerce.number().min(0).optional(),
  avgGasConsumption: z.coerce.number().min(0).optional(),
  avgEnergyConsumption: z.coerce.number().min(0).optional(),
}).refine((data) => data.occupiedUnits <= data.totalUnits, {
  message: "Unidades ocupadas não pode ser maior que o total",
  path: ["occupiedUnits"],
});

const defaultOccupancy = {
  totalUnits: 52,
  occupiedUnits: 48,
  vacantUnits: 4,
  averagePeoplePerUnit: 2.8,
  estimatedPopulation: 134,
  avgWaterConsumption: 150,
  avgGasConsumption: 30,
  avgEnergyConsumption: 180,
};

export default function Occupancy() {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { canEdit } = useAuth();
  const { toast } = useToast();

  const { data: occupancy, isLoading } = useQuery<OccupancyData | null>({
    queryKey: ["/api/occupancy"],
  });

  const currentData = occupancy || defaultOccupancy;

  const form = useForm<z.infer<typeof occupancyFormSchema>>({
    resolver: zodResolver(occupancyFormSchema),
    defaultValues: {
      totalUnits: defaultOccupancy.totalUnits,
      occupiedUnits: defaultOccupancy.occupiedUnits,
      averagePeoplePerUnit: defaultOccupancy.averagePeoplePerUnit,
      avgWaterConsumption: defaultOccupancy.avgWaterConsumption,
      avgGasConsumption: defaultOccupancy.avgGasConsumption,
      avgEnergyConsumption: defaultOccupancy.avgEnergyConsumption,
    },
  });

  useEffect(() => {
    if (occupancy) {
      form.reset({
        totalUnits: occupancy.totalUnits,
        occupiedUnits: occupancy.occupiedUnits,
        averagePeoplePerUnit: occupancy.averagePeoplePerUnit,
        avgWaterConsumption: occupancy.avgWaterConsumption || 150,
        avgGasConsumption: occupancy.avgGasConsumption || 30,
        avgEnergyConsumption: occupancy.avgEnergyConsumption || 180,
      });
    }
  }, [occupancy, form]);

  const updateOccupancyMutation = useMutation({
    mutationFn: (formData: z.infer<typeof occupancyFormSchema>) => {
      const vacantUnits = formData.totalUnits - formData.occupiedUnits;
      const estimatedPopulation = Math.round(formData.occupiedUnits * formData.averagePeoplePerUnit);
      
      return apiRequest("PUT", "/api/occupancy", {
        ...formData,
        vacantUnits,
        estimatedPopulation,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/occupancy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Dados de ocupação atualizados com sucesso!" });
      setIsEditOpen(false);
    },
    onError: () => {
      toast({ title: "Erro ao atualizar dados de ocupação", variant: "destructive" });
    },
  });

  const handleFormSubmit = (data: z.infer<typeof occupancyFormSchema>) => {
    updateOccupancyMutation.mutate(data);
  };

  const totalUnits = currentData.totalUnits;
  const occupiedUnits = currentData.occupiedUnits;
  const vacantUnits = currentData.vacantUnits;
  const estimatedPopulation = currentData.estimatedPopulation;
  const averagePeoplePerUnit = currentData.averagePeoplePerUnit;
  const avgWaterConsumption = currentData.avgWaterConsumption || 150;
  const avgGasConsumption = currentData.avgGasConsumption || 30;
  const avgEnergyConsumption = currentData.avgEnergyConsumption || 180;

  const occupancyRate = Math.round((occupiedUnits / totalUnits) * 100);

  const occupancyChartData = [
    { name: "Ocupadas", value: occupiedUnits, color: "hsl(142, 70%, 45%)" },
    { name: "Vazias", value: vacantUnits, color: "hsl(0, 0%, 70%)" },
  ];

  const consumptionData = [
    {
      name: "Água",
      perPerson: avgWaterConsumption,
      total: avgWaterConsumption * estimatedPopulation,
      unit: "L/dia",
      color: "hsl(200, 70%, 50%)",
    },
    {
      name: "Gás",
      perPerson: avgGasConsumption,
      total: avgGasConsumption * estimatedPopulation,
      unit: "kg/mês",
      color: "hsl(35, 90%, 50%)",
    },
    {
      name: "Energia",
      perPerson: avgEnergyConsumption,
      total: avgEnergyConsumption * estimatedPopulation,
      unit: "kWh/mês",
      color: "hsl(50, 90%, 50%)",
    },
  ];

  const waterCapacity = 50000;
  const dailyWaterConsumption = avgWaterConsumption * estimatedPopulation;
  const waterAutonomy = Math.round(waterCapacity / dailyWaterConsumption);


  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Ocupação & População"
          description="Dados de ocupação e consumo estimado do condomínio"
          backHref="/"
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ocupação & População"
        description="Dados de ocupação e consumo estimado do condomínio"
        backHref="/"
        actions={
          canEdit && (
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
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="totalUnits"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total de Unidades</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                data-testid="input-total-units"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="occupiedUnits"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unidades Ocupadas</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                data-testid="input-occupied-units"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="averagePeoplePerUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Média de Pessoas por Unidade</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              {...field}
                              data-testid="input-avg-people"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="avgWaterConsumption"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Água (L/pessoa/dia)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                data-testid="input-water-consumption"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="avgGasConsumption"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gás (kg/pessoa/mês)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                data-testid="input-gas-consumption"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="avgEnergyConsumption"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Energia (kWh/pessoa/mês)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                data-testid="input-energy-consumption"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={updateOccupancyMutation.isPending} data-testid="button-save-occupancy">
                        {updateOccupancyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar
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
          title="Total de Unidades"
          value={totalUnits}
          icon={Building2}
          color="blue"
          testId="stat-total-units"
        />
        <StatCard
          title="Unidades Ocupadas"
          value={occupiedUnits}
          icon={Home}
          color="green"
          testId="stat-occupied-units"
        />
        <StatCard
          title="População Estimada"
          value={estimatedPopulation}
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
                    data={occupancyChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {occupancyChartData.map((entry, index) => (
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
                  {occupiedUnits}
                </p>
                <p className="text-sm text-muted-foreground">Ocupadas</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-2xl font-bold">{vacantUnits}</p>
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
                  {(avgGasConsumption * estimatedPopulation).toLocaleString()}{" "}
                  <span className="text-sm font-normal">kg</span>
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Média por unidade</span>
                <span className="font-medium">
                  {Math.round(avgGasConsumption * averagePeoplePerUnit)} kg
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
                  {(avgEnergyConsumption * estimatedPopulation).toLocaleString()}{" "}
                  <span className="text-sm font-normal">kWh</span>
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Média por unidade</span>
                <span className="font-medium">
                  {Math.round(avgEnergyConsumption * averagePeoplePerUnit)} kWh
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
