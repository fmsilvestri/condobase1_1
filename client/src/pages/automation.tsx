import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Droplets,
  Flame,
  Zap,
  Plus,
  Loader2,
  Activity,
  TrendingUp,
  TrendingDown,
  Gauge,
  Camera,
  Image,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { queryClient, apiRequest, getAuthHeaders } from "@/lib/queryClient";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
} from "recharts";

// Schemas de validação
const waterReadingSchema = z.object({
  tankLevel: z.coerce.number().min(0).max(100, "Nível deve ser entre 0 e 100%"),
  volumeAvailable: z.coerce.number().min(0, "Volume deve ser positivo"),
  quality: z.string().min(1, "Selecione a qualidade"),
  estimatedAutonomy: z.coerce.number().optional(),
  casanStatus: z.string().optional(),
  notes: z.string().optional(),
});

const gasReadingSchema = z.object({
  level: z.coerce.number().min(0).max(100, "Nível deve ser entre 0 e 100%"),
  percentAvailable: z.coerce.number().min(0).max(100, "Percentual deve ser entre 0 e 100%"),
  notes: z.string().optional(),
});

const energyEventSchema = z.object({
  status: z.string().min(1, "Selecione o status"),
  description: z.string().optional(),
});

type WaterReadingFormData = z.infer<typeof waterReadingSchema>;
type GasReadingFormData = z.infer<typeof gasReadingSchema>;
type EnergyEventFormData = z.infer<typeof energyEventSchema>;

interface WaterReading {
  id: string;
  tankLevel: number;
  quality: string;
  volumeAvailable: number;
  estimatedAutonomy: number | null;
  casanStatus: string | null;
  photo: string | null;
  notes: string | null;
  createdAt: string;
  recordedBy: string | null;
}

interface GasReading {
  id: string;
  level: number;
  percentAvailable: number;
  photo: string | null;
  notes: string | null;
  createdAt: string;
  recordedBy: string | null;
}

interface EnergyEvent {
  id: string;
  status: string;
  description: string | null;
  createdAt: string;
  resolvedAt: string | null;
  recordedBy: string | null;
}

const qualityLabels: Record<string, string> = {
  boa: "Boa",
  regular: "Regular",
  ruim: "Ruim",
  critica: "Crítica",
};

const casanStatusLabels: Record<string, string> = {
  normal: "Normal",
  baixa_pressao: "Baixa Pressão",
  sem_abastecimento: "Sem Abastecimento",
  racionamento: "Racionamento",
};

const energyStatusLabels: Record<string, string> = {
  ok: "Normal",
  queda: "Queda de Energia",
  oscilacao: "Oscilação",
  fase_faltando: "Fase Faltando",
  gerador_ativo: "Gerador Ativo",
};

