import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCondominium } from "@/hooks/use-condominium";
import { format, differenceInDays, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarCheck,
  Plus,
  Settings,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wrench,
  FileText,
  History,
  BarChart3,
  Building,
  Truck,
  Calendar,
  ClipboardList,
  Bell,
  Download,
  ChevronRight,
  Search,
  Filter,
  MoreHorizontal,
  Trash2,
  Edit,
  Eye,
  Camera,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  type Equipment,
  type MaintenancePlan,
  type MaintenanceExecution,
  type Supplier,
  equipmentCategories,
  equipmentStatuses,
  maintenanceTypes,
  maintenancePeriodicities,
} from "@shared/schema";

function Icon3D({ icon: IconComponent, color }: { icon: any; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: "from-blue-500 to-blue-600 shadow-blue-500/30",
    green: "from-green-500 to-green-600 shadow-green-500/30",
    orange: "from-orange-500 to-orange-600 shadow-orange-500/30",
    red: "from-red-500 to-red-600 shadow-red-500/30",
    purple: "from-purple-500 to-purple-600 shadow-purple-500/30",
    yellow: "from-yellow-500 to-yellow-600 shadow-yellow-500/30",
    cyan: "from-cyan-500 to-cyan-600 shadow-cyan-500/30",
    indigo: "from-indigo-500 to-indigo-600 shadow-indigo-500/30",
  };

  return (
    <div
      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color] || colorClasses.blue} shadow-lg flex items-center justify-center transform hover:scale-105 transition-transform`}
      style={{ perspective: "1000px", transform: "rotateX(5deg) rotateY(-5deg)" }}
    >
      <IconComponent className="w-6 h-6 text-white" />
    </div>
  );
}

const categoryIcons: Record<string, { icon: any; color: string }> = {
  "elétrico": { icon: Settings, color: "yellow" },
  "hidráulico": { icon: Wrench, color: "blue" },
  "piscina": { icon: Wrench, color: "cyan" },
  "elevadores": { icon: Building, color: "blue" },
  "cisternas": { icon: Wrench, color: "blue" },
  "bombas": { icon: Wrench, color: "cyan" },
  "academia": { icon: CalendarCheck, color: "green" },
  "brinquedoteca": { icon: CalendarCheck, color: "purple" },
  "pet place": { icon: CalendarCheck, color: "orange" },
  "campo": { icon: CalendarCheck, color: "green" },
  "portas": { icon: Building, color: "indigo" },
  "portões": { icon: Building, color: "indigo" },
  "acessos": { icon: Bell, color: "red" },
  "pintura": { icon: Wrench, color: "purple" },
  "reboco": { icon: Building, color: "orange" },
  "limpeza": { icon: Wrench, color: "cyan" },
  "pisos": { icon: Building, color: "purple" },
  "jardim": { icon: CalendarCheck, color: "green" },
};

export default function PreventiveMaintenance() {
  const { toast } = useToast();
  const { selectedCondominium } = useCondominium();
  const [activeTab, setActiveTab] = useState("assets");
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [executionDialogOpen, setExecutionDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Equipment | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<MaintenancePlan | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: assets = [], isLoading: assetsLoading } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment"],
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery<MaintenancePlan[]>({
    queryKey: ["/api/maintenance-plans"],
  });

  const { data: executions = [], isLoading: executionsLoading } = useQuery<MaintenanceExecution[]>({
    queryKey: ["/api/maintenance-executions"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const createAssetMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/equipment", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      setAssetDialogOpen(false);
      toast({ title: "Ativo cadastrado com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao cadastrar ativo", description: error.message, variant: "destructive" });
    },
  });

  const updateAssetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PATCH", `/api/equipment/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      setAssetDialogOpen(false);
      setSelectedAsset(null);
      toast({ title: "Ativo atualizado com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar ativo", description: error.message, variant: "destructive" });
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/equipment/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({ title: "Ativo excluído com sucesso!" });
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/maintenance-plans", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-plans"] });
      setPlanDialogOpen(false);
      toast({ title: "Plano de manutenção criado com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar plano", description: error.message, variant: "destructive" });
    },
  });

  const createExecutionMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/maintenance-executions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-executions"] });
      setExecutionDialogOpen(false);
      toast({ title: "Manutenção registrada com sucesso!" });
    },
  });

  const updateExecutionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PATCH", `/api/maintenance-executions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-executions"] });
      toast({ title: "Manutenção atualizada!" });
    },
  });

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || asset.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const upcomingMaintenances = plans.filter((plan) => {
    if (!plan.nextMaintenanceDate || !plan.isActive) return false;
    const daysUntil = differenceInDays(new Date(plan.nextMaintenanceDate), new Date());
    return daysUntil >= 0 && daysUntil <= 30;
  });

  const overdueMaintenances = plans.filter((plan) => {
    if (!plan.nextMaintenanceDate || !plan.isActive) return false;
    const daysUntil = differenceInDays(new Date(plan.nextMaintenanceDate), new Date());
    return daysUntil < 0;
  });

  const criticalAssets = assets.filter((asset) => {
    const assetPlans = plans.filter((p) => p.equipmentId === asset.id && p.isActive);
    return assetPlans.some((p) => {
      if (!p.nextMaintenanceDate) return false;
      const daysUntil = differenceInDays(new Date(p.nextMaintenanceDate), new Date());
      return daysUntil < 0;
    });
  });

  const completedThisMonth = executions.filter((e) => {
    if (!e.executedDate || e.status !== "concluído") return false;
    const execDate = new Date(e.executedDate);
    const now = new Date();
    return execDate.getMonth() === now.getMonth() && execDate.getFullYear() === now.getFullYear();
  });

  const preventiveCount = executions.filter((e) => e.maintenanceType === "preventiva").length;
  const correctiveCount = executions.filter((e) => e.maintenanceType === "corretiva").length;

  const handleAssetSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCondominium) {
      toast({ title: "Selecione um condominio primeiro", variant: "destructive" });
      return;
    }
    const formData = new FormData(e.currentTarget);
    const supplierIdValue = formData.get("supplierId") as string;
    const data = {
      condominiumId: selectedCondominium,
      name: formData.get("name") as string,
      category: formData.get("category") as string,
      location: formData.get("location") as string,
      manufacturer: formData.get("manufacturer") as string || null,
      installationDate: formData.get("installationDate") ? new Date(formData.get("installationDate") as string).toISOString() : null,
      estimatedLifespan: formData.get("estimatedLifespan") ? parseInt(formData.get("estimatedLifespan") as string) : null,
      powerConsumption: formData.get("powerConsumption") ? parseFloat(formData.get("powerConsumption") as string) : null,
      estimatedUsageHours: formData.get("estimatedUsageHours") ? parseFloat(formData.get("estimatedUsageHours") as string) : null,
      status: formData.get("status") as string || "ativo",
      supplierId: supplierIdValue && supplierIdValue !== "none" ? supplierIdValue : null,
      notes: formData.get("notes") as string || null,
    };

    if (selectedAsset) {
      updateAssetMutation.mutate({ id: selectedAsset.id, data });
    } else {
      createAssetMutation.mutate(data);
    }
  };

  const handlePlanSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCondominium) {
      toast({ title: "Selecione um condominio primeiro", variant: "destructive" });
      return;
    }
    const formData = new FormData(e.currentTarget);
    const periodicity = formData.get("periodicity") as string;
    const nextDate = new Date(formData.get("nextMaintenanceDate") as string);

    const data = {
      condominiumId: selectedCondominium,
      equipmentId: formData.get("equipmentId") as string,
      name: formData.get("name") as string,
      maintenanceType: formData.get("maintenanceType") as string,
      periodicity,
      nextMaintenanceDate: nextDate.toISOString(),
      responsibleType: formData.get("responsibleType") as string || "interno",
      responsibleName: formData.get("responsibleName") as string || null,
      responsibleId: formData.get("responsibleId") as string || null,
      estimatedCost: formData.get("estimatedCost") ? parseFloat(formData.get("estimatedCost") as string) : null,
      alertDaysBefore: formData.get("alertDaysBefore") ? parseInt(formData.get("alertDaysBefore") as string) : 7,
      notes: formData.get("notes") as string || null,
      isActive: true,
    };

    createPlanMutation.mutate(data);
  };

  const handleExecutionSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCondominium) {
      toast({ title: "Selecione um condominio primeiro", variant: "destructive" });
      return;
    }
    const formData = new FormData(e.currentTarget);
    const data = {
      condominiumId: selectedCondominium,
      equipmentId: formData.get("equipmentId") as string,
      planId: formData.get("planId") as string || null,
      maintenanceType: formData.get("maintenanceType") as string,
      scheduledDate: new Date(formData.get("scheduledDate") as string).toISOString(),
      executedDate: formData.get("executedDate") ? new Date(formData.get("executedDate") as string).toISOString() : null,
      status: formData.get("status") as string || "pendente",
      responsibleName: formData.get("responsibleName") as string || null,
      cost: formData.get("cost") ? parseFloat(formData.get("cost") as string) : null,
      notes: formData.get("notes") as string || null,
    };

    createExecutionMutation.mutate(data);
  };

  const getAssetName = (equipmentId: string) => {
    const asset = assets.find((a) => a.id === equipmentId);
    return asset?.name || "Ativo desconhecido";
  };

  const getDaysUntilMaintenance = (date: Date | string | null) => {
    if (!date) return null;
    return differenceInDays(new Date(date), new Date());
  };

  const getMaintenanceStatusBadge = (daysUntil: number | null) => {
    if (daysUntil === null) return <Badge variant="outline">Não agendada</Badge>;
    if (daysUntil < 0) return <Badge variant="destructive">Vencida ({Math.abs(daysUntil)} dias)</Badge>;
    if (daysUntil <= 7) return <Badge className="bg-orange-500 hover:bg-orange-600">Em {daysUntil} dias</Badge>;
    if (daysUntil <= 30) return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">Em {daysUntil} dias</Badge>;
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Em {daysUntil} dias</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Icon3D icon={CalendarCheck} color="indigo" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Manutenção Preventiva</h1>
            <p className="text-muted-foreground">Gestão de ativos, planos e histórico de manutenções</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-elevate">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Icon3D icon={Building} color="blue" />
              <div>
                <p className="text-sm text-muted-foreground">Ativos Cadastrados</p>
                <p className="text-2xl font-bold">{assets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Icon3D icon={AlertTriangle} color="orange" />
              <div>
                <p className="text-sm text-muted-foreground">Manutenções Pendentes</p>
                <p className="text-2xl font-bold">{upcomingMaintenances.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Icon3D icon={XCircle} color="red" />
              <div>
                <p className="text-sm text-muted-foreground">Manutenções Vencidas</p>
                <p className="text-2xl font-bold">{overdueMaintenances.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Icon3D icon={CheckCircle2} color="green" />
              <div>
                <p className="text-sm text-muted-foreground">Realizadas (mês)</p>
                <p className="text-2xl font-bold">{completedThisMonth.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="assets" className="flex items-center gap-2" data-testid="tab-assets">
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">Ativos</span>
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2" data-testid="tab-plans">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Planos</span>
          </TabsTrigger>
          <TabsTrigger value="executions" className="flex items-center gap-2" data-testid="tab-executions">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Execuções</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2" data-testid="tab-alerts">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Alertas</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2" data-testid="tab-history">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2" data-testid="tab-reports">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Relatórios</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar ativos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full sm:w-64"
                  data-testid="input-search-assets"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-40" data-testid="select-category-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {equipmentCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Dialog open={assetDialogOpen} onOpenChange={(open) => {
                setAssetDialogOpen(open);
                if (!open) setSelectedAsset(null);
              }}>
              <DialogTrigger asChild>
                <Button onClick={() => setSelectedAsset(null)} data-testid="button-add-asset">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Ativo
                </Button>
              </DialogTrigger>
              <DialogContent key={selectedAsset?.id || "new"} className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{selectedAsset ? "Editar Ativo" : "Cadastrar Novo Ativo"}</DialogTitle>
                  <DialogDescription>
                    Preencha as informações do ativo para controle de manutenção preventiva.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAssetSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Ativo *</Label>
                      <Input
                        id="name"
                        name="name"
                        required
                        defaultValue={selectedAsset?.name || ""}
                        placeholder="Ex: Elevador Social Bloco A"
                        data-testid="input-asset-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Categoria *</Label>
                      <Select name="category" defaultValue={selectedAsset?.category || ""} required>
                        <SelectTrigger data-testid="select-asset-category">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {equipmentCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Localização *</Label>
                      <Input
                        id="location"
                        name="location"
                        required
                        defaultValue={selectedAsset?.location || ""}
                        placeholder="Ex: Casa de Máquinas"
                        data-testid="input-asset-location"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manufacturer">Fabricante</Label>
                      <Input
                        id="manufacturer"
                        name="manufacturer"
                        defaultValue={selectedAsset?.manufacturer || ""}
                        placeholder="Ex: ThyssenKrupp"
                        data-testid="input-asset-manufacturer"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="installationDate">Data de Instalação</Label>
                      <Input
                        id="installationDate"
                        name="installationDate"
                        type="date"
                        defaultValue={selectedAsset?.installationDate ? format(new Date(selectedAsset.installationDate), "yyyy-MM-dd") : ""}
                        data-testid="input-asset-installation-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estimatedLifespan">Vida Útil Estimada (meses)</Label>
                      <Input
                        id="estimatedLifespan"
                        name="estimatedLifespan"
                        type="number"
                        defaultValue={selectedAsset?.estimatedLifespan || ""}
                        placeholder="Ex: 120"
                        data-testid="input-asset-lifespan"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="powerConsumption">Consumo Elétrico (kWh)</Label>
                      <Input
                        id="powerConsumption"
                        name="powerConsumption"
                        type="number"
                        step="0.01"
                        defaultValue={selectedAsset?.powerConsumption || ""}
                        placeholder="Ex: 2.5"
                        data-testid="input-asset-power-consumption"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estimatedUsageHours">Horas de Uso Estimadas/Dia</Label>
                      <Input
                        id="estimatedUsageHours"
                        name="estimatedUsageHours"
                        type="number"
                        step="0.5"
                        defaultValue={selectedAsset?.estimatedUsageHours || ""}
                        placeholder="Ex: 8"
                        data-testid="input-asset-usage-hours"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select name="status" defaultValue={selectedAsset?.status || "ativo"}>
                        <SelectTrigger data-testid="select-asset-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {equipmentStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supplierId">Fornecedor Responsável</Label>
                      <Select name="supplierId" defaultValue={selectedAsset?.supplierId || "none"}>
                        <SelectTrigger data-testid="select-asset-supplier">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      defaultValue={selectedAsset?.notes || ""}
                      placeholder="Informações adicionais sobre o ativo..."
                      data-testid="textarea-asset-notes"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setAssetDialogOpen(false)} data-testid="button-cancel-asset">
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createAssetMutation.isPending || updateAssetMutation.isPending} data-testid="button-save-asset">
                      {createAssetMutation.isPending || updateAssetMutation.isPending ? "Salvando..." : selectedAsset ? "Atualizar" : "Cadastrar"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {assetsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredAssets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum ativo cadastrado</p>
                <p className="text-sm text-muted-foreground">Clique em "Novo Ativo" para começar.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssets.map((asset) => {
                const assetPlans = plans.filter((p) => p.equipmentId === asset.id && p.isActive);
                const nextMaintenance = assetPlans.reduce((earliest, plan) => {
                  if (!plan.nextMaintenanceDate) return earliest;
                  if (!earliest) return plan;
                  return new Date(plan.nextMaintenanceDate) < new Date(earliest.nextMaintenanceDate!) ? plan : earliest;
                }, null as MaintenancePlan | null);
                const daysUntil = getDaysUntilMaintenance(nextMaintenance?.nextMaintenanceDate || null);
                const iconConfig = categoryIcons[asset.category] || { icon: Wrench, color: "blue" };

                return (
                  <Card key={asset.id} className="hover-elevate" data-testid={`card-asset-${asset.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <Icon3D icon={iconConfig.icon} color={iconConfig.color} />
                          <div>
                            <CardTitle className="text-lg">{asset.name}</CardTitle>
                            <CardDescription>{asset.location}</CardDescription>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-asset-menu-${asset.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedAsset(asset); setAssetDialogOpen(true); }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (confirm("Tem certeza que deseja excluir este ativo?")) {
                                  deleteAssetMutation.mutate(asset.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{asset.category}</Badge>
                        <Badge variant={asset.status === "ativo" ? "default" : "secondary"}>
                          {asset.status}
                        </Badge>
                      </div>
                      {asset.manufacturer && (
                        <p className="text-sm text-muted-foreground">
                          Fabricante: {asset.manufacturer}
                        </p>
                      )}
                      {(asset.powerConsumption || asset.estimatedUsageHours) && (
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                          {asset.powerConsumption && (
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {asset.powerConsumption} kWh
                            </span>
                          )}
                          {asset.estimatedUsageHours && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {asset.estimatedUsageHours}h/dia
                            </span>
                          )}
                          {asset.powerConsumption && asset.estimatedUsageHours && (
                            <span className="text-xs">
                              (~{(asset.powerConsumption * asset.estimatedUsageHours * 30).toFixed(0)} kWh/mês)
                            </span>
                          )}
                        </div>
                      )}
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Próxima manutenção:</span>
                        {getMaintenanceStatusBadge(daysUntil)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {assetPlans.length} plano(s) de manutenção ativo(s)
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Planos de Manutenção</h3>
            <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-plan">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Plano
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Criar Plano de Manutenção</DialogTitle>
                  <DialogDescription>
                    Configure um plano de manutenção preventiva para um ativo.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePlanSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="assetId">Equipamento *</Label>
                      <Select name="equipmentId" required>
                        <SelectTrigger data-testid="select-plan-asset">
                          <SelectValue placeholder="Selecione o equipamento" />
                        </SelectTrigger>
                        <SelectContent>
                          {assets.filter((a) => a.status !== "inativo").map((asset) => (
                            <SelectItem key={asset.id} value={asset.id}>
                              {asset.name} - {asset.location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="planName">Nome do Plano *</Label>
                      <Input
                        id="planName"
                        name="name"
                        required
                        placeholder="Ex: Revisão mensal do elevador"
                        data-testid="input-plan-name"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maintenanceType">Tipo de Manutenção *</Label>
                      <Select name="maintenanceType" defaultValue="preventiva" required>
                        <SelectTrigger data-testid="select-plan-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {maintenanceTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="periodicity">Periodicidade *</Label>
                      <Select name="periodicity" defaultValue="mensal" required>
                        <SelectTrigger data-testid="select-plan-periodicity">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {maintenancePeriodicities.map((period) => (
                            <SelectItem key={period} value={period}>
                              {period.charAt(0).toUpperCase() + period.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nextMaintenanceDate">Próxima Manutenção *</Label>
                      <Input
                        id="nextMaintenanceDate"
                        name="nextMaintenanceDate"
                        type="date"
                        required
                        data-testid="input-plan-next-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alertDaysBefore">Alertar X dias antes</Label>
                      <Input
                        id="alertDaysBefore"
                        name="alertDaysBefore"
                        type="number"
                        defaultValue="7"
                        data-testid="input-plan-alert-days"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="responsibleType">Tipo de Responsável</Label>
                      <Select name="responsibleType" defaultValue="interno">
                        <SelectTrigger data-testid="select-plan-responsible-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="interno">Interno</SelectItem>
                          <SelectItem value="fornecedor">Fornecedor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="responsibleName">Nome do Responsável</Label>
                      <Input
                        id="responsibleName"
                        name="responsibleName"
                        placeholder="Ex: João da Silva"
                        data-testid="input-plan-responsible-name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimatedCost">Custo Estimado (R$)</Label>
                    <Input
                      id="estimatedCost"
                      name="estimatedCost"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      data-testid="input-plan-estimated-cost"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="planNotes">Observações</Label>
                    <Textarea
                      id="planNotes"
                      name="notes"
                      placeholder="Instruções ou observações sobre a manutenção..."
                      data-testid="textarea-plan-notes"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setPlanDialogOpen(false)} data-testid="button-cancel-plan">
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createPlanMutation.isPending} data-testid="button-save-plan">
                      {createPlanMutation.isPending ? "Criando..." : "Criar Plano"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {plansLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : plans.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum plano de manutenção cadastrado</p>
                <p className="text-sm text-muted-foreground">Crie planos para automatizar a gestão de manutenções.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {plans.map((plan) => {
                const daysUntil = getDaysUntilMaintenance(plan.nextMaintenanceDate);
                return (
                  <Card key={plan.id} className="hover-elevate" data-testid={`card-plan-${plan.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Icon3D icon={Calendar} color="purple" />
                          <div>
                            <h4 className="font-semibold">{plan.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Ativo: {getAssetName(plan.equipmentId)} | Periodicidade: {plan.periodicity}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{plan.maintenanceType}</Badge>
                              {getMaintenanceStatusBadge(daysUntil)}
                            </div>
                            {plan.nextMaintenanceDate && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(plan.nextMaintenanceDate), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            )}
                          </div>
                          <Badge variant={plan.isActive ? "default" : "secondary"}>
                            {plan.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="executions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Execuções de Manutenção</h3>
            <Dialog open={executionDialogOpen} onOpenChange={setExecutionDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-execution">
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Manutenção
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Registrar Execução de Manutenção</DialogTitle>
                  <DialogDescription>
                    Registre uma manutenção realizada ou agendada.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleExecutionSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="execAssetId">Ativo *</Label>
                      <Select name="equipmentId" required>
                        <SelectTrigger data-testid="select-execution-asset">
                          <SelectValue placeholder="Selecione o ativo" />
                        </SelectTrigger>
                        <SelectContent>
                          {assets.map((asset) => (
                            <SelectItem key={asset.id} value={asset.id}>
                              {asset.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="execMaintenanceType">Tipo *</Label>
                      <Select name="maintenanceType" defaultValue="preventiva" required>
                        <SelectTrigger data-testid="select-execution-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {maintenanceTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scheduledDate">Data Agendada *</Label>
                      <Input
                        id="scheduledDate"
                        name="scheduledDate"
                        type="date"
                        required
                        data-testid="input-execution-scheduled-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="executedDate">Data de Execução</Label>
                      <Input
                        id="executedDate"
                        name="executedDate"
                        type="date"
                        data-testid="input-execution-executed-date"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="execStatus">Status</Label>
                      <Select name="status" defaultValue="pendente">
                        <SelectTrigger data-testid="select-execution-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="em_andamento">Em Andamento</SelectItem>
                          <SelectItem value="concluído">Concluído</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="execCost">Custo (R$)</Label>
                      <Input
                        id="execCost"
                        name="cost"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        data-testid="input-execution-cost"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="execResponsibleName">Responsável</Label>
                    <Input
                      id="execResponsibleName"
                      name="responsibleName"
                      placeholder="Nome do técnico ou empresa"
                      data-testid="input-execution-responsible"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="execNotes">Observações</Label>
                    <Textarea
                      id="execNotes"
                      name="notes"
                      placeholder="Descrição do serviço realizado..."
                      data-testid="textarea-execution-notes"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setExecutionDialogOpen(false)} data-testid="button-cancel-execution">
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createExecutionMutation.isPending} data-testid="button-save-execution">
                      {createExecutionMutation.isPending ? "Salvando..." : "Registrar"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {executionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : executions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma execução registrada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {executions.map((exec) => {
                const statusColors: Record<string, string> = {
                  pendente: "bg-yellow-500",
                  em_andamento: "bg-blue-500",
                  concluído: "bg-green-500",
                  cancelado: "bg-gray-500",
                };
                return (
                  <Card key={exec.id} className="hover-elevate" data-testid={`card-execution-${exec.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Icon3D icon={Wrench} color={exec.status === "concluído" ? "green" : exec.status === "pendente" ? "yellow" : "blue"} />
                          <div>
                            <h4 className="font-semibold">{getAssetName(exec.equipmentId)}</h4>
                            <p className="text-sm text-muted-foreground">
                              {exec.maintenanceType} | {exec.responsibleName || "Sem responsável"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <Badge className={statusColors[exec.status] || "bg-gray-500"}>
                              {exec.status.replace("_", " ")}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {exec.executedDate
                                ? format(new Date(exec.executedDate), "dd/MM/yyyy", { locale: ptBR })
                                : format(new Date(exec.scheduledDate), "dd/MM/yyyy", { locale: ptBR }) + " (agendada)"}
                            </p>
                          </div>
                          {exec.cost && (
                            <Badge variant="outline">
                              R$ {exec.cost.toFixed(2)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <h3 className="text-lg font-semibold">Alertas de Manutenção</h3>

          {overdueMaintenances.length > 0 && (
            <Card className="border-destructive">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" />
                  Manutenções Vencidas ({overdueMaintenances.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {overdueMaintenances.map((plan) => (
                    <div key={plan.id} className="flex items-center justify-between p-2 bg-destructive/10 rounded">
                      <div>
                        <p className="font-medium">{plan.name}</p>
                        <p className="text-sm text-muted-foreground">{getAssetName(plan.equipmentId)}</p>
                      </div>
                      <Badge variant="destructive">
                        Vencida há {Math.abs(getDaysUntilMaintenance(plan.nextMaintenanceDate) || 0)} dias
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {upcomingMaintenances.length > 0 && (
            <Card className="border-orange-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="h-5 w-5" />
                  Próximas Manutenções ({upcomingMaintenances.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {upcomingMaintenances.map((plan) => {
                    const daysUntil = getDaysUntilMaintenance(plan.nextMaintenanceDate);
                    return (
                      <div key={plan.id} className="flex items-center justify-between p-2 bg-orange-500/10 rounded">
                        <div>
                          <p className="font-medium">{plan.name}</p>
                          <p className="text-sm text-muted-foreground">{getAssetName(plan.equipmentId)}</p>
                        </div>
                        {getMaintenanceStatusBadge(daysUntil)}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {overdueMaintenances.length === 0 && upcomingMaintenances.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum alerta no momento</p>
                <p className="text-sm text-muted-foreground">Todas as manutenções estão em dia!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <h3 className="text-lg font-semibold">Histórico Técnico</h3>
          
          {assets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Cadastre ativos para visualizar o histórico</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {assets.map((asset) => {
                const assetExecutions = executions.filter((e) => e.equipmentId === asset.id);
                if (assetExecutions.length === 0) return null;
                
                return (
                  <Card key={asset.id} data-testid={`card-history-${asset.id}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {categoryIcons[asset.category]?.icon && (
                          <Icon3D icon={categoryIcons[asset.category].icon} color={categoryIcons[asset.category].color} />
                        )}
                        {asset.name}
                      </CardTitle>
                      <CardDescription>{asset.location}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-48">
                        <div className="relative pl-6 border-l-2 border-muted space-y-4">
                          {assetExecutions.map((exec) => (
                            <div key={exec.id} className="relative">
                              <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-primary border-2 border-background" />
                              <div className="bg-muted/50 rounded p-3">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{exec.maintenanceType}</span>
                                  <Badge variant="outline">
                                    {exec.executedDate
                                      ? format(new Date(exec.executedDate), "dd/MM/yyyy", { locale: ptBR })
                                      : "Agendada"}
                                  </Badge>
                                </div>
                                {exec.responsibleName && (
                                  <p className="text-sm text-muted-foreground">Por: {exec.responsibleName}</p>
                                )}
                                {exec.cost && (
                                  <p className="text-sm text-muted-foreground">Custo: R$ {exec.cost.toFixed(2)}</p>
                                )}
                                {exec.notes && (
                                  <p className="text-sm mt-1">{exec.notes}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Relatórios</h3>
            <Button variant="outline" data-testid="button-export-report">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preventiva vs Corretiva</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Preventiva</span>
                      <span className="text-sm font-medium">{preventiveCount}</span>
                    </div>
                    <Progress value={executions.length > 0 ? (preventiveCount / executions.length) * 100 : 0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Corretiva</span>
                      <span className="text-sm font-medium">{correctiveCount}</span>
                    </div>
                    <Progress value={executions.length > 0 ? (correctiveCount / executions.length) * 100 : 0} className="h-2 bg-orange-100 [&>div]:bg-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Custo Total por Período</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  R$ {executions.reduce((sum, e) => sum + (e.cost || 0), 0).toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground">Total gasto em manutenções</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ativos por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {equipmentCategories.map((cat) => {
                    const count = assets.filter((a) => a.category === cat).length;
                    if (count === 0) return null;
                    return (
                      <div key={cat} className="flex justify-between items-center">
                        <span className="text-sm capitalize">{cat}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumo Geral</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total de Ativos</span>
                    <span className="font-medium">{assets.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Planos Ativos</span>
                    <span className="font-medium">{plans.filter((p) => p.isActive).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Manutenções Realizadas</span>
                    <span className="font-medium">{executions.filter((e) => e.status === "concluído").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Manutenções Pendentes</span>
                    <span className="font-medium">{executions.filter((e) => e.status === "pendente").length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
