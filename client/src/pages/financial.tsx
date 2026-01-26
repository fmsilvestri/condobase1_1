import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  PieChart,
  BarChart3,
  Loader2,
  Search,
  Filter,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { queryClient, apiRequest } from "@/lib/queryClient";

const transactionSchema = z.object({
  type: z.string(),
  category: z.string(),
  description: z.string().min(3, "Descrição é obrigatória"),
  amount: z.coerce.number().positive("Valor deve ser positivo"),
  transactionDate: z.string(),
  status: z.string(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface FinancialTransaction {
  id: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  transactionDate: string;
  status: string;
  createdAt: string;
}

interface Budget {
  id: string;
  year: number;
  month: number | null;
  category: string;
  plannedAmount: number;
  actualAmount: number;
}

const categoryLabels: Record<string, string> = {
  pessoal: "Pessoal",
  manutencao: "Manutenção",
  limpeza: "Limpeza",
  seguranca: "Segurança",
  energia: "Energia",
  agua: "Água",
  gas: "Gás",
  seguros: "Seguros",
  administrativo: "Administrativo",
  fundo_reserva: "Fundo de Reserva",
  outros: "Outros",
  taxa_condominial: "Taxa Condominial",
  aluguel: "Aluguel de Espaços",
  multas: "Multas",
};

const categoryColors: Record<string, string> = {
  pessoal: "blue",
  manutencao: "amber",
  limpeza: "emerald",
  seguranca: "purple",
  energia: "yellow",
  agua: "cyan",
  gas: "orange",
  seguros: "indigo",
  administrativo: "slate",
  fundo_reserva: "teal",
  outros: "gray",
};

export default function Financial() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const { toast } = useToast();

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "despesa",
      category: "manutencao",
      description: "",
      amount: 0,
      transactionDate: new Date().toISOString().split("T")[0],
      status: "pendente",
    },
  });

  const createTransaction = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      return apiRequest("/api/financial/transactions", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/transactions"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Transação registrada com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao registrar transação", variant: "destructive" });
    },
  });

  const onSubmit = (data: TransactionFormData) => {
    createTransaction.mutate(data);
  };

  const mockTransactions: FinancialTransaction[] = [
    { id: "1", type: "receita", category: "taxa_condominial", description: "Taxa condominial Janeiro", amount: 48000, transactionDate: "2024-01-05", status: "pago", createdAt: "2024-01-05T10:00:00Z" },
    { id: "2", type: "despesa", category: "pessoal", description: "Folha de pagamento Janeiro", amount: 18500, transactionDate: "2024-01-31", status: "pago", createdAt: "2024-01-31T10:00:00Z" },
    { id: "3", type: "despesa", category: "manutencao", description: "Manutenção elevador", amount: 3200, transactionDate: "2024-01-15", status: "pago", createdAt: "2024-01-15T10:00:00Z" },
    { id: "4", type: "despesa", category: "energia", description: "Conta de energia elétrica", amount: 4800, transactionDate: "2024-01-20", status: "pendente", createdAt: "2024-01-20T10:00:00Z" },
    { id: "5", type: "despesa", category: "agua", description: "Conta de água", amount: 2100, transactionDate: "2024-01-18", status: "pago", createdAt: "2024-01-18T10:00:00Z" },
    { id: "6", type: "receita", category: "aluguel", description: "Aluguel salão de festas", amount: 800, transactionDate: "2024-01-12", status: "pago", createdAt: "2024-01-12T10:00:00Z" },
  ];

  const mockBudgets: Budget[] = [
    { id: "1", year: 2024, month: null, category: "pessoal", plannedAmount: 220000, actualAmount: 18500 },
    { id: "2", year: 2024, month: null, category: "manutencao", plannedAmount: 80000, actualAmount: 12500 },
    { id: "3", year: 2024, month: null, category: "energia", plannedAmount: 60000, actualAmount: 4800 },
    { id: "4", year: 2024, month: null, category: "agua", plannedAmount: 30000, actualAmount: 2100 },
    { id: "5", year: 2024, month: null, category: "seguranca", plannedAmount: 48000, actualAmount: 4000 },
    { id: "6", year: 2024, month: null, category: "limpeza", plannedAmount: 24000, actualAmount: 2000 },
  ];

  const transactions = mockTransactions;
  const budgets = mockBudgets;

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || t.type === filterType;
    return matchesSearch && matchesType;
  });

  const totalReceitas = transactions.filter((t) => t.type === "receita").reduce((sum, t) => sum + t.amount, 0);
  const totalDespesas = transactions.filter((t) => t.type === "despesa").reduce((sum, t) => sum + t.amount, 0);
  const saldo = totalReceitas - totalDespesas;

  const totalPlanned = budgets.reduce((sum, b) => sum + b.plannedAmount, 0);
  const totalActual = budgets.reduce((sum, b) => sum + b.actualAmount, 0);
  const budgetUsage = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Financeiro e Orçamentário"
        description="Controle de receitas, despesas e orçamento"
        icon={DollarSign}
        iconColor="blue"
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receitas</p>
                <p className="text-2xl font-bold text-emerald-600">
                  R$ {totalReceitas.toLocaleString()}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <ArrowUpRight className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Despesas</p>
                <p className="text-2xl font-bold text-red-600">
                  R$ {totalDespesas.toLocaleString()}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <ArrowDownRight className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className={`text-2xl font-bold ${saldo >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  R$ {saldo.toLocaleString()}
                </p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${saldo >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                {saldo >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-500" /> : <TrendingDown className="h-5 w-5 text-red-500" />}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Orçamento Utilizado</p>
                <p className="text-2xl font-bold">{budgetUsage.toFixed(1)}%</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <PieChart className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <Progress value={budgetUsage} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <TabsList>
            <TabsTrigger value="transactions" data-testid="tab-transactions">
              <DollarSign className="h-4 w-4 mr-2" />
              Transações
            </TabsTrigger>
            <TabsTrigger value="budget" data-testid="tab-budget">
              <BarChart3 className="h-4 w-4 mr-2" />
              Orçamento
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32" data-testid="select-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="receita">Receitas</SelectItem>
                <SelectItem value="despesa">Despesas</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-transaction">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Transação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Registrar Transação</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="type"
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
                                <SelectItem value="receita">Receita</SelectItem>
                                <SelectItem value="despesa">Despesa</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoria</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-category">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(categoryLabels).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: Conta de energia janeiro" data-testid="input-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor (R$)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} data-testid="input-amount" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="transactionDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-date" />
                            </FormControl>
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
                              <SelectItem value="pago">Pago</SelectItem>
                              <SelectItem value="cancelado">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createTransaction.isPending} data-testid="button-submit">
                        {createTransaction.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Registrar
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="transactions" className="space-y-4">
          <ScrollArea className="h-[calc(100vh-450px)]">
            <div className="space-y-2 pr-4">
              {filteredTransactions.map((transaction) => (
                <Card key={transaction.id} className="hover-elevate" data-testid={`transaction-${transaction.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${transaction.type === "receita" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                          {transaction.type === "receita" ? (
                            <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <ArrowDownRight className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{transaction.description}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-xs">
                              {categoryLabels[transaction.category] || transaction.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(transaction.transactionDate).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${transaction.type === "receita" ? "text-emerald-600" : "text-red-600"}`}>
                          {transaction.type === "receita" ? "+" : "-"} R$ {transaction.amount.toLocaleString()}
                        </p>
                        <Badge 
                          variant={transaction.status === "pago" ? "default" : transaction.status === "pendente" ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          {transaction.status === "pago" ? "Pago" : transaction.status === "pendente" ? "Pendente" : "Cancelado"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="budget" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Orçamento Anual 2024</CardTitle>
                <Badge variant="outline">
                  {budgetUsage.toFixed(1)}% utilizado
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {budgets.map((budget) => {
                  const usage = budget.plannedAmount > 0 ? (budget.actualAmount / budget.plannedAmount) * 100 : 0;
                  const color = categoryColors[budget.category] || "gray";
                  const isOverBudget = usage > 100;

                  return (
                    <div key={budget.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full bg-${color}-500`} />
                          <span className="font-medium">{categoryLabels[budget.category] || budget.category}</span>
                        </div>
                        <div className="text-right">
                          <span className={isOverBudget ? "text-red-600 font-medium" : "text-muted-foreground"}>
                            R$ {budget.actualAmount.toLocaleString()}
                          </span>
                          <span className="text-muted-foreground"> / R$ {budget.plannedAmount.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="relative">
                        <Progress 
                          value={Math.min(usage, 100)} 
                          className={`h-2 ${isOverBudget ? "[&>div]:bg-red-500" : ""}`}
                        />
                        {isOverBudget && (
                          <Badge variant="destructive" className="absolute -right-1 -top-1 text-[10px] px-1">
                            +{(usage - 100).toFixed(0)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button variant="outline" data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Exportar Relatório
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
