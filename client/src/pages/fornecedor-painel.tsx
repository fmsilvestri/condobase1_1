import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Store,
  Package,
  ShoppingCart,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  MessageCircle,
  DollarSign,
  RefreshCw,
  Play,
  Check,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  type FornecedorMarketplace,
  type Oferta,
  type Contratacao,
  type Avaliacao,
  statusContratacaoOptions,
} from "@shared/schema";

const statusLabels: Record<string, string> = {
  solicitado: "Solicitado",
  aceito: "Aceito",
  em_execucao: "Em Execucao",
  concluido: "Concluido",
  cancelado: "Cancelado",
};

const statusColors: Record<string, string> = {
  solicitado: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  aceito: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  em_execucao: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  concluido: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelado: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const aprovacaoLabels: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  bloqueado: "Bloqueado",
};

const aprovacaoColors: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  aprovado: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  bloqueado: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function FornecedorPainel() {
  const { toast } = useToast();
  const [selectedContratacao, setSelectedContratacao] = useState<Contratacao | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");

  const { data: perfil, isLoading: isLoadingPerfil } = useQuery<FornecedorMarketplace>({
    queryKey: ["/api/fornecedor/perfil"],
  });

  const { data: ofertas = [], isLoading: isLoadingOfertas } = useQuery<Oferta[]>({
    queryKey: ["/api/fornecedor/ofertas"],
  });

  const { data: contratacoes = [], isLoading: isLoadingContratacoes } = useQuery<Contratacao[]>({
    queryKey: ["/api/fornecedor/contratacoes"],
  });

  const { data: avaliacoes = [], isLoading: isLoadingAvaliacoes } = useQuery<Avaliacao[]>({
    queryKey: ["/api/fornecedor/avaliacoes"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/contratacoes/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fornecedor/contratacoes"] });
      setShowStatusDialog(false);
      setSelectedContratacao(null);
      toast({
        title: "Status atualizado",
        description: "O status da contratacao foi atualizado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Nao foi possivel atualizar o status.",
        variant: "destructive",
      });
    },
  });

  const handleUpdateStatus = () => {
    if (selectedContratacao && newStatus) {
      updateStatusMutation.mutate({ id: selectedContratacao.id, status: newStatus });
    }
  };

  const contratacoesPendentes = contratacoes.filter(c => c.status === "solicitado");
  const contratacoesEmAndamento = contratacoes.filter(c => ["aceito", "em_execucao"].includes(c.status));
  const contratacoesConcluidas = contratacoes.filter(c => ["concluido", "cancelado"].includes(c.status));

  if (isLoadingPerfil) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Store}
          title="Perfil nao encontrado"
          description="Voce nao esta cadastrado como fornecedor. Entre em contato com o administrador."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        icon={Store}
        title="Painel do Fornecedor"
        description="Gerencie suas ofertas, pedidos e avaliacoes"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle data-testid="text-supplier-name">{perfil.nomeFantasia}</CardTitle>
              <CardDescription>{perfil.descricao || "Sem descricao"}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={aprovacaoColors[perfil.statusAprovacao || "pendente"]}>
                {aprovacaoLabels[perfil.statusAprovacao || "pendente"]}
              </Badge>
              {perfil.avaliacaoMedia ? (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{perfil.avaliacaoMedia.toFixed(1)}</span>
                  <span className="text-muted-foreground text-sm">({perfil.totalAvaliacoes})</span>
                </div>
              ) : null}
            </div>
          </div>
        </CardHeader>
        {perfil.statusAprovacao === "bloqueado" && perfil.motivoBloqueio && (
          <CardContent>
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              <span>Motivo do bloqueio: {perfil.motivoBloqueio}</span>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-offers">{ofertas.length}</p>
                <p className="text-sm text-muted-foreground">Ofertas Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-pending-orders">{contratacoesPendentes.length}</p>
                <p className="text-sm text-muted-foreground">Pedidos Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <RefreshCw className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-ongoing-orders">{contratacoesEmAndamento.length}</p>
                <p className="text-sm text-muted-foreground">Em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-completed-orders">{contratacoesConcluidas.length}</p>
                <p className="text-sm text-muted-foreground">Concluidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pedidos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pedidos" data-testid="tab-orders">
            Pedidos {contratacoesPendentes.length > 0 && <Badge variant="destructive" className="ml-2">{contratacoesPendentes.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="ofertas" data-testid="tab-offers">Minhas Ofertas</TabsTrigger>
          <TabsTrigger value="avaliacoes" data-testid="tab-reviews">Avaliacoes</TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos" className="space-y-4">
          {isLoadingContratacoes ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          ) : contratacoes.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="Nenhum pedido"
              description="Voce ainda nao recebeu nenhum pedido."
            />
          ) : (
            <div className="space-y-6">
              {contratacoesPendentes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Novos Pedidos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {contratacoesPendentes.map((contratacao) => (
                      <Card key={contratacao.id} className="border-yellow-200 dark:border-yellow-800">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle className="text-base">Pedido #{contratacao.id.slice(0, 8)}</CardTitle>
                            <Badge className={statusColors[contratacao.status]}>
                              {statusLabels[contratacao.status]}
                            </Badge>
                          </div>
                          <CardDescription>
                            {contratacao.dataSolicitacao
                              ? new Date(contratacao.dataSolicitacao).toLocaleDateString("pt-BR")
                              : "Data nao informada"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-2">
                          {contratacao.observacoes && (
                            <p className="text-sm text-muted-foreground">{contratacao.observacoes}</p>
                          )}
                        </CardContent>
                        <CardFooter className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedContratacao(contratacao);
                              setNewStatus("aceito");
                              setShowStatusDialog(true);
                            }}
                            data-testid={`button-accept-${contratacao.id}`}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Aceitar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedContratacao(contratacao);
                              setNewStatus("cancelado");
                              setShowStatusDialog(true);
                            }}
                            data-testid={`button-reject-${contratacao.id}`}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Recusar
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {contratacoesEmAndamento.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Em Andamento</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {contratacoesEmAndamento.map((contratacao) => (
                      <Card key={contratacao.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle className="text-base">Pedido #{contratacao.id.slice(0, 8)}</CardTitle>
                            <Badge className={statusColors[contratacao.status]}>
                              {statusLabels[contratacao.status]}
                            </Badge>
                          </div>
                          <CardDescription>
                            {contratacao.dataAceite
                              ? `Aceito em ${new Date(contratacao.dataAceite).toLocaleDateString("pt-BR")}`
                              : "Aceito"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-2">
                          {contratacao.observacoes && (
                            <p className="text-sm text-muted-foreground">{contratacao.observacoes}</p>
                          )}
                        </CardContent>
                        <CardFooter className="flex gap-2">
                          {contratacao.status === "aceito" && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedContratacao(contratacao);
                                setNewStatus("em_execucao");
                                setShowStatusDialog(true);
                              }}
                              data-testid={`button-start-${contratacao.id}`}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Iniciar Execucao
                            </Button>
                          )}
                          {contratacao.status === "em_execucao" && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedContratacao(contratacao);
                                setNewStatus("concluido");
                                setShowStatusDialog(true);
                              }}
                              data-testid={`button-complete-${contratacao.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Concluir
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {contratacoesConcluidas.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Historico</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {contratacoesConcluidas.map((contratacao) => (
                      <Card key={contratacao.id} className="opacity-75">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle className="text-base">Pedido #{contratacao.id.slice(0, 8)}</CardTitle>
                            <Badge className={statusColors[contratacao.status]}>
                              {statusLabels[contratacao.status]}
                            </Badge>
                          </div>
                          <CardDescription>
                            {contratacao.dataConclusao
                              ? `Concluido em ${new Date(contratacao.dataConclusao).toLocaleDateString("pt-BR")}`
                              : contratacao.status === "cancelado" ? "Cancelado" : "Concluido"}
                          </CardDescription>
                        </CardHeader>
                        {contratacao.avaliacao && (
                          <CardContent>
                            <div className="flex items-center gap-2">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{contratacao.avaliacao}/5</span>
                              {contratacao.comentarioAvaliacao && (
                                <span className="text-sm text-muted-foreground">- {contratacao.comentarioAvaliacao}</span>
                              )}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ofertas" className="space-y-4">
          {isLoadingOfertas ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          ) : ofertas.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Nenhuma oferta"
              description="Voce ainda nao tem ofertas cadastradas. Entre em contato com o administrador para adicionar suas ofertas."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ofertas.map((oferta) => (
                <Card key={oferta.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{oferta.titulo}</CardTitle>
                      <Badge variant={oferta.ativo ? "default" : "secondary"}>
                        {oferta.ativo ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <CardDescription>{oferta.descricao || "Sem descricao"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      {oferta.precoBase && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">R$ {oferta.precoBase.toFixed(2)}</span>
                        </div>
                      )}
                      {oferta.recorrente && (
                        <Badge variant="outline">
                          <RefreshCw className="h-3 w-3 mr-1" />
                          {oferta.unidadePreco || "Recorrente"}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="avaliacoes" className="space-y-4">
          {isLoadingAvaliacoes ? (
            <div className="space-y-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : avaliacoes.length === 0 ? (
            <EmptyState
              icon={Star}
              title="Nenhuma avaliacao"
              description="Voce ainda nao recebeu avaliacoes."
            />
          ) : (
            <div className="space-y-4">
              {avaliacoes.map((avaliacao) => (
                <Card key={avaliacao.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= avaliacao.nota
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex-1">
                        {avaliacao.comentario && (
                          <p className="text-sm">{avaliacao.comentario}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {avaliacao.dataAvaliacao
                            ? new Date(avaliacao.dataAvaliacao).toLocaleDateString("pt-BR")
                            : ""}
                        </p>
                      </div>
                    </div>
                    {avaliacao.resposta && (
                      <div className="mt-3 pl-4 border-l-2 border-muted">
                        <p className="text-sm text-muted-foreground">
                          <strong>Sua resposta:</strong> {avaliacao.resposta}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Status</DialogTitle>
            <DialogDescription>
              Confirme a atualizacao do status do pedido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger data-testid="select-status">
                <SelectValue placeholder="Selecione o novo status" />
              </SelectTrigger>
              <SelectContent>
                {statusContratacaoOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={updateStatusMutation.isPending}
              data-testid="button-confirm-status"
            >
              {updateStatusMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