export default function Automation() {
  const { toast } = useToast();
  const [isWaterDialogOpen, setIsWaterDialogOpen] = useState(false);
  const [isGasDialogOpen, setIsGasDialogOpen] = useState(false);
  const [isEnergyDialogOpen, setIsEnergyDialogOpen] = useState(false);
  const [waterPhotoFile, setWaterPhotoFile] = useState<File | null>(null);
  const [waterPhotoPreview, setWaterPhotoPreview] = useState<string | null>(null);
  const [gasPhotoFile, setGasPhotoFile] = useState<File | null>(null);
  const [gasPhotoPreview, setGasPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const waterPhotoInputRef = useRef<HTMLInputElement>(null);
  const gasPhotoInputRef = useRef<HTMLInputElement>(null);

  // Função para upload de foto
  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const authHeaders = getAuthHeaders();
      
      // Solicitar URL de upload (requer autenticação)
      const response = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao obter URL de upload");
      }

      const { uploadURL, objectPath } = await response.json();

      // Upload direto para o storage
      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Falha no upload do arquivo");
      }

      return objectPath;
    } catch (error) {
      console.error("Erro no upload:", error);
      toast({ title: "Erro ao fazer upload da foto", variant: "destructive" });
      return null;
    }
  };

  const handleWaterPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setWaterPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setWaterPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGasPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGasPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setGasPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearWaterPhoto = () => {
    setWaterPhotoFile(null);
    setWaterPhotoPreview(null);
    if (waterPhotoInputRef.current) {
      waterPhotoInputRef.current.value = "";
    }
  };

  const clearGasPhoto = () => {
    setGasPhotoFile(null);
    setGasPhotoPreview(null);
    if (gasPhotoInputRef.current) {
      gasPhotoInputRef.current.value = "";
    }
  };

  const waterForm = useForm<WaterReadingFormData>({
    resolver: zodResolver(waterReadingSchema),
    defaultValues: {
      tankLevel: 0,
      volumeAvailable: 0,
      quality: "boa",
      casanStatus: "normal",
    },
  });

  const gasForm = useForm<GasReadingFormData>({
    resolver: zodResolver(gasReadingSchema),
    defaultValues: {
      level: 0,
      percentAvailable: 0,
    },
  });

  const energyForm = useForm<EnergyEventFormData>({
    resolver: zodResolver(energyEventSchema),
    defaultValues: {
      status: "ok",
    },
  });

  // Queries
  const { data: waterReadings = [], isLoading: waterLoading } = useQuery<WaterReading[]>({
    queryKey: ["/api/water"],
  });

  const { data: gasReadings = [], isLoading: gasLoading } = useQuery<GasReading[]>({
    queryKey: ["/api/gas"],
  });

  const { data: energyEvents = [], isLoading: energyLoading } = useQuery<EnergyEvent[]>({
    queryKey: ["/api/energy"],
  });

  // Mutations
  const createWaterReading = useMutation({
    mutationFn: async (data: WaterReadingFormData) => {
      setIsUploading(true);
      let photoUrl: string | null = null;
      
      if (waterPhotoFile) {
        photoUrl = await uploadPhoto(waterPhotoFile);
      }
      
      setIsUploading(false);
      return apiRequest("POST", "/api/water", { ...data, photo: photoUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/water"] });
      setIsWaterDialogOpen(false);
      waterForm.reset();
      clearWaterPhoto();
      toast({ title: "Leitura de água registrada com sucesso" });
    },
    onError: () => {
      setIsUploading(false);
      toast({ title: "Erro ao registrar leitura", variant: "destructive" });
    },
  });

  const createGasReading = useMutation({
    mutationFn: async (data: GasReadingFormData) => {
      setIsUploading(true);
      let photoUrl: string | null = null;
      
      if (gasPhotoFile) {
        photoUrl = await uploadPhoto(gasPhotoFile);
      }
      
      setIsUploading(false);
      return apiRequest("POST", "/api/gas", { ...data, photo: photoUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gas"] });
      setIsGasDialogOpen(false);
      gasForm.reset();
      clearGasPhoto();
      toast({ title: "Leitura de gás registrada com sucesso" });
    },
    onError: () => {
      setIsUploading(false);
      toast({ title: "Erro ao registrar leitura", variant: "destructive" });
    },
  });

  const createEnergyEvent = useMutation({
    mutationFn: async (data: EnergyEventFormData) => {
      return apiRequest("POST", "/api/energy", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/energy"] });
      setIsEnergyDialogOpen(false);
      energyForm.reset();
      toast({ title: "Evento de energia registrado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao registrar evento", variant: "destructive" });
    },
  });

  // Preparar dados para gráficos
  const waterChartData = [...waterReadings]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-30)
    .map((reading) => ({
      date: format(new Date(reading.createdAt), "dd/MM", { locale: ptBR }),
      nivel: reading.tankLevel,
      volume: reading.volumeAvailable,
    }));

  const gasChartData = [...gasReadings]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-30)
    .map((reading) => ({
      date: format(new Date(reading.createdAt), "dd/MM", { locale: ptBR }),
      nivel: reading.level,
      percentual: reading.percentAvailable,
    }));

  // Ordenar dados por data (mais recentes primeiro para métricas)
  const sortedWaterReadings = [...waterReadings].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const sortedGasReadings = [...gasReadings].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const sortedEnergyEvents = [...energyEvents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Gráfico de eventos de energia - contagem por status nos últimos 30 dias
  const energyStatusCounts = sortedEnergyEvents.reduce((acc, event) => {
    const statusLabel = energyStatusLabels[event.status] || event.status;
    acc[statusLabel] = (acc[statusLabel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const energyBarChartData = Object.entries(energyStatusCounts).map(([status, count]) => ({
    status,
    count,
  }));

  // Timeline de eventos por dia
  const energyTimelineData = [...sortedEnergyEvents]
    .slice(0, 30)
    .reverse()
    .map((event) => ({
      date: format(new Date(event.createdAt), "dd/MM", { locale: ptBR }),
      status: event.status,
      statusLabel: energyStatusLabels[event.status] || event.status,
      value: event.status === "ok" ? 1 : 0,
    }));

  // Calcular métricas usando dados ordenados
  const lastWaterReading = sortedWaterReadings[0];
  const lastGasReading = sortedGasReadings[0];
  const lastEnergyEvent = sortedEnergyEvents[0];

  const waterTrend = sortedWaterReadings.length >= 2
    ? sortedWaterReadings[0].tankLevel - sortedWaterReadings[1].tankLevel
    : 0;
  const gasTrend = sortedGasReadings.length >= 2
    ? sortedGasReadings[0].level - sortedGasReadings[1].level
    : 0;

  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case "boa":
        return <Badge className="bg-green-500">Boa</Badge>;
      case "regular":
        return <Badge className="bg-yellow-500">Regular</Badge>;
      case "ruim":
        return <Badge className="bg-orange-500">Ruim</Badge>;
      case "critica":
        return <Badge variant="destructive">Crítica</Badge>;
      default:
        return <Badge variant="outline">{quality}</Badge>;
    }
  };

  const getEnergyStatusBadge = (status: string) => {
    switch (status) {
      case "ok":
        return <Badge className="bg-green-500">Normal</Badge>;
      case "queda":
        return <Badge variant="destructive">Queda</Badge>;
      case "oscilacao":
        return <Badge className="bg-yellow-500">Oscilação</Badge>;
      case "fase_faltando":
        return <Badge className="bg-orange-500">Fase Faltando</Badge>;
      case "gerador_ativo":
        return <Badge className="bg-blue-500">Gerador Ativo</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        icon={Activity}
        title="Operação e Automação"
        description="Leituras e consumos de água, gás e energia do condomínio"
        backHref="/"
      />

      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Cards de resumo */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Água</CardTitle>
              <Droplets className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {lastWaterReading ? `${lastWaterReading.tankLevel}%` : "-"}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {waterTrend !== 0 && (
                  <span className={`flex items-center ${waterTrend > 0 ? "text-green-500" : "text-red-500"}`}>
                    {waterTrend > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {Math.abs(waterTrend).toFixed(1)}%
                  </span>
                )}
                <span>{waterReadings.length} leituras</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gás</CardTitle>
              <Flame className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {lastGasReading ? `${lastGasReading.percentAvailable}%` : "-"}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {gasTrend !== 0 && (
                  <span className={`flex items-center ${gasTrend > 0 ? "text-green-500" : "text-red-500"}`}>
                    {gasTrend > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {Math.abs(gasTrend).toFixed(1)}%
                  </span>
                )}
                <span>{gasReadings.length} leituras</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Energia</CardTitle>
              <Zap className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {lastEnergyEvent ? getEnergyStatusBadge(lastEnergyEvent.status) : "-"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {energyEvents.length} eventos registrados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Abas de conteúdo */}
        <Tabs defaultValue="water" className="space-y-4">
          <TabsList>
            <TabsTrigger value="water" data-testid="tab-water">
              <Droplets className="mr-2 h-4 w-4" />
              Água
            </TabsTrigger>
            <TabsTrigger value="gas" data-testid="tab-gas">
              <Flame className="mr-2 h-4 w-4" />
              Gás
            </TabsTrigger>
            <TabsTrigger value="energy" data-testid="tab-energy">
              <Zap className="mr-2 h-4 w-4" />
              Energia
            </TabsTrigger>
          </TabsList>

          {/* Aba Água */}
          <TabsContent value="water" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Leituras de Água</h3>
              <Dialog open={isWaterDialogOpen} onOpenChange={setIsWaterDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-water-reading">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Leitura
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Nova Leitura de Água</DialogTitle>
                  </DialogHeader>
                  <Form {...waterForm}>
                    <form onSubmit={waterForm.handleSubmit((data) => createWaterReading.mutate(data))} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={waterForm.control}
                          name="tankLevel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nível do Reservatório (%)</FormLabel>
                              <FormControl>
                                <Input type="number" min={0} max={100} {...field} data-testid="input-tank-level" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={waterForm.control}
                          name="volumeAvailable"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Volume Disponível (L)</FormLabel>
                              <FormControl>
                                <Input type="number" min={0} {...field} data-testid="input-volume" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={waterForm.control}
                          name="quality"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Qualidade da Água</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-quality">
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.entries(qualityLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={waterForm.control}
                          name="casanStatus"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status Abastecimento</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-casan">
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.entries(casanStatusLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={waterForm.control}
                        name="estimatedAutonomy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Autonomia Estimada (horas)</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} {...field} data-testid="input-autonomy" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Upload de foto do hidrômetro */}
                      <div className="space-y-2">
                        <FormLabel>Foto do Hidrômetro</FormLabel>
                        <div className="flex items-center gap-3">
                          <input
                            ref={waterPhotoInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleWaterPhotoChange}
                            className="hidden"
                            data-testid="input-water-photo"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => waterPhotoInputRef.current?.click()}
                            className="flex items-center gap-2"
                            data-testid="button-water-photo"
                          >
                            <Camera className="h-4 w-4" />
                            {waterPhotoPreview ? "Trocar Foto" : "Adicionar Foto"}
                          </Button>
                          {waterPhotoPreview && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={clearWaterPhoto}
                              data-testid="button-clear-water-photo"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {waterPhotoPreview && (
                          <div className="relative mt-2">
                            <img
                              src={waterPhotoPreview}
                              alt="Preview da foto do hidrômetro"
                              className="w-full max-h-48 object-contain rounded-lg border"
                            />
                          </div>
                        )}
                      </div>

                      <FormField
                        control={waterForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Observações</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Observações adicionais" {...field} data-testid="input-water-notes" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={createWaterReading.isPending || isUploading} data-testid="button-submit-water">
                        {createWaterReading.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Registrar Leitura
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Gráfico de Água */}
            {waterChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Histórico de Nível do Reservatório</CardTitle>
                  <CardDescription>Últimas 30 leituras</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={waterChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="nivel"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.3}
                          name="Nível (%)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lista de leituras */}
            {waterLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : waterReadings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Droplets className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma leitura registrada</h3>
                  <p className="text-muted-foreground text-center">
                    Registre leituras de água para acompanhar o consumo do condomínio.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Histórico de Leituras</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {sortedWaterReadings.slice(0, 20).map((reading) => (
                        <div
                          key={reading.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                          data-testid={`water-reading-${reading.id}`}
                        >
                          <div className="flex items-center gap-3">
                            {reading.photo ? (
                              <img
                                src={reading.photo}
                                alt="Foto do hidrômetro"
                                className="h-12 w-12 object-cover rounded-lg border"
                              />
                            ) : (
                              <div className="p-2 rounded-lg bg-blue-500/10">
                                <Gauge className="h-4 w-4 text-blue-500" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{reading.tankLevel}% - {reading.volumeAvailable}L</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(reading.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {reading.photo && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(reading.photo!, '_blank')}
                                data-testid={`button-view-water-photo-${reading.id}`}
                              >
                                <Image className="h-4 w-4" />
                              </Button>
                            )}
                            {getQualityBadge(reading.quality)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Aba Gás */}
          <TabsContent value="gas" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Leituras de Gás</h3>
              <Dialog open={isGasDialogOpen} onOpenChange={setIsGasDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-gas-reading">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Leitura
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Nova Leitura de Gás</DialogTitle>
                  </DialogHeader>
                  <Form {...gasForm}>
                    <form onSubmit={gasForm.handleSubmit((data) => createGasReading.mutate(data))} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={gasForm.control}
                          name="level"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nível do Tanque (%)</FormLabel>
                              <FormControl>
                                <Input type="number" min={0} max={100} {...field} data-testid="input-gas-level" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={gasForm.control}
                          name="percentAvailable"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Percentual Disponível (%)</FormLabel>
                              <FormControl>
                                <Input type="number" min={0} max={100} {...field} data-testid="input-gas-percent" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      {/* Upload de foto do medidor de gás */}
                      <div className="space-y-2">
                        <FormLabel>Foto do Medidor de Gás</FormLabel>
                        <div className="flex items-center gap-3">
                          <input
                            ref={gasPhotoInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleGasPhotoChange}
                            className="hidden"
                            data-testid="input-gas-photo"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => gasPhotoInputRef.current?.click()}
                            className="flex items-center gap-2"
                            data-testid="button-gas-photo"
                          >
                            <Camera className="h-4 w-4" />
                            {gasPhotoPreview ? "Trocar Foto" : "Adicionar Foto"}
                          </Button>
                          {gasPhotoPreview && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={clearGasPhoto}
                              data-testid="button-clear-gas-photo"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {gasPhotoPreview && (
                          <div className="relative mt-2">
                            <img
                              src={gasPhotoPreview}
                              alt="Preview da foto do medidor de gás"
                              className="w-full max-h-48 object-contain rounded-lg border"
                            />
                          </div>
                        )}
                      </div>

                      <FormField
                        control={gasForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Observações</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Observações adicionais" {...field} data-testid="input-gas-notes" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={createGasReading.isPending || isUploading} data-testid="button-submit-gas">
                        {createGasReading.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Registrar Leitura
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Gráfico de Gás */}
            {gasChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Histórico de Nível de Gás</CardTitle>
                  <CardDescription>Últimas 30 leituras</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={gasChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="percentual"
                          stroke="#f97316"
                          strokeWidth={2}
                          dot={{ fill: "#f97316", strokeWidth: 2 }}
                          name="Disponível (%)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lista de leituras de gás */}
            {gasLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : gasReadings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Flame className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma leitura registrada</h3>
                  <p className="text-muted-foreground text-center">
                    Registre leituras de gás para acompanhar o consumo do condomínio.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Histórico de Leituras</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {sortedGasReadings.slice(0, 20).map((reading) => (
                        <div
                          key={reading.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                          data-testid={`gas-reading-${reading.id}`}
                        >
                          <div className="flex items-center gap-3">
                            {reading.photo ? (
                              <img
                                src={reading.photo}
                                alt="Foto do medidor de gás"
                                className="h-12 w-12 object-cover rounded-lg border"
                              />
                            ) : (
                              <div className="p-2 rounded-lg bg-orange-500/10">
                                <Flame className="h-4 w-4 text-orange-500" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{reading.percentAvailable}% disponível</p>
                              <p className="text-xs text-muted-foreground">
                                Nível: {reading.level}% - {format(new Date(reading.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {reading.photo && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(reading.photo!, '_blank')}
                                data-testid={`button-view-gas-photo-${reading.id}`}
                              >
                                <Image className="h-4 w-4" />
                              </Button>
                            )}
                            {reading.notes && (
                              <p className="text-xs text-muted-foreground max-w-[150px] truncate">{reading.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Aba Energia */}
          <TabsContent value="energy" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Eventos de Energia</h3>
              <Dialog open={isEnergyDialogOpen} onOpenChange={setIsEnergyDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-energy-event">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Evento
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Novo Evento de Energia</DialogTitle>
                  </DialogHeader>
                  <Form {...energyForm}>
                    <form onSubmit={energyForm.handleSubmit((data) => createEnergyEvent.mutate(data))} className="space-y-4">
                      <FormField
                        control={energyForm.control}
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
                                {Object.entries(energyStatusLabels).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={energyForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrição</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Descreva o evento" {...field} data-testid="input-energy-description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={createEnergyEvent.isPending} data-testid="button-submit-energy">
                        {createEnergyEvent.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Registrar Evento
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Gráfico de eventos de energia */}
            {energyBarChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resumo de Eventos por Tipo</CardTitle>
                  <CardDescription>Distribuição dos eventos registrados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={energyBarChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" className="text-xs" />
                        <YAxis dataKey="status" type="category" className="text-xs" width={100} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                        />
                        <Bar
                          dataKey="count"
                          fill="#eab308"
                          radius={[0, 4, 4, 0]}
                          name="Quantidade"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Timeline de eventos de energia */}
            {energyLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : energyEvents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum evento registrado</h3>
                  <p className="text-muted-foreground text-center">
                    Registre eventos de energia para acompanhar o histórico do condomínio.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Histórico de Eventos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {sortedEnergyEvents.slice(0, 30).map((event, index) => (
                        <div
                          key={event.id}
                          className="flex items-start gap-3 p-3 rounded-lg border"
                          data-testid={`energy-event-${event.id}`}
                        >
                          <div className={`p-2 rounded-lg ${event.status === "ok" ? "bg-green-500/10" : "bg-yellow-500/10"}`}>
                            <Zap className={`h-4 w-4 ${event.status === "ok" ? "text-green-500" : "text-yellow-500"}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getEnergyStatusBadge(event.status)}
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(event.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            {event.description && (
                              <p className="text-sm text-muted-foreground">{event.description}</p>
                            )}
                            {event.resolvedAt && (
                              <p className="text-xs text-green-600 mt-1">
                                Resolvido em: {format(new Date(event.resolvedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
