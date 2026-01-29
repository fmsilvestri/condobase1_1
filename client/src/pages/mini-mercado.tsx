import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { supabase, supabaseReady } from "@/lib/supabase";
import type {
  MercadoCategoria,
  MercadoProduto,
  MercadoPromocao,
  MercadoVenda,
  MercadoPerfilConsumo,
  MercadoCashback,
} from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  ShoppingCart,
  Package,
  TrendingUp,
  Users,
  Coins,
  Tag,
  Plus,
  Search,
  Edit,
  Trash2,
  Gift,
  AlertTriangle,
  BarChart3,
  DollarSign,
  Star,
  Bell,
  Loader2,
} from "lucide-react";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
};

function toCamelCase<T>(obj: Record<string, unknown>): T {
  if (!obj) return obj as T;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result as T;
}

function mapArrayToCamelCase<T>(arr: Record<string, unknown>[]): T[] {
  return (arr || []).map(item => toCamelCase<T>(item));
}

const formatDate = (date: string | Date | null) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("pt-BR");
};

const formatDateTime = (date: string | Date | null) => {
  if (!date) return "-";
  return new Date(date).toLocaleString("pt-BR");
};

export default function MiniMercado() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState<string>("all");
  
  const [isProdutoDialogOpen, setIsProdutoDialogOpen] = useState(false);
  const [isPromocaoDialogOpen, setIsPromocaoDialogOpen] = useState(false);
  const [isVendaDialogOpen, setIsVendaDialogOpen] = useState(false);
  const [isCategoriaDialogOpen, setIsCategoriaDialogOpen] = useState(false);
  
  const [selectedProduto, setSelectedProduto] = useState<MercadoProduto | null>(null);
  const [selectedPromocao, setSelectedPromocao] = useState<MercadoPromocao | null>(null);
  
  const [carrinho, setCarrinho] = useState<{ produtoId: string; quantidade: number; preco: number; nome: string }[]>([]);
  
  const [produtoForm, setProdutoForm] = useState({
    nome: "",
    descricao: "",
    categoriaId: "",
    codigoBarras: "",
    unidade: "un",
    precoCusto: "",
    precoVenda: "",
    estoqueAtual: "",
    estoqueMinimo: "5",
    estoqueMaximo: "100",
    destaque: false,
  });
  
  const [promocaoForm, setPromocaoForm] = useState({
    produtoId: "",
    titulo: "",
    descricao: "",
    descontoPercentual: "",
    precoPromocional: "",
    dataInicio: "",
    dataFim: "",
  });
  
  const [vendaForm, setVendaForm] = useState({
    unidade: "",
    moradorNome: "",
    formaPagamento: "pix",
    observacoes: "",
  });
  
  const [categoriaForm, setCategoriaForm] = useState({
    nome: "",
    icone: "Package",
    cor: "#FF6B35",
  });

  const condominiumId = localStorage.getItem("selectedCondominiumId");

  const { data: categorias = [], isLoading: loadingCategorias } = useQuery<MercadoCategoria[]>({
    queryKey: ["mercado-categorias", condominiumId],
    queryFn: async () => {
      await supabaseReady;
      if (!supabase || !condominiumId) return [];
      const { data, error } = await supabase
        .from("mercado_categorias")
        .select("*")
        .eq("condominium_id", condominiumId)
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return mapArrayToCamelCase<MercadoCategoria>(data || []);
    },
    enabled: !!condominiumId,
  });

  const { data: produtos = [], isLoading: loadingProdutos } = useQuery<MercadoProduto[]>({
    queryKey: ["mercado-produtos", condominiumId],
    queryFn: async () => {
      await supabaseReady;
      if (!supabase || !condominiumId) return [];
      const { data, error } = await supabase
        .from("mercado_produtos")
        .select("*")
        .eq("condominium_id", condominiumId)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return mapArrayToCamelCase<MercadoProduto>(data || []);
    },
    enabled: !!condominiumId,
  });

  const { data: promocoes = [], isLoading: loadingPromocoes } = useQuery<MercadoPromocao[]>({
    queryKey: ["mercado-promocoes", condominiumId],
    queryFn: async () => {
      await supabaseReady;
      if (!supabase || !condominiumId) return [];
      const { data, error } = await supabase
        .from("mercado_promocoes")
        .select("*")
        .eq("condominium_id", condominiumId)
        .eq("ativo", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return mapArrayToCamelCase<MercadoPromocao>(data || []);
    },
    enabled: !!condominiumId,
  });

  const { data: vendas = [], isLoading: loadingVendas } = useQuery<MercadoVenda[]>({
    queryKey: ["mercado-vendas", condominiumId],
    queryFn: async () => {
      await supabaseReady;
      if (!supabase || !condominiumId) return [];
      const { data, error } = await supabase
        .from("mercado_vendas")
        .select("*")
        .eq("condominium_id", condominiumId)
        .order("data_venda", { ascending: false })
        .limit(100);
      if (error) throw error;
      return mapArrayToCamelCase<MercadoVenda>(data || []);
    },
    enabled: !!condominiumId,
  });

  const { data: perfisConsumo = [] } = useQuery<MercadoPerfilConsumo[]>({
    queryKey: ["mercado-perfil-consumo", condominiumId],
    queryFn: async () => {
      await supabaseReady;
      if (!supabase || !condominiumId) return [];
      const { data, error } = await supabase
        .from("mercado_perfil_consumo")
        .select("*")
        .eq("condominium_id", condominiumId)
        .order("total_compras", { ascending: false });
      if (error) throw error;
      return mapArrayToCamelCase<MercadoPerfilConsumo>(data || []);
    },
    enabled: !!condominiumId,
  });

  const { data: cashbacks = [] } = useQuery<MercadoCashback[]>({
    queryKey: ["mercado-cashback", condominiumId],
    queryFn: async () => {
      await supabaseReady;
      if (!supabase || !condominiumId) return [];
      const { data, error } = await supabase
        .from("mercado_cashback")
        .select("*")
        .eq("condominium_id", condominiumId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return mapArrayToCamelCase<MercadoCashback>(data || []);
    },
    enabled: !!condominiumId,
  });

  const stats = useMemo(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const vendasMes = vendas.filter(v => {
      const dateStr = v.dataVenda || v.createdAt;
      if (!dateStr) return false;
      return new Date(dateStr) >= firstDayOfMonth;
    });
    const totalVendasMes = vendasMes.reduce((sum, v) => sum + (v.total || 0), 0);
    const ticketMedio = vendasMes.length > 0 ? totalVendasMes / vendasMes.length : 0;
    const cashbackGerado = totalVendasMes * 0.03;
    
    const produtosBaixoEstoque = produtos.filter(p => (p.estoqueAtual || 0) <= (p.estoqueMinimo || 5));
    const promocoesAtivas = promocoes.filter(p => {
      const hoje = new Date().toISOString().split("T")[0];
      return p.dataInicio <= hoje && p.dataFim >= hoje;
    });
    
    return {
      totalVendasMes,
      ticketMedio,
      totalClientes: perfisConsumo.length,
      cashbackGerado,
      produtosBaixoEstoque: produtosBaixoEstoque.length,
      promocoesAtivas: promocoesAtivas.length,
      totalProdutos: produtos.length,
      vendasHoje: vendas.filter(v => {
        const dateStr = v.dataVenda || v.createdAt;
        if (!dateStr) return false;
        const vendaDate = new Date(dateStr).toDateString();
        return vendaDate === now.toDateString();
      }).length,
    };
  }, [vendas, produtos, promocoes, perfisConsumo]);

  const produtosFiltrados = useMemo(() => {
    return produtos.filter(p => {
      const matchSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategoria = selectedCategoria === "all" || p.categoriaId === selectedCategoria;
      return matchSearch && matchCategoria;
    });
  }, [produtos, searchTerm, selectedCategoria]);

  const createCategoriaMutation = useMutation({
    mutationFn: async (data: typeof categoriaForm) => {
      await supabaseReady;
      if (!supabase || !condominiumId) throw new Error("Não configurado");
      const { error } = await supabase.from("mercado_categorias").insert({
        condominium_id: condominiumId,
        nome: data.nome,
        icone: data.icone,
        cor: data.cor,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mercado-categorias"] });
      setIsCategoriaDialogOpen(false);
      setCategoriaForm({ nome: "", icone: "Package", cor: "#FF6B35" });
      toast({ title: "Categoria criada com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar categoria", description: error.message, variant: "destructive" });
    },
  });

  const createProdutoMutation = useMutation({
    mutationFn: async (data: typeof produtoForm) => {
      await supabaseReady;
      if (!supabase || !condominiumId) throw new Error("Não configurado");
      
      const precoCusto = parseFloat(data.precoCusto) || 0;
      const precoVenda = parseFloat(data.precoVenda) || 0;
      const margemLucro = precoCusto > 0 ? ((precoVenda - precoCusto) / precoCusto) * 100 : 0;
      
      const categoriaId = data.categoriaId && data.categoriaId.trim() !== "" ? data.categoriaId : null;
      const { error } = await supabase.from("mercado_produtos").insert({
        condominium_id: condominiumId,
        categoria_id: categoriaId,
        nome: data.nome,
        descricao: data.descricao && data.descricao.trim() !== "" ? data.descricao : null,
        codigo_barras: data.codigoBarras && data.codigoBarras.trim() !== "" ? data.codigoBarras : null,
        unidade: data.unidade || "un",
        preco_custo: precoCusto,
        preco_venda: precoVenda,
        margem_lucro: margemLucro,
        estoque_atual: parseInt(data.estoqueAtual) || 0,
        estoque_minimo: parseInt(data.estoqueMinimo) || 5,
        estoque_maximo: parseInt(data.estoqueMaximo) || 100,
        destaque: data.destaque || false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mercado-produtos"] });
      setIsProdutoDialogOpen(false);
      resetProdutoForm();
      toast({ title: "Produto cadastrado com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao cadastrar produto", description: error.message, variant: "destructive" });
    },
  });

  const updateProdutoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof produtoForm }) => {
      await supabaseReady;
      if (!supabase) throw new Error("Não configurado");
      
      const precoCusto = parseFloat(data.precoCusto) || 0;
      const precoVenda = parseFloat(data.precoVenda) || 0;
      const margemLucro = precoCusto > 0 ? ((precoVenda - precoCusto) / precoCusto) * 100 : 0;
      const categoriaId = data.categoriaId && data.categoriaId.trim() !== "" ? data.categoriaId : null;
      
      const { error } = await supabase
        .from("mercado_produtos")
        .update({
          categoria_id: categoriaId,
          nome: data.nome,
          descricao: data.descricao && data.descricao.trim() !== "" ? data.descricao : null,
          codigo_barras: data.codigoBarras && data.codigoBarras.trim() !== "" ? data.codigoBarras : null,
          unidade: data.unidade || "un",
          preco_custo: precoCusto,
          preco_venda: precoVenda,
          margem_lucro: margemLucro,
          estoque_atual: parseInt(data.estoqueAtual) || 0,
          estoque_minimo: parseInt(data.estoqueMinimo) || 5,
          estoque_maximo: parseInt(data.estoqueMaximo) || 100,
          destaque: data.destaque || false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mercado-produtos"] });
      setIsProdutoDialogOpen(false);
      setSelectedProduto(null);
      resetProdutoForm();
      toast({ title: "Produto atualizado com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar produto", description: error.message, variant: "destructive" });
    },
  });

  const deleteProdutoMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabaseReady;
      if (!supabase) throw new Error("Não configurado");
      const { error } = await supabase
        .from("mercado_produtos")
        .update({ ativo: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mercado-produtos"] });
      toast({ title: "Produto removido com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao remover produto", description: error.message, variant: "destructive" });
    },
  });

  const createPromocaoMutation = useMutation({
    mutationFn: async (data: typeof promocaoForm) => {
      await supabaseReady;
      if (!supabase || !condominiumId) throw new Error("Não configurado");
      const produtoId = data.produtoId && data.produtoId.trim() !== "" ? data.produtoId : null;
      const { error } = await supabase.from("mercado_promocoes").insert({
        condominium_id: condominiumId,
        produto_id: produtoId,
        titulo: data.titulo,
        descricao: data.descricao && data.descricao.trim() !== "" ? data.descricao : null,
        desconto_percentual: parseFloat(data.descontoPercentual) || null,
        preco_promocional: parseFloat(data.precoPromocional) || null,
        data_inicio: data.dataInicio,
        data_fim: data.dataFim,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mercado-promocoes"] });
      setIsPromocaoDialogOpen(false);
      resetPromocaoForm();
      toast({ title: "Promoção criada com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar promoção", description: error.message, variant: "destructive" });
    },
  });

  const createVendaMutation = useMutation({
    mutationFn: async () => {
      await supabaseReady;
      if (!supabase || !condominiumId) throw new Error("Não configurado");
      if (carrinho.length === 0) throw new Error("Carrinho vazio");
      
      const subtotal = carrinho.reduce((sum, item) => sum + item.preco * item.quantidade, 0);
      const cashbackGerado = subtotal * 0.03;
      
      const { data: venda, error: vendaError } = await supabase
        .from("mercado_vendas")
        .insert({
          condominium_id: condominiumId,
          unidade: vendaForm.unidade || null,
          morador_nome: vendaForm.moradorNome || null,
          subtotal,
          total: subtotal,
          forma_pagamento: vendaForm.formaPagamento,
          observacoes: vendaForm.observacoes || null,
        })
        .select()
        .single();
      
      if (vendaError) throw vendaError;
      
      const itens = carrinho.map(item => ({
        venda_id: venda.id,
        produto_id: item.produtoId,
        quantidade: item.quantidade,
        preco_unitario: item.preco,
        total: item.preco * item.quantidade,
      }));
      
      const { error: itensError } = await supabase
        .from("mercado_venda_itens")
        .insert(itens);
      
      if (itensError) throw itensError;
      
      for (const item of carrinho) {
        const produto = produtos.find(p => p.id === item.produtoId);
        if (produto && supabase) {
          const novoEstoque = Math.max(0, (produto.estoqueAtual || 0) - item.quantidade);
          await supabase
            .from("mercado_produtos")
            .update({ estoque_atual: novoEstoque })
            .eq("id", item.produtoId);
        }
      }
      
      if (vendaForm.unidade) {
        await supabase.from("mercado_cashback").insert({
          condominium_id: condominiumId,
          unidade: vendaForm.unidade,
          morador_nome: vendaForm.moradorNome || null,
          tipo: "compra",
          valor: cashbackGerado,
          descricao: `Cashback 3% da compra`,
          venda_id: venda.id,
          data_expiracao: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        });
      }
      
      return venda;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mercado-vendas"] });
      queryClient.invalidateQueries({ queryKey: ["mercado-produtos"] });
      queryClient.invalidateQueries({ queryKey: ["mercado-cashback"] });
      setIsVendaDialogOpen(false);
      setCarrinho([]);
      setVendaForm({ unidade: "", moradorNome: "", formaPagamento: "pix", observacoes: "" });
      toast({ title: "Venda registrada com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao registrar venda", description: error.message, variant: "destructive" });
    },
  });

  const resetProdutoForm = () => {
    setProdutoForm({
      nome: "",
      descricao: "",
      categoriaId: "",
      codigoBarras: "",
      unidade: "un",
      precoCusto: "",
      precoVenda: "",
      estoqueAtual: "",
      estoqueMinimo: "5",
      estoqueMaximo: "100",
      destaque: false,
    });
  };

  const resetPromocaoForm = () => {
    setPromocaoForm({
      produtoId: "",
      titulo: "",
      descricao: "",
      descontoPercentual: "",
      precoPromocional: "",
      dataInicio: "",
      dataFim: "",
    });
  };

  const handleEditProduto = (produto: MercadoProduto) => {
    setSelectedProduto(produto);
    setProdutoForm({
      nome: produto.nome,
      descricao: produto.descricao || "",
      categoriaId: produto.categoriaId || "",
      codigoBarras: produto.codigoBarras || "",
      unidade: produto.unidade || "un",
      precoCusto: String(produto.precoCusto || ""),
      precoVenda: String(produto.precoVenda || ""),
      estoqueAtual: String(produto.estoqueAtual || ""),
      estoqueMinimo: String(produto.estoqueMinimo || "5"),
      estoqueMaximo: String(produto.estoqueMaximo || "100"),
      destaque: produto.destaque || false,
    });
    setIsProdutoDialogOpen(true);
  };

  const handleAddToCart = (produto: MercadoProduto) => {
    const existing = carrinho.find(item => item.produtoId === produto.id);
    if (existing) {
      setCarrinho(carrinho.map(item =>
        item.produtoId === produto.id
          ? { ...item, quantidade: item.quantidade + 1 }
          : item
      ));
    } else {
      setCarrinho([...carrinho, {
        produtoId: produto.id,
        quantidade: 1,
        preco: produto.precoVenda,
        nome: produto.nome,
      }]);
    }
    toast({ title: `${produto.nome} adicionado ao carrinho` });
  };

  const handleRemoveFromCart = (produtoId: string) => {
    setCarrinho(carrinho.filter(item => item.produtoId !== produtoId));
  };

  const handleSubmitProduto = () => {
    if (!produtoForm.nome || !produtoForm.precoVenda) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (selectedProduto) {
      updateProdutoMutation.mutate({ id: selectedProduto.id, data: produtoForm });
    } else {
      createProdutoMutation.mutate(produtoForm);
    }
  };

  const handleSubmitPromocao = () => {
    if (!promocaoForm.titulo || !promocaoForm.dataInicio || !promocaoForm.dataFim) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    createPromocaoMutation.mutate(promocaoForm);
  };

  const totalCarrinho = carrinho.reduce((sum, item) => sum + item.preco * item.quantidade, 0);

  const getNivelBadge = (nivel: string) => {
    const niveis: Record<string, { color: string; label: string }> = {
      bronze: { color: "bg-amber-600", label: "Bronze" },
      prata: { color: "bg-gray-400", label: "Prata" },
      ouro: { color: "bg-yellow-500", label: "Ouro" },
      diamante: { color: "bg-cyan-400", label: "Diamante" },
    };
    return niveis[nivel] || niveis.bronze;
  };

  const getCategoriaNome = (categoriaId: string | null) => {
    if (!categoriaId) return "Geral";
    const cat = categorias.find(c => c.id === categoriaId);
    return cat?.nome || "Geral";
  };

  const getCategoriaIcone = (categoriaId: string | null) => {
    if (!categoriaId) return <Package className="w-8 h-8 text-muted-foreground" />;
    const cat = categorias.find(c => c.id === categoriaId);
    const iconName = cat?.icone || "Package";
    const icons: Record<string, JSX.Element> = {
      Package: <Package className="w-8 h-8 text-muted-foreground" />,
      ShoppingCart: <ShoppingCart className="w-8 h-8 text-muted-foreground" />,
      Coins: <Coins className="w-8 h-8 text-muted-foreground" />,
      Gift: <Gift className="w-8 h-8 text-muted-foreground" />,
      Tag: <Tag className="w-8 h-8 text-muted-foreground" />,
    };
    return icons[iconName] || <Package className="w-8 h-8 text-muted-foreground" />;
  };

  if (!condominiumId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Selecione um condomínio</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="mini-mercado-page">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Mini Mercado</h1>
            <p className="text-sm text-muted-foreground">Gestão do mercado do condomínio</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setIsCategoriaDialogOpen(true)} variant="outline" data-testid="button-add-categoria">
            <Tag className="w-4 h-4 mr-2" />
            Nova Categoria
          </Button>
          <Button onClick={() => { resetProdutoForm(); setSelectedProduto(null); setIsProdutoDialogOpen(true); }} data-testid="button-add-produto">
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
          <Button onClick={() => setIsVendaDialogOpen(true)} variant="default" className="bg-green-600 hover:bg-green-700" data-testid="button-nova-venda">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Nova Venda
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vendas do Mês</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalVendasMes)}</p>
                <p className="text-xs text-green-600 mt-1">+{stats.vendasHoje} vendas hoje</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.ticketMedio)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clientes</p>
                <p className="text-2xl font-bold mt-1">{stats.totalClientes}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cashback Gerado</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.cashbackGerado)}</p>
                <p className="text-xs text-muted-foreground mt-1">3% das vendas</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Coins className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.produtosBaixoEstoque > 0 && (
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-900/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <p className="text-sm">
              <span className="font-semibold">{stats.produtosBaixoEstoque} produto(s)</span> com estoque baixo. Verifique a aba de produtos.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 gap-1">
          <TabsTrigger value="dashboard" className="gap-2" data-testid="tab-dashboard">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden md:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="produtos" className="gap-2" data-testid="tab-produtos">
            <Package className="w-4 h-4" />
            <span className="hidden md:inline">Produtos</span>
          </TabsTrigger>
          <TabsTrigger value="promocoes" className="gap-2" data-testid="tab-promocoes">
            <Tag className="w-4 h-4" />
            <span className="hidden md:inline">Promoções</span>
          </TabsTrigger>
          <TabsTrigger value="vendas" className="gap-2" data-testid="tab-vendas">
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden md:inline">Vendas</span>
          </TabsTrigger>
          <TabsTrigger value="perfil" className="gap-2" data-testid="tab-perfil">
            <Users className="w-4 h-4" />
            <span className="hidden md:inline">Perfil Consumo</span>
          </TabsTrigger>
          <TabsTrigger value="cashback" className="gap-2" data-testid="tab-cashback">
            <Coins className="w-4 h-4" />
            <span className="hidden md:inline">Cashback</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Resumo de Vendas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Total de Produtos</span>
                    <span className="font-semibold">{stats.totalProdutos}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Promoções Ativas</span>
                    <span className="font-semibold">{stats.promocoesAtivas}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Vendas Hoje</span>
                    <span className="font-semibold">{stats.vendasHoje}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Estoque Baixo</span>
                    <Badge variant="destructive">{stats.produtosBaixoEstoque}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Últimas Vendas</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingVendas ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : vendas.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhuma venda registrada</p>
                ) : (
                  <div className="space-y-3">
                    {vendas.slice(0, 5).map(venda => (
                      <div key={venda.id} className="flex justify-between items-center py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium">{venda.moradorNome || venda.unidade || "Cliente"}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(venda.dataVenda)}</p>
                        </div>
                        <span className="font-bold text-green-600">{formatCurrency(venda.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="produtos" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle>Catálogo de Produtos</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar produto..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-9 w-[200px]"
                      data-testid="input-search-produto"
                    />
                  </div>
                  <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
                    <SelectTrigger className="w-[150px]" data-testid="select-categoria-filter">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {categorias.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.icone} {cat.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingProdutos ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : produtosFiltrados.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum produto encontrado</p>
                  <Button className="mt-4" onClick={() => { resetProdutoForm(); setSelectedProduto(null); setIsProdutoDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Produto
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {produtosFiltrados.map(produto => (
                    <Card key={produto.id} className="hover-elevate overflow-hidden" data-testid={`card-produto-${produto.id}`}>
                      <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center text-4xl relative">
                        {getCategoriaIcone(produto.categoriaId)}
                        {produto.destaque && (
                          <Badge className="absolute top-2 right-2 bg-yellow-500">
                            <Star className="w-3 h-3 mr-1" />
                            Destaque
                          </Badge>
                        )}
                        {(produto.estoqueAtual || 0) <= (produto.estoqueMinimo || 5) && (
                          <Badge variant="destructive" className="absolute top-2 left-2">
                            Estoque Baixo
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground uppercase">{getCategoriaNome(produto.categoriaId)}</p>
                        <h3 className="font-semibold mt-1 truncate">{produto.nome}</h3>
                        <p className="text-2xl font-bold text-primary mt-2">{formatCurrency(produto.precoVenda)}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          📦 Estoque: {produto.estoqueAtual} {produto.unidade}
                        </p>
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEditProduto(produto)} data-testid={`button-edit-produto-${produto.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleAddToCart(produto)} data-testid={`button-cart-produto-${produto.id}`}>
                            <ShoppingCart className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteProdutoMutation.mutate(produto.id)} data-testid={`button-delete-produto-${produto.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promocoes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Promoções</CardTitle>
                <Button onClick={() => { resetPromocaoForm(); setSelectedPromocao(null); setIsPromocaoDialogOpen(true); }} data-testid="button-add-promocao">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Promoção
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPromocoes ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : promocoes.length === 0 ? (
                <div className="text-center py-12">
                  <Gift className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma promoção ativa</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {promocoes.map(promo => {
                    const hoje = new Date().toISOString().split("T")[0];
                    const ativa = promo.dataInicio <= hoje && promo.dataFim >= hoje;
                    return (
                      <Card key={promo.id} className={`overflow-hidden ${ativa ? "border-green-500" : "border-gray-300"}`} data-testid={`card-promocao-${promo.id}`}>
                        <div className="h-24 bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center relative">
                          <span className="text-4xl">🔥</span>
                          {promo.descontoPercentual && (
                            <Badge className="absolute top-2 right-2 bg-white text-red-600">
                              {promo.descontoPercentual}% OFF
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <Badge className={ativa ? "bg-green-600" : "bg-gray-500"}>
                            {ativa ? "Ativa" : "Encerrada"}
                          </Badge>
                          <h3 className="font-semibold mt-2">{promo.titulo}</h3>
                          {promo.descricao && <p className="text-sm text-muted-foreground mt-1">{promo.descricao}</p>}
                          {promo.precoPromocional && (
                            <p className="text-xl font-bold text-primary mt-2">{formatCurrency(promo.precoPromocional)}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            📅 {formatDate(promo.dataInicio)} - {formatDate(promo.dataFim)}
                          </p>
                          {!promo.pushEnviado && ativa && (
                            <Button size="sm" className="w-full mt-3 bg-blue-600 hover:bg-blue-700">
                              <Bell className="w-4 h-4 mr-2" />
                              Enviar Push
                            </Button>
                          )}
                          {promo.pushEnviado && (
                            <p className="text-xs text-green-600 mt-2 text-center">✅ Push enviado</p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingVendas ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : vendas.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma venda registrada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendas.map(venda => (
                      <TableRow key={venda.id} data-testid={`row-venda-${venda.id}`}>
                        <TableCell>{formatDateTime(venda.dataVenda)}</TableCell>
                        <TableCell>{venda.moradorNome || "-"}</TableCell>
                        <TableCell>{venda.unidade || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{venda.formaPagamento || "pix"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={venda.status === "concluida" ? "bg-green-600" : "bg-yellow-600"}>
                            {venda.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(venda.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="perfil" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Perfil de Consumo dos Moradores</CardTitle>
            </CardHeader>
            <CardContent>
              {perfisConsumo.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum perfil de consumo registrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Morador</TableHead>
                      <TableHead>Total Compras</TableHead>
                      <TableHead>Qtd Compras</TableHead>
                      <TableHead>Ticket Médio</TableHead>
                      <TableHead>Última Compra</TableHead>
                      <TableHead>Nível</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perfisConsumo.map(perfil => {
                      const nivel = getNivelBadge(perfil.nivel || "bronze");
                      return (
                        <TableRow key={perfil.id}>
                          <TableCell className="font-semibold">{perfil.unidade}</TableCell>
                          <TableCell>{perfil.moradorNome || "-"}</TableCell>
                          <TableCell>{formatCurrency(perfil.totalCompras || 0)}</TableCell>
                          <TableCell>{perfil.quantidadeCompras || 0}</TableCell>
                          <TableCell>{formatCurrency(perfil.ticketMedio || 0)}</TableCell>
                          <TableCell>{formatDateTime(perfil.ultimaCompra)}</TableCell>
                          <TableCell>
                            <Badge className={nivel.color}>{nivel.label}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cashback dos Moradores</CardTitle>
            </CardHeader>
            <CardContent>
              {cashbacks.length === 0 ? (
                <div className="text-center py-12">
                  <Coins className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum cashback registrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Morador</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Expira em</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashbacks.map(cb => (
                      <TableRow key={cb.id}>
                        <TableCell>{formatDate(cb.createdAt)}</TableCell>
                        <TableCell className="font-semibold">{cb.unidade}</TableCell>
                        <TableCell>{cb.moradorNome || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{cb.tipo}</Badge>
                        </TableCell>
                        <TableCell>{cb.descricao || "-"}</TableCell>
                        <TableCell>{formatDate(cb.dataExpiracao)}</TableCell>
                        <TableCell>
                          <Badge className={cb.utilizado ? "bg-gray-500" : "bg-green-600"}>
                            {cb.utilizado ? "Utilizado" : "Disponível"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {formatCurrency(cb.valor)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isCategoriaDialogOpen} onOpenChange={setIsCategoriaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da Categoria *</Label>
              <Input
                value={categoriaForm.nome}
                onChange={e => setCategoriaForm({ ...categoriaForm, nome: e.target.value })}
                placeholder="Ex: Bebidas"
                data-testid="input-categoria-nome"
              />
            </div>
            <div>
              <Label>Ícone</Label>
              <Input
                value={categoriaForm.icone}
                onChange={e => setCategoriaForm({ ...categoriaForm, icone: e.target.value })}
                placeholder="Ex: 🍺"
                data-testid="input-categoria-icone"
              />
            </div>
            <div>
              <Label>Cor</Label>
              <Input
                type="color"
                value={categoriaForm.cor}
                onChange={e => setCategoriaForm({ ...categoriaForm, cor: e.target.value })}
                data-testid="input-categoria-cor"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoriaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => createCategoriaMutation.mutate(categoriaForm)} disabled={createCategoriaMutation.isPending} data-testid="button-save-categoria">
              {createCategoriaMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isProdutoDialogOpen} onOpenChange={setIsProdutoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProduto ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Nome do Produto *</Label>
              <Input
                value={produtoForm.nome}
                onChange={e => setProdutoForm({ ...produtoForm, nome: e.target.value })}
                placeholder="Ex: Coca-Cola 2L"
                data-testid="input-produto-nome"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Descrição</Label>
              <Textarea
                value={produtoForm.descricao}
                onChange={e => setProdutoForm({ ...produtoForm, descricao: e.target.value })}
                placeholder="Descrição do produto"
                data-testid="input-produto-descricao"
              />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={produtoForm.categoriaId} onValueChange={v => setProdutoForm({ ...produtoForm, categoriaId: v })}>
                <SelectTrigger data-testid="select-produto-categoria">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.icone} {cat.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Código de Barras</Label>
              <Input
                value={produtoForm.codigoBarras}
                onChange={e => setProdutoForm({ ...produtoForm, codigoBarras: e.target.value })}
                placeholder="Ex: 7891234567890"
                data-testid="input-produto-codigo"
              />
            </div>
            <div>
              <Label>Preço de Custo</Label>
              <Input
                type="number"
                step="0.01"
                value={produtoForm.precoCusto}
                onChange={e => setProdutoForm({ ...produtoForm, precoCusto: e.target.value })}
                placeholder="0,00"
                data-testid="input-produto-custo"
              />
            </div>
            <div>
              <Label>Preço de Venda *</Label>
              <Input
                type="number"
                step="0.01"
                value={produtoForm.precoVenda}
                onChange={e => setProdutoForm({ ...produtoForm, precoVenda: e.target.value })}
                placeholder="0,00"
                data-testid="input-produto-venda"
              />
            </div>
            <div>
              <Label>Unidade</Label>
              <Select value={produtoForm.unidade} onValueChange={v => setProdutoForm({ ...produtoForm, unidade: v })}>
                <SelectTrigger data-testid="select-produto-unidade">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="un">Unidade</SelectItem>
                  <SelectItem value="kg">Quilograma</SelectItem>
                  <SelectItem value="l">Litro</SelectItem>
                  <SelectItem value="pc">Pacote</SelectItem>
                  <SelectItem value="cx">Caixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estoque Atual</Label>
              <Input
                type="number"
                value={produtoForm.estoqueAtual}
                onChange={e => setProdutoForm({ ...produtoForm, estoqueAtual: e.target.value })}
                placeholder="0"
                data-testid="input-produto-estoque"
              />
            </div>
            <div>
              <Label>Estoque Mínimo</Label>
              <Input
                type="number"
                value={produtoForm.estoqueMinimo}
                onChange={e => setProdutoForm({ ...produtoForm, estoqueMinimo: e.target.value })}
                placeholder="5"
                data-testid="input-produto-estoque-min"
              />
            </div>
            <div>
              <Label>Estoque Máximo</Label>
              <Input
                type="number"
                value={produtoForm.estoqueMaximo}
                onChange={e => setProdutoForm({ ...produtoForm, estoqueMaximo: e.target.value })}
                placeholder="100"
                data-testid="input-produto-estoque-max"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={produtoForm.destaque}
                onCheckedChange={checked => setProdutoForm({ ...produtoForm, destaque: checked })}
                data-testid="switch-produto-destaque"
              />
              <Label>Produto em Destaque</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProdutoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitProduto} disabled={createProdutoMutation.isPending || updateProdutoMutation.isPending} data-testid="button-save-produto">
              {(createProdutoMutation.isPending || updateProdutoMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPromocaoDialogOpen} onOpenChange={setIsPromocaoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Promoção</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={promocaoForm.titulo}
                onChange={e => setPromocaoForm({ ...promocaoForm, titulo: e.target.value })}
                placeholder="Ex: Super Oferta de Verão"
                data-testid="input-promocao-titulo"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={promocaoForm.descricao}
                onChange={e => setPromocaoForm({ ...promocaoForm, descricao: e.target.value })}
                placeholder="Descrição da promoção"
                data-testid="input-promocao-descricao"
              />
            </div>
            <div>
              <Label>Produto (opcional)</Label>
              <Select value={promocaoForm.produtoId} onValueChange={v => setPromocaoForm({ ...promocaoForm, produtoId: v })}>
                <SelectTrigger data-testid="select-promocao-produto">
                  <SelectValue placeholder="Selecione um produto..." />
                </SelectTrigger>
                <SelectContent>
                  {produtos.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Desconto %</Label>
                <Input
                  type="number"
                  value={promocaoForm.descontoPercentual}
                  onChange={e => setPromocaoForm({ ...promocaoForm, descontoPercentual: e.target.value })}
                  placeholder="Ex: 20"
                  data-testid="input-promocao-desconto"
                />
              </div>
              <div>
                <Label>Preço Promocional</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={promocaoForm.precoPromocional}
                  onChange={e => setPromocaoForm({ ...promocaoForm, precoPromocional: e.target.value })}
                  placeholder="0,00"
                  data-testid="input-promocao-preco"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data Início *</Label>
                <Input
                  type="date"
                  value={promocaoForm.dataInicio}
                  onChange={e => setPromocaoForm({ ...promocaoForm, dataInicio: e.target.value })}
                  data-testid="input-promocao-inicio"
                />
              </div>
              <div>
                <Label>Data Fim *</Label>
                <Input
                  type="date"
                  value={promocaoForm.dataFim}
                  onChange={e => setPromocaoForm({ ...promocaoForm, dataFim: e.target.value })}
                  data-testid="input-promocao-fim"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPromocaoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitPromocao} disabled={createPromocaoMutation.isPending} data-testid="button-save-promocao">
              {createPromocaoMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isVendaDialogOpen} onOpenChange={setIsVendaDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Venda</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Dados do Cliente</h3>
              <div>
                <Label>Unidade</Label>
                <Input
                  value={vendaForm.unidade}
                  onChange={e => setVendaForm({ ...vendaForm, unidade: e.target.value })}
                  placeholder="Ex: 101"
                  data-testid="input-venda-unidade"
                />
              </div>
              <div>
                <Label>Nome do Morador</Label>
                <Input
                  value={vendaForm.moradorNome}
                  onChange={e => setVendaForm({ ...vendaForm, moradorNome: e.target.value })}
                  placeholder="Nome do morador"
                  data-testid="input-venda-morador"
                />
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={vendaForm.formaPagamento} onValueChange={v => setVendaForm({ ...vendaForm, formaPagamento: v })}>
                  <SelectTrigger data-testid="select-venda-pagamento">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                    <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                    <SelectItem value="fiado">Fiado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={vendaForm.observacoes}
                  onChange={e => setVendaForm({ ...vendaForm, observacoes: e.target.value })}
                  placeholder="Observações..."
                  data-testid="input-venda-obs"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Produtos no Carrinho</h3>
              {carrinho.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Carrinho vazio. Adicione produtos pela aba Produtos.</p>
              ) : (
                <div className="space-y-2">
                  {carrinho.map(item => (
                    <div key={item.produtoId} className="flex items-center justify-between p-2 border rounded-lg">
                      <div>
                        <p className="font-medium">{item.nome}</p>
                        <p className="text-sm text-muted-foreground">{item.quantidade}x {formatCurrency(item.preco)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{formatCurrency(item.preco * item.quantidade)}</span>
                        <Button size="icon" variant="ghost" onClick={() => handleRemoveFromCart(item.produtoId)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-green-600">{formatCurrency(totalCarrinho)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground mt-1">
                      <span>Cashback (3%):</span>
                      <span className="text-orange-600">{formatCurrency(totalCarrinho * 0.03)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVendaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => createVendaMutation.mutate()} disabled={createVendaMutation.isPending || carrinho.length === 0} className="bg-green-600 hover:bg-green-700" data-testid="button-finalizar-venda">
              {createVendaMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Finalizar Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
