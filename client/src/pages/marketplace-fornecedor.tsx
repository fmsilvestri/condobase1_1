import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Store,
  Plus,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  DollarSign,
  Phone,
  Mail,
  Loader2,
  Edit,
  Trash2,
  MessageCircle,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useCondominium } from "@/hooks/use-condominium";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  marketplaceTipoPrecoOptions,
  marketplaceStatusContratacaoOptions,
  type MarketplaceServico,
  type MarketplaceFornecedor,
  type MarketplaceOferta,
  type MarketplaceContratacao,
} from "@shared/schema";

const ofertaFormSchema = z.object({
  servicoId: z.string().min(1, "Selecione um servico"),
  titulo: z.string().min(2, "Titulo deve ter pelo menos 2 caracteres"),
  descricao: z.string().optional(),
  preco: z.coerce.number().min(0).optional(),
  tipoPreco: z.string().default("fixo"),
  disponivel: z.boolean().default(true),
  destaque: z.boolean().default(false),
});

type OfertaFormValues = z.infer<typeof ofertaFormSchema>;

const tipoPrecoLabels: Record<string, string> = {
  fixo: "Fixo",
  hora: "Por Hora",
  negociavel: "Negociável",
  orcamento: "Sob Orçamento",
};

const statusContratacaoLabels: Record<string, string> = {
  solicitado: "Solicitado",
  confirmado: "Confirmado",
  em_execucao: "Em Execução",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const statusContratacaoColors: Record<string, string> = {
  solicitado: "bg-yellow-500",
  confirmado: "bg-blue-500",
  em_execucao: "bg-purple-500",
  concluido: "bg-green-600",
  cancelado: "bg-gray-500",
};

type OfertaEnriquecida = MarketplaceOferta & {
  servico?: MarketplaceServico;
};

type ContratacaoEnriquecida = MarketplaceContratacao & {
  oferta?: MarketplaceOferta & {
    servico?: MarketplaceServico;
  };
};

export default function MarketplaceFornecedor() {
  const { toast } = useToast();
  const { selectedCondominium } = useCondominium();
  const [activeTab, setActiveTab] = useState("ofertas");
  
  const [ofertaDialogOpen, setOfertaDialogOpen] = useState(false);
  const [editingOferta, setEditingOferta] = useState<MarketplaceOferta | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ofertaToDelete, setOfertaToDelete] = useState<{ id: string; name: string } | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedContratacao, setSelectedContratacao] = useState<MarketplaceContratacao | null>(null);
  const [newStatus, setNewStatus] = useState("");

  const ofertaForm = useForm<OfertaFormValues>({
    resolver: zodResolver(ofertaFormSchema),
    defaultValues: { servicoId: "", titulo: "", descricao: "", preco: 0, tipoPreco: "fixo", disponivel: true, destaque: false },
  });

  const { data: meuFornecedor, isLoading: loadingFornecedor } = useQuery<MarketplaceFornecedor>({
    queryKey: ["/api/marketplace/fornecedores/me"],
    enabled: !!selectedCondominium,
  });

  const { data: servicos = [] } = useQuery<MarketplaceServico[]>({
    queryKey: ["/api/marketplace/servicos"],
    enabled: !!selectedCondominium,
  });

  const { data: minhasOfertas = [], isLoading: loadingOfertas } = useQuery<OfertaEnriquecida[]>({
    queryKey: ["/api/marketplace/ofertas/me"],
    enabled: !!selectedCondominium && !!meuFornecedor,
  });

  const { data: minhasContratacoes = [], isLoading: loadingContratacoes } = useQuery<ContratacaoEnriquecida[]>({
    queryKey: ["/api/marketplace/contratacoes/fornecedor"],
    enabled: !!selectedCondominium && !!meuFornecedor,
  });

  const createOfertaMutation = useMutation({
    mutationFn: (data: OfertaFormValues) => apiRequest("POST", "/api/marketplace/ofertas", { ...data, fornecedorId: meuFornecedor?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/ofertas/me"] });
      toast({ title: "Oferta criada com sucesso!" });
      setOfertaDialogOpen(false);
      ofertaForm.reset();
    },
    onError: () => toast({ title: "Erro ao criar oferta", variant: "destructive" }),
  });

  const updateOfertaMutation = useMutation({
    mutationFn: (data: OfertaFormValues) => apiRequest("PATCH", `/api/marketplace/ofertas/${editingOferta?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/ofertas/me"] });
      toast({ title: "Oferta atualizada!" });
      setOfertaDialogOpen(false);
      setEditingOferta(null);
      ofertaForm.reset();
    },
    onError: () => toast({ title: "Erro ao atualizar oferta", variant: "destructive" }),
  });

  const deleteOfertaMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/marketplace/ofertas/${ofertaToDelete?.id}`, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/ofertas/me"] });
      toast({ title: "Oferta excluída!" });
      setDeleteDialogOpen(false);
      setOfertaToDelete(null);
    },
    onError: () => toast({ title: "Erro ao excluir oferta", variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      apiRequest("PATCH", `/api/marketplace/contratacoes/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/contratacoes/fornecedor"] });
      toast({ title: "Status atualizado!" });
      setStatusDialogOpen(false);
      setSelectedContratacao(null);
      setNewStatus("");
    },
    onError: () => toast({ title: "Erro ao atualizar status", variant: "destructive" }),
  });

  const handleEditOferta = (oferta: MarketplaceOferta) => {
    setEditingOferta(oferta);
    ofertaForm.reset({
      servicoId: oferta.servicoId ?? "",
      titulo: oferta.titulo,
      descricao: oferta.descricao ?? "",
      preco: oferta.preco ?? 0,
      tipoPreco: oferta.tipoPreco ?? "fixo",
      disponivel: oferta.disponivel ?? true,
      destaque: oferta.destaque ?? false,
    });
    setOfertaDialogOpen(true);
  };

  const handleDeleteOferta = (oferta: MarketplaceOferta) => {
    setOfertaToDelete({ id: oferta.id, name: oferta.titulo });
    setDeleteDialogOpen(true);
  };

  const handleStatusChange = (contratacao: MarketplaceContratacao) => {
    setSelectedContratacao(contratacao);
    setNewStatus(contratacao.status);
    setStatusDialogOpen(true);
  };

  const onSubmitOferta = (data: OfertaFormValues) => {
    if (editingOferta) {
      updateOfertaMutation.mutate(data);
    } else {
      createOfertaMutation.mutate(data);
    }
  };

  const getServicoName = (id: string) => servicos.find(s => s.id === id)?.nome || "-";

  const contratacoesPendentes = minhasContratacoes.filter(c => c.status === "solicitado");
  const contratacoesAtivas = minhasContratacoes.filter(c => ["confirmado", "em_execucao"].includes(c.status));
  const contratacoesFinalizadas = minhasContratacoes.filter(c => ["concluido", "cancelado"].includes(c.status));

  if (!selectedCondominium) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Store}
          title="Selecione um Condominio"
          description="Selecione um condominio para acessar o painel do fornecedor."
        />
      </div>
    );
  }

  if (loadingFornecedor) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!meuFornecedor) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Store}
          title="Voce nao e um fornecedor"
          description="Para acessar o painel do fornecedor, voce precisa estar cadastrado como fornecedor. Entre em contato com a administracao."
        />
      </div>
    );
  }

  if (meuFornecedor.status === "pendente") {
    return (
      <div className="p-6">
        <EmptyState
          icon={Clock}
          title="Aguardando Aprovacao"
          description="Seu cadastro como fornecedor esta em analise. Voce sera notificado quando for aprovado."
        />
      </div>
    );
  }

  if (meuFornecedor.status === "rejeitado" || meuFornecedor.status === "suspenso") {
    return (
      <div className="p-6">
        <EmptyState
          icon={AlertCircle}
          title="Acesso Bloqueado"
          description="Seu cadastro como fornecedor esta bloqueado ou suspenso. Entre em contato com a administracao."
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={`Painel do Fornecedor - ${meuFornecedor.nomeComercial}`}
        description="Gerencie suas ofertas e solicitacoes"
        icon={Store}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ofertas Ativas</CardDescription>
            <CardTitle className="text-2xl">{minhasOfertas.filter(o => o.disponivel).length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Solicitacoes Pendentes</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{contratacoesPendentes.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Em Andamento</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{contratacoesAtivas.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avaliacao Media</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-1">
              <Star className="h-5 w-5 text-yellow-500" />
              {(meuFornecedor as any).notaMedia?.toFixed(1) || "-"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ofertas" data-testid="tab-ofertas">
            <Package className="h-4 w-4 mr-2" />
            Minhas Ofertas
          </TabsTrigger>
          <TabsTrigger value="pendentes" data-testid="tab-pendentes">
            <Clock className="h-4 w-4 mr-2" />
            Pendentes ({contratacoesPendentes.length})
          </TabsTrigger>
          <TabsTrigger value="contratacoes" data-testid="tab-contratacoes">
            <CheckCircle className="h-4 w-4 mr-2" />
            Contratacoes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ofertas" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingOferta(null); ofertaForm.reset(); setOfertaDialogOpen(true); }} data-testid="button-add-oferta">
              <Plus className="h-4 w-4 mr-2" />
              Nova Oferta
            </Button>
          </div>

          {loadingOfertas ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : minhasOfertas.length === 0 ? (
            <EmptyState icon={Package} title="Nenhuma oferta" description="Crie sua primeira oferta de servico." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {minhasOfertas.map(oferta => (
                <Card key={oferta.id} data-testid={`card-oferta-${oferta.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <CardTitle className="text-lg">{oferta.titulo}</CardTitle>
                      <Badge variant={oferta.disponivel ? "default" : "secondary"}>
                        {oferta.disponivel ? "Disponível" : "Indisponível"}
                      </Badge>
                    </div>
                    <CardDescription>{getServicoName(oferta.servicoId ?? "")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      {oferta.preco ? (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-semibold">R$ {oferta.preco.toFixed(2)}</span>
                          <Badge variant="outline">{tipoPrecoLabels[oferta.tipoPreco || "fixo"]}</Badge>
                        </div>
                      ) : null}
                      {oferta.destaque && (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                          <Star className="h-3 w-3 mr-1" />
                          Destaque
                        </Badge>
                      )}
                      <p className="text-sm text-muted-foreground">{oferta.descricao || "Sem descricao"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditOferta(oferta)} data-testid={`button-edit-oferta-${oferta.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeleteOferta(oferta)} data-testid={`button-delete-oferta-${oferta.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pendentes" className="space-y-4">
          {loadingContratacoes ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : contratacoesPendentes.length === 0 ? (
            <EmptyState icon={Clock} title="Nenhuma solicitacao pendente" description="Aguarde novas solicitacoes de contratacao." />
          ) : (
            <div className="space-y-4">
              {contratacoesPendentes.map(contratacao => (
                <Card key={contratacao.id} data-testid={`card-contratacao-${contratacao.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">{contratacao.oferta?.titulo || "Oferta"}</h3>
                        <p className="text-sm text-muted-foreground">{contratacao.oferta?.servico?.nome || "Servico"}</p>
                        {contratacao.observacoes && (
                          <p className="text-sm mt-2 p-2 bg-muted rounded">{contratacao.observacoes}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Solicitado em: {new Date(contratacao.createdAt || "").toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => updateStatusMutation.mutate({ id: contratacao.id, status: "confirmado" })}
                          disabled={updateStatusMutation.isPending}
                          data-testid={`button-aceitar-${contratacao.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Confirmar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => updateStatusMutation.mutate({ id: contratacao.id, status: "cancelado" })}
                          disabled={updateStatusMutation.isPending}
                          data-testid={`button-recusar-${contratacao.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Recusar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contratacoes" className="space-y-4">
          {loadingContratacoes ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : [...contratacoesAtivas, ...contratacoesFinalizadas].length === 0 ? (
            <EmptyState icon={Package} title="Nenhuma contratacao" description="Suas contratacoes aparecerão aqui." />
          ) : (
            <div className="space-y-4">
              {[...contratacoesAtivas, ...contratacoesFinalizadas].map(contratacao => (
                <Card key={contratacao.id} data-testid={`card-contratacao-${contratacao.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{contratacao.oferta?.titulo || "Oferta"}</h3>
                          <Badge className={statusContratacaoColors[contratacao.status]}>
                            {statusContratacaoLabels[contratacao.status]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{contratacao.oferta?.servico?.nome || "Servico"}</p>
                        {contratacao.observacoes && (
                          <p className="text-sm mt-2 p-2 bg-muted rounded">{contratacao.observacoes}</p>
                        )}
                      </div>
                      {["aceito", "em_andamento"].includes(contratacao.status) && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleStatusChange(contratacao)}
                          data-testid={`button-status-${contratacao.id}`}
                        >
                          Atualizar Status
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={ofertaDialogOpen} onOpenChange={setOfertaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOferta ? "Editar Oferta" : "Nova Oferta"}</DialogTitle>
            <DialogDescription>Preencha os dados da oferta.</DialogDescription>
          </DialogHeader>
          <Form {...ofertaForm}>
            <form onSubmit={ofertaForm.handleSubmit(onSubmitOferta)} className="space-y-4">
              <FormField control={ofertaForm.control} name="servicoId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Servico</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-oferta-servico"><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {servicos.filter(s => s.ativo).map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={ofertaForm.control} name="titulo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Titulo</FormLabel>
                  <FormControl><Input {...field} data-testid="input-oferta-titulo" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={ofertaForm.control} name="preco" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preco (R$)</FormLabel>
                    <FormControl><Input {...field} type="number" step="0.01" data-testid="input-oferta-preco" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={ofertaForm.control} name="tipoPreco" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Preco</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-oferta-tipo-preco"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {marketplaceTipoPrecoOptions.map(t => (
                          <SelectItem key={t} value={t}>{tipoPrecoLabels[t]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={ofertaForm.control} name="descricao" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descricao</FormLabel>
                  <FormControl><Textarea {...field} data-testid="input-oferta-descricao" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={ofertaForm.control} name="disponivel" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel>Disponível</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-oferta-disponivel" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={ofertaForm.control} name="destaque" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel>Destaque</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-oferta-destaque" /></FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOfertaDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createOfertaMutation.isPending || updateOfertaMutation.isPending} data-testid="button-submit-oferta">
                  {(createOfertaMutation.isPending || updateOfertaMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Status</DialogTitle>
            <DialogDescription>Selecione o novo status da contratacao.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger data-testid="select-new-status">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {marketplaceStatusContratacaoOptions.filter(s => s !== "solicitado").map(s => (
                  <SelectItem key={s} value={s}>{statusContratacaoLabels[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancelar</Button>
              <Button 
                onClick={() => selectedContratacao && updateStatusMutation.mutate({ id: selectedContratacao.id, status: newStatus })}
                disabled={updateStatusMutation.isPending || !newStatus}
                data-testid="button-confirm-status"
              >
                {updateStatusMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Oferta</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir a oferta "{ofertaToDelete?.name}"? Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteOfertaMutation.mutate()} data-testid="button-confirm-delete">
              {deleteOfertaMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
