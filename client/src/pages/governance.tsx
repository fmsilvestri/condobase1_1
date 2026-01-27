import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Landmark,
  Plus,
  FileText,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Vote,
  Loader2,
  Search,
  Filter,
  Edit,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { queryClient, apiRequest } from "@/lib/queryClient";

const decisionSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  decisionType: z.string(),
  decisionDate: z.string(),
  status: z.string(),
  votesFor: z.coerce.number().optional(),
  votesAgainst: z.coerce.number().optional(),
  votesAbstain: z.coerce.number().optional(),
});

type DecisionFormData = z.infer<typeof decisionSchema>;

const successionSchema = z.object({
  currentSindicoName: z.string().min(1, "Nome do síndico é obrigatório"),
  mandateStartDate: z.string().optional(),
  mandateEndDate: z.string().optional(),
  successorName: z.string().optional(),
  transitionPlan: z.string().optional(),
  keyResponsibilities: z.string().optional(),
  criticalContacts: z.string().optional(),
  pendingIssues: z.string().optional(),
});

type SuccessionFormData = z.infer<typeof successionSchema>;

interface SuccessionPlan {
  id: string;
  currentSindicoId: string | null;
  currentSindicoName: string | null;
  mandateStartDate: string | null;
  mandateEndDate: string | null;
  successorId: string | null;
  successorName: string | null;
  transitionPlan: string | null;
  keyResponsibilities: string[] | null;
  criticalContacts: string[] | null;
  pendingIssues: string[] | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface GovernanceDecision {
  id: string;
  title: string;
  description: string;
  decisionType: string;
  decisionDate: string;
  status: string;
  votesFor: number | null;
  votesAgainst: number | null;
  votesAbstain: number | null;
  createdAt: string;
}

interface MeetingMinutes {
  id: string;
  title: string;
  meetingType: string;
  meetingDate: string;
  attendeesCount: number | null;
  quorumReached: boolean;
  status: string;
  createdAt: string;
}

const decisionTypeLabels: Record<string, string> = {
  assembleia: "Assembleia",
  reuniao_conselho: "Reunião de Conselho",
  decisao_sindico: "Decisão do Síndico",
  votacao_online: "Votação Online",
};

const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
  aprovada: { label: "Aprovada", color: "emerald", icon: CheckCircle2 },
  rejeitada: { label: "Rejeitada", color: "red", icon: XCircle },
  pendente: { label: "Pendente", color: "amber", icon: Clock },
};

