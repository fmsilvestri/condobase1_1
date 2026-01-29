import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Zap, Plus, AlertTriangle, Check, Clock, Calendar, 
  Sun, TrendingUp, TrendingDown, FileText, Upload, Download,
  Trash2, Edit2, Eye, Battery, Leaf
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient, getAuthHeaders } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { EnergyEvent } from "@shared/schema";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface EnergyConsumption {
  id: string;
  condominiumId: string;
  month: number;
  year: number;
  consumptionKwh: number;
  cost: number | null;
  peakConsumptionKwh: number | null;
  offPeakConsumptionKwh: number | null;
  invoiceNumber: string | null;
  invoicePdfUrl: string | null;
  notes: string | null;
  createdAt: string;
}

interface SolarPanel {
  id: string;
  condominiumId: string;
  name: string;
  capacityKw: number;
  installationDate: string | null;
  location: string | null;
  brand: string | null;
  model: string | null;
  notes: string | null;
  isActive: boolean;
}

interface SolarGeneration {
  id: string;
  condominiumId: string;
  solarPanelId: string | null;
  solarPanelName: string | null;
  month: number;
  year: number;
  generationKwh: number;
  injectedKwh: number | null;
  creditsKwh: number | null;
  savings: number | null;
}

interface EnergySummary {
  year: number;
  totalConsumption: number;
  totalCost: number;
  totalGeneration: number;
  totalSavings: number;
  monthlyData: Array<{
    month: number;
    consumptionKwh: number;
    cost: number;
    generationKwh: number;
    savings: number;
  }>;
}

