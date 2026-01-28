import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ClipboardList,
  Plus,
  Search,
  Calendar,
  Loader2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Send,
  User,
  ListChecks,
  BarChart3,
  Trash2,
  Eye,
  MessageCircle,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useCondominium } from "@/hooks/use-condominium";
import { apiRequest, queryClient, getAuthHeaders } from "@/lib/queryClient";
import { teamMemberRoles, type TeamMember } from "@shared/schema";

const createListFormSchema = z.object({
  titulo: z.string().min(2, "Título deve ter pelo menos 2 caracteres"),
  membroId: z.string().min(1, "Selecione um membro da equipe"),
  dataExecucao: z.string().min(1, "Selecione a data de execução"),
  turno: z.enum(["manha", "tarde", "noite", "integral"]),
  prioridade: z.enum(["baixa", "normal", "alta", "urgente"]).default("normal"),
  observacoes: z.string().optional(),
});

type CreateListFormData = z.infer<typeof createListFormSchema>;

interface ActivityTemplate {
  id: string;
  categoriaId: string | null;
  titulo: string;
  descricao: string | null;
  funcao: string;
  area: string | null;
  instrucoes: string | null;
  equipamentosNecessarios: string[] | null;
  checklist: { items: string[] } | null;
  tempoEstimado: number | null;
  ordem: number;
  categoria: { id: string; nome: string; cor: string } | null;
}

interface ActivityList {
  id: string;
  titulo: string;
  membroId: string;
  dataExecucao: string;
  turno: string;
  prioridade: string;
  status: string;
  observacoes: string | null;
  enviadoWhatsapp: boolean;
  dataEnvioWhatsapp: string | null;
  createdAt: string;
  membro: TeamMember | null;
}

interface ActivityListItem {
  id: string;
  listaId: string;
  titulo: string;
  descricao: string | null;
  area: string | null;
  instrucoes: string | null;
  equipamentosNecessarios: string[] | null;
  checklist: { items: string[] } | null;
  concluido: boolean;
  dataConclusao: string | null;
  observacoes: string | null;
  ordem: number;
}

interface ActivityStats {
  totalListas: number;
  listasPendentes: number;
  listasEmAndamento: number;
  listasConcluidas: number;
  totalAtividades: number;
  atividadesConcluidas: number;
  percentualConclusao: number;
}

const turnoLabels: Record<string, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
  integral: "Integral",
};

const prioridadeLabels: Record<string, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
};

