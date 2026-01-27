import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  Clock,
  Calendar,
  Loader2,
  ClipboardList,
  CheckCircle,
  AlertCircle,
  Pause,
  PlayCircle,
  UserCheck,
  Briefcase,
  MessageCircle,
  FileText,
  Share2,
  Building2,
  Layers,
  Wrench,
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
  DialogTrigger,
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
import { jsPDF } from "jspdf";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useCondominium } from "@/hooks/use-condominium";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  teamMemberRoles,
  teamMemberStatuses,
  processCategories,
  processFrequencies,
  type TeamMember,
  type Process,
  type ProcessExecution,
} from "@shared/schema";

const teamMemberFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cpf: z.string().optional(),
  role: z.string().min(1, "Selecione uma função"),
  department: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  workSchedule: z.string().optional(),
  hireDate: z.string().optional(),
  status: z.string().default("ativo"),
  notes: z.string().optional(),
});

const processFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
  category: z.string().min(1, "Selecione uma categoria"),
  frequency: z.string().min(1, "Selecione uma frequência"),
  assignedToId: z.string().optional().nullable(),
  blocks: z.array(z.string()).optional(),
  floors: z.array(z.string()).optional(),
  equipmentIds: z.array(z.string()).optional(),
  executionScript: z.string().optional(),
  checklistItems: z.array(z.string()).optional(),
  estimatedDuration: z.coerce.number().optional().nullable(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

type TeamMemberFormValues = z.infer<typeof teamMemberFormSchema>;
type ProcessFormValues = z.infer<typeof processFormSchema>;

const roleLabels: Record<string, string> = {
  zelador: "Zelador",
  porteiro: "Porteiro",
  faxineiro: "Faxineiro",
  jardineiro: "Jardineiro",
  "técnico": "Técnico",
  administrativo: "Administrativo",
  "segurança": "Segurança",
  outro: "Outro",
};

const statusLabels: Record<string, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  "férias": "Férias",
  afastado: "Afastado",
};

const categoryLabels: Record<string, string> = {
  limpeza: "Limpeza",
  "segurança": "Segurança",
  "manutenção": "Manutenção",
  administrativo: "Administrativo",
  jardinagem: "Jardinagem",
  piscina: "Piscina",
  portaria: "Portaria",
  outro: "Outro",
};

const frequencyLabels: Record<string, string> = {
  "diário": "Diário",
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
  "sob demanda": "Sob Demanda",
};

