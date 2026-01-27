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
  tipoServicoOptions,
  unidadePrecoOptions,
  type CategoriaServico,
  type Servico,
  type FornecedorMarketplace,
  type Oferta,
} from "@shared/schema";

const categoriaFormSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
});

const servicoFormSchema = z.object({
  categoriaId: z.string().min(1, "Selecione uma categoria"),
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  descricao: z.string().optional(),
  tipoServico: z.string().min(1, "Selecione um tipo"),
  requisitos: z.string().optional(),
  ativo: z.boolean().default(true),
});

const fornecedorFormSchema = z.object({
  nomeFantasia: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  razaoSocial: z.string().optional(),
  cnpj: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email("Email invalido").optional().or(z.literal("")),
  whatsapp: z.string().optional(),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
});

const ofertaFormSchema = z.object({
  servicoId: z.string().min(1, "Selecione um servico"),
  fornecedorId: z.string().min(1, "Selecione um fornecedor"),
  titulo: z.string().min(2, "Titulo deve ter pelo menos 2 caracteres"),
  descricao: z.string().optional(),
  precoBase: z.coerce.number().min(0).optional(),
  recorrente: z.boolean().default(false),
  unidadePreco: z.string().default("avulso"),
  ativo: z.boolean().default(true),
});

type CategoriaFormValues = z.infer<typeof categoriaFormSchema>;
type ServicoFormValues = z.infer<typeof servicoFormSchema>;
type FornecedorFormValues = z.infer<typeof fornecedorFormSchema>;
type OfertaFormValues = z.infer<typeof ofertaFormSchema>;

const tipoServicoLabels: Record<string, string> = {
  veiculo: "Veiculo",
  pet: "Pet",
  limpeza: "Limpeza",
  manutencao: "Manutencao",
  pessoal: "Pessoal",
  geral: "Geral",
};

