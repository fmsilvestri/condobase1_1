import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Zap,
  Plus,
  Calendar,
  Clock,
  Play,
  Pause,
  Settings,
  Loader2,
  Power,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit,
  Cpu,
  Timer,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

const automationRuleSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  description: z.string().optional(),
  triggerType: z.string(),
  triggerConfig: z.string().optional(),
  actionType: z.string(),
  actionConfig: z.string().optional(),
  priority: z.coerce.number().optional(),
  isActive: z.boolean().optional(),
});

type AutomationRuleFormData = z.infer<typeof automationRuleSchema>;

const scheduledTaskSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  description: z.string().optional(),
  taskType: z.string(),
  frequency: z.string(),
  scheduledDate: z.string(),
  scheduledTime: z.string().optional(),
  assignedName: z.string().optional(),
  notes: z.string().optional(),
});

type ScheduledTaskFormData = z.infer<typeof scheduledTaskSchema>;

interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  triggerConfig: string | null;
  actionType: string;
  actionConfig: string | null;
  targetDeviceId: string | null;
  isActive: boolean;
  priority: number;
  lastExecutedAt: string | null;
  executionCount: number;
  createdAt: string;
}

interface ScheduledTask {
  id: string;
  name: string;
  description: string | null;
  taskType: string;
  frequency: string;
  scheduledDate: string;
  scheduledTime: string | null;
  assignedTo: string | null;
  assignedName: string | null;
  status: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
  notes: string | null;
  createdAt: string;
}

interface OperationLog {
  id: string;
  logType: string;
  action: string;
  description: string | null;
  entityType: string | null;
  entityId: string | null;
  status: string;
  errorMessage: string | null;
  executedBy: string | null;
  executedAt: string;
  duration: number | null;
}

const triggerTypeLabels: Record<string, string> = {
  horario: "Horário",
  evento: "Evento",
  sensor: "Sensor",
  condicao: "Condição",
  manual: "Manual",
};

const actionTypeLabels: Record<string, string> = {
  ligar_dispositivo: "Ligar Dispositivo",
  desligar_dispositivo: "Desligar Dispositivo",
  enviar_notificacao: "Enviar Notificação",
  gerar_alerta: "Gerar Alerta",
  executar_tarefa: "Executar Tarefa",
  enviar_email: "Enviar E-mail",
};

const taskTypeLabels: Record<string, string> = {
  manutencao: "Manutenção",
  limpeza: "Limpeza",
  inspecao: "Inspeção",
  relatorio: "Relatório",
  backup: "Backup",
};

const frequencyLabels: Record<string, string> = {
  unica: "Única",
  diaria: "Diária",
  semanal: "Semanal",
  mensal: "Mensal",
  anual: "Anual",
};

const taskStatusLabels: Record<string, string> = {
  pendente: "Pendente",
  em_execucao: "Em Execução",
  concluida: "Concluída",
  falhou: "Falhou",
  cancelada: "Cancelada",
};

const logTypeLabels: Record<string, string> = {
  automacao: "Automação",
  dispositivo: "Dispositivo",
  tarefa: "Tarefa",
  sistema: "Sistema",
  usuario: "Usuário",
};

