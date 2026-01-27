import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Scale,
  Plus,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Search,
  Filter,
  Loader2,
  FileText,
  Shield,
  Download,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface LegalChecklistItem {
  id: string;
  name: string;
  itemType: string;
  description: string | null;
  isMandatory: boolean;
  frequency: string;
  lastCompletedDate: string | null;
  nextDueDate: string | null;
  status: string;
  responsibleName: string | null;
  notes: string | null;
}

const checklistSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  itemType: z.string().min(1, "Tipo é obrigatório"),
  description: z.string().optional(),
  isMandatory: z.boolean().default(true),
  frequency: z.string().min(1, "Frequência é obrigatória"),
  lastCompletedDate: z.string().optional(),
  nextDueDate: z.string().optional(),
  status: z.string().default("pendente"),
  responsibleName: z.string().optional(),
  notes: z.string().optional(),
});

type ChecklistFormData = z.infer<typeof checklistSchema>;

const itemTypeLabels: Record<string, { label: string; icon: any }> = {
  documento: { label: "Documento", icon: FileText },
  certificado: { label: "Certificado", icon: FileCheck },
  licenca: { label: "Licença", icon: Shield },
  seguro: { label: "Seguro", icon: Shield },
  inspecao: { label: "Inspeção", icon: FileCheck },
  laudo: { label: "Laudo", icon: FileText },
};

const frequencyLabels: Record<string, string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
  unica: "Única",
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  em_dia: { label: "Em Dia", color: "emerald", icon: CheckCircle2 },
  pendente: { label: "Pendente", color: "amber", icon: Clock },
  vencido: { label: "Vencido", color: "red", icon: XCircle },
  nao_aplicavel: { label: "N/A", color: "gray", icon: null },
};

