import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Store,
  Search,
  Star,
  Phone,
  MessageCircle,
  DollarSign,
  RefreshCw,
  Filter,
  ShoppingCart,
  CheckCircle,
  Clock,
  Loader2,
  Tag,
  PawPrint,
  Car,
  Sparkles,
  Wrench,
  User,
  Package,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useCondominium } from "@/hooks/use-condominium";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  type MarketplaceCategoria,
  type MarketplaceServico,
  type MarketplaceFornecedor,
  type MarketplaceOferta,
  type MarketplaceContratacao,
  type MarketplaceAvaliacao,
  marketplaceStatusContratacaoOptions,
} from "@shared/schema";

interface OfertaEnriquecida extends MarketplaceOferta {
  servico?: MarketplaceServico;
  fornecedor?: MarketplaceFornecedor;
  categoria?: MarketplaceCategoria;
}

const tipoServicoIcons: Record<string, any> = {
  veiculo: Car,
  pet: PawPrint,
  limpeza: Sparkles,
  manutencao: Wrench,
  pessoal: User,
  geral: Package,
};

const tipoServicoLabels: Record<string, string> = {
  veiculo: "Veiculo",
  pet: "Pet",
  limpeza: "Limpeza",
  manutencao: "Manutencao",
  pessoal: "Pessoal",
  geral: "Geral",
};

const statusLabels: Record<string, string> = {
  solicitado: "Solicitado",
  confirmado: "Confirmado",
  em_execucao: "Em Execucao",
  concluido: "Concluido",
  cancelado: "Cancelado",
};