export default function Automation() {
  const { toast } = useToast();
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

  const ruleForm = useForm<AutomationRuleFormData>({
    resolver: zodResolver(automationRuleSchema),
    defaultValues: {
      name: "",
      description: "",
      triggerType: "horario",
      actionType: "enviar_notificacao",
      priority: 1,
      isActive: true,
    },
  });

  const taskForm = useForm<ScheduledTaskFormData>({
    resolver: zodResolver(scheduledTaskSchema),
    defaultValues: {
      name: "",
      description: "",
      taskType: "manutencao",
      frequency: "unica",
      scheduledDate: new Date().toISOString().split("T")[0],
      scheduledTime: "08:00",
    },
  });

  const { data: rules = [], isLoading: rulesLoading } = useQuery<AutomationRule[]>({
    queryKey: ["/api/automation/rules"],
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<ScheduledTask[]>({
    queryKey: ["/api/automation/tasks"],
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery<OperationLog[]>({
    queryKey: ["/api/automation/logs"],
  });

  const createRule = useMutation({
    mutationFn: async (data: AutomationRuleFormData) => {
      return apiRequest("POST", "/api/automation/rules", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/rules"] });
      setIsRuleDialogOpen(false);
      ruleForm.reset();
      toast({ title: "Regra de automação criada com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao criar regra", variant: "destructive" });
    },
  });

  const createTask = useMutation({
    mutationFn: async (data: ScheduledTaskFormData) => {
      return apiRequest("POST", "/api/automation/tasks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/tasks"] });
      setIsTaskDialogOpen(false);
      taskForm.reset();
      toast({ title: "Tarefa agendada criada com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao criar tarefa", variant: "destructive" });
    },
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/automation/rules/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/rules"] });
      toast({ title: "Status da regra atualizado" });
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/automation/rules/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/rules"] });
      toast({ title: "Regra removida com sucesso" });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/automation/tasks/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/tasks"] });
      toast({ title: "Tarefa removida com sucesso" });
    },
  });

  const activeRules = rules.filter((r) => r.isActive).length;
  const pendingTasks = tasks.filter((t) => t.status === "pendente").length;
  const recentLogs = logs.slice(0, 10);

  const getTaskStatusBadge = (status: string) => {
    switch (status) {
      case "concluida":
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="mr-1 h-3 w-3" />{taskStatusLabels[status]}</Badge>;
      case "em_execucao":
        return <Badge variant="default" className="bg-blue-500"><Loader2 className="mr-1 h-3 w-3 animate-spin" />{taskStatusLabels[status]}</Badge>;
      case "falhou":
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />{taskStatusLabels[status]}</Badge>;
      case "cancelada":
        return <Badge variant="secondary">{taskStatusLabels[status]}</Badge>;
      default:
        return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />{taskStatusLabels[status] || status}</Badge>;
    }
  };

  const getLogStatusIcon = (status: string) => {
    switch (status) {
      case "sucesso":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "falha":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "aviso":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        icon={Zap}
        title="Operação e Automação"
        description="Gerencie regras de automação, tarefas agendadas e monitore operações"
        backHref="/"
      />

      <div className="flex-1 p-4 md:p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Regras Ativas</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeRules}</div>
              <p className="text-xs text-muted-foreground">de {rules.length} regras</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tarefas Pendentes</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingTasks}</div>
              <p className="text-xs text-muted-foreground">agendadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Operações Hoje</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{logs.length}</div>
              <p className="text-xs text-muted-foreground">registros</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dispositivos IoT</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                <Link href="/dispositivos-iot" className="text-primary hover:underline" data-testid="link-iot-devices">Ver dispositivos</Link>
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="rules" className="space-y-4">
          <TabsList>
            <TabsTrigger value="rules" data-testid="tab-rules">
              <Zap className="mr-2 h-4 w-4" />
              Regras de Automação
            </TabsTrigger>
            <TabsTrigger value="tasks" data-testid="tab-tasks">
              <Calendar className="mr-2 h-4 w-4" />
              Tarefas Agendadas
            </TabsTrigger>
            <TabsTrigger value="logs" data-testid="tab-logs">
              <FileText className="mr-2 h-4 w-4" />
              Logs de Operação
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Regras de Automação</h3>
              <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-rule">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Regra
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Nova Regra de Automação</DialogTitle>
                  </DialogHeader>
                  <Form {...ruleForm}>
                    <form onSubmit={ruleForm.handleSubmit((data) => createRule.mutate(data))} className="space-y-4">
                      <FormField
                        control={ruleForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome da regra" {...field} data-testid="input-rule-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={ruleForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrição</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Descrição da regra" {...field} data-testid="input-rule-description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={ruleForm.control}
                          name="triggerType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Gatilho</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-trigger-type">
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.entries(triggerTypeLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={ruleForm.control}
                          name="actionType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Ação</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-action-type">
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.entries(actionTypeLabels).map(([value, label]) => (
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
                        control={ruleForm.control}
                        name="triggerConfig"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Configuração do Gatilho</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: 08:00, sensor_id=123" {...field} data-testid="input-trigger-config" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={ruleForm.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prioridade (1-10)</FormLabel>
                            <FormControl>
                              <Input type="number" min={1} max={10} {...field} data-testid="input-priority" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={createRule.isPending} data-testid="button-submit-rule">
                        {createRule.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Criar Regra
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {rulesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : rules.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma regra cadastrada</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Crie regras de automação para controlar dispositivos e enviar notificações automaticamente.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <Card key={rule.id} data-testid={`card-rule-${rule.id}`}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${rule.isActive ? "bg-primary/10" : "bg-muted"}`}>
                          <Zap className={`h-5 w-5 ${rule.isActive ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <h4 className="font-medium">{rule.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {triggerTypeLabels[rule.triggerType] || rule.triggerType} &rarr; {actionTypeLabels[rule.actionType] || rule.actionType}
                          </p>
                          {rule.description && (
                            <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <p className="text-muted-foreground">Execuções: {rule.executionCount}</p>
                          {rule.lastExecutedAt && (
                            <p className="text-xs text-muted-foreground">
                              Última: {format(new Date(rule.lastExecutedAt), "dd/MM HH:mm", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={(checked) => toggleRule.mutate({ id: rule.id, isActive: checked })}
                          data-testid={`switch-rule-${rule.id}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRule.mutate(rule.id)}
                          data-testid={`button-delete-rule-${rule.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Tarefas Agendadas</h3>
              <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-task">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Tarefa
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Nova Tarefa Agendada</DialogTitle>
                  </DialogHeader>
                  <Form {...taskForm}>
                    <form onSubmit={taskForm.handleSubmit((data) => createTask.mutate(data))} className="space-y-4">
                      <FormField
                        control={taskForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome da tarefa" {...field} data-testid="input-task-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={taskForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrição</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Descrição da tarefa" {...field} data-testid="input-task-description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={taskForm.control}
                          name="taskType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-task-type">
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.entries(taskTypeLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={taskForm.control}
                          name="frequency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Frequência</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-frequency">
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.entries(frequencyLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
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
                          control={taskForm.control}
                          name="scheduledDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} data-testid="input-scheduled-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={taskForm.control}
                          name="scheduledTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Horário</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} data-testid="input-scheduled-time" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={taskForm.control}
                        name="assignedName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Responsável</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome do responsável" {...field} data-testid="input-assigned-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={taskForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Observações</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Observações adicionais" {...field} data-testid="input-task-notes" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={createTask.isPending} data-testid="button-submit-task">
                        {createTask.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Criar Tarefa
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {tasksLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma tarefa agendada</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Agende tarefas para execução automática ou manual.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <Card key={task.id} data-testid={`card-task-${task.id}`}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-muted">
                          <Timer className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h4 className="font-medium">{task.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {taskTypeLabels[task.taskType] || task.taskType} - {frequencyLabels[task.frequency] || task.frequency}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(task.scheduledDate), "dd/MM/yyyy", { locale: ptBR })}
                            {task.scheduledTime && ` às ${task.scheduledTime}`}
                            {task.assignedName && ` - ${task.assignedName}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getTaskStatusBadge(task.status)}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTask.mutate(task.id)}
                          data-testid={`button-delete-task-${task.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Logs de Operação</h3>
            </div>

            {logsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum log registrado</h3>
                  <p className="text-muted-foreground text-center">
                    Os logs de operação aparecerão aqui quando as automações forem executadas.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <ScrollArea className="h-[400px]">
                  <div className="divide-y">
                    {recentLogs.map((log) => (
                      <div key={log.id} className="flex items-center gap-4 p-4" data-testid={`log-${log.id}`}>
                        {getLogStatusIcon(log.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {logTypeLabels[log.logType] || log.logType}
                            </Badge>
                            <span className="font-medium text-sm">{log.action}</span>
                          </div>
                          {log.description && (
                            <p className="text-sm text-muted-foreground truncate">{log.description}</p>
                          )}
                          {log.errorMessage && (
                            <p className="text-sm text-destructive">{log.errorMessage}</p>
                          )}
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>{format(new Date(log.executedAt), "dd/MM HH:mm:ss", { locale: ptBR })}</p>
                          {log.duration && <p>{log.duration}ms</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