export default function Compliance() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LegalChecklistItem | null>(null);
  const { toast } = useToast();

  const form = useForm<ChecklistFormData>({
    resolver: zodResolver(checklistSchema),
    defaultValues: {
      name: "",
      itemType: "documento",
      description: "",
      isMandatory: true,
      frequency: "anual",
      lastCompletedDate: "",
      nextDueDate: "",
      status: "pendente",
      responsibleName: "",
      notes: "",
    },
  });

  const { data: checklistData = [], isLoading } = useQuery<LegalChecklistItem[]>({
    queryKey: ["/api/legal-checklist"],
  });

  const createItem = useMutation({
    mutationFn: async (data: ChecklistFormData) => {
      return apiRequest("POST", "/api/legal-checklist", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/legal-checklist"] });
      handleCloseDialog();
      toast({ title: "Item cadastrado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao cadastrar item", variant: "destructive" });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ChecklistFormData }) => {
      return apiRequest("PATCH", `/api/legal-checklist/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/legal-checklist"] });
      handleCloseDialog();
      toast({ title: "Item atualizado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar item", variant: "destructive" });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    form.reset({
      name: "",
      itemType: "documento",
      description: "",
      isMandatory: true,
      frequency: "anual",
      lastCompletedDate: "",
      nextDueDate: "",
      status: "pendente",
      responsibleName: "",
      notes: "",
    });
  };

  const handleEditItem = (item: LegalChecklistItem) => {
    setEditingItem(item);
    form.reset({
      name: item.name,
      itemType: item.itemType,
      description: item.description || "",
      isMandatory: item.isMandatory,
      frequency: item.frequency,
      lastCompletedDate: item.lastCompletedDate ? new Date(item.lastCompletedDate).toISOString().split("T")[0] : "",
      nextDueDate: item.nextDueDate ? new Date(item.nextDueDate).toISOString().split("T")[0] : "",
      status: item.status,
      responsibleName: item.responsibleName || "",
      notes: item.notes || "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: ChecklistFormData) => {
    if (editingItem) {
      updateItem.mutate({ id: editingItem.id, data });
    } else {
      createItem.mutate(data);
    }
  };

  const checklist = checklistData.map((item) => ({
    ...item,
    daysUntilDue: item.nextDueDate 
      ? Math.ceil((new Date(item.nextDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null,
  }));

  const filteredChecklist = checklist.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: checklist.length,
    emDia: checklist.filter((i) => i.status === "em_dia").length,
    pendente: checklist.filter((i) => i.status === "pendente").length,
    vencido: checklist.filter((i) => i.status === "vencido").length,
  };

  const complianceScore = stats.total > 0 ? Math.round((stats.emDia / stats.total) * 100) : 0;

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Conformidade Legal"
        description="Checklist legal e gestão de documentos obrigatórios"
        icon={Scale}
        iconColor="red"
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Score de Conformidade</p>
                <p className={`text-3xl font-bold ${complianceScore >= 80 ? "text-emerald-600" : complianceScore >= 50 ? "text-amber-600" : "text-red-600"}`}>
                  {complianceScore}%
                </p>
              </div>
              <div className={`flex h-14 w-14 items-center justify-center rounded-full ${complianceScore >= 80 ? "bg-emerald-500/10" : complianceScore >= 50 ? "bg-amber-500/10" : "bg-red-500/10"}`}>
                <Scale className={`h-7 w-7 ${complianceScore >= 80 ? "text-emerald-500" : complianceScore >= 50 ? "text-amber-500" : "text-red-500"}`} />
              </div>
            </div>
            <Progress 
              value={complianceScore} 
              className={`mt-3 h-2 ${complianceScore >= 80 ? "[&>div]:bg-emerald-500" : complianceScore >= 50 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500"}`}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.emDia}</p>
                <p className="text-xs text-muted-foreground">Em Dia</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendente}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.vencido}</p>
                <p className="text-xs text-muted-foreground">Vencidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar itens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36" data-testid="select-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="em_dia">Em Dia</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="vencido">Vencidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); else setIsDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-item">
              <Plus className="h-4 w-4 mr-2" />
              Novo Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Editar Item" : "Novo Item de Conformidade"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: AVCB - Auto de Vistoria" data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="itemType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(itemTypeLabels).map(([value, config]) => (
                              <SelectItem key={value} value={value}>{config.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequência</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-frequency">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(frequencyLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Descrição do item" data-testid="input-description" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="lastCompletedDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Última Realização</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-last-date" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nextDueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Próximo Vencimento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-next-date" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([value, config]) => (
                              <SelectItem key={value} value={value}>{config.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="responsibleName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Responsável</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome do responsável" data-testid="input-responsible" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="isMandatory"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">Item obrigatório</FormLabel>
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
                        <Textarea {...field} placeholder="Observações adicionais" data-testid="input-notes" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createItem.isPending || updateItem.isPending} data-testid="button-submit">
                    {(createItem.isPending || updateItem.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingItem ? "Salvar" : "Cadastrar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredChecklist.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum item cadastrado</p>
            <p className="text-sm text-muted-foreground mt-1">Clique em "Novo Item" para adicionar documentos de conformidade</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-450px)]">
          <div className="space-y-3 pr-4">
            {filteredChecklist.map((item) => {
              const status = statusConfig[item.status] || statusConfig.pendente;
              const StatusIcon = status.icon;
              const typeConfig = itemTypeLabels[item.itemType] || itemTypeLabels.documento;
              const TypeIcon = typeConfig.icon;

              return (
                <Card 
                  key={item.id} 
                  className={`hover-elevate ${item.status === "vencido" ? "border-red-500/50" : item.status === "pendente" ? "border-amber-500/50" : ""}`}
                  data-testid={`checklist-${item.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-${status.color}-500/10`}>
                        <TypeIcon className={`h-5 w-5 text-${status.color}-500`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-sm">{item.name}</h3>
                          {item.isMandatory && (
                            <Badge variant="outline" className="text-xs">Obrigatório</Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Frequência: {frequencyLabels[item.frequency] || item.frequency}
                          </span>
                          {item.lastCompletedDate && (
                            <span>
                              Última: {new Date(item.lastCompletedDate).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                          {item.nextDueDate && (
                            <span className={item.status === "vencido" ? "text-red-600 font-medium" : item.status === "pendente" ? "text-amber-600" : ""}>
                              Próxima: {new Date(item.nextDueDate).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                          {item.responsibleName && (
                            <span>Responsável: {item.responsibleName}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditItem(item)}
                            data-testid={`button-edit-${item.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Badge className={`bg-${status.color}-500/10 text-${status.color}-600 border-${status.color}-500/20`}>
                            {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                            {status.label}
                          </Badge>
                        </div>
                        {item.daysUntilDue !== null && item.status !== "em_dia" && (
                          <span className={`text-xs font-medium ${item.daysUntilDue < 0 ? "text-red-600" : "text-amber-600"}`}>
                            {item.daysUntilDue < 0 
                              ? `Vencido há ${Math.abs(item.daysUntilDue)} dias`
                              : `Vence em ${item.daysUntilDue} dias`
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
