import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Store,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  Loader2,
  Tag,
  Building2,
  Package,
  Star,
  MessageCircle,
  DollarSign,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
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
  type MarketplaceCategoria,
  type MarketplaceServico,
  type MarketplaceFornecedor,
  type MarketplaceOferta,
} from "@shared/schema";

const categoriaFormSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  descricao: z.string().optional(),
  icone: z.string().optional(),
  ordem: z.coerce.number().default(0),
  ativo: z.boolean().default(true),
});

const servicoFormSchema = z.object({
  categoriaId: z.string().min(1, "Selecione uma categoria"),
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
});

const fornecedorFormSchema = z.object({
  nomeComercial: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  documento: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email("Email invalido").optional().or(z.literal("")),
  whatsapp: z.string().optional(),
  endereco: z.string().optional(),
  descricao: z.string().optional(),
});

const ofertaFormSchema = z.object({
  servicoId: z.string().min(1, "Selecione um servico"),
  fornecedorId: z.string().min(1, "Selecione um fornecedor"),
  titulo: z.string().min(2, "Titulo deve ter pelo menos 2 caracteres"),
  descricao: z.string().optional(),
  preco: z.coerce.number().min(0).optional(),
  tipoPreco: z.string().default("fixo"),
  disponivel: z.boolean().default(true),
  destaque: z.boolean().default(false),
});

type CategoriaFormValues = z.infer<typeof categoriaFormSchema>;
type ServicoFormValues = z.infer<typeof servicoFormSchema>;
type FornecedorFormValues = z.infer<typeof fornecedorFormSchema>;
type OfertaFormValues = z.infer<typeof ofertaFormSchema>;

const tipoPrecoLabels: Record<string, string> = {
  fixo: "Fixo",
  hora: "Por Hora",
  negociavel: "Negociável",
  orcamento: "Sob Orçamento",
};