const unidadePrecoLabels: Record<string, string> = {
  avulso: "Avulso",
  mensal: "Mensal",
  semanal: "Semanal",
  anual: "Anual",
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
  
  const [editingCategoria, setEditingCategoria] = useState<CategoriaServico | null>(null);
  const [editingServico, setEditingServico] = useState<Servico | null>(null);
  const [editingFornecedor, setEditingFornecedor] = useState<FornecedorMarketplace | null>(null);
  const [editingOferta, setEditingOferta] = useState<Oferta | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: string; id: string; name: string } | null>(null);

  const categoriaForm = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaFormSchema),
    defaultValues: { nome: "", descricao: "", ativo: true },
  });

  const servicoForm = useForm<ServicoFormValues>({
    resolver: zodResolver(servicoFormSchema),
    defaultValues: { categoriaId: "", nome: "", descricao: "", tipoServico: "geral", requisitos: "", ativo: true },
  });

  const fornecedorForm = useForm<FornecedorFormValues>({
    resolver: zodResolver(fornecedorFormSchema),
    defaultValues: { nomeFantasia: "", razaoSocial: "", cnpj: "", telefone: "", email: "", whatsapp: "", descricao: "", ativo: true },
  });

  const ofertaForm = useForm<OfertaFormValues>({
    resolver: zodResolver(ofertaFormSchema),
    defaultValues: { servicoId: "", fornecedorId: "", titulo: "", descricao: "", precoBase: 0, recorrente: false, unidadePreco: "avulso", ativo: true },
  });

  const { data: categorias = [], isLoading: loadingCategorias } = useQuery<CategoriaServico[]>({
    queryKey: ["/api/categorias-servicos"],
    enabled: !!selectedCondominium,
  });

  const { data: servicos = [], isLoading: loadingServicos } = useQuery<Servico[]>({
    queryKey: ["/api/servicos"],
    enabled: !!selectedCondominium,
  });

  const { data: fornecedores = [], isLoading: loadingFornecedores } = useQuery<FornecedorMarketplace[]>({
    queryKey: ["/api/fornecedores-marketplace"],
    enabled: !!selectedCondominium,
  });

  const { data: ofertas = [], isLoading: loadingOfertas } = useQuery<Oferta[]>({
    queryKey: ["/api/ofertas"],
    enabled: !!selectedCondominium,
  });

  const createCategoriaMutation = useMutation({
    mutationFn: (data: CategoriaFormValues) => apiRequest("POST", "/api/categorias-servicos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categorias-servicos"] });
      toast({ title: "Categoria criada com sucesso!" });
      setCategoriaDialogOpen(false);
      categoriaForm.reset();
    },
    onError: () => toast({ title: "Erro ao criar categoria", variant: "destructive" }),
  });

  const updateCategoriaMutation = useMutation({
    mutationFn: (data: CategoriaFormValues) => apiRequest("PATCH", `/api/categorias-servicos/${editingCategoria?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categorias-servicos"] });
      toast({ title: "Categoria atualizada!" });
      setCategoriaDialogOpen(false);
      setEditingCategoria(null);
      categoriaForm.reset();
    },
    onError: () => toast({ title: "Erro ao atualizar categoria", variant: "destructive" }),
  });

  const createServicoMutation = useMutation({
    mutationFn: (data: ServicoFormValues) => apiRequest("POST", "/api/servicos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servicos"] });
      toast({ title: "Servico criado com sucesso!" });
      setServicoDialogOpen(false);
      servicoForm.reset();
    },
    onError: () => toast({ title: "Erro ao criar servico", variant: "destructive" }),
  });

  const updateServicoMutation = useMutation({
    mutationFn: (data: ServicoFormValues) => apiRequest("PATCH", `/api/servicos/${editingServico?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servicos"] });
      toast({ title: "Servico atualizado!" });
      setServicoDialogOpen(false);
      setEditingServico(null);
      servicoForm.reset();
    },
    onError: () => toast({ title: "Erro ao atualizar servico", variant: "destructive" }),
  });

  const createFornecedorMutation = useMutation({
    mutationFn: (data: FornecedorFormValues) => apiRequest("POST", "/api/fornecedores-marketplace", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fornecedores-marketplace"] });
      toast({ title: "Fornecedor criado com sucesso!" });
      setFornecedorDialogOpen(false);
      fornecedorForm.reset();
    },
    onError: () => toast({ title: "Erro ao criar fornecedor", variant: "destructive" }),
  });

  const updateFornecedorMutation = useMutation({
    mutationFn: (data: FornecedorFormValues) => apiRequest("PATCH", `/api/fornecedores-marketplace/${editingFornecedor?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fornecedores-marketplace"] });
      toast({ title: "Fornecedor atualizado!" });
      setFornecedorDialogOpen(false);
      setEditingFornecedor(null);
      fornecedorForm.reset();
    },
    onError: () => toast({ title: "Erro ao atualizar fornecedor", variant: "destructive" }),
  });

  const createOfertaMutation = useMutation({
    mutationFn: (data: OfertaFormValues) => apiRequest("POST", "/api/ofertas", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ofertas"] });
      toast({ title: "Oferta criada com sucesso!" });
      setOfertaDialogOpen(false);
      ofertaForm.reset();
    },
    onError: () => toast({ title: "Erro ao criar oferta", variant: "destructive" }),
  });

  const updateOfertaMutation = useMutation({
    mutationFn: (data: OfertaFormValues) => apiRequest("PATCH", `/api/ofertas/${editingOferta?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ofertas"] });
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
        categoria: "/api/categorias-servicos",
        servico: "/api/servicos",
        fornecedor: "/api/fornecedores-marketplace",
        oferta: "/api/ofertas",
      };
      return apiRequest("DELETE", `${endpoints[itemToDelete.type]}/${itemToDelete.id}`, undefined);
    },
    onSuccess: () => {
      const queryKeys: Record<string, string> = {
        categoria: "/api/categorias-servicos",
        servico: "/api/servicos",
        fornecedor: "/api/fornecedores-marketplace",
        oferta: "/api/ofertas",
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
    mutationFn: (id: string) => apiRequest("PATCH", `/api/fornecedores-marketplace/${id}/aprovar`, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fornecedores-marketplace"] });
      toast({ title: "Fornecedor aprovado com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao aprovar fornecedor", variant: "destructive" }),
  });

  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [fornecedorToBlock, setFornecedorToBlock] = useState<{ id: string; name: string } | null>(null);
  const [blockMotivo, setBlockMotivo] = useState("");

  const bloquearFornecedorMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => 
      apiRequest("PATCH", `/api/fornecedores-marketplace/${id}/bloquear`, { motivo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fornecedores-marketplace"] });
      toast({ title: "Fornecedor bloqueado." });
      setBlockDialogOpen(false);
      setFornecedorToBlock(null);
      setBlockMotivo("");
    },
    onError: () => toast({ title: "Erro ao bloquear fornecedor", variant: "destructive" }),
  });

  const handleBlockFornecedor = (fornecedor: FornecedorMarketplace) => {
    setFornecedorToBlock({ id: fornecedor.id, name: fornecedor.nomeFantasia });
    setBlockDialogOpen(true);
  };

  const handleEditCategoria = (categoria: CategoriaServico) => {
    setEditingCategoria(categoria);
    categoriaForm.reset({
      nome: categoria.nome,
      descricao: categoria.descricao || "",
      ativo: categoria.ativo,
    });
    setCategoriaDialogOpen(true);
  };

  const handleEditServico = (servico: Servico) => {
    setEditingServico(servico);
    servicoForm.reset({
      categoriaId: servico.categoriaId,
      nome: servico.nome,
      descricao: servico.descricao || "",
      tipoServico: servico.tipoServico,
      requisitos: servico.requisitos || "",
      ativo: servico.ativo,
    });
    setServicoDialogOpen(true);
  };

  const handleEditFornecedor = (fornecedor: FornecedorMarketplace) => {
    setEditingFornecedor(fornecedor);
    fornecedorForm.reset({
      nomeFantasia: fornecedor.nomeFantasia,
      razaoSocial: fornecedor.razaoSocial || "",
      cnpj: fornecedor.cnpj || "",
      telefone: fornecedor.telefone || "",
      email: fornecedor.email || "",
      whatsapp: fornecedor.whatsapp || "",
      descricao: fornecedor.descricao || "",
      ativo: fornecedor.ativo,
    });
    setFornecedorDialogOpen(true);
  };

  const handleEditOferta = (oferta: Oferta) => {
    setEditingOferta(oferta);
    ofertaForm.reset({
      servicoId: oferta.servicoId,
      fornecedorId: oferta.fornecedorId,
      titulo: oferta.titulo,
      descricao: oferta.descricao || "",
      precoBase: oferta.precoBase || 0,
      recorrente: oferta.recorrente || false,
      unidadePreco: oferta.unidadePreco || "avulso",
      ativo: oferta.ativo,
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
    f.nomeFantasia.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOfertas = ofertas.filter(o =>
    o.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoriaName = (id: string) => categorias.find(c => c.id === id)?.nome || "-";
  const getServicoName = (id: string) => servicos.find(s => s.id === id)?.nome || "-";
  const getFornecedorName = (id: string) => fornecedores.find(f => f.id === id)?.nomeFantasia || "-";

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
                    <Badge variant="outline" className="mb-2">{tipoServicoLabels[servico.tipoServico]}</Badge>
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
                      <CardTitle className="text-lg">{fornecedor.nomeFantasia}</CardTitle>
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
                      <Button size="sm" variant="outline" onClick={() => handleDelete("fornecedor", fornecedor.id, fornecedor.nomeFantasia)} data-testid={`button-delete-fornecedor-${fornecedor.id}`}>
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
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{oferta.titulo}</CardTitle>
                      <Badge variant={oferta.ativo ? "default" : "secondary"}>
                        {oferta.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <CardDescription>{getServicoName(oferta.servicoId)} - {getFornecedorName(oferta.fornecedorId)}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      {oferta.precoBase ? (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-semibold">R$ {oferta.precoBase.toFixed(2)}</span>
                          <Badge variant="outline">{unidadePrecoLabels[oferta.unidadePreco || "avulso"]}</Badge>
                        </div>
                      ) : null}
                      {oferta.recorrente && (
                        <Badge variant="outline">
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Recorrente
                        </Badge>
                      )}
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
              <FormField control={servicoForm.control} name="tipoServico" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Servico</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-servico-tipo"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {tipoServicoOptions.map(t => (
                        <SelectItem key={t} value={t}>{tipoServicoLabels[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              <div className="grid grid-cols-2 gap-4">
                <FormField control={fornecedorForm.control} name="nomeFantasia" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Fantasia</FormLabel>
                    <FormControl><Input {...field} data-testid="input-fornecedor-nome" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={fornecedorForm.control} name="razaoSocial" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razao Social</FormLabel>
                    <FormControl><Input {...field} data-testid="input-fornecedor-razao" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={fornecedorForm.control} name="cnpj" render={({ field }) => (
                <FormItem>
                  <FormLabel>CNPJ</FormLabel>
                  <FormControl><Input {...field} data-testid="input-fornecedor-cnpj" /></FormControl>
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
              <FormField control={fornecedorForm.control} name="descricao" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descricao</FormLabel>
                  <FormControl><Textarea {...field} data-testid="input-fornecedor-descricao" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={fornecedorForm.control} name="ativo" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel>Ativo</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-fornecedor-ativo" /></FormControl>
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
                      {fornecedores.filter(f => f.ativo).map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.nomeFantasia}</SelectItem>
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
                <FormField control={ofertaForm.control} name="precoBase" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preco Base (R$)</FormLabel>
                    <FormControl><Input {...field} type="number" step="0.01" data-testid="input-oferta-preco" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={ofertaForm.control} name="unidadePreco" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-oferta-unidade"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {unidadePrecoOptions.map(u => (
                          <SelectItem key={u} value={u}>{unidadePrecoLabels[u]}</SelectItem>
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
                <FormField control={ofertaForm.control} name="recorrente" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel>Recorrente</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-oferta-recorrente" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={ofertaForm.control} name="ativo" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel>Ativo</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-oferta-ativo" /></FormControl>
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