const energyFormSchema = z.object({
  status: z.enum(["ok", "falta de energia", "meia fase"]),
  description: z.string().min(1, "Descrição é obrigatória"),
});

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function Energy() {
  const [activeTab, setActiveTab] = useState("ocorrencias");
  const [isNewEventOpen, setIsNewEventOpen] = useState(false);
  const [isConsumptionOpen, setIsConsumptionOpen] = useState(false);
  const [isSolarPanelOpen, setIsSolarPanelOpen] = useState(false);
  const [isSolarGenerationOpen, setIsSolarGenerationOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { canEdit, dbUserId } = useAuth();
  const { toast } = useToast();

  const [consumptionForm, setConsumptionForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    consumptionKwh: 0,
    cost: 0,
    peakConsumptionKwh: 0,
    offPeakConsumptionKwh: 0,
    invoiceNumber: "",
    notes: "",
  });
  const [consumptionFile, setConsumptionFile] = useState<File | null>(null);

  const [solarPanelForm, setSolarPanelForm] = useState({
    name: "",
    capacityKw: 0,
    installationDate: "",
    location: "",
    brand: "",
    model: "",
    notes: "",
  });

  const [solarGenerationForm, setSolarGenerationForm] = useState({
    solarPanelId: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    generationKwh: 0,
    injectedKwh: 0,
    creditsKwh: 0,
    savings: 0,
    notes: "",
  });

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

  const { data: consumption = [] } = useQuery<EnergyConsumption[]>({
    queryKey: ["/api/energy-consumption", selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/energy-consumption?year=${selectedYear}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Erro ao carregar consumo");
      return res.json();
    },
  });

  const { data: solarPanels = [] } = useQuery<SolarPanel[]>({
    queryKey: ["/api/solar-panels"],
  });

  const { data: solarGeneration = [] } = useQuery<SolarGeneration[]>({
    queryKey: ["/api/solar-generation", selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/solar-generation?year=${selectedYear}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Erro ao carregar geração solar");
      return res.json();
    },
  });

  const { data: summary } = useQuery<EnergySummary>({
    queryKey: ["/api/energy-summary", selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/energy-summary?year=${selectedYear}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Erro ao carregar resumo");
      return res.json();
    },
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

  const createConsumptionMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      Object.entries(consumptionForm).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      if (consumptionFile) {
        formData.append("invoicePdf", consumptionFile);
      }
      const res = await fetch("/api/energy-consumption", {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });
      if (!res.ok) throw new Error("Erro ao salvar consumo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/energy-consumption"] });
      queryClient.invalidateQueries({ queryKey: ["/api/energy-summary"] });
      toast({ title: "Consumo registrado com sucesso!" });
      setIsConsumptionOpen(false);
      setConsumptionForm({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        consumptionKwh: 0,
        cost: 0,
        peakConsumptionKwh: 0,
        offPeakConsumptionKwh: 0,
        invoiceNumber: "",
        notes: "",
      });
      setConsumptionFile(null);
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao registrar consumo", description: error.message, variant: "destructive" });
    },
  });

  const deleteConsumptionMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/energy-consumption/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/energy-consumption"] });
      queryClient.invalidateQueries({ queryKey: ["/api/energy-summary"] });
      toast({ title: "Consumo excluído com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  const createSolarPanelMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/solar-panels", solarPanelForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solar-panels"] });
      toast({ title: "Placa solar cadastrada com sucesso!" });
      setIsSolarPanelOpen(false);
      setSolarPanelForm({ name: "", capacityKw: 0, installationDate: "", location: "", brand: "", model: "", notes: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao cadastrar placa solar", description: error.message, variant: "destructive" });
    },
  });

  const deleteSolarPanelMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/solar-panels/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solar-panels"] });
      toast({ title: "Placa solar excluída com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  const createSolarGenerationMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/solar-generation", solarGenerationForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solar-generation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/energy-summary"] });
      toast({ title: "Geração solar registrada com sucesso!" });
      setIsSolarGenerationOpen(false);
      setSolarGenerationForm({
        solarPanelId: "",
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        generationKwh: 0,
        injectedKwh: 0,
        creditsKwh: 0,
        savings: 0,
        notes: "",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao registrar geração", description: error.message, variant: "destructive" });
    },
  });

  const deleteSolarGenerationMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/solar-generation/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solar-generation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/energy-summary"] });
      toast({ title: "Registro excluído com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  const latestEvent = events[0];
  const currentStatus = latestEvent?.status || "ok";
  const totalOutages = events.filter((e) => e.status !== "ok").length;

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const chartData = summary?.monthlyData.map((m) => ({
    month: monthNames[m.month - 1],
    consumo: m.consumptionKwh,
    geracao: m.generationKwh,
    custo: m.cost,
    economia: m.savings,
  })) || [];

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    doc.setFontSize(18);
    doc.text("Relatório de Energia", pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Ano: ${selectedYear}`, pageWidth / 2, 28, { align: "center" });
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, pageWidth / 2, 34, { align: "center" });

    doc.setFontSize(14);
    doc.text("Resumo Anual", 14, 50);

    autoTable(doc, {
      startY: 55,
      head: [["Métrica", "Valor"]],
      body: [
        ["Consumo Total", `${summary?.totalConsumption?.toLocaleString("pt-BR") || 0} kWh`],
        ["Custo Total", formatCurrency(summary?.totalCost || 0)],
        ["Geração Solar Total", `${summary?.totalGeneration?.toLocaleString("pt-BR") || 0} kWh`],
        ["Economia com Solar", formatCurrency(summary?.totalSavings || 0)],
      ],
      theme: "grid",
      headStyles: { fillColor: [99, 102, 241] },
    });

    const finalY1 = (doc as any).lastAutoTable.finalY + 15;
    doc.text("Consumo Mensal", 14, finalY1);

    autoTable(doc, {
      startY: finalY1 + 5,
      head: [["Mês", "Consumo (kWh)", "Custo (R$)", "Geração Solar (kWh)", "Economia (R$)"]],
      body: consumption.map((c) => [
        `${monthNames[c.month - 1]}/${c.year}`,
        c.consumptionKwh.toLocaleString("pt-BR"),
        formatCurrency(c.cost || 0),
        solarGeneration.find((g) => g.month === c.month)?.generationKwh?.toLocaleString("pt-BR") || "0",
        formatCurrency(solarGeneration.find((g) => g.month === c.month)?.savings || 0),
      ]),
      theme: "striped",
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 8 },
    });

    if (solarPanels.length > 0) {
      const finalY2 = (doc as any).lastAutoTable.finalY + 15;
      doc.text("Placas Solares Instaladas", 14, finalY2);

      autoTable(doc, {
        startY: finalY2 + 5,
        head: [["Nome", "Capacidade (kW)", "Localização", "Marca/Modelo"]],
        body: solarPanels.map((p) => [
          p.name,
          p.capacityKw.toLocaleString("pt-BR"),
          p.location || "-",
          `${p.brand || ""} ${p.model || ""}`.trim() || "-",
        ]),
        theme: "grid",
        headStyles: { fillColor: [34, 197, 94] },
      });
    }

    doc.save(`relatorio-energia-${selectedYear}.pdf`);
    toast({ title: "PDF gerado com sucesso!" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Energia"
        description="Monitoramento de energia, consumo e geração solar"
        backHref="/"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={generatePDF} data-testid="button-generate-pdf">
              <FileText className="w-4 h-4 mr-2" />
              Gerar PDF
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Status Atual"
          value={getStatusLabel(currentStatus)}
          icon={currentStatus === "ok" ? Check : AlertTriangle}
          color={currentStatus === "ok" ? "green" : currentStatus === "falta de energia" ? "red" : "amber"}
          testId="stat-energy-status"
        />
        <StatCard
          title="Consumo Total (Ano)"
          value={`${(summary?.totalConsumption || 0).toLocaleString("pt-BR")} kWh`}
          icon={Zap}
          color="amber"
          testId="stat-consumption"
        />
        <StatCard
          title="Geração Solar (Ano)"
          value={`${(summary?.totalGeneration || 0).toLocaleString("pt-BR")} kWh`}
          icon={Sun}
          color="green"
          testId="stat-generation"
        />
        <StatCard
          title="Economia (Ano)"
          value={formatCurrency(summary?.totalSavings || 0)}
          icon={Leaf}
          color="purple"
          testId="stat-savings"
        />
      </div>

      <div className="flex items-center gap-4">
        <Label>Ano:</Label>
        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-32" data-testid="select-year">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ocorrencias" data-testid="tab-ocorrencias">Ocorrências</TabsTrigger>
          <TabsTrigger value="consumo" data-testid="tab-consumo">Consumo</TabsTrigger>
          <TabsTrigger value="solar" data-testid="tab-solar">Placa Solar</TabsTrigger>
          <TabsTrigger value="graficos" data-testid="tab-graficos">Gráficos</TabsTrigger>
        </TabsList>

        <TabsContent value="ocorrencias" className="space-y-4">
          <div className="flex justify-end">
            {canEdit && (
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
            )}
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
        </TabsContent>

        <TabsContent value="consumo" className="space-y-4">
          <div className="flex justify-end">
            {canEdit && (
              <Dialog open={isConsumptionOpen} onOpenChange={setIsConsumptionOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-consumption">
                    <Plus className="mr-2 h-4 w-4" />
                    Registrar Consumo
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Registrar Consumo de Energia</DialogTitle>
                    <DialogDescription>
                      Insira os dados da conta de luz do mês.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Mês</Label>
                        <Select 
                          value={String(consumptionForm.month)} 
                          onValueChange={(v) => setConsumptionForm({ ...consumptionForm, month: parseInt(v) })}
                        >
                          <SelectTrigger data-testid="select-consumption-month">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {monthNames.map((m, i) => (
                              <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Ano</Label>
                        <Input
                          type="number"
                          value={consumptionForm.year}
                          onChange={(e) => setConsumptionForm({ ...consumptionForm, year: parseInt(e.target.value) })}
                          data-testid="input-consumption-year"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Consumo Total (kWh)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={consumptionForm.consumptionKwh}
                          onChange={(e) => setConsumptionForm({ ...consumptionForm, consumptionKwh: parseFloat(e.target.value) || 0 })}
                          data-testid="input-consumption-kwh"
                        />
                      </div>
                      <div>
                        <Label>Custo Total (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={consumptionForm.cost}
                          onChange={(e) => setConsumptionForm({ ...consumptionForm, cost: parseFloat(e.target.value) || 0 })}
                          data-testid="input-consumption-cost"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Consumo Ponta (kWh)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={consumptionForm.peakConsumptionKwh}
                          onChange={(e) => setConsumptionForm({ ...consumptionForm, peakConsumptionKwh: parseFloat(e.target.value) || 0 })}
                          data-testid="input-peak-consumption"
                        />
                      </div>
                      <div>
                        <Label>Consumo Fora Ponta (kWh)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={consumptionForm.offPeakConsumptionKwh}
                          onChange={(e) => setConsumptionForm({ ...consumptionForm, offPeakConsumptionKwh: parseFloat(e.target.value) || 0 })}
                          data-testid="input-off-peak-consumption"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Número da Fatura</Label>
                      <Input
                        value={consumptionForm.invoiceNumber}
                        onChange={(e) => setConsumptionForm({ ...consumptionForm, invoiceNumber: e.target.value })}
                        data-testid="input-invoice-number"
                      />
                    </div>
                    <div>
                      <Label>PDF da Conta de Luz</Label>
                      <Input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setConsumptionFile(e.target.files?.[0] || null)}
                        data-testid="input-invoice-pdf"
                      />
                    </div>
                    <div>
                      <Label>Observações</Label>
                      <Textarea
                        value={consumptionForm.notes}
                        onChange={(e) => setConsumptionForm({ ...consumptionForm, notes: e.target.value })}
                        data-testid="textarea-consumption-notes"
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsConsumptionOpen(false)}>Cancelar</Button>
                      <Button 
                        onClick={() => createConsumptionMutation.mutate()}
                        disabled={createConsumptionMutation.isPending}
                        data-testid="button-save-consumption"
                      >
                        {createConsumptionMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Histórico de Consumo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {consumption.length === 0 ? (
                <EmptyState
                  icon={Zap}
                  title="Nenhum registro de consumo"
                  description="Registre o consumo mensal de energia."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mês/Ano</TableHead>
                      <TableHead>Consumo (kWh)</TableHead>
                      <TableHead>Custo</TableHead>
                      <TableHead>Ponta</TableHead>
                      <TableHead>Fora Ponta</TableHead>
                      <TableHead>Fatura</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consumption.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{monthNames[c.month - 1]}/{c.year}</TableCell>
                        <TableCell>{c.consumptionKwh.toLocaleString("pt-BR")}</TableCell>
                        <TableCell>{formatCurrency(c.cost || 0)}</TableCell>
                        <TableCell>{c.peakConsumptionKwh?.toLocaleString("pt-BR") || "-"}</TableCell>
                        <TableCell>{c.offPeakConsumptionKwh?.toLocaleString("pt-BR") || "-"}</TableCell>
                        <TableCell>
                          {c.invoicePdfUrl ? (
                            <a href={c.invoicePdfUrl} target="_blank" rel="noopener noreferrer">
                              <Button size="icon" variant="ghost">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </a>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => deleteConsumptionMutation.mutate(c.id)}
                            data-testid={`button-delete-consumption-${c.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="solar" className="space-y-4">
          <div className="flex flex-wrap gap-2 justify-end">
            {canEdit && (
              <>
                <Dialog open={isSolarPanelOpen} onOpenChange={setIsSolarPanelOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" data-testid="button-new-solar-panel">
                      <Sun className="mr-2 h-4 w-4" />
                      Nova Placa Solar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Cadastrar Placa Solar</DialogTitle>
                      <DialogDescription>
                        Adicione uma nova placa fotovoltaica ao sistema.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nome/Identificação</Label>
                        <Input
                          value={solarPanelForm.name}
                          onChange={(e) => setSolarPanelForm({ ...solarPanelForm, name: e.target.value })}
                          placeholder="Ex: Placa Bloco A"
                          data-testid="input-solar-name"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Capacidade (kW)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={solarPanelForm.capacityKw}
                            onChange={(e) => setSolarPanelForm({ ...solarPanelForm, capacityKw: parseFloat(e.target.value) || 0 })}
                            data-testid="input-solar-capacity"
                          />
                        </div>
                        <div>
                          <Label>Data de Instalação</Label>
                          <Input
                            type="date"
                            value={solarPanelForm.installationDate}
                            onChange={(e) => setSolarPanelForm({ ...solarPanelForm, installationDate: e.target.value })}
                            data-testid="input-solar-date"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Localização</Label>
                        <Input
                          value={solarPanelForm.location}
                          onChange={(e) => setSolarPanelForm({ ...solarPanelForm, location: e.target.value })}
                          placeholder="Ex: Telhado Bloco A"
                          data-testid="input-solar-location"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Marca</Label>
                          <Input
                            value={solarPanelForm.brand}
                            onChange={(e) => setSolarPanelForm({ ...solarPanelForm, brand: e.target.value })}
                            data-testid="input-solar-brand"
                          />
                        </div>
                        <div>
                          <Label>Modelo</Label>
                          <Input
                            value={solarPanelForm.model}
                            onChange={(e) => setSolarPanelForm({ ...solarPanelForm, model: e.target.value })}
                            data-testid="input-solar-model"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Observações</Label>
                        <Textarea
                          value={solarPanelForm.notes}
                          onChange={(e) => setSolarPanelForm({ ...solarPanelForm, notes: e.target.value })}
                          data-testid="textarea-solar-notes"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSolarPanelOpen(false)}>Cancelar</Button>
                        <Button 
                          onClick={() => createSolarPanelMutation.mutate()}
                          disabled={createSolarPanelMutation.isPending || !solarPanelForm.name}
                          data-testid="button-save-solar-panel"
                        >
                          {createSolarPanelMutation.isPending ? "Salvando..." : "Salvar"}
                        </Button>
                      </DialogFooter>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={isSolarGenerationOpen} onOpenChange={setIsSolarGenerationOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-new-solar-generation">
                      <Plus className="mr-2 h-4 w-4" />
                      Registrar Geração
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Registrar Geração Solar</DialogTitle>
                      <DialogDescription>
                        Insira os dados de geração de energia solar do mês.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Placa Solar</Label>
                        <Select
                          value={solarGenerationForm.solarPanelId}
                          onValueChange={(v) => setSolarGenerationForm({ ...solarGenerationForm, solarPanelId: v })}
                        >
                          <SelectTrigger data-testid="select-solar-panel">
                            <SelectValue placeholder="Selecione a placa" />
                          </SelectTrigger>
                          <SelectContent>
                            {solarPanels.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Mês</Label>
                          <Select
                            value={String(solarGenerationForm.month)}
                            onValueChange={(v) => setSolarGenerationForm({ ...solarGenerationForm, month: parseInt(v) })}
                          >
                            <SelectTrigger data-testid="select-generation-month">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {monthNames.map((m, i) => (
                                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Ano</Label>
                          <Input
                            type="number"
                            value={solarGenerationForm.year}
                            onChange={(e) => setSolarGenerationForm({ ...solarGenerationForm, year: parseInt(e.target.value) })}
                            data-testid="input-generation-year"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Geração Total (kWh)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={solarGenerationForm.generationKwh}
                            onChange={(e) => setSolarGenerationForm({ ...solarGenerationForm, generationKwh: parseFloat(e.target.value) || 0 })}
                            data-testid="input-generation-kwh"
                          />
                        </div>
                        <div>
                          <Label>Energia Injetada (kWh)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={solarGenerationForm.injectedKwh}
                            onChange={(e) => setSolarGenerationForm({ ...solarGenerationForm, injectedKwh: parseFloat(e.target.value) || 0 })}
                            data-testid="input-injected-kwh"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Créditos (kWh)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={solarGenerationForm.creditsKwh}
                            onChange={(e) => setSolarGenerationForm({ ...solarGenerationForm, creditsKwh: parseFloat(e.target.value) || 0 })}
                            data-testid="input-credits-kwh"
                          />
                        </div>
                        <div>
                          <Label>Economia (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={solarGenerationForm.savings}
                            onChange={(e) => setSolarGenerationForm({ ...solarGenerationForm, savings: parseFloat(e.target.value) || 0 })}
                            data-testid="input-savings"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSolarGenerationOpen(false)}>Cancelar</Button>
                        <Button 
                          onClick={() => createSolarGenerationMutation.mutate()}
                          disabled={createSolarGenerationMutation.isPending}
                          data-testid="button-save-solar-generation"
                        >
                          {createSolarGenerationMutation.isPending ? "Salvando..." : "Salvar"}
                        </Button>
                      </DialogFooter>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="h-5 w-5" />
                Placas Solares Instaladas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {solarPanels.length === 0 ? (
                <EmptyState
                  icon={Sun}
                  title="Nenhuma placa solar cadastrada"
                  description="Cadastre as placas fotovoltaicas do condomínio."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {solarPanels.map((panel) => (
                    <Card key={panel.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                              <Sun className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-semibold">{panel.name}</p>
                              <p className="text-sm text-muted-foreground">{panel.capacityKw} kW</p>
                            </div>
                          </div>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => deleteSolarPanelMutation.mutate(panel.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                        <div className="mt-3 text-sm text-muted-foreground space-y-1">
                          {panel.location && <p>Local: {panel.location}</p>}
                          {panel.brand && <p>Marca: {panel.brand} {panel.model}</p>}
                          {panel.installationDate && (
                            <p>Instalação: {format(new Date(panel.installationDate), "dd/MM/yyyy")}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Battery className="h-5 w-5" />
                Histórico de Geração Solar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {solarGeneration.length === 0 ? (
                <EmptyState
                  icon={Sun}
                  title="Nenhum registro de geração"
                  description="Registre a geração mensal de energia solar."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mês/Ano</TableHead>
                      <TableHead>Placa</TableHead>
                      <TableHead>Geração (kWh)</TableHead>
                      <TableHead>Injetada (kWh)</TableHead>
                      <TableHead>Créditos (kWh)</TableHead>
                      <TableHead>Economia</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {solarGeneration.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell>{monthNames[g.month - 1]}/{g.year}</TableCell>
                        <TableCell>{g.solarPanelName || "-"}</TableCell>
                        <TableCell>{g.generationKwh.toLocaleString("pt-BR")}</TableCell>
                        <TableCell>{g.injectedKwh?.toLocaleString("pt-BR") || "-"}</TableCell>
                        <TableCell>{g.creditsKwh?.toLocaleString("pt-BR") || "-"}</TableCell>
                        <TableCell>{formatCurrency(g.savings || 0)}</TableCell>
                        <TableCell>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => deleteSolarGenerationMutation.mutate(g.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="graficos" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Consumo vs Geração Solar
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <EmptyState
                    icon={TrendingUp}
                    title="Sem dados para exibir"
                    description="Registre o consumo e geração para visualizar o gráfico."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `${value.toLocaleString("pt-BR")} kWh`} />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="consumo" 
                        name="Consumo" 
                        stroke="#f59e0b" 
                        fill="#f59e0b" 
                        fillOpacity={0.3} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="geracao" 
                        name="Geração Solar" 
                        stroke="#22c55e" 
                        fill="#22c55e" 
                        fillOpacity={0.3} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  Custo vs Economia
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <EmptyState
                    icon={TrendingDown}
                    title="Sem dados para exibir"
                    description="Registre o consumo e geração para visualizar o gráfico."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="custo" name="Custo" fill="#ef4444" />
                      <Bar dataKey="economia" name="Economia" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