export default function MarketplaceAdmin() {
  const { toast } = useToast();
  const { selectedCondominium } = useCondominium();
  const [activeTab, setActiveTab] = useState("categorias");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [categoriaDialogOpen, setCategoriaDialogOpen] = useState(false);
  const [servicoDialogOpen, setServicoDialogOpen] = useState(false);
  const [fornecedorDialogOpen, setFornecedorDialogOpen] = useState(false);
  const [ofertaDialogOpen, setOfertaDialogOpen] = useState(false);
  
  const [editingCategoria, setEditingCategoria] = useState<MarketplaceCategoria | null>(null);
  const [editingServico, setEditingServico] = useState<MarketplaceServico | null>(null);
  const [editingFornecedor, setEditingFornecedor] = useState<MarketplaceFornecedor | null>(null);
  const [editingOferta, setEditingOferta] = useState<MarketplaceOferta | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: string; id: string; name: string } | null>(null);

  const categoriaForm = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaFormSchema),
    defaultValues: { nome: "", descricao: "", icone: "", ordem: 0, ativo: true },
  });

  const servicoForm = useForm<ServicoFormValues>({
    resolver: zodResolver(servicoFormSchema),
    defaultValues: { categoriaId: "", nome: "", descricao: "", ativo: true },
  });

  const fornecedorForm = useForm<FornecedorFormValues>({
    resolver: zodResolver(fornecedorFormSchema),
    defaultValues: { nomeComercial: "", documento: "", telefone: "", email: "", whatsapp: "", endereco: "", descricao: "" },
  });

  const ofertaForm = useForm<OfertaFormValues>({
    resolver: zodResolver(ofertaFormSchema),
    defaultValues: { servicoId: "", fornecedorId: "", titulo: "", descricao: "", preco: 0, tipoPreco: "fixo", disponivel: true, destaque: false },
  });

  const { data: categorias = [], isLoading: loadingCategorias } = useQuery<MarketplaceCategoria[]>({
    queryKey: ["/api/marketplace/categorias"],
    enabled: !!selectedCondominium,
  });

  const { data: servicos = [], isLoading: loadingServicos } = useQuery<MarketplaceServico[]>({
    queryKey: ["/api/marketplace/servicos"],
    enabled: !!selectedCondominium,
  });

  const { data: fornecedores = [], isLoading: loadingFornecedores } = useQuery<MarketplaceFornecedor[]>({
    queryKey: ["/api/marketplace/fornecedores"],
    enabled: !!selectedCondominium,
  });

  const { data: ofertas = [], isLoading: loadingOfertas } = useQuery<MarketplaceOferta[]>({
    queryKey: ["/api/marketplace/ofertas"],
    enabled: !!selectedCondominium,
  });

  const createCategoriaMutation = useMutation({
    mutationFn: (data: CategoriaFormValues) => apiRequest("POST", "/api/marketplace/categorias", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/categorias"] });
      toast({ title: "Categoria criada com sucesso!" });
      setCategoriaDialogOpen(false);
      categoriaForm.reset();
    },
    onError: () => toast({ title: "Erro ao criar categoria", variant: "destructive" }),
  });

  const updateCategoriaMutation = useMutation({
    mutationFn: (data: CategoriaFormValues) => apiRequest("PATCH", `/api/marketplace/categorias/${editingCategoria?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/categorias"] });
      toast({ title: "Categoria atualizada!" });
      setCategoriaDialogOpen(false);
      setEditingCategoria(null);
      categoriaForm.reset();
    },
    onError: () => toast({ title: "Erro ao atualizar categoria", variant: "destructive" }),
  });

  const createServicoMutation = useMutation({
    mutationFn: (data: ServicoFormValues) => apiRequest("POST", "/api/marketplace/servicos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/servicos"] });
      toast({ title: "Servico criado com sucesso!" });
      setServicoDialogOpen(false);
      servicoForm.reset();
    },
    onError: () => toast({ title: "Erro ao criar servico", variant: "destructive" }),
  });

  const updateServicoMutation = useMutation({
    mutationFn: (data: ServicoFormValues) => apiRequest("PATCH", `/api/marketplace/servicos/${editingServico?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/servicos"] });
      toast({ title: "Servico atualizado!" });
      setServicoDialogOpen(false);
      setEditingServico(null);
      servicoForm.reset();
    },
    onError: () => toast({ title: "Erro ao atualizar servico", variant: "destructive" }),
  });

  const createFornecedorMutation = useMutation({
    mutationFn: (data: FornecedorFormValues) => apiRequest("POST", "/api/marketplace/fornecedores", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/fornecedores"] });
      toast({ title: "Fornecedor criado com sucesso!" });
      setFornecedorDialogOpen(false);
      fornecedorForm.reset();
    },
    onError: () => toast({ title: "Erro ao criar fornecedor", variant: "destructive" }),
  });

  const updateFornecedorMutation = useMutation({
    mutationFn: (data: FornecedorFormValues) => apiRequest("PATCH", `/api/marketplace/fornecedores/${editingFornecedor?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/fornecedores"] });
      toast({ title: "Fornecedor atualizado!" });
      setFornecedorDialogOpen(false);
      setEditingFornecedor(null);
      fornecedorForm.reset();
    },
    onError: () => toast({ title: "Erro ao atualizar fornecedor", variant: "destructive" }),
  });

  const createOfertaMutation = useMutation({
    mutationFn: (data: OfertaFormValues) => apiRequest("POST", "/api/marketplace/ofertas", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/ofertas"] });
      toast({ title: "Oferta criada com sucesso!" });
      setOfertaDialogOpen(false);
      ofertaForm.reset();
    },
    onError: () => toast({ title: "Erro ao criar oferta", variant: "destructive" }),
  });

  const updateOfertaMutation = useMutation({
    mutationFn: (data: OfertaFormValues) => apiRequest("PATCH", `/api/marketplace/ofertas/${editingOferta?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/ofertas"] });
      toast({ title: "Oferta atualizada!" });
      setOfertaDialogOpen(false);
      setEditingOferta(null);
      ofertaForm.reset();
    },
    onError: () => toast({ title: "Erro ao atualizar oferta", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!itemToDelete) return Promise.reject();
      const endpoints: Record<string, string> = {
        categoria: "/api/marketplace/categorias",
        servico: "/api/marketplace/servicos",
        fornecedor: "/api/marketplace/fornecedores",
        oferta: "/api/marketplace/ofertas",
      };
      return apiRequest("DELETE", `${endpoints[itemToDelete.type]}/${itemToDelete.id}`, undefined);
    },
    onSuccess: () => {
      const queryKeys: Record<string, string> = {
        categoria: "/api/marketplace/categorias",
        servico: "/api/marketplace/servicos",
        fornecedor: "/api/marketplace/fornecedores",
        oferta: "/api/marketplace/ofertas",
      };
      if (itemToDelete) {
        queryClient.invalidateQueries({ queryKey: [queryKeys[itemToDelete.type]] });
      }
      toast({ title: "Excluido com sucesso!" });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    },
    onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
  });

  const aproveFornecedorMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/marketplace/fornecedores/${id}/aprovar`, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/fornecedores"] });
      toast({ title: "Fornecedor aprovado com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao aprovar fornecedor", variant: "destructive" }),
  });

  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [fornecedorToBlock, setFornecedorToBlock] = useState<{ id: string; name: string } | null>(null);
  const [blockMotivo, setBlockMotivo] = useState("");

  const bloquearFornecedorMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => 
      apiRequest("POST", `/api/marketplace/fornecedores/${id}/bloquear`, { motivo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/fornecedores"] });
      toast({ title: "Fornecedor bloqueado." });
      setBlockDialogOpen(false);
      setFornecedorToBlock(null);
      setBlockMotivo("");
    },
    onError: () => toast({ title: "Erro ao bloquear fornecedor", variant: "destructive" }),
  });

  const handleBlockFornecedor = (fornecedor: MarketplaceFornecedor) => {
    setFornecedorToBlock({ id: fornecedor.id, name: fornecedor.nomeComercial });
    setBlockDialogOpen(true);
  };

  const handleEditCategoria = (categoria: MarketplaceCategoria) => {
    setEditingCategoria(categoria);
    categoriaForm.reset({
      nome: categoria.nome,
      descricao: categoria.descricao || "",
      icone: categoria.icone || "",
      ordem: categoria.ordem || 0,
      ativo: categoria.ativo,
    });
    setCategoriaDialogOpen(true);
  };

  const handleEditServico = (servico: MarketplaceServico) => {
    setEditingServico(servico);
    servicoForm.reset({
      categoriaId: servico.categoriaId,
      nome: servico.nome,
      descricao: servico.descricao || "",
      ativo: servico.ativo,
    });
    setServicoDialogOpen(true);
  };

  const handleEditFornecedor = (fornecedor: MarketplaceFornecedor) => {
    setEditingFornecedor(fornecedor);
    fornecedorForm.reset({
      nomeComercial: fornecedor.nomeComercial,
      documento: fornecedor.documento || "",
      telefone: fornecedor.telefone || "",
      email: fornecedor.email || "",
      whatsapp: fornecedor.whatsapp || "",
      endereco: fornecedor.endereco || "",
      descricao: fornecedor.descricao || "",
    });
    setFornecedorDialogOpen(true);
  };

  const handleEditOferta = (oferta: MarketplaceOferta) => {
    setEditingOferta(oferta);
    ofertaForm.reset({
      servicoId: oferta.servicoId,
      fornecedorId: oferta.fornecedorId,
      titulo: oferta.titulo,
      descricao: oferta.descricao || "",
      preco: oferta.preco || 0,
      tipoPreco: oferta.tipoPreco || "fixo",
      disponivel: oferta.disponivel,
      destaque: oferta.destaque || false,
    });
    setOfertaDialogOpen(true);
  };

  const handleDelete = (type: string, id: string, name: string) => {
    setItemToDelete({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const onSubmitCategoria = (data: CategoriaFormValues) => {
    if (editingCategoria) {
      updateCategoriaMutation.mutate(data);
    } else {
      createCategoriaMutation.mutate(data);
    }
  };

  const onSubmitServico = (data: ServicoFormValues) => {
    if (editingServico) {
      updateServicoMutation.mutate(data);
    } else {
      createServicoMutation.mutate(data);
    }
  };

  const onSubmitFornecedor = (data: FornecedorFormValues) => {
    if (editingFornecedor) {
      updateFornecedorMutation.mutate(data);
    } else {
      createFornecedorMutation.mutate(data);
    }
  };

  const onSubmitOferta = (data: OfertaFormValues) => {
    if (editingOferta) {
      updateOfertaMutation.mutate(data);
    } else {
      createOfertaMutation.mutate(data);
    }
  };

  const filteredCategorias = categorias.filter(c =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredServicos = servicos.filter(s =>
    s.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFornecedores = fornecedores.filter(f =>
    f.nomeComercial.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOfertas = ofertas.filter(o =>
    o.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoriaName = (id: string) => categorias.find(c => c.id === id)?.nome || "-";
  const getServicoName = (id: string) => servicos.find(s => s.id === id)?.nome || "-";
  const getFornecedorName = (id: string) => fornecedores.find(f => f.id === id)?.nomeComercial || "-";

  if (!selectedCondominium) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Store}
          title="Selecione um Condominio"
          description="Selecione um condominio para gerenciar o marketplace."
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Marketplace - Administracao"
        description="Gerencie categorias, servicos, fornecedores e ofertas"
        icon={Store}
      />

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="categorias" data-testid="tab-categorias">
            <Tag className="h-4 w-4 mr-2" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="servicos" data-testid="tab-servicos">
            <Package className="h-4 w-4 mr-2" />
            Servicos
          </TabsTrigger>
          <TabsTrigger value="fornecedores" data-testid="tab-fornecedores">
            <Building2 className="h-4 w-4 mr-2" />
            Fornecedores
          </TabsTrigger>
          <TabsTrigger value="ofertas" data-testid="tab-ofertas">
            <DollarSign className="h-4 w-4 mr-2" />
            Ofertas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categorias" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingCategoria(null); categoriaForm.reset(); setCategoriaDialogOpen(true); }} data-testid="button-add-categoria">
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </div>

          {loadingCategorias ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : filteredCategorias.length === 0 ? (
            <EmptyState icon={Tag} title="Nenhuma categoria" description="Cadastre a primeira categoria de servicos." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCategorias.map(categoria => (
                <Card key={categoria.id} data-testid={`card-categoria-${categoria.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{categoria.nome}</CardTitle>
                      <Badge variant={categoria.ativo ? "default" : "secondary"}>
                        {categoria.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{categoria.descricao || "Sem descricao"}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditCategoria(categoria)} data-testid={`button-edit-categoria-${categoria.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete("categoria", categoria.id, categoria.nome)} data-testid={`button-delete-categoria-${categoria.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="servicos" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingServico(null); servicoForm.reset(); setServicoDialogOpen(true); }} data-testid="button-add-servico">
              <Plus className="h-4 w-4 mr-2" />
              Novo Servico
            </Button>
          </div>

          {loadingServicos ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
            </div>
          ) : filteredServicos.length === 0 ? (
            <EmptyState icon={Package} title="Nenhum servico" description="Cadastre o primeiro servico." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredServicos.map(servico => (
                <Card key={servico.id} data-testid={`card-servico-${servico.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{servico.nome}</CardTitle>
                      <Badge variant={servico.ativo ? "default" : "secondary"}>
                        {servico.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <CardDescription>{getCategoriaName(servico.categoriaId)}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{servico.descricao || "Sem descricao"}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditServico(servico)} data-testid={`button-edit-servico-${servico.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete("servico", servico.id, servico.nome)} data-testid={`button-delete-servico-${servico.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="fornecedores" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingFornecedor(null); fornecedorForm.reset(); setFornecedorDialogOpen(true); }} data-testid="button-add-fornecedor">
              <Plus className="h-4 w-4 mr-2" />
              Novo Fornecedor
            </Button>
          </div>

          {loadingFornecedores ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : filteredFornecedores.length === 0 ? (
            <EmptyState icon={Building2} title="Nenhum fornecedor" description="Cadastre o primeiro fornecedor." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredFornecedores.map(fornecedor => (
                <Card key={fornecedor.id} data-testid={`card-fornecedor-${fornecedor.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <CardTitle className="text-lg">{fornecedor.nomeComercial}</CardTitle>
                      <div className="flex gap-1 flex-wrap">
                        {fornecedor.statusAprovacao === "aprovado" && (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Aprovado
                          </Badge>
                        )}
                        {fornecedor.statusAprovacao === "pendente" && (
                          <Badge variant="secondary" className="bg-yellow-500 text-white">
                            <Clock className="h-3 w-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                        {fornecedor.statusAprovacao === "bloqueado" && (
                          <Badge variant="destructive">
                            <Ban className="h-3 w-3 mr-1" />
                            Bloqueado
                          </Badge>
                        )}
                        {!fornecedor.statusAprovacao && (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                        <Badge variant={fornecedor.ativo ? "outline" : "secondary"}>
                          {fornecedor.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>
                    {fornecedor.razaoSocial && <CardDescription>{fornecedor.razaoSocial}</CardDescription>}
                    {fornecedor.motivoBloqueio && (
                      <p className="text-xs text-destructive mt-1">Motivo: {fornecedor.motivoBloqueio}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm mb-4">
                      {fornecedor.avaliacaoMedia ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span>{fornecedor.avaliacaoMedia.toFixed(1)} ({fornecedor.totalAvaliacoes} avaliacoes)</span>
                        </div>
                      ) : null}
                      {fornecedor.telefone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{fornecedor.telefone}</span>
                        </div>
                      )}
                      {fornecedor.whatsapp && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MessageCircle className="h-4 w-4" />
                          <span>{fornecedor.whatsapp}</span>
                        </div>
                      )}
                      {fornecedor.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{fornecedor.email}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {(fornecedor.statusAprovacao === "pendente" || !fornecedor.statusAprovacao) && (
                        <Button 
                          size="sm" 
                          variant="default" 
                          className="bg-green-600"
                          onClick={() => aproveFornecedorMutation.mutate(fornecedor.id)}
                          disabled={aproveFornecedorMutation.isPending}
                          data-testid={`button-aprovar-fornecedor-${fornecedor.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                      )}
                      {fornecedor.statusAprovacao !== "bloqueado" && (
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => handleBlockFornecedor(fornecedor)}
                          data-testid={`button-bloquear-fornecedor-${fornecedor.id}`}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Bloquear
                        </Button>
                      )}
                      {fornecedor.statusAprovacao === "bloqueado" && (
                        <Button 
                          size="sm" 
                          variant="default" 
                          className="bg-green-600"
                          onClick={() => aproveFornecedorMutation.mutate(fornecedor.id)}
                          disabled={aproveFornecedorMutation.isPending}
                          data-testid={`button-desbloquear-fornecedor-${fornecedor.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Desbloquear
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleEditFornecedor(fornecedor)} data-testid={`button-edit-fornecedor-${fornecedor.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete("fornecedor", fornecedor.id, fornecedor.nomeComercial)} data-testid={`button-delete-fornecedor-${fornecedor.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

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
          ) : filteredOfertas.length === 0 ? (
            <EmptyState icon={DollarSign} title="Nenhuma oferta" description="Cadastre a primeira oferta." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredOfertas.map(oferta => (
                <Card key={oferta.id} data-testid={`card-oferta-${oferta.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <CardTitle className="text-lg">{oferta.titulo}</CardTitle>
                      <div className="flex gap-1">
                        <Badge variant={oferta.disponivel ? "default" : "secondary"}>
                          {oferta.disponivel ? "Disponível" : "Indisponível"}
                        </Badge>
                        {oferta.destaque && (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                            <Star className="h-3 w-3 mr-1" />
                            Destaque
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription>{getServicoName(oferta.servicoId)} - {getFornecedorName(oferta.fornecedorId)}</CardDescription>
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
                      <p className="text-sm text-muted-foreground">{oferta.descricao || "Sem descricao"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditOferta(oferta)} data-testid={`button-edit-oferta-${oferta.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete("oferta", oferta.id, oferta.titulo)} data-testid={`button-delete-oferta-${oferta.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={categoriaDialogOpen} onOpenChange={setCategoriaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategoria ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
            <DialogDescription>Preencha os dados da categoria de servicos.</DialogDescription>
          </DialogHeader>
          <Form {...categoriaForm}>
            <form onSubmit={categoriaForm.handleSubmit(onSubmitCategoria)} className="space-y-4">
              <FormField control={categoriaForm.control} name="nome" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl><Input {...field} data-testid="input-categoria-nome" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={categoriaForm.control} name="descricao" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descricao</FormLabel>
                  <FormControl><Textarea {...field} data-testid="input-categoria-descricao" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={categoriaForm.control} name="ativo" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel>Ativo</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-categoria-ativo" /></FormControl>
                </FormItem>
              )} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCategoriaDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createCategoriaMutation.isPending || updateCategoriaMutation.isPending} data-testid="button-submit-categoria">
                  {(createCategoriaMutation.isPending || updateCategoriaMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={servicoDialogOpen} onOpenChange={setServicoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingServico ? "Editar Servico" : "Novo Servico"}</DialogTitle>
            <DialogDescription>Preencha os dados do servico.</DialogDescription>
          </DialogHeader>
          <Form {...servicoForm}>
            <form onSubmit={servicoForm.handleSubmit(onSubmitServico)} className="space-y-4">
              <FormField control={servicoForm.control} name="categoriaId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-servico-categoria"><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {categorias.filter(c => c.ativo).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={servicoForm.control} name="nome" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl><Input {...field} data-testid="input-servico-nome" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={servicoForm.control} name="descricao" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descricao</FormLabel>
                  <FormControl><Textarea {...field} data-testid="input-servico-descricao" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={servicoForm.control} name="ativo" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel>Ativo</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-servico-ativo" /></FormControl>
                </FormItem>
              )} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setServicoDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createServicoMutation.isPending || updateServicoMutation.isPending} data-testid="button-submit-servico">
                  {(createServicoMutation.isPending || updateServicoMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={fornecedorDialogOpen} onOpenChange={setFornecedorDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFornecedor ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
            <DialogDescription>Preencha os dados do fornecedor.</DialogDescription>
          </DialogHeader>
          <Form {...fornecedorForm}>
            <form onSubmit={fornecedorForm.handleSubmit(onSubmitFornecedor)} className="space-y-4">
              <FormField control={fornecedorForm.control} name="nomeComercial" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Comercial</FormLabel>
                  <FormControl><Input {...field} data-testid="input-fornecedor-nome" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={fornecedorForm.control} name="documento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Documento (CPF/CNPJ)</FormLabel>
                  <FormControl><Input {...field} data-testid="input-fornecedor-documento" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={fornecedorForm.control} name="telefone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl><Input {...field} data-testid="input-fornecedor-telefone" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={fornecedorForm.control} name="whatsapp" render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp</FormLabel>
                    <FormControl><Input {...field} data-testid="input-fornecedor-whatsapp" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={fornecedorForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input {...field} type="email" data-testid="input-fornecedor-email" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={fornecedorForm.control} name="endereco" render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereco</FormLabel>
                  <FormControl><Input {...field} data-testid="input-fornecedor-endereco" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={fornecedorForm.control} name="descricao" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descricao</FormLabel>
                  <FormControl><Textarea {...field} data-testid="input-fornecedor-descricao" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setFornecedorDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createFornecedorMutation.isPending || updateFornecedorMutation.isPending} data-testid="button-submit-fornecedor">
                  {(createFornecedorMutation.isPending || updateFornecedorMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={ofertaDialogOpen} onOpenChange={setOfertaDialogOpen}>
        <DialogContent className="max-w-lg">
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
              <FormField control={ofertaForm.control} name="fornecedorId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornecedor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-oferta-fornecedor"><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {fornecedores.filter(f => f.status === "aprovado").map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.nomeComercial}</SelectItem>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusao</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{itemToDelete?.name}"? Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} data-testid="button-confirm-delete">
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear Fornecedor</DialogTitle>
            <DialogDescription>
              Informe o motivo para bloquear "{fornecedorToBlock?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Motivo do bloqueio..."
              value={blockMotivo}
              onChange={(e) => setBlockMotivo(e.target.value)}
              data-testid="input-motivo-bloqueio"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setBlockDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={bloquearFornecedorMutation.isPending || !blockMotivo.trim()}
                onClick={() => {
                  if (fornecedorToBlock) {
                    bloquearFornecedorMutation.mutate({ id: fornecedorToBlock.id, motivo: blockMotivo });
                  }
                }}
                data-testid="button-confirm-bloquear"
              >
                {bloquearFornecedorMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Bloquear
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
