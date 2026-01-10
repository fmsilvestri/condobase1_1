import { useState } from "react";
import { Droplets, Plus, TrendingUp, Clock, AlertTriangle, Check, MapPin, Edit, Trash2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { GaugeChart } from "@/components/gauge-chart";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type { WaterReading, Reservoir } from "@shared/schema";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const reservoirFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  location: z.string().min(1, "Localização é obrigatória"),
  capacityLiters: z.coerce.number().min(1, "Capacidade deve ser maior que 0"),
});

const waterFormSchema = z.object({
  reservoirId: z.string().optional(),
  tankLevel: z.coerce.number().min(0).max(100),
  quality: z.enum(["boa", "regular", "ruim"]),
  casanStatus: z.enum(["normal", "interrompido", "baixa pressão"]).optional(),
  notes: z.string().optional(),
});

export default function Water() {
  const [isNewReadingOpen, setIsNewReadingOpen] = useState(false);
  const [isNewReservoirOpen, setIsNewReservoirOpen] = useState(false);
  const [editingReservoir, setEditingReservoir] = useState<Reservoir | null>(null);
  const { canEdit, dbUserId } = useAuth();
  const { toast } = useToast();

  const readingForm = useForm<z.infer<typeof waterFormSchema>>({
    resolver: zodResolver(waterFormSchema),
    defaultValues: {
      reservoirId: "",
      tankLevel: 0,
      quality: "boa",
      casanStatus: "normal",
      notes: "",
    },
  });

  const reservoirForm = useForm<z.infer<typeof reservoirFormSchema>>({
    resolver: zodResolver(reservoirFormSchema),
    defaultValues: {
      name: "",
      location: "",
      capacityLiters: 0,
    },
  });

  const { data: readings = [], isLoading: loadingReadings } = useQuery<WaterReading[]>({
    queryKey: ["/api/water"],
  });

  const { data: reservoirs = [], isLoading: loadingReservoirs } = useQuery<Reservoir[]>({
    queryKey: ["/api/reservoirs"],
  });

  const createReservoirMutation = useMutation({
    mutationFn: (data: z.infer<typeof reservoirFormSchema>) =>
      apiRequest("POST", "/api/reservoirs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservoirs"] });
      toast({ title: "Reservatório cadastrado com sucesso!" });
      setIsNewReservoirOpen(false);
      reservoirForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao cadastrar reservatório", description: error.message, variant: "destructive" });
    },
  });

  const updateReservoirMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: z.infer<typeof reservoirFormSchema> }) =>
      apiRequest("PATCH", `/api/reservoirs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservoirs"] });
      toast({ title: "Reservatório atualizado com sucesso!" });
      setEditingReservoir(null);
      reservoirForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar reservatório", description: error.message, variant: "destructive" });
    },
  });

  const deleteReservoirMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/reservoirs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservoirs"] });
      toast({ title: "Reservatório removido com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover reservatório", description: error.message, variant: "destructive" });
    },
  });

  const createReadingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof waterFormSchema>) => {
      const reservoir = reservoirs.find(r => r.id === data.reservoirId);
      const capacity = reservoir?.capacityLiters || 50000;
      const volumeAvailable = (data.tankLevel / 100) * capacity;
      const estimatedDailyConsumption = 5000;
      const estimatedAutonomy = volumeAvailable / estimatedDailyConsumption;
      
      return apiRequest("POST", "/api/water", {
        reservoirId: data.reservoirId || null,
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
      readingForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao registrar leitura", description: error.message, variant: "destructive" });
    },
  });

  const handleEditReservoir = (reservoir: Reservoir) => {
    setEditingReservoir(reservoir);
    reservoirForm.reset({
      name: reservoir.name,
      location: reservoir.location,
      capacityLiters: reservoir.capacityLiters,
    });
  };

  const handleSaveReservoir = (data: z.infer<typeof reservoirFormSchema>) => {
    if (editingReservoir) {
      updateReservoirMutation.mutate({ id: editingReservoir.id, data });
    } else {
      createReservoirMutation.mutate(data);
    }
  };

  const totalCapacity = reservoirs.reduce((sum, r) => sum + r.capacityLiters, 0) || 50000;
  const latestReading = readings[0];
  const currentLevel = latestReading?.tankLevel ?? 0;
  const totalVolume = (currentLevel / 100) * totalCapacity;
  const estimatedDailyConsumption = 5000;
  const autonomyDays = Math.round(totalVolume / estimatedDailyConsumption);

  const chartData = readings.slice(0, 10).map((r) => ({
    date: r.createdAt ? new Date(r.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "",
    level: r.tankLevel,
    volume: r.volumeAvailable,
  })).reverse();

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

  const getReservoirName = (reservoirId: string | null) => {
    if (!reservoirId) return "Geral";
    const reservoir = reservoirs.find(r => r.id === reservoirId);
    return reservoir?.name || "Desconhecido";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Água & Reservatórios"
        description="Monitoramento de níveis e qualidade da água"
        backHref="/"
        actions={
          canEdit && (
            <div className="flex gap-2">
              <Dialog open={isNewReservoirOpen} onOpenChange={setIsNewReservoirOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-new-reservoir">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Reservatório
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Cadastrar Reservatório</DialogTitle>
                    <DialogDescription>
                      Adicione um novo reservatório ao sistema.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...reservoirForm}>
                    <form onSubmit={reservoirForm.handleSubmit(handleSaveReservoir)} className="space-y-4">
                      <FormField
                        control={reservoirForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Reservatório</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Caixa d'água superior" {...field} data-testid="input-reservoir-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={reservoirForm.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Localização</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Cobertura Bloco A" {...field} data-testid="input-reservoir-location" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={reservoirForm.control}
                        name="capacityLiters"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Capacidade (Litros)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="10000" {...field} data-testid="input-reservoir-capacity" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsNewReservoirOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={createReservoirMutation.isPending} data-testid="button-save-reservoir">
                          {createReservoirMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Salvar
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

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
                  <Form {...readingForm}>
                    <form onSubmit={readingForm.handleSubmit((data) => createReadingMutation.mutate(data))} className="space-y-4">
                      {reservoirs.length > 0 && (
                        <FormField
                          control={readingForm.control}
                          name="reservoirId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reservatório</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-reservoir">
                                    <SelectValue placeholder="Selecione o reservatório" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="">Geral (todos)</SelectItem>
                                  {reservoirs.map((r) => (
                                    <SelectItem key={r.id} value={r.id}>
                                      {r.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      <FormField
                        control={readingForm.control}
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
                        control={readingForm.control}
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
                        control={readingForm.control}
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
                        control={readingForm.control}
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
                          {createReadingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Salvar Leitura
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          )
        }
      />

      {/* Edit Reservoir Dialog */}
      <Dialog open={!!editingReservoir} onOpenChange={(open) => {
        if (!open) {
          setEditingReservoir(null);
          reservoirForm.reset({ name: "", location: "", capacityLiters: 0 });
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Reservatório</DialogTitle>
            <DialogDescription>
              Atualize as informações do reservatório.
            </DialogDescription>
          </DialogHeader>
          <Form {...reservoirForm}>
            <form onSubmit={reservoirForm.handleSubmit(handleSaveReservoir)} className="space-y-4">
              <FormField
                control={reservoirForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Reservatório</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Caixa d'água superior" {...field} data-testid="input-edit-reservoir-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={reservoirForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localização</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Cobertura Bloco A" {...field} data-testid="input-edit-reservoir-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={reservoirForm.control}
                name="capacityLiters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacidade (Litros)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="10000" {...field} data-testid="input-edit-reservoir-capacity" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingReservoir(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateReservoirMutation.isPending} data-testid="button-update-reservoir">
                  {updateReservoirMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Atualizar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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
          title="Reservatórios"
          value={reservoirs.length}
          unit="cadastrados"
          icon={Droplets}
          color="purple"
          testId="stat-reservoirs-count"
        />
      </div>

      <Tabs defaultValue="reservoirs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reservoirs" data-testid="tab-reservoirs">
            Reservatórios ({reservoirs.length})
          </TabsTrigger>
          <TabsTrigger value="readings" data-testid="tab-readings">
            Leituras ({readings.length})
          </TabsTrigger>
          <TabsTrigger value="chart" data-testid="tab-chart">
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reservoirs" className="space-y-4">
          {reservoirs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Droplets className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum reservatório cadastrado</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Cadastre os reservatórios do condomínio para um controle mais preciso.
                </p>
                {canEdit && (
                  <Button onClick={() => setIsNewReservoirOpen(true)} data-testid="button-empty-new-reservoir">
                    <Plus className="mr-2 h-4 w-4" />
                    Cadastrar Reservatório
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reservoirs.map((reservoir) => (
                <Card key={reservoir.id} className="hover-elevate" data-testid={`reservoir-card-${reservoir.id}`}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base" data-testid={`text-reservoir-name-${reservoir.id}`}>
                        {reservoir.name}
                      </CardTitle>
                      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {reservoir.location}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {(reservoir.capacityLiters / 1000).toFixed(0)}k L
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Capacidade: {reservoir.capacityLiters.toLocaleString("pt-BR")} L
                      </span>
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditReservoir(reservoir)}
                            data-testid={`button-edit-reservoir-${reservoir.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteReservoirMutation.mutate(reservoir.id)}
                            className="text-destructive"
                            data-testid={`button-delete-reservoir-${reservoir.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="readings" className="space-y-4">
          {readings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Droplets className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma leitura registrada</h3>
                <p className="text-muted-foreground text-center">
                  Registre as leituras de nível dos reservatórios.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {readings.map((reading) => (
                <Card key={reading.id} className="hover-elevate" data-testid={`reading-card-${reading.id}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{reading.tankLevel}%</span>
                          {getQualityBadge(reading.quality)}
                          <Badge variant="outline">{getReservoirName(reading.reservoirId)}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Volume: {Math.round(reading.volumeAvailable / 1000)}k L | 
                          Autonomia: ~{Math.round(reading.estimatedAutonomy || 0)} dias
                        </div>
                        {reading.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{reading.notes}</p>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {reading.createdAt ? new Date(reading.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }) : "-"}
                      </div>
                    </div>
                    <Progress value={reading.tankLevel} className="mt-3 h-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="chart" className="space-y-4">
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
                          name === "level" ? `${value}%` : `${value.toLocaleString()} L`,
                          name === "level" ? "Nível" : "Volume"
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="level"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Sem dados para exibir
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