export default function TeamManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedCondominium } = useCondominium();
  const [activeTab, setActiveTab] = useState("team");
  const [searchTerm, setSearchTerm] = useState("");
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);

  const canEdit = user?.role === "admin" || user?.role === "síndico";

  const teamForm = useForm<TeamMemberFormValues>({
    resolver: zodResolver(teamMemberFormSchema),
    defaultValues: {
      name: "",
      role: "",
      department: "",
      phone: "",
      email: "",
      workSchedule: "",
      hireDate: "",
      status: "ativo",
      notes: "",
    },
  });

  const processForm = useForm<ProcessFormValues>({
    resolver: zodResolver(processFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      frequency: "",
      assignedToId: null,
      blocks: [],
      floors: [],
      equipmentIds: [],
      executionScript: "",
      checklistItems: [],
      estimatedDuration: null,
      isActive: true,
      notes: "",
    },
  });

  const { data: teamMembers = [], isLoading: loadingTeam } = useQuery<TeamMember[]>({
    queryKey: ["/api/team-members"],
    enabled: !!selectedCondominium,
  });

  const { data: processes = [], isLoading: loadingProcesses } = useQuery<Process[]>({
    queryKey: ["/api/processes"],
    enabled: !!selectedCondominium,
  });

  const { data: executions = [] } = useQuery<ProcessExecution[]>({
    queryKey: ["/api/process-executions"],
    enabled: !!selectedCondominium,
  });

  const { data: equipment = [] } = useQuery<Array<{ id: string; name: string; category: string }>>({
    queryKey: ["/api/equipment"],
    enabled: !!selectedCondominium,
  });

  const createTeamMemberMutation = useMutation({
    mutationFn: async (data: TeamMemberFormValues) => {
      const response = await apiRequest("POST", "/api/team-members", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      setIsTeamDialogOpen(false);
      teamForm.reset();
      toast({ title: "Membro da equipe cadastrado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao cadastrar membro", variant: "destructive" });
    },
  });

  const updateTeamMemberMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TeamMemberFormValues> }) => {
      const response = await apiRequest("PATCH", `/api/team-members/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      setIsTeamDialogOpen(false);
      setEditingMember(null);
      teamForm.reset();
      toast({ title: "Membro da equipe atualizado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar membro", variant: "destructive" });
    },
  });

  const deleteTeamMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/team-members/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({ title: "Membro removido com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao remover membro", variant: "destructive" });
    },
  });

  const createProcessMutation = useMutation({
    mutationFn: async (data: ProcessFormValues) => {
      const response = await apiRequest("POST", "/api/processes", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processes"] });
      setIsProcessDialogOpen(false);
      processForm.reset();
      toast({ title: "Processo cadastrado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao cadastrar processo", variant: "destructive" });
    },
  });

  const updateProcessMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProcessFormValues> }) => {
      const response = await apiRequest("PATCH", `/api/processes/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processes"] });
      setIsProcessDialogOpen(false);
      setEditingProcess(null);
      processForm.reset();
      toast({ title: "Processo atualizado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar processo", variant: "destructive" });
    },
  });

  const deleteProcessMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/processes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processes"] });
      toast({ title: "Processo removido com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao remover processo", variant: "destructive" });
    },
  });

  const handleOpenTeamDialog = (member?: TeamMember) => {
    if (member) {
      setEditingMember(member);
      teamForm.reset({
        name: member.name,
        cpf: member.cpf || "",
        role: member.role,
        department: member.department || "",
        phone: member.phone || "",
        whatsapp: member.whatsapp || "",
        email: member.email || "",
        workSchedule: member.workSchedule || "",
        hireDate: member.hireDate ? new Date(member.hireDate).toISOString().split("T")[0] : "",
        status: member.status,
        notes: member.notes || "",
      });
    } else {
      setEditingMember(null);
      teamForm.reset();
    }
    setIsTeamDialogOpen(true);
  };

  const handleOpenProcessDialog = (process?: Process) => {
    if (process) {
      setEditingProcess(process);
      processForm.reset({
        name: process.name,
        description: process.description || "",
        category: process.category,
        frequency: process.frequency,
        assignedToId: process.assignedToId || null,
        blocks: process.blocks || [],
        floors: process.floors || [],
        equipmentIds: process.equipmentIds || [],
        executionScript: process.executionScript || "",
        checklistItems: process.checklistItems || [],
        estimatedDuration: process.estimatedDuration || null,
        isActive: process.isActive,
        notes: process.notes || "",
      });
    } else {
      setEditingProcess(null);
      processForm.reset();
    }
    setIsProcessDialogOpen(true);
  };

  const handleTeamSubmit = (data: TeamMemberFormValues) => {
    const submitData = {
      ...data,
      hireDate: data.hireDate || undefined,
      email: data.email || undefined,
    };
    if (editingMember) {
      updateTeamMemberMutation.mutate({ id: editingMember.id, data: submitData });
    } else {
      createTeamMemberMutation.mutate(submitData);
    }
  };

  const handleProcessSubmit = (data: ProcessFormValues) => {
    if (editingProcess) {
      updateProcessMutation.mutate({ id: editingProcess.id, data });
    } else {
      createProcessMutation.mutate(data);
    }
  };

  const filteredTeamMembers = teamMembers.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProcesses = processes.filter(
    (process) =>
      process.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      process.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeMembers = teamMembers.filter((m) => m.status === "ativo").length;
  const activeProcesses = processes.filter((p) => p.isActive).length;

  const getMemberName = (id: string | null | undefined) => {
    if (!id) return "Não atribuído";
    const member = teamMembers.find((m) => m.id === id);
    return member?.name || "Não encontrado";
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6" data-testid="page-team-management">
      <PageHeader
        icon={Users}
        title="Equipe e Gestão de Processos"
        description="Gerencie a equipe do condomínio e os processos operacionais"
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-total-members">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Membros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers.length}</div>
            <p className="text-xs text-muted-foreground">{activeMembers} ativos</p>
          </CardContent>
        </Card>
        <Card data-testid="card-active-members">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membros Ativos</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMembers}</div>
            <p className="text-xs text-muted-foreground">Em atividade</p>
          </CardContent>
        </Card>
        <Card data-testid="card-total-processes">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Processos</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processes.length}</div>
            <p className="text-xs text-muted-foreground">{activeProcesses} ativos</p>
          </CardContent>
        </Card>
        <Card data-testid="card-active-processes">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processos Ativos</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProcesses}</div>
            <p className="text-xs text-muted-foreground">Em execução</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="team" data-testid="tab-team">
            <Users className="mr-2 h-4 w-4" />
            Equipe
          </TabsTrigger>
          <TabsTrigger value="processes" data-testid="tab-processes">
            <ClipboardList className="mr-2 h-4 w-4" />
            Processos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Membros da Equipe</h3>
            {canEdit && (
              <Dialog open={isTeamDialogOpen} onOpenChange={(open) => {
                if (!open) {
                  setEditingMember(null);
                  teamForm.reset();
                }
                setIsTeamDialogOpen(open);
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenTeamDialog()} data-testid="button-add-team-member">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Membro
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingMember ? "Editar Membro" : "Novo Membro da Equipe"}</DialogTitle>
                    <DialogDescription>
                      {editingMember ? "Atualize as informações do membro" : "Cadastre um novo membro da equipe"}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...teamForm}>
                    <form onSubmit={teamForm.handleSubmit(handleTeamSubmit)} className="space-y-4">
                      <FormField
                        control={teamForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome *</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome completo" {...field} data-testid="input-member-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={teamForm.control}
                        name="cpf"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPF</FormLabel>
                            <FormControl>
                              <Input placeholder="000.000.000-00" {...field} data-testid="input-member-cpf" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={teamForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Função *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-member-role">
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {teamMemberRoles.map((role) => (
                                    <SelectItem key={role} value={role}>
                                      {roleLabels[role] || role}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={teamForm.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-member-status">
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {teamMemberStatuses.map((status) => (
                                    <SelectItem key={status} value={status}>
                                      {statusLabels[status] || status}
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
                        control={teamForm.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Departamento</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Manutenção, Limpeza..." {...field} data-testid="input-member-department" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={teamForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefone</FormLabel>
                              <FormControl>
                                <Input placeholder="(11) 99999-9999" {...field} data-testid="input-member-phone" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={teamForm.control}
                          name="whatsapp"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>WhatsApp</FormLabel>
                              <FormControl>
                                <Input placeholder="(11) 99999-9999" {...field} data-testid="input-member-whatsapp" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={teamForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="email@exemplo.com" {...field} data-testid="input-member-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={teamForm.control}
                          name="workSchedule"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Horário de Trabalho</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: 08:00 - 17:00" {...field} data-testid="input-member-schedule" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={teamForm.control}
                          name="hireDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data de Contratação</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} data-testid="input-member-hire-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={teamForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Observações</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Observações sobre o membro..." {...field} data-testid="textarea-member-notes" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button
                          type="submit"
                          disabled={createTeamMemberMutation.isPending || updateTeamMemberMutation.isPending}
                          data-testid="button-save-member"
                        >
                          {(createTeamMemberMutation.isPending || updateTeamMemberMutation.isPending) && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {editingMember ? "Salvar Alterações" : "Cadastrar"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {loadingTeam ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTeamMembers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum membro cadastrado"
              description="Comece adicionando membros à equipe do condomínio."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTeamMembers.map((member) => (
                <Card key={member.id} data-testid={`card-team-member-${member.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{member.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {roleLabels[member.role] || member.role}
                        </CardDescription>
                      </div>
                      <Badge variant={member.status === "ativo" ? "default" : "secondary"}>
                        {statusLabels[member.status] || member.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {member.department && (
                      <p className="text-sm text-muted-foreground">{member.department}</p>
                    )}
                    {member.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {member.phone}
                      </div>
                    )}
                    {member.whatsapp && (
                      <div className="flex items-center gap-2 text-sm">
                        <MessageCircle className="h-3 w-3 text-muted-foreground" />
                        {member.whatsapp}
                      </div>
                    )}
                    {member.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {member.email}
                      </div>
                    )}
                    {member.workSchedule && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {member.workSchedule}
                      </div>
                    )}
                    {canEdit && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenTeamDialog(member)}
                          data-testid={`button-edit-member-${member.id}`}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              data-testid={`button-delete-member-${member.id}`}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Remover
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover {member.name} da equipe?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteTeamMemberMutation.mutate(member.id)}
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="processes" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Processos Operacionais</h3>
            {canEdit && (
              <Dialog open={isProcessDialogOpen} onOpenChange={(open) => {
                if (!open) {
                  setEditingProcess(null);
                  processForm.reset();
                }
                setIsProcessDialogOpen(open);
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenProcessDialog()} data-testid="button-add-process">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Processo
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingProcess ? "Editar Processo" : "Novo Processo"}</DialogTitle>
                    <DialogDescription>
                      {editingProcess ? "Atualize as informações do processo" : "Cadastre um novo processo operacional"}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...processForm}>
                    <form onSubmit={processForm.handleSubmit(handleProcessSubmit)} className="space-y-4">
                      <FormField
                        control={processForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Processo *</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Limpeza das áreas comuns" {...field} data-testid="input-process-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={processForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrição</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Descreva o processo..." {...field} data-testid="textarea-process-description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={processForm.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Categoria *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-process-category">
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {processCategories.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                      {categoryLabels[cat] || cat}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={processForm.control}
                          name="frequency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Frequência *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-process-frequency">
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {processFrequencies.map((freq) => (
                                    <SelectItem key={freq} value={freq}>
                                      {frequencyLabels[freq] || freq}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={processForm.control}
                          name="assignedToId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Responsável</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-process-assigned">
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="">Não atribuído</SelectItem>
                                  {teamMembers
                                    .filter((m) => m.status === "ativo")
                                    .map((member) => (
                                      <SelectItem key={member.id} value={member.id}>
                                        {member.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={processForm.control}
                          name="estimatedDuration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Duração (min)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="Ex: 60"
                                  {...field}
                                  value={field.value ?? ""}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                  data-testid="input-process-duration"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={processForm.control}
                        name="blocks"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Blocos</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: A, B, C (separados por vírgula)"
                                value={(field.value || []).join(", ")}
                                onChange={(e) => field.onChange(e.target.value.split(",").map(b => b.trim()).filter(Boolean))}
                                data-testid="input-process-blocks"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={processForm.control}
                        name="floors"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Andares</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: Térreo, 1, 2, 3 (separados por vírgula)"
                                value={(field.value || []).join(", ")}
                                onChange={(e) => field.onChange(e.target.value.split(",").map(f => f.trim()).filter(Boolean))}
                                data-testid="input-process-floors"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={processForm.control}
                        name="equipmentIds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Equipamentos</FormLabel>
                            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                              {equipment.length === 0 ? (
                                <p className="text-sm text-muted-foreground col-span-2">Nenhum equipamento cadastrado</p>
                              ) : (
                                equipment.map((eq) => (
                                  <div key={eq.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`eq-${eq.id}`}
                                      checked={(field.value || []).includes(eq.id)}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        if (checked) {
                                          field.onChange([...current, eq.id]);
                                        } else {
                                          field.onChange(current.filter(id => id !== eq.id));
                                        }
                                      }}
                                    />
                                    <label htmlFor={`eq-${eq.id}`} className="text-sm">{eq.name}</label>
                                  </div>
                                ))
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={processForm.control}
                        name="executionScript"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Roteiro de Execução</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Descreva passo a passo as tarefas a serem executadas..."
                                className="min-h-[100px]"
                                {...field}
                                data-testid="textarea-process-script"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={processForm.control}
                        name="checklistItems"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Checklist de Tarefas</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Liste as tarefas (uma por linha)"
                                value={(field.value || []).join("\n")}
                                onChange={(e) => field.onChange(e.target.value.split("\n").filter(Boolean))}
                                data-testid="textarea-process-checklist"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={processForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Observações</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Instruções adicionais..." {...field} data-testid="textarea-process-notes" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button
                          type="submit"
                          disabled={createProcessMutation.isPending || updateProcessMutation.isPending}
                          data-testid="button-save-process"
                        >
                          {(createProcessMutation.isPending || updateProcessMutation.isPending) && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {editingProcess ? "Salvar Alterações" : "Cadastrar"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {loadingProcesses ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProcesses.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Nenhum processo cadastrado"
              description="Comece adicionando processos operacionais do condomínio."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProcesses.map((process) => (
                <Card key={process.id} data-testid={`card-process-${process.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{process.name}</CardTitle>
                        <CardDescription>{categoryLabels[process.category] || process.category}</CardDescription>
                      </div>
                      <Badge variant={process.isActive ? "default" : "secondary"}>
                        {process.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {process.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{process.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {frequencyLabels[process.frequency] || process.frequency}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      {getMemberName(process.assignedToId)}
                    </div>
                    {process.estimatedDuration && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {process.estimatedDuration} minutos
                      </div>
                    )}
                    {canEdit && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenProcessDialog(process)}
                          data-testid={`button-edit-process-${process.id}`}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              data-testid={`button-delete-process-${process.id}`}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Remover
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover o processo "{process.name}"?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteProcessMutation.mutate(process.id)}
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