const statusColors: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  em_andamento: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  concluida: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const prioridadeColors: Record<string, string> = {
  baixa: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  normal: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  alta: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  urgente: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function ActivityManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedCondominium } = useCondominium();
  const [activeTab, setActiveTab] = useState("criar");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFuncao, setSelectedFuncao] = useState<string>("");
  const [selectedTemplates, setSelectedTemplates] = useState<ActivityTemplate[]>([]);
  const [viewListDialog, setViewListDialog] = useState<ActivityList | null>(null);
  const [whatsappDialog, setWhatsappDialog] = useState<{ list: ActivityList; url: string; message: string } | null>(null);

  const form = useForm<CreateListFormData>({
    resolver: zodResolver(createListFormSchema),
    defaultValues: {
      titulo: "",
      membroId: "",
      dataExecucao: new Date().toISOString().split("T")[0],
      turno: "manha",
      prioridade: "normal",
      observacoes: "",
    },
  });

  const { data: teamMembers = [], isLoading: loadingMembers } = useQuery<TeamMember[]>({
    queryKey: ["/api/team-members"],
    enabled: !!selectedCondominium,
  });

  const { data: templates = [], isLoading: loadingTemplates } = useQuery<ActivityTemplate[]>({
    queryKey: ["/api/activity-templates", selectedFuncao],
    queryFn: async () => {
      const url = selectedFuncao 
        ? `/api/activity-templates?funcao=${selectedFuncao}`
        : "/api/activity-templates";
      const headers = getAuthHeaders();
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
    enabled: !!selectedCondominium,
  });

  const { data: lists = [], isLoading: loadingLists } = useQuery<ActivityList[]>({
    queryKey: ["/api/activity-lists"],
    enabled: !!selectedCondominium,
  });

  const { data: stats, isLoading: loadingStats } = useQuery<ActivityStats>({
    queryKey: ["/api/activity-statistics"],
    enabled: !!selectedCondominium,
  });

  const createListMutation = useMutation({
    mutationFn: async (data: CreateListFormData & { atividades: ActivityTemplate[] }) => {
      return apiRequest("POST", "/api/activity-lists", data);
    },
    onSuccess: () => {
      toast({ title: "Lista criada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-statistics"] });
      form.reset();
      setSelectedTemplates([]);
      setActiveTab("listas");
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar lista", description: error.message, variant: "destructive" });
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/activity-lists/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Lista excluída com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-statistics"] });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao excluir lista", description: error.message, variant: "destructive" });
    },
  });

  const sendWhatsAppMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/activity-lists/${id}/enviar-whatsapp`);
      return res.json();
    },
    onSuccess: (data: any, listId: string) => {
      const list = lists.find(l => l.id === listId);
      if (list && data.urlWhatsApp) {
        setWhatsappDialog({ list, url: data.urlWhatsApp, message: data.mensagem });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/activity-lists"] });
      toast({ title: "Mensagem gerada com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao gerar mensagem", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (data: CreateListFormData) => {
    if (selectedTemplates.length === 0) {
      toast({ title: "Selecione pelo menos uma atividade", variant: "destructive" });
      return;
    }
    createListMutation.mutate({ ...data, atividades: selectedTemplates });
  };

  const toggleTemplate = (template: ActivityTemplate) => {
    setSelectedTemplates(prev => {
      const exists = prev.find(t => t.id === template.id);
      if (exists) {
        return prev.filter(t => t.id !== template.id);
      }
      return [...prev, template];
    });
  };

  const handleMemberChange = (membroId: string) => {
    form.setValue("membroId", membroId);
    const member = teamMembers.find(m => m.id === membroId);
    if (member) {
      setSelectedFuncao(member.role);
    }
  };

  const filteredLists = lists.filter(list => {
    if (!searchQuery) return true;
    return (
      list.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      list.membro?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const activeMembers = teamMembers.filter(m => m.status === "ativo");

  if (!selectedCondominium) {
    return (
      <div className="p-6">
        <EmptyState
          icon={ClipboardList}
          title="Selecione um condomínio"
          description="Escolha um condomínio para gerenciar as atividades da equipe"
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Gestão de Atividades"
        description="Crie e distribua listas de atividades para a equipe"
        icon={ClipboardList}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="criar" data-testid="tab-criar-lista">
            <Plus className="w-4 h-4 mr-2" />
            Criar Lista
          </TabsTrigger>
          <TabsTrigger value="listas" data-testid="tab-minhas-listas">
            <ListChecks className="w-4 h-4 mr-2" />
            Minhas Listas
          </TabsTrigger>
          <TabsTrigger value="estatisticas" data-testid="tab-estatisticas">
            <BarChart3 className="w-4 h-4 mr-2" />
            Estatísticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="criar" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Dados da Lista</CardTitle>
                <CardDescription>Preencha as informações básicas</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form className="space-y-4">
                    <FormField
                      control={form.control}
                      name="titulo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título da Lista</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: Limpeza Bloco A - Manhã"
                              {...field}
                              data-testid="input-titulo-lista"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="membroId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsável</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={handleMemberChange}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-membro">
                                <SelectValue placeholder="Selecione um membro" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {activeMembers.map((member) => (
                                <SelectItem key={member.id} value={member.id} data-testid={`select-item-membro-${member.id}`}>
                                  {member.name} - {member.role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="dataExecucao"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data de Execução</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                data-testid="input-data-execucao"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="turno"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Turno</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger data-testid="select-turno">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(turnoLabels).map(([value, label]) => (
                                  <SelectItem key={value} value={value} data-testid={`select-item-turno-${value}`}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="prioridade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prioridade</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger data-testid="select-prioridade">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(prioridadeLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value} data-testid={`select-item-prioridade-${value}`}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="observacoes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Instruções adicionais..."
                              rows={3}
                              {...field}
                              data-testid="input-observacoes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle>Atividades Disponíveis</CardTitle>
                    <CardDescription>
                      {selectedFuncao
                        ? `Mostrando atividades para: ${selectedFuncao}`
                        : "Selecione um membro para filtrar"}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" data-testid="badge-selecionadas">
                    {selectedTemplates.length} selecionadas
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {loadingTemplates ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {selectedFuncao
                      ? "Nenhuma atividade cadastrada para esta função"
                      : "Selecione um membro da equipe"}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {templates.map((template) => {
                      const isSelected = selectedTemplates.some(t => t.id === template.id);
                      return (
                        <div
                          key={template.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover-elevate"
                          }`}
                          onClick={() => toggleTemplate(template)}
                          data-testid={`template-item-${template.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-primary" />
                              ) : (
                                <Square className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium" data-testid={`template-titulo-${template.id}`}>{template.titulo}</span>
                                {template.categoria && (
                                  <Badge variant="outline" className="text-xs" data-testid={`template-categoria-${template.id}`}>
                                    {template.categoria.nome}
                                  </Badge>
                                )}
                              </div>
                              {template.area && (
                                <p className="text-sm text-muted-foreground mt-1" data-testid={`template-area-${template.id}`}>
                                  Local: {template.area}
                                </p>
                              )}
                              {template.tempoEstimado && (
                                <p className="text-sm text-muted-foreground" data-testid={`template-tempo-${template.id}`}>
                                  Tempo estimado: {template.tempoEstimado} min
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {selectedTemplates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Atividades Selecionadas ({selectedTemplates.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplates.map((template) => (
                    <Badge
                      key={template.id}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => toggleTemplate(template)}
                      data-testid={`selected-template-${template.id}`}
                    >
                      {template.titulo}
                      <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                form.reset();
                setSelectedTemplates([]);
              }}
              data-testid="button-limpar-form"
            >
              Limpar
            </Button>
            <Button
              onClick={form.handleSubmit(handleSubmit)}
              disabled={createListMutation.isPending || selectedTemplates.length === 0}
              data-testid="button-criar-lista"
            >
              {createListMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar Lista
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="listas" className="space-y-6 mt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar listas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-listas"
              />
            </div>
          </div>

          {loadingLists ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : filteredLists.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Nenhuma lista encontrada"
              description="Crie uma nova lista de atividades"
              action={{
                label: "Criar Lista",
                onClick: () => setActiveTab("criar")
              }}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredLists.map((list) => (
                <Card key={list.id} className="hover-elevate" data-testid={`card-lista-${list.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base line-clamp-2" data-testid={`text-lista-titulo-${list.id}`}>{list.titulo}</CardTitle>
                      <Badge className={statusColors[list.status]} data-testid={`badge-status-${list.id}`}>
                        {statusLabels[list.status]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span data-testid={`text-membro-${list.id}`}>{list.membro?.name || "Sem responsável"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span data-testid={`text-data-${list.id}`}>
                        {new Date(list.dataExecucao).toLocaleDateString("pt-BR")} - {turnoLabels[list.turno]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={prioridadeColors[list.prioridade]} variant="outline" data-testid={`badge-prioridade-${list.id}`}>
                        {prioridadeLabels[list.prioridade]}
                      </Badge>
                      {list.enviadoWhatsapp && (
                        <Badge variant="outline" className="text-green-600" data-testid={`badge-enviado-${list.id}`}>
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Enviado
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewListDialog(list)}
                        data-testid={`button-ver-lista-${list.id}`}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendWhatsAppMutation.mutate(list.id)}
                        disabled={sendWhatsAppMutation.isPending || !list.membro?.whatsapp}
                        data-testid={`button-whatsapp-${list.id}`}
                      >
                        {sendWhatsAppMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-1" />
                        )}
                        WhatsApp
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-destructive"
                            data-testid={`button-delete-lista-${list.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir lista?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid={`button-cancel-delete-${list.id}`}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteListMutation.mutate(list.id)}
                              className="bg-destructive text-destructive-foreground"
                              data-testid={`button-confirm-delete-${list.id}`}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="estatisticas" className="space-y-6 mt-6">
          {loadingStats ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : stats ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card data-testid="stat-total-listas">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total de Listas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" data-testid="value-total-listas">{stats.totalListas}</div>
                  </CardContent>
                </Card>

                <Card data-testid="stat-pendentes">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-500" />
                      Pendentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-yellow-600" data-testid="value-pendentes">{stats.listasPendentes}</div>
                  </CardContent>
                </Card>

                <Card data-testid="stat-em-andamento">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-blue-500" />
                      Em Andamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600" data-testid="value-em-andamento">{stats.listasEmAndamento}</div>
                  </CardContent>
                </Card>

                <Card data-testid="stat-concluidas">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Concluídas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600" data-testid="value-concluidas">{stats.listasConcluidas}</div>
                  </CardContent>
                </Card>
              </div>

              <Card data-testid="stat-atividades">
                <CardHeader>
                  <CardTitle>Progresso Geral</CardTitle>
                  <CardDescription data-testid="text-progresso-descricao">
                    {stats.atividadesConcluidas} de {stats.totalAtividades} atividades concluídas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Taxa de Conclusão</span>
                      <span className="font-bold" data-testid="value-percentual">{stats.percentualConclusao}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-4">
                      <div
                        className="bg-primary h-4 rounded-full transition-all"
                        style={{ width: `${stats.percentualConclusao}%` }}
                        data-testid="progress-bar"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <EmptyState
              icon={BarChart3}
              title="Sem dados"
              description="Crie algumas listas para ver as estatísticas"
            />
          )}
        </TabsContent>
      </Tabs>

      <ViewListDialog
        list={viewListDialog}
        onClose={() => setViewListDialog(null)}
      />

      <Dialog open={!!whatsappDialog} onOpenChange={() => setWhatsappDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar via WhatsApp</DialogTitle>
            <DialogDescription>
              Clique no botão abaixo para abrir o WhatsApp com a mensagem formatada
            </DialogDescription>
          </DialogHeader>
          {whatsappDialog && (
            <div className="space-y-4">
              <div className="p-3 bg-secondary rounded-lg max-h-60 overflow-y-auto" data-testid="container-whatsapp-message">
                <pre className="whitespace-pre-wrap text-sm font-mono" data-testid="text-whatsapp-message">{whatsappDialog.message}</pre>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  window.open(whatsappDialog.url, "_blank");
                  setWhatsappDialog(null);
                }}
                data-testid="button-abrir-whatsapp"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Abrir WhatsApp
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ViewListDialog({ list, onClose }: { list: ActivityList | null; onClose: () => void }) {
  const { data: items = [], isLoading } = useQuery<ActivityListItem[]>({
    queryKey: ["/api/activity-lists", list?.id, "items"],
    queryFn: async () => {
      if (!list) return [];
      const headers = getAuthHeaders();
      const res = await fetch(`/api/activity-lists/${list.id}/items`, { headers });
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
    enabled: !!list,
  });

  const markItemMutation = useMutation({
    mutationFn: async ({ id, concluido }: { id: string; concluido: boolean }) => {
      return apiRequest("PATCH", `/api/activity-list-items/${id}/concluir`, { concluido });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activity-lists", list?.id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-statistics"] });
    },
  });

  if (!list) return null;

  return (
    <Dialog open={!!list} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="dialog-list-titulo">{list.titulo}</DialogTitle>
          <DialogDescription data-testid="dialog-list-descricao">
            {list.membro?.name} - {new Date(list.dataExecucao).toLocaleDateString("pt-BR")} ({turnoLabels[list.turno]})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge className={statusColors[list.status]} data-testid="dialog-badge-status">{statusLabels[list.status]}</Badge>
            <Badge className={prioridadeColors[list.prioridade]} variant="outline" data-testid="dialog-badge-prioridade">
              {prioridadeLabels[list.prioridade]}
            </Badge>
          </div>

          {list.observacoes && (
            <div className="p-3 bg-secondary rounded-lg" data-testid="dialog-observacoes">
              <p className="text-sm font-medium mb-1">Observações:</p>
              <p className="text-sm text-muted-foreground">{list.observacoes}</p>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="font-medium" data-testid="dialog-atividades-count">Atividades ({items.length})</h4>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 border rounded-lg ${
                      item.concluido ? "bg-green-50 dark:bg-green-950 border-green-200" : ""
                    }`}
                    data-testid={`list-item-${item.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={item.concluido}
                        onCheckedChange={(checked) => {
                          markItemMutation.mutate({ id: item.id, concluido: !!checked });
                        }}
                        data-testid={`checkbox-item-${item.id}`}
                      />
                      <div className="flex-1">
                        <p className={`font-medium ${item.concluido ? "line-through text-muted-foreground" : ""}`} data-testid={`item-titulo-${item.id}`}>
                          {item.titulo}
                        </p>
                        {item.area && (
                          <p className="text-sm text-muted-foreground" data-testid={`item-area-${item.id}`}>Local: {item.area}</p>
                        )}
                        {item.dataConclusao && (
                          <p className="text-xs text-green-600 mt-1" data-testid={`item-conclusao-${item.id}`}>
                            Concluído em: {new Date(item.dataConclusao).toLocaleString("pt-BR")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-fechar-dialog">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