export default function Governance() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditingSuccession, setIsEditingSuccession] = useState(false);
  const { toast } = useToast();

  const form = useForm<DecisionFormData>({
    resolver: zodResolver(decisionSchema),
    defaultValues: {
      title: "",
      description: "",
      decisionType: "assembleia",
      decisionDate: new Date().toISOString().split("T")[0],
      status: "pendente",
    },
  });

  const successionForm = useForm<SuccessionFormData>({
    resolver: zodResolver(successionSchema),
    defaultValues: {
      currentSindicoName: "",
      mandateStartDate: "",
      mandateEndDate: "",
      successorName: "",
      transitionPlan: "",
      keyResponsibilities: "",
      criticalContacts: "",
      pendingIssues: "",
    },
  });

  const { data: decisions, isLoading: isLoadingDecisions } = useQuery<GovernanceDecision[]>({
    queryKey: ["/api/governance/decisions"],
  });

  const { data: minutes, isLoading: isLoadingMinutes } = useQuery<MeetingMinutes[]>({
    queryKey: ["/api/governance/minutes"],
  });

  const { data: successionPlan, isLoading: isLoadingSuccession } = useQuery<SuccessionPlan | null>({
    queryKey: ["/api/governance/succession-plan"],
  });

  useEffect(() => {
    if (successionPlan) {
      successionForm.reset({
        currentSindicoName: successionPlan.currentSindicoName || "",
        mandateStartDate: successionPlan.mandateStartDate ? new Date(successionPlan.mandateStartDate).toISOString().split("T")[0] : "",
        mandateEndDate: successionPlan.mandateEndDate ? new Date(successionPlan.mandateEndDate).toISOString().split("T")[0] : "",
        successorName: successionPlan.successorName || "",
        transitionPlan: successionPlan.transitionPlan || "",
        keyResponsibilities: successionPlan.keyResponsibilities?.join("\n") || "",
        criticalContacts: successionPlan.criticalContacts?.join("\n") || "",
        pendingIssues: successionPlan.pendingIssues?.join("\n") || "",
      });
    }
  }, [successionPlan]);

  const saveSuccession = useMutation({
    mutationFn: async (data: SuccessionFormData) => {
      const payload = {
        currentSindicoName: data.currentSindicoName,
        mandateStartDate: data.mandateStartDate || null,
        mandateEndDate: data.mandateEndDate || null,
        successorName: data.successorName || null,
        transitionPlan: data.transitionPlan || null,
        keyResponsibilities: data.keyResponsibilities?.split("\n").filter(Boolean) || null,
        criticalContacts: data.criticalContacts?.split("\n").filter(Boolean) || null,
        pendingIssues: data.pendingIssues?.split("\n").filter(Boolean) || null,
      };

      if (successionPlan?.id) {
        return apiRequest("PATCH", `/api/governance/succession-plan/${successionPlan.id}`, payload);
      } else {
        return apiRequest("POST", "/api/governance/succession-plan", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/governance/succession-plan"] });
      setIsEditingSuccession(false);
      toast({ title: "Plano de sucessão salvo com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao salvar plano de sucessão", variant: "destructive" });
    },
  });

  const onSubmitSuccession = (data: SuccessionFormData) => {
    saveSuccession.mutate(data);
  };

  const createDecision = useMutation({
    mutationFn: async (data: DecisionFormData) => {
      return apiRequest("POST", "/api/governance/decisions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/governance/decisions"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Decisão registrada com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao registrar decisão", variant: "destructive" });
    },
  });

  const onSubmit = (data: DecisionFormData) => {
    createDecision.mutate(data);
  };

  const mockDecisions: GovernanceDecision[] = [
    {
      id: "1",
      title: "Aprovação do orçamento 2024",
      description: "Assembleia aprovou o orçamento anual de R$ 480.000",
      decisionType: "assembleia",
      decisionDate: "2024-01-15",
      status: "aprovada",
      votesFor: 35,
      votesAgainst: 5,
      votesAbstain: 2,
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: "2",
      title: "Contratação de empresa de segurança",
      description: "Decisão sobre mudança de empresa de vigilância",
      decisionType: "reuniao_conselho",
      decisionDate: "2024-01-10",
      status: "aprovada",
      votesFor: 4,
      votesAgainst: 1,
      votesAbstain: 0,
      createdAt: "2024-01-10T14:00:00Z",
    },
    {
      id: "3",
      title: "Reforma da guarita",
      description: "Proposta de reforma da guarita principal",
      decisionType: "assembleia",
      decisionDate: "2024-01-20",
      status: "pendente",
      votesFor: null,
      votesAgainst: null,
      votesAbstain: null,
      createdAt: "2024-01-08T09:00:00Z",
    },
  ];

  const mockMinutes: MeetingMinutes[] = [
    {
      id: "1",
      title: "Assembleia Geral Ordinária 2024",
      meetingType: "assembleia_ordinaria",
      meetingDate: "2024-01-15",
      attendeesCount: 42,
      quorumReached: true,
      status: "publicada",
      createdAt: "2024-01-15T18:00:00Z",
    },
    {
      id: "2",
      title: "Reunião do Conselho - Janeiro",
      meetingType: "reuniao_conselho",
      meetingDate: "2024-01-10",
      attendeesCount: 5,
      quorumReached: true,
      status: "publicada",
      createdAt: "2024-01-10T17:00:00Z",
    },
  ];

  const displayDecisions = decisions || mockDecisions;
  const displayMinutes = minutes || mockMinutes;

  const filteredDecisions = displayDecisions.filter(
    (d) =>
      d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: displayDecisions.length,
    approved: displayDecisions.filter((d) => d.status === "aprovada").length,
    pending: displayDecisions.filter((d) => d.status === "pendente").length,
    rejected: displayDecisions.filter((d) => d.status === "rejeitada").length,
  };

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Governança e Sucessão"
        description="Registro de decisões, atas e plano de sucessão"
        icon={Landmark}
        iconColor="emerald"
      />

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total de Decisões</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.approved}</p>
                <p className="text-xs text-muted-foreground">Aprovadas</p>
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
                <p className="text-2xl font-bold">{stats.pending}</p>
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
                <p className="text-2xl font-bold">{stats.rejected}</p>
                <p className="text-xs text-muted-foreground">Rejeitadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="decisions" className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <TabsList>
            <TabsTrigger value="decisions" data-testid="tab-decisions">
              <Vote className="h-4 w-4 mr-2" />
              Decisões
            </TabsTrigger>
            <TabsTrigger value="minutes" data-testid="tab-minutes">
              <FileText className="h-4 w-4 mr-2" />
              Atas
            </TabsTrigger>
            <TabsTrigger value="succession" data-testid="tab-succession">
              <Users className="h-4 w-4 mr-2" />
              Sucessão
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-decision">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Decisão
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Registrar Nova Decisão</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: Aprovação do orçamento 2024" data-testid="input-title" />
                          </FormControl>
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
                            <Textarea {...field} placeholder="Descreva a decisão..." data-testid="input-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="decisionType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-type">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="assembleia">Assembleia</SelectItem>
                                <SelectItem value="reuniao_conselho">Reunião de Conselho</SelectItem>
                                <SelectItem value="decisao_sindico">Decisão do Síndico</SelectItem>
                                <SelectItem value="votacao_online">Votação Online</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="decisionDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-status">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pendente">Pendente</SelectItem>
                              <SelectItem value="aprovada">Aprovada</SelectItem>
                              <SelectItem value="rejeitada">Rejeitada</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="votesFor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Votos a Favor</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} placeholder="0" data-testid="input-votes-for" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="votesAgainst"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Votos Contra</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} placeholder="0" data-testid="input-votes-against" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="votesAbstain"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Abstenções</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} placeholder="0" data-testid="input-votes-abstain" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createDecision.isPending} data-testid="button-submit">
                        {createDecision.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Registrar
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="decisions" className="space-y-4">
          <ScrollArea className="h-[calc(100vh-400px)]">
            <div className="space-y-3 pr-4">
              {filteredDecisions.map((decision) => {
                const statusConfig = statusLabels[decision.status] || statusLabels.pendente;
                const StatusIcon = statusConfig.icon;
                const totalVotes = (decision.votesFor || 0) + (decision.votesAgainst || 0) + (decision.votesAbstain || 0);

                return (
                  <Card key={decision.id} className="hover-elevate cursor-pointer" data-testid={`decision-${decision.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-sm">{decision.title}</h3>
                            <Badge variant="outline" className="text-xs">
                              {decisionTypeLabels[decision.decisionType] || decision.decisionType}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{decision.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(decision.decisionDate).toLocaleDateString("pt-BR")}
                            </span>
                            {totalVotes > 0 && (
                              <span className="flex items-center gap-1">
                                <Vote className="h-3 w-3" />
                                {decision.votesFor} a favor, {decision.votesAgainst} contra
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge className={`shrink-0 bg-${statusConfig.color}-500/10 text-${statusConfig.color}-600 border-${statusConfig.color}-500/20`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="minutes" className="space-y-4">
          <ScrollArea className="h-[calc(100vh-400px)]">
            <div className="space-y-3 pr-4">
              {displayMinutes.map((minute) => (
                <Card key={minute.id} className="hover-elevate cursor-pointer" data-testid={`minute-${minute.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-blue-500" />
                          <h3 className="font-medium text-sm">{minute.title}</h3>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(minute.meetingDate).toLocaleDateString("pt-BR")}
                          </span>
                          {minute.attendeesCount && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {minute.attendeesCount} presentes
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={minute.status === "publicada" ? "default" : "secondary"}>
                          {minute.status === "publicada" ? "Publicada" : "Rascunho"}
                        </Badge>
                        {minute.quorumReached && (
                          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600">
                            Quórum atingido
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="succession" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Plano de Sucessão</CardTitle>
              {!isEditingSuccession && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingSuccession(true)}
                  data-testid="button-edit-succession"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingSuccession ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : isEditingSuccession ? (
                <Form {...successionForm}>
                  <form onSubmit={successionForm.handleSubmit(onSubmitSuccession)} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={successionForm.control}
                        name="currentSindicoName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Síndico</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Nome completo do síndico" data-testid="input-sindico-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={successionForm.control}
                        name="successorName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sucessor Designado</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Nome do sucessor" data-testid="input-successor-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={successionForm.control}
                        name="mandateStartDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Início do Mandato</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-mandate-start" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={successionForm.control}
                        name="mandateEndDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fim do Mandato</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-mandate-end" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={successionForm.control}
                      name="transitionPlan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plano de Transição</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Descreva o plano de transição..." data-testid="input-transition-plan" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={successionForm.control}
                      name="keyResponsibilities"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsabilidades Críticas (uma por linha)</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Gestão de contratos&#10;Manutenção preventiva&#10;Prestação de contas" data-testid="input-responsibilities" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={successionForm.control}
                      name="criticalContacts"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contatos Críticos (um por linha)</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Administradora: (11) 99999-9999&#10;Síndico profissional: (11) 88888-8888" data-testid="input-contacts" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={successionForm.control}
                      name="pendingIssues"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pendências (uma por linha)</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Renovação de contrato de segurança&#10;Aprovação do orçamento anual" data-testid="input-pending" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsEditingSuccession(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={saveSuccession.isPending} data-testid="button-save-succession">
                        {saveSuccession.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground mb-1">Síndico Atual</p>
                      <p className="font-medium">{successionPlan?.currentSindicoName || "Não definido"}</p>
                      {successionPlan?.mandateStartDate && successionPlan?.mandateEndDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Mandato: {new Date(successionPlan.mandateStartDate).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })} - {new Date(successionPlan.mandateEndDate).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground mb-1">Sucessor Designado</p>
                      <p className="font-medium">{successionPlan?.successorName || "Não definido"}</p>
                    </div>
                  </div>
                  {successionPlan?.transitionPlan && (
                    <div className="rounded-lg border p-4">
                      <p className="text-sm font-medium mb-2">Plano de Transição</p>
                      <p className="text-sm text-muted-foreground">{successionPlan.transitionPlan}</p>
                    </div>
                  )}
                  {successionPlan?.keyResponsibilities && successionPlan.keyResponsibilities.length > 0 && (
                    <div className="rounded-lg border p-4">
                      <p className="text-sm font-medium mb-2">Responsabilidades Críticas</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {successionPlan.keyResponsibilities.map((item, idx) => (
                          <li key={idx}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {successionPlan?.criticalContacts && successionPlan.criticalContacts.length > 0 && (
                    <div className="rounded-lg border p-4">
                      <p className="text-sm font-medium mb-2">Contatos Críticos</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {successionPlan.criticalContacts.map((item, idx) => (
                          <li key={idx}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {successionPlan?.pendingIssues && successionPlan.pendingIssues.length > 0 && (
                    <div className="rounded-lg border p-4">
                      <p className="text-sm font-medium mb-2">Pendências</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {successionPlan.pendingIssues.map((item, idx) => (
                          <li key={idx}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!successionPlan && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum plano de sucessão cadastrado.</p>
                      <p className="text-sm mt-1">Clique em "Editar" para adicionar as informações.</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
