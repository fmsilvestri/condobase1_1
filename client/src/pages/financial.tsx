import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Upload, Download, Edit2, Trash2, Plus, Filter, 
  DollarSign, TrendingUp, TrendingDown, FileText,
  Check, X, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, getAuthHeaders } from "@/lib/queryClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface FinancialCategory {
  id: string;
  condominiumId: string;
  name: string;
  type: string;
  description: string | null;
  keywords: string | null;
  color: string;
  isActive: boolean;
}

interface FinancialTransaction {
  id: string;
  condominiumId: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  categoryId: string | null;
  categoryName: string | null;
  status: string;
  bankName: string | null;
  accountNumber: string | null;
  fitId: string | null;
  importedAt: string | null;
  notes: string | null;
}

interface FinancialSummary {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  totalTransactions: number;
  byCategory: Array<{ name: string; type: string; total: number; count: number }>;
  transactions: FinancialTransaction[];
}

export default function Financeiro() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("transacoes");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<FinancialTransaction | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");

  const [editForm, setEditForm] = useState({
    description: "",
    amount: 0,
    type: "despesa",
    categoryId: "",
    categoryName: "",
    status: "pendente",
    notes: "",
  });

  const [newCategory, setNewCategory] = useState({
    name: "",
    type: "despesa",
    description: "",
    keywords: "",
    color: "#6366f1",
  });

  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split('T')[0],
    description: "",
    amount: 0,
    type: "despesa",
    categoryId: "",
    status: "confirmado",
    notes: "",
  });

  const { data: transactions = [], isLoading: loadingTransactions } = useQuery<FinancialTransaction[]>({
    queryKey: ["/api/financial/transactions", filterStartDate, filterEndDate, filterType, filterCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStartDate) params.append("startDate", filterStartDate);
      if (filterEndDate) params.append("endDate", filterEndDate);
      if (filterType && filterType !== "all") params.append("type", filterType);
      if (filterCategory && filterCategory !== "all") params.append("categoryId", filterCategory);
      const res = await fetch(`/api/financial/transactions?${params}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Erro ao carregar transações");
      return res.json();
    },
  });

  const { data: categories = [] } = useQuery<FinancialCategory[]>({
    queryKey: ["/api/financial/categories"],
  });

  const { data: summary } = useQuery<FinancialSummary>({
    queryKey: ["/api/financial/summary", filterStartDate, filterEndDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStartDate) params.append("startDate", filterStartDate);
      if (filterEndDate) params.append("endDate", filterEndDate);
      const res = await fetch(`/api/financial/summary?${params}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Erro ao carregar resumo");
      return res.json();
    },
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<FinancialTransaction> }) => {
      return apiRequest("PATCH", `/api/financial/transactions/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/summary"] });
      setIsEditOpen(false);
      toast({ title: "Transação atualizada com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar transação", description: error.message, variant: "destructive" });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/financial/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/summary"] });
      toast({ title: "Transação excluída com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao excluir transação", description: error.message, variant: "destructive" });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: typeof newCategory) => {
      return apiRequest("POST", "/api/financial/categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/categories"] });
      setIsCategoryOpen(false);
      setNewCategory({ name: "", type: "despesa", description: "", keywords: "", color: "#6366f1" });
      toast({ title: "Categoria criada com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar categoria", description: error.message, variant: "destructive" });
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: typeof newTransaction) => {
      const category = categories.find(c => c.id === data.categoryId);
      return apiRequest("POST", "/api/financial/transactions", {
        ...data,
        categoryName: category?.name || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/summary"] });
      setIsCreateOpen(false);
      setNewTransaction({
        date: new Date().toISOString().split('T')[0],
        description: "",
        amount: 0,
        type: "despesa",
        categoryId: "",
        status: "confirmado",
        notes: "",
      });
      toast({ title: "Transação criada com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar transação", description: error.message, variant: "destructive" });
    },
  });

  const handleUploadOFX = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/financial/import-ofx", {
        method: "POST",
        body: formData,
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao importar OFX");
      }

      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/financial/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/summary"] });
      setIsUploadOpen(false);
      toast({
        title: "Importação concluída",
        description: `${result.imported} transações importadas, ${result.skipped} ignoradas (duplicatas)`,
      });
    } catch (error: any) {
      toast({ title: "Erro ao importar OFX", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditTransaction = (transaction: FinancialTransaction) => {
    setSelectedTransaction(transaction);
    setEditForm({
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      categoryId: transaction.categoryId || "",
      categoryName: transaction.categoryName || "",
      status: transaction.status,
      notes: transaction.notes || "",
    });
    setIsEditOpen(true);
  };

  const handleSaveTransaction = () => {
    if (!selectedTransaction) return;
    
    const category = categories.find(c => c.id === editForm.categoryId);
    updateTransactionMutation.mutate({
      id: selectedTransaction.id,
      updates: {
        ...editForm,
        categoryName: category?.name || editForm.categoryName,
      },
    });
  };

  const generatePDF = () => {
    if (!summary) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    doc.setFontSize(18);
    doc.text("Relatório Financeiro", pageWidth / 2, 20, { align: "center" });

    if (filterStartDate || filterEndDate) {
      doc.setFontSize(10);
      const period = `Período: ${filterStartDate || "Início"} a ${filterEndDate || "Atual"}`;
      doc.text(period, pageWidth / 2, 28, { align: "center" });
    }

    doc.setFontSize(12);
    doc.text(`Data de geração: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 40);

    doc.setFontSize(14);
    doc.text("Resumo Geral", 14, 55);

    autoTable(doc, {
      startY: 60,
      head: [["Descrição", "Valor"]],
      body: [
        ["Total de Receitas", `R$ ${summary.totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
        ["Total de Despesas", `R$ ${summary.totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
        ["Saldo", `R$ ${summary.saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
        ["Total de Transações", summary.totalTransactions.toString()],
      ],
      theme: "grid",
      headStyles: { fillColor: [99, 102, 241] },
    });

    const finalY1 = (doc as any).lastAutoTable.finalY + 15;
    doc.text("Resumo por Categoria", 14, finalY1);

    const receitas = summary.byCategory.filter(c => c.type === "receita");
    const despesas = summary.byCategory.filter(c => c.type === "despesa");

    if (receitas.length > 0) {
      autoTable(doc, {
        startY: finalY1 + 5,
        head: [["Categoria (Receitas)", "Qtd", "Total"]],
        body: receitas.map(c => [
          c.name,
          c.count.toString(),
          `R$ ${c.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        ]),
        theme: "grid",
        headStyles: { fillColor: [34, 197, 94] },
      });
    }

    const finalY2 = (doc as any).lastAutoTable?.finalY + 10 || finalY1 + 10;
    
    if (despesas.length > 0) {
      autoTable(doc, {
        startY: finalY2,
        head: [["Categoria (Despesas)", "Qtd", "Total"]],
        body: despesas.map(c => [
          c.name,
          c.count.toString(),
          `R$ ${c.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        ]),
        theme: "grid",
        headStyles: { fillColor: [239, 68, 68] },
      });
    }

    doc.addPage();
    doc.setFontSize(14);
    doc.text("Detalhamento de Transações", 14, 20);

    autoTable(doc, {
      startY: 25,
      head: [["Data", "Descrição", "Categoria", "Tipo", "Valor"]],
      body: summary.transactions.map(t => [
        t.date ? format(new Date(t.date), "dd/MM/yyyy") : "-",
        t.description.substring(0, 40),
        t.categoryName || "Não classificado",
        t.type === "receita" ? "Receita" : "Despesa",
        `R$ ${t.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      ]),
      theme: "striped",
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 8 },
    });

    doc.save(`relatorio-financeiro-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast({ title: "PDF gerado com sucesso" });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="container mx-auto p-4 space-y-6" data-testid="page-financeiro">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Módulo Financeiro</h1>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setIsCreateOpen(true)} data-testid="button-new-transaction">
            <Plus className="w-4 h-4 mr-2" />
            Nova Transação
          </Button>
          <Button variant="outline" onClick={() => setIsUploadOpen(true)} data-testid="button-import-ofx">
            <Upload className="w-4 h-4 mr-2" />
            Importar OFX
          </Button>
          <Button variant="outline" onClick={generatePDF} disabled={!summary} data-testid="button-generate-pdf">
            <FileText className="w-4 h-4 mr-2" />
            Gerar PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary?.totalReceitas || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary?.totalDespesas || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(summary?.saldo || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(summary?.saldo || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transações</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalTransactions || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="transacoes" data-testid="tab-transacoes">Transações</TabsTrigger>
          <TabsTrigger value="categorias" data-testid="tab-categorias">Categorias</TabsTrigger>
          <TabsTrigger value="resumo" data-testid="tab-resumo">Resumo por Categoria</TabsTrigger>
        </TabsList>

        <TabsContent value="transacoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Data Inicial</Label>
                  <Input 
                    type="date" 
                    value={filterStartDate} 
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    data-testid="input-filter-start-date"
                  />
                </div>
                <div>
                  <Label>Data Final</Label>
                  <Input 
                    type="date" 
                    value={filterEndDate} 
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    data-testid="input-filter-end-date"
                  />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger data-testid="select-filter-type">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="receita">Receita</SelectItem>
                      <SelectItem value="despesa">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger data-testid="select-filter-category">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              {loadingTransactions ? (
                <div className="text-center py-8">Carregando transações...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma transação encontrada. Importe um arquivo OFX para começar.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((trn) => (
                      <TableRow key={trn.id} data-testid={`row-transaction-${trn.id}`}>
                        <TableCell>
                          {trn.date ? format(new Date(trn.date), "dd/MM/yyyy") : "-"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={trn.description}>
                          {trn.description}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {trn.categoryName || "Não classificado"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={trn.type === "receita" ? "default" : "destructive"}>
                            {trn.type === "receita" ? "Receita" : "Despesa"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={trn.status === "confirmado" ? "default" : "secondary"}>
                            {trn.status}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${trn.type === "receita" ? "text-green-600" : "text-red-600"}`}>
                          {formatCurrency(trn.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => handleEditTransaction(trn)}
                              data-testid={`button-edit-transaction-${trn.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => deleteTransactionMutation.mutate(trn.id)}
                              data-testid={`button-delete-transaction-${trn.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categorias" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsCategoryOpen(true)} data-testid="button-add-category">
              <Plus className="w-4 h-4 mr-2" />
              Nova Categoria
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Palavras-chave</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id} data-testid={`row-category-${cat.id}`}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell>
                        <Badge variant={cat.type === "receita" ? "default" : "destructive"}>
                          {cat.type === "receita" ? "Receita" : "Despesa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{cat.keywords || "-"}</TableCell>
                      <TableCell>
                        <div 
                          className="w-6 h-6 rounded" 
                          style={{ backgroundColor: cat.color }}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={cat.isActive ? "default" : "secondary"}>
                          {cat.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resumo" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Receitas por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                {summary?.byCategory.filter(c => c.type === "receita").map((cat) => (
                  <div key={cat.name} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span>{cat.name}</span>
                    <div className="text-right">
                      <div className="font-medium text-green-600">{formatCurrency(cat.total)}</div>
                      <div className="text-xs text-muted-foreground">{cat.count} transações</div>
                    </div>
                  </div>
                ))}
                {summary?.byCategory.filter(c => c.type === "receita").length === 0 && (
                  <div className="text-center text-muted-foreground py-4">Sem receitas no período</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Despesas por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                {summary?.byCategory.filter(c => c.type === "despesa").map((cat) => (
                  <div key={cat.name} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span>{cat.name}</span>
                    <div className="text-right">
                      <div className="font-medium text-red-600">{formatCurrency(cat.total)}</div>
                      <div className="text-xs text-muted-foreground">{cat.count} transações</div>
                    </div>
                  </div>
                ))}
                {summary?.byCategory.filter(c => c.type === "despesa").length === 0 && (
                  <div className="text-center text-muted-foreground py-4">Sem despesas no período</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Extrato OFX</DialogTitle>
            <DialogDescription>
              Selecione um arquivo OFX do seu banco para importar as transações automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="file"
              accept=".ofx,.OFX"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadOFX(file);
              }}
              disabled={isUploading}
              data-testid="input-upload-ofx"
            />
            {isUploading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Importando transações...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Transação</DialogTitle>
            <DialogDescription>
              Adicione uma nova transação manualmente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data</Label>
                <Input 
                  type="date" 
                  value={newTransaction.date} 
                  onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                  data-testid="input-new-date"
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={newTransaction.type} onValueChange={(v) => setNewTransaction({ ...newTransaction, type: v, categoryId: "" })}>
                  <SelectTrigger data-testid="select-new-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input 
                value={newTransaction.description} 
                onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                placeholder="Ex: Pagamento taxa de condomínio"
                data-testid="input-new-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor (R$)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={newTransaction.amount} 
                  onChange={(e) => setNewTransaction({ ...newTransaction, amount: parseFloat(e.target.value) || 0 })}
                  data-testid="input-new-amount"
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select 
                  value={newTransaction.categoryId} 
                  onValueChange={(v) => setNewTransaction({ ...newTransaction, categoryId: v })}
                >
                  <SelectTrigger data-testid="select-new-category">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.type === newTransaction.type).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={newTransaction.status} onValueChange={(v) => setNewTransaction({ ...newTransaction, status: v })}>
                <SelectTrigger data-testid="select-new-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações (opcional)</Label>
              <Textarea 
                value={newTransaction.notes} 
                onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })}
                placeholder="Notas adicionais sobre esta transação"
                data-testid="textarea-new-notes"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => createTransactionMutation.mutate(newTransaction)} 
                disabled={createTransactionMutation.isPending || !newTransaction.description || newTransaction.amount <= 0}
                data-testid="button-create-transaction"
              >
                {createTransactionMutation.isPending ? "Salvando..." : "Criar Transação"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Transação</DialogTitle>
            <DialogDescription>
              Atualize os dados da transação e classifique corretamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Descrição</Label>
              <Input 
                value={editForm.description} 
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                data-testid="input-edit-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={editForm.amount} 
                  onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                  data-testid="input-edit-amount"
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={editForm.type} onValueChange={(v) => setEditForm({ ...editForm, type: v })}>
                  <SelectTrigger data-testid="select-edit-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select 
                  value={editForm.categoryId} 
                  onValueChange={(v) => {
                    const cat = categories.find(c => c.id === v);
                    setEditForm({ ...editForm, categoryId: v, categoryName: cat?.name || "" });
                  }}
                >
                  <SelectTrigger data-testid="select-edit-category">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.type === editForm.type).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger data-testid="select-edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea 
                value={editForm.notes} 
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                data-testid="textarea-edit-notes"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveTransaction} 
                disabled={updateTransactionMutation.isPending}
                data-testid="button-save-transaction"
              >
                {updateTransactionMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>
              Crie uma nova categoria para classificar suas transações.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input 
                value={newCategory.name} 
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                data-testid="input-category-name"
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={newCategory.type} onValueChange={(v) => setNewCategory({ ...newCategory, type: v })}>
                <SelectTrigger data-testid="select-category-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Palavras-chave (separadas por vírgula)</Label>
              <Input 
                value={newCategory.keywords} 
                onChange={(e) => setNewCategory({ ...newCategory, keywords: e.target.value })}
                placeholder="energia, luz, celesc"
                data-testid="input-category-keywords"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea 
                value={newCategory.description} 
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                data-testid="textarea-category-description"
              />
            </div>
            <div>
              <Label>Cor</Label>
              <Input 
                type="color" 
                value={newCategory.color} 
                onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                className="w-20 h-10"
                data-testid="input-category-color"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCategoryOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => createCategoryMutation.mutate(newCategory)} 
                disabled={createCategoryMutation.isPending || !newCategory.name}
                data-testid="button-save-category"
              >
                {createCategoryMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