const statusColors: Record<string, string> = {
  solicitado: "bg-yellow-100 text-yellow-800",
  confirmado: "bg-blue-100 text-blue-800",
  em_execucao: "bg-purple-100 text-purple-800",
  concluido: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

const tipoPrecoLabels: Record<string, string> = {
  fixo: "Preco Fixo",
  hora: "Por Hora",
  orcamento: "Sob Orcamento",
  negociavel: "Negociavel",
};

export default function Marketplace() {
  const { toast } = useToast();
  const { selectedCondominium } = useCondominium();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategoria, setFilterCategoria] = useState<string>("todas");
  const [filterTipoPreco, setFilterTipoPreco] = useState<string>("todos");
  const [filterAvaliacao, setFilterAvaliacao] = useState<string>("todas");
  const [filterPrecoMax, setFilterPrecoMax] = useState<string>("");
  const [activeTab, setActiveTab] = useState("ofertas");
  
  const [detalhesDialogOpen, setDetalhesDialogOpen] = useState(false);
  const [selectedOfertaDetalhes, setSelectedOfertaDetalhes] = useState<OfertaEnriquecida | null>(null);
  
  const [contratarDialogOpen, setContratarDialogOpen] = useState(false);
  const [selectedOferta, setSelectedOferta] = useState<OfertaEnriquecida | null>(null);
  const [observacoes, setObservacoes] = useState("");
  
  const [avaliarDialogOpen, setAvaliarDialogOpen] = useState(false);
  const [selectedContratacao, setSelectedContratacao] = useState<MarketplaceContratacao | null>(null);
  const [avaliacao, setAvaliacao] = useState(5);
  const [comentarioAvaliacao, setComentarioAvaliacao] = useState("");

  const { data: categorias = [] } = useQuery<MarketplaceCategoria[]>({
    queryKey: ["/api/marketplace/categorias"],
    enabled: !!selectedCondominium,
  });

  const { data: servicos = [] } = useQuery<MarketplaceServico[]>({
    queryKey: ["/api/marketplace/servicos"],
    enabled: !!selectedCondominium,
  });

  const { data: fornecedores = [] } = useQuery<MarketplaceFornecedor[]>({
    queryKey: ["/api/marketplace/fornecedores"],
    enabled: !!selectedCondominium,
  });

  const { data: ofertas = [], isLoading: loadingOfertas } = useQuery<MarketplaceOferta[]>({
    queryKey: ["/api/marketplace/ofertas"],
    enabled: !!selectedCondominium,
  });

  const { data: contratacoes = [], isLoading: loadingContratacoes } = useQuery<MarketplaceContratacao[]>({
    queryKey: ["/api/marketplace/contratacoes/morador"],
    enabled: !!selectedCondominium,
  });

  const { data: avaliacoes = [] } = useQuery<MarketplaceAvaliacao[]>({
    queryKey: ["/api/marketplace/avaliacoes"],
    enabled: !!selectedCondominium,
  });

  const marketplace: OfertaEnriquecida[] = ofertas.map(oferta => ({
    ...oferta,
    servico: servicos.find(s => s.id === oferta.servicoId),
    fornecedor: fornecedores.find(f => f.id === oferta.fornecedorId),
    categoria: servicos.find(s => s.id === oferta.servicoId)?.categoriaId 
      ? categorias.find(c => c.id === servicos.find(s => s.id === oferta.servicoId)?.categoriaId)
      : undefined,
  }));

  const loadingMarketplace = loadingOfertas;

  const contratarMutation = useMutation({
    mutationFn: (data: { ofertaId: string; fornecedorId: string; observacoes?: string; valor?: number }) =>
      apiRequest("POST", "/api/marketplace/contratacoes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/contratacoes/morador"] });
      toast({ title: "Servico contratado com sucesso!" });
      setContratarDialogOpen(false);
      setSelectedOferta(null);
      setObservacoes("");
    },
    onError: () => toast({ title: "Erro ao contratar servico", variant: "destructive" }),
  });

  const avaliarMutation = useMutation({
    mutationFn: (data: { contratacaoId: string; fornecedorId: string; nota: number; comentario?: string }) =>
      apiRequest("POST", "/api/marketplace/avaliacoes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/contratacoes/morador"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/fornecedores"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/avaliacoes"] });
      toast({ title: "Avaliacao enviada!" });
      setAvaliarDialogOpen(false);
      setSelectedContratacao(null);
      setAvaliacao(5);
      setComentarioAvaliacao("");
    },
    onError: () => toast({ title: "Erro ao avaliar", variant: "destructive" }),
  });

  const handleContratar = (oferta: OfertaEnriquecida) => {
    setSelectedOferta(oferta);
    setContratarDialogOpen(true);
  };

  const handleAvaliar = (contratacao: MarketplaceContratacao) => {
    setSelectedContratacao(contratacao);
    setAvaliarDialogOpen(true);
  };

  const submitContratacao = () => {
    if (!selectedOferta) return;
    contratarMutation.mutate({
      ofertaId: selectedOferta.id,
      fornecedorId: selectedOferta.fornecedorId,
      observacoes: observacoes || undefined,
      valor: selectedOferta.preco || undefined,
    });
  };

  const submitAvaliacao = () => {
    if (!selectedContratacao) return;
    avaliarMutation.mutate({ 
      contratacaoId: selectedContratacao.id,
      fornecedorId: selectedContratacao.fornecedorId,
      nota: avaliacao, 
      comentario: comentarioAvaliacao || undefined
    });
  };

  const getOfertaInfo = (ofertaId: string | null) => {
    if (!ofertaId) return { oferta: null, servico: null, fornecedor: null };
    const oferta = ofertas.find(o => o.id === ofertaId);
    const servico = oferta ? servicos.find(s => s.id === oferta.servicoId) : null;
    const fornecedor = oferta ? fornecedores.find(f => f.id === oferta.fornecedorId) : null;
    return { oferta, servico, fornecedor };
  };

  const getFornecedorNome = (fornecedorId: string) => {
    const fornecedor = fornecedores.find(f => f.id === fornecedorId);
    return fornecedor?.nomeComercial || "-";
  };

  const getFornecedorAvaliacao = (fornecedorId: string) => {
    const fornecedor = fornecedores.find(f => f.id === fornecedorId);
    return fornecedor?.avaliacaoMedia || 0;
  };

  const handleVerDetalhes = (oferta: OfertaEnriquecida) => {
    setSelectedOfertaDetalhes(oferta);
    setDetalhesDialogOpen(true);
  };

  const filteredMarketplace = marketplace.filter(oferta => {
    const matchesSearch = oferta.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      oferta.servico?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      oferta.fornecedor?.nomeComercial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      oferta.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategoria = filterCategoria === "todas" || oferta.servico?.categoriaId === filterCategoria;
    
    const matchesTipoPreco = filterTipoPreco === "todos" || oferta.tipoPreco === filterTipoPreco;
    
    const fornecedorAvaliacao = getFornecedorAvaliacao(oferta.fornecedorId);
    const matchesAvaliacao = filterAvaliacao === "todas" || 
      (filterAvaliacao === "5" && fornecedorAvaliacao >= 5) ||
      (filterAvaliacao === "4" && fornecedorAvaliacao >= 4) ||
      (filterAvaliacao === "3" && fornecedorAvaliacao >= 3);
    
    const precoMaxNum = filterPrecoMax !== "" ? parseFloat(filterPrecoMax) : null;
    const matchesPreco = precoMaxNum === null || !oferta.preco || oferta.preco <= precoMaxNum;
    
    return matchesSearch && matchesCategoria && matchesTipoPreco && matchesAvaliacao && matchesPreco;
  });

  const categoriasDisponiveis = categorias.filter(c => c.ativo);

  if (!selectedCondominium) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Store}
          title="Selecione um Condominio"
          description="Selecione um condominio para acessar o marketplace."
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Marketplace de Servicos"
        description="Encontre e contrate servicos para sua unidade"
        icon={Store}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="ofertas" data-testid="tab-ofertas" className="gap-2 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400">
            <span>🛒</span> Ofertas
          </TabsTrigger>
          <TabsTrigger value="minhas-contratacoes" data-testid="tab-contratacoes" className="gap-2 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-600 dark:data-[state=active]:text-green-400">
            <span>✅</span> Minhas Contratações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ofertas" className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, servico, fornecedor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterCategoria("todas");
                    setFilterTipoPreco("todos");
                    setFilterAvaliacao("todas");
                    setFilterPrecoMax("");
                  }}
                  data-testid="button-limpar-filtros"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                  <SelectTrigger className="w-44" data-testid="select-filter-categoria">
                    <Tag className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas categorias</SelectItem>
                    {categoriasDisponiveis.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterTipoPreco} onValueChange={setFilterTipoPreco}>
                  <SelectTrigger className="w-40" data-testid="select-filter-tipo-preco">
                    <DollarSign className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Tipo Preco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos tipos</SelectItem>
                    <SelectItem value="fixo">Preco Fixo</SelectItem>
                    <SelectItem value="hora">Por Hora</SelectItem>
                    <SelectItem value="orcamento">Sob Orcamento</SelectItem>
                    <SelectItem value="negociavel">Negociavel</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterAvaliacao} onValueChange={setFilterAvaliacao}>
                  <SelectTrigger className="w-40" data-testid="select-filter-avaliacao">
                    <Star className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Avaliacao" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas avaliacoes</SelectItem>
                    <SelectItem value="5">5 estrelas</SelectItem>
                    <SelectItem value="4">4+ estrelas</SelectItem>
                    <SelectItem value="3">3+ estrelas</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative w-36">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="Preco max"
                    value={filterPrecoMax}
                    onChange={(e) => setFilterPrecoMax(e.target.value)}
                    className="pl-10"
                    data-testid="input-preco-max"
                  />
                </div>
              </div>

              <div className="text-sm text-muted-foreground" data-testid="text-result-count">
                {filteredMarketplace.length} {filteredMarketplace.length === 1 ? "oferta encontrada" : "ofertas encontradas"}
              </div>
            </div>
          </Card>

          {loadingMarketplace ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64" />)}
            </div>
          ) : filteredMarketplace.length === 0 ? (
            <EmptyState
              icon={Store}
              title="Nenhuma oferta encontrada"
              description={searchTerm || filterCategoria !== "todas"
                ? "Tente ajustar os filtros de busca."
                : "Ainda nao ha ofertas disponiveis no marketplace."}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMarketplace.map(oferta => {
                const TipoIcon = oferta.categoria?.icone ? tipoServicoIcons[oferta.categoria.icone] || Package : Package;
                return (
                  <Card key={oferta.id} className="flex flex-col" data-testid={`card-oferta-${oferta.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <TipoIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{oferta.titulo}</CardTitle>
                            <CardDescription>{oferta.servico?.nome}</CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="space-y-3">
                        {oferta.categoria && (
                          <Badge variant="outline">{oferta.categoria.nome}</Badge>
                        )}
                        
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {oferta.descricao || "Sem descricao"}
                        </p>

                        {oferta.fornecedor && (
                          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{oferta.fornecedor.nomeComercial}</span>
                              {oferta.fornecedor.avaliacaoMedia ? (
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                  <span className="text-sm">{oferta.fornecedor.avaliacaoMedia.toFixed(1)}</span>
                                </div>
                              ) : null}
                            </div>
                            <div className="flex gap-2">
                              {oferta.fornecedor.whatsapp && (
                                <a
                                  href={`https://wa.me/${oferta.fornecedor.whatsapp.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-600"
                                  data-testid={`link-whatsapp-${oferta.id}`}
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </a>
                              )}
                              {oferta.fornecedor.telefone && (
                                <a
                                  href={`tel:${oferta.fornecedor.telefone}`}
                                  className="text-muted-foreground"
                                  data-testid={`link-telefone-${oferta.id}`}
                                >
                                  <Phone className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {oferta.preco ? (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-green-600" />
                            <span className="text-xl font-bold">R$ {Number(oferta.preco).toFixed(2)}</span>
                            <Badge variant="secondary">{tipoPrecoLabels[oferta.tipoPreco || "avulso"]}</Badge>
                          </div>
                        ) : (
                          <Badge variant="outline">Consultar preco</Badge>
                        )}

                        {oferta.destaque && (
                          <Badge variant="outline">
                            <Star className="h-3 w-3 mr-1" />
                            Destaque
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => handleVerDetalhes(oferta)} data-testid={`button-detalhes-${oferta.id}`}>
                        Ver Detalhes
                      </Button>
                      <Button className="flex-1" onClick={() => handleContratar(oferta)} data-testid={`button-contratar-${oferta.id}`}>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Contratar
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="minhas-contratacoes" className="space-y-4">
          {loadingContratacoes ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : contratacoes.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="Nenhuma contratacao"
              description="Voce ainda nao contratou nenhum servico."
            />
          ) : (
            <div className="space-y-4">
              {contratacoes.map(contratacao => {
                const { oferta, servico, fornecedor } = getOfertaInfo(contratacao.ofertaId);
                return (
                  <Card key={contratacao.id} data-testid={`card-contratacao-${contratacao.id}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{oferta?.titulo || "Oferta"}</h3>
                            <Badge className={statusColors[contratacao.status]}>
                              {statusLabels[contratacao.status]}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {servico?.nome} - {fornecedor?.nomeComercial || getFornecedorNome(contratacao.fornecedorId)}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>Solicitado em: {contratacao.createdAt ? new Date(contratacao.createdAt).toLocaleDateString("pt-BR") : "-"}</span>
                          </div>
                          {contratacao.observacoes && (
                            <p className="text-sm mt-2 p-2 bg-muted rounded">{contratacao.observacoes}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {contratacao.status === "concluido" && !avaliacoes.find(a => a.contratacaoId === contratacao.id) && (
                            <Button size="sm" onClick={() => handleAvaliar(contratacao)} data-testid={`button-avaliar-${contratacao.id}`}>
                              <Star className="h-4 w-4 mr-2" />
                              Avaliar
                            </Button>
                          )}
                          {avaliacoes.find(a => a.contratacaoId === contratacao.id) && (
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map(i => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${i <= (avaliacoes.find(a => a.contratacaoId === contratacao.id)?.nota || 0) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                                />
                              ))}
                            </div>
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
      </Tabs>

      <Dialog open={contratarDialogOpen} onOpenChange={setContratarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contratar Servico</DialogTitle>
            <DialogDescription>
              {selectedOferta?.titulo} - {selectedOferta?.servico?.nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedOferta?.preco && (
              <div className="p-3 rounded-lg bg-muted">
                <span className="text-sm text-muted-foreground">Valor:</span>
                <span className="ml-2 font-semibold">R$ {selectedOferta.preco.toFixed(2)}</span>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block">Observacoes (opcional)</label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Descreva detalhes adicionais sobre o servico..."
                data-testid="input-observacoes"
              />
            </div>
            {selectedOferta?.preco && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Valor estimado:</span>
                  <span className="text-xl font-bold text-green-600">
                    R$ {Number(selectedOferta.preco).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContratarDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={submitContratacao}
              disabled={contratarMutation.isPending}
              data-testid="button-confirm-contratar"
            >
              {contratarMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Contratacao
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={avaliarDialogOpen} onOpenChange={setAvaliarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avaliar Servico</DialogTitle>
            <DialogDescription>
              Como foi sua experiencia com este servico?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Avaliacao</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAvaliacao(i)}
                    className="p-1 hover:scale-110 transition-transform"
                    data-testid={`star-${i}`}
                  >
                    <Star
                      className={`h-8 w-8 ${i <= avaliacao ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Comentario (opcional)</label>
              <Textarea
                value={comentarioAvaliacao}
                onChange={(e) => setComentarioAvaliacao(e.target.value)}
                placeholder="Deixe seu comentario sobre o servico..."
                data-testid="input-comentario"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAvaliarDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitAvaliacao} disabled={avaliarMutation.isPending} data-testid="button-submit-avaliacao">
              {avaliarMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar Avaliacao
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detalhesDialogOpen} onOpenChange={setDetalhesDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedOfertaDetalhes?.titulo}</DialogTitle>
            <DialogDescription>
              Detalhes completos do servico
            </DialogDescription>
          </DialogHeader>
          {selectedOfertaDetalhes && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Servico</span>
                  <p className="font-medium">{selectedOfertaDetalhes.servico?.nome || "-"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Categoria</span>
                  <p className="font-medium">{selectedOfertaDetalhes.categoria?.nome || "-"}</p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Descricao</span>
                <p className="text-sm">{selectedOfertaDetalhes.descricao || "Sem descricao disponivel"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Preco</span>
                  <div className="flex items-center gap-2">
                    {selectedOfertaDetalhes.preco ? (
                      <>
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <span className="text-xl font-bold text-green-600">
                          R$ {Number(selectedOfertaDetalhes.preco).toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Sob consulta</span>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Tipo de Preco</span>
                  <Badge variant="secondary">{tipoPrecoLabels[selectedOfertaDetalhes.tipoPreco || "fixo"]}</Badge>
                </div>
              </div>

              {selectedOfertaDetalhes.fornecedor && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-3">Fornecedor</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{selectedOfertaDetalhes.fornecedor.nomeComercial}</span>
                      {selectedOfertaDetalhes.fornecedor.avaliacaoMedia ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                          <span className="font-medium">{selectedOfertaDetalhes.fornecedor.avaliacaoMedia.toFixed(1)}</span>
                          <span className="text-muted-foreground text-sm">
                            ({selectedOfertaDetalhes.fornecedor.totalAvaliacoes || 0} avaliacoes)
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sem avaliacoes</span>
                      )}
                    </div>
                    
                    {selectedOfertaDetalhes.fornecedor.descricao && (
                      <p className="text-sm text-muted-foreground">{selectedOfertaDetalhes.fornecedor.descricao}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-3 pt-2">
                      {selectedOfertaDetalhes.fornecedor.whatsapp && (
                        <a
                          href={`https://wa.me/${selectedOfertaDetalhes.fornecedor.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-green-600"
                          data-testid="link-whatsapp-detalhes"
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span className="text-sm">WhatsApp</span>
                        </a>
                      )}
                      {selectedOfertaDetalhes.fornecedor.telefone && (
                        <a
                          href={`tel:${selectedOfertaDetalhes.fornecedor.telefone}`}
                          className="flex items-center gap-2 text-muted-foreground"
                          data-testid="link-telefone-detalhes"
                        >
                          <Phone className="h-4 w-4" />
                          <span className="text-sm">{selectedOfertaDetalhes.fornecedor.telefone}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {selectedOfertaDetalhes.destaque && (
                <Badge variant="outline" className="w-fit">
                  <Star className="h-3 w-3 mr-1 fill-yellow-500 text-yellow-500" />
                  Servico em Destaque
                </Badge>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetalhesDialogOpen(false)} data-testid="button-fechar-detalhes">
              Fechar
            </Button>
            <Button 
              onClick={() => {
                if (selectedOfertaDetalhes) {
                  handleContratar(selectedOfertaDetalhes);
                  setDetalhesDialogOpen(false);
                }
              }}
              data-testid="button-contratar-from-detalhes"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Contratar Servico
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
