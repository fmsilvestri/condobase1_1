import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DollarSign,
  Plus,
  Receipt,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Edit,
  Trash2,
  FileText,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface TaxaCondominio {
  id: string;
  condominiumId: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  valorPadrao: number;
  diaVencimento: number;
  recorrente: boolean;
  ativo: boolean;
  stripePriceId: string | null;
  stripeProductId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Cobranca {
  id: string;
  condominiumId: string;
  taxaId: string | null;
  moradorId: string | null;
  unidade: string | null;
  bloco: string | null;
  descricao: string;
  valor: number;
  dataVencimento: string;
  competencia: string | null;
  status: string;
  valorPago: number;
  dataPagamento: string | null;
  stripePaymentIntentId: string | null;
  stripeCheckoutSessionId: string | null;
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Morador {
  id: string;
  nomeCompleto: string;
  unidadeId: string | null;
  bloco: string | null;
  status: string;
}

const taxaSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  descricao: z.string().optional(),
  tipo: z.string().default("ordinaria"),
  valorPadrao: z.coerce.number().positive("Valor deve ser positivo"),
  diaVencimento: z.coerce.number().min(1).max(28, "Dia deve estar entre 1 e 28"),
  recorrente: z.boolean().default(true),
  ativo: z.boolean().default(true),
});

const cobrancaSchema = z.object({
  taxaId: z.string().optional(),
  moradorId: z.string().min(1, "Selecione um morador"),
  descricao: z.string().min(3, "Descrição é obrigatória"),
  valor: z.coerce.number().positive("Valor deve ser positivo"),
  dataVencimento: z.string().min(1, "Data de vencimento é obrigatória"),
  competencia: z.string().optional(),
  observacoes: z.string().optional(),
});

const gerarLoteSchema = z.object({
  taxaId: z.string().min(1, "Selecione uma taxa"),
  competencia: z.string().min(1, "Competência é obrigatória"),
  dataVencimento: z.string().min(1, "Data de vencimento é obrigatória"),
  moradorIds: z.array(z.string()).optional(),
});

type TaxaFormData = z.infer<typeof taxaSchema>;
type CobrancaFormData = z.infer<typeof cobrancaSchema>;
type GerarLoteFormData = z.infer<typeof gerarLoteSchema>;

export default function TaxasCobrancasPage() {
  const { toast } = useToast();
  const [taxaDialogOpen, setTaxaDialogOpen] = useState(false);
  const [cobrancaDialogOpen, setCobrancaDialogOpen] = useState(false);
  const [gerarLoteDialogOpen, setGerarLoteDialogOpen] = useState(false);
  const [editingTaxa, setEditingTaxa] = useState<TaxaCondominio | null>(null);
  const [selectedMoradores, setSelectedMoradores] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  const { data: taxas = [], isLoading: loadingTaxas } = useQuery<TaxaCondominio[]>({
    queryKey: ["/api/taxas-condominio"],
  });

  const { data: cobrancas = [], isLoading: loadingCobrancas } = useQuery<Cobranca[]>({
    queryKey: ["/api/cobrancas"],
  });

  const { data: moradores = [] } = useQuery<Morador[]>({
    queryKey: ["/api/moradores"],
  });

  const taxaForm = useForm<TaxaFormData>({
    resolver: zodResolver(taxaSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      tipo: "ordinaria",
      valorPadrao: 0,
      diaVencimento: 10,
      recorrente: true,
      ativo: true,
    },
  });

  const cobrancaForm = useForm<CobrancaFormData>({
    resolver: zodResolver(cobrancaSchema),
    defaultValues: {
      moradorId: "",
      descricao: "",
      valor: 0,
      dataVencimento: "",
      competencia: "",
      observacoes: "",
    },
  });

  const gerarLoteForm = useForm<GerarLoteFormData>({
    resolver: zodResolver(gerarLoteSchema),
    defaultValues: {
      taxaId: "",
      competencia: "",
      dataVencimento: "",
      moradorIds: [],
    },
  });

  const createTaxaMutation = useMutation({
    mutationFn: async (data: TaxaFormData) => {
      return apiRequest("POST", "/api/taxas-condominio", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/taxas-condominio"] });
      toast({ title: "Taxa criada com sucesso" });
      setTaxaDialogOpen(false);
      taxaForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar taxa", description: error.message, variant: "destructive" });
    },
  });

  const updateTaxaMutation = useMutation({
    mutationFn: async (data: TaxaFormData & { id: string }) => {
      const { id, ...rest } = data;
      return apiRequest("PATCH", `/api/taxas-condominio/${id}`, rest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/taxas-condominio"] });
      toast({ title: "Taxa atualizada com sucesso" });
      setTaxaDialogOpen(false);
      setEditingTaxa(null);
      taxaForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar taxa", description: error.message, variant: "destructive" });
    },
  });

  const deleteTaxaMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/taxas-condominio/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/taxas-condominio"] });
      toast({ title: "Taxa excluída com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao excluir taxa", description: error.message, variant: "destructive" });
    },
  });

  const createCobrancaMutation = useMutation({
    mutationFn: async (data: CobrancaFormData) => {
      return apiRequest("POST", "/api/cobrancas", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cobrancas"] });
      toast({ title: "Cobrança criada com sucesso" });
      setCobrancaDialogOpen(false);
      cobrancaForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar cobrança", description: error.message, variant: "destructive" });
    },
  });

  const gerarLoteMutation = useMutation({
    mutationFn: async (data: GerarLoteFormData) => {
      const payload = {
        ...data,
        moradorIds: selectedMoradores.length > 0 ? selectedMoradores : undefined,
      };
      return apiRequest("POST", "/api/cobrancas/gerar-lote", payload);
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cobrancas"] });
      toast({ title: "Cobranças geradas", description: result.message });
      setGerarLoteDialogOpen(false);
      gerarLoteForm.reset();
      setSelectedMoradores([]);
    },
    onError: (error: any) => {
      toast({ title: "Erro ao gerar cobranças", description: error.message, variant: "destructive" });
    },
  });

  const handleEditTaxa = (taxa: TaxaCondominio) => {
    setEditingTaxa(taxa);
    taxaForm.reset({
      nome: taxa.nome,
      descricao: taxa.descricao || "",
      tipo: taxa.tipo,
      valorPadrao: taxa.valorPadrao,
      diaVencimento: taxa.diaVencimento,
      recorrente: taxa.recorrente,
      ativo: taxa.ativo,
    });
    setTaxaDialogOpen(true);
  };

  const handleSubmitTaxa = (data: TaxaFormData) => {
    if (editingTaxa) {
      updateTaxaMutation.mutate({ ...data, id: editingTaxa.id });
    } else {
      createTaxaMutation.mutate(data);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pago":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Pago</Badge>;
      case "pendente":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case "vencido":
        return <Badge className="bg-red-500/10 text-red-600 border-red-200"><AlertCircle className="w-3 h-3 mr-1" />Vencido</Badge>;
      case "cancelado":
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-200"><XCircle className="w-3 h-3 mr-1" />Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredCobrancas = statusFilter === "todos" 
    ? cobrancas 
    : cobrancas.filter(c => c.status === statusFilter);

  const stats = {
    totalTaxas: taxas.length,
    taxasAtivas: taxas.filter(t => t.ativo).length,
    cobrancasPendentes: cobrancas.filter(c => c.status === "pendente").length,
    valorPendente: cobrancas.filter(c => c.status === "pendente").reduce((sum, c) => sum + c.valor, 0),
    cobrancasPagas: cobrancas.filter(c => c.status === "pago").length,
    valorRecebido: cobrancas.filter(c => c.status === "pago").reduce((sum, c) => sum + c.valorPago, 0),
  };

  if (loadingTaxas || loadingCobrancas) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Taxas e Cobranças"
        description="Gerencie as taxas condominiais e cobranças dos moradores"
        icon={Receipt}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxas Cadastradas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTaxas}</div>
            <p className="text-xs text-muted-foreground">{stats.taxasAtivas} ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cobranças Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cobrancasPendentes}</div>
            <p className="text-xs text-muted-foreground">
              R$ {stats.valorPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cobranças Pagas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cobrancasPagas}</div>
            <p className="text-xs text-muted-foreground">
              R$ {stats.valorRecebido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Moradores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{moradores.filter(m => m.status === 'ativo').length}</div>
            <p className="text-xs text-muted-foreground">ativos para cobrança</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="taxas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="taxas" data-testid="tab-taxas">Taxas</TabsTrigger>
          <TabsTrigger value="cobrancas" data-testid="tab-cobrancas">Cobranças</TabsTrigger>
        </TabsList>

        <TabsContent value="taxas" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Taxas Condominiais</h3>
            <Dialog open={taxaDialogOpen} onOpenChange={(open) => {
              setTaxaDialogOpen(open);
              if (!open) {
                setEditingTaxa(null);
                taxaForm.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-nova-taxa">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Taxa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTaxa ? "Editar Taxa" : "Nova Taxa"}</DialogTitle>
                </DialogHeader>
                <Form {...taxaForm}>
                  <form onSubmit={taxaForm.handleSubmit(handleSubmitTaxa)} className="space-y-4">
                    <FormField
                      control={taxaForm.control}
                      name="nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Taxa</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Taxa de Condomínio" {...field} data-testid="input-taxa-nome" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={taxaForm.control}
                      name="descricao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Descrição opcional" {...field} data-testid="input-taxa-descricao" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={taxaForm.control}
                        name="tipo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-taxa-tipo">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="ordinaria">Ordinária</SelectItem>
                                <SelectItem value="extraordinaria">Extraordinária</SelectItem>
                                <SelectItem value="fundo_reserva">Fundo de Reserva</SelectItem>
                                <SelectItem value="agua">Água</SelectItem>
                                <SelectItem value="gas">Gás</SelectItem>
                                <SelectItem value="multa">Multa</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={taxaForm.control}
                        name="valorPadrao"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor Padrão (R$)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="0,00" {...field} data-testid="input-taxa-valor" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={taxaForm.control}
                      name="diaVencimento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dia de Vencimento</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" max="28" {...field} data-testid="input-taxa-dia" />
                          </FormControl>
                          <FormDescription>Dia do mês para vencimento (1-28)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center gap-4">
                      <FormField
                        control={taxaForm.control}
                        name="recorrente"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-taxa-recorrente" />
                            </FormControl>
                            <FormLabel className="!mt-0">Recorrente</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={taxaForm.control}
                        name="ativo"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-taxa-ativo" />
                            </FormControl>
                            <FormLabel className="!mt-0">Ativo</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>

                    <DialogFooter>
                      <Button type="submit" disabled={createTaxaMutation.isPending || updateTaxaMutation.isPending} data-testid="button-salvar-taxa">
                        {(createTaxaMutation.isPending || updateTaxaMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {editingTaxa ? "Atualizar" : "Criar"} Taxa
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxas.map((taxa) => (
                    <TableRow key={taxa.id} data-testid={`row-taxa-${taxa.id}`}>
                      <TableCell className="font-medium">{taxa.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{taxa.tipo.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell>R$ {taxa.valorPadrao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>Dia {taxa.diaVencimento}</TableCell>
                      <TableCell>
                        {taxa.ativo ? (
                          <Badge className="bg-green-500/10 text-green-600">Ativa</Badge>
                        ) : (
                          <Badge variant="secondary">Inativa</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="icon" variant="ghost" onClick={() => handleEditTaxa(taxa)} data-testid={`button-edit-taxa-${taxa.id}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteTaxaMutation.mutate(taxa.id)} data-testid={`button-delete-taxa-${taxa.id}`}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {taxas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhuma taxa cadastrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cobrancas" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Cobranças</h3>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-filter-status">
                  <SelectValue placeholder="Filtrar status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="pago">Pagos</SelectItem>
                  <SelectItem value="vencido">Vencidos</SelectItem>
                  <SelectItem value="cancelado">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Dialog open={gerarLoteDialogOpen} onOpenChange={setGerarLoteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-gerar-lote">
                    <Send className="w-4 h-4 mr-2" />
                    Gerar em Lote
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Gerar Cobranças em Lote</DialogTitle>
                  </DialogHeader>
                  <Form {...gerarLoteForm}>
                    <form onSubmit={gerarLoteForm.handleSubmit((data) => gerarLoteMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={gerarLoteForm.control}
                        name="taxaId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Taxa</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-lote-taxa">
                                  <SelectValue placeholder="Selecione a taxa" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {taxas.filter(t => t.ativo).map((taxa) => (
                                  <SelectItem key={taxa.id} value={taxa.id}>
                                    {taxa.nome} - R$ {taxa.valorPadrao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={gerarLoteForm.control}
                          name="competencia"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Competência</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: 01/2026" {...field} data-testid="input-lote-competencia" />
                              </FormControl>
                              <FormDescription>Mês/Ano de referência</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={gerarLoteForm.control}
                          name="dataVencimento"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data de Vencimento</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} data-testid="input-lote-vencimento" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div>
                        <FormLabel>Moradores (deixe vazio para todos ativos)</FormLabel>
                        <ScrollArea className="h-48 border rounded-md p-2 mt-2">
                          {moradores.filter(m => m.status === 'ativo').map((morador) => (
                            <div key={morador.id} className="flex items-center gap-2 py-1">
                              <Checkbox
                                checked={selectedMoradores.includes(morador.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedMoradores([...selectedMoradores, morador.id]);
                                  } else {
                                    setSelectedMoradores(selectedMoradores.filter(id => id !== morador.id));
                                  }
                                }}
                                data-testid={`checkbox-morador-${morador.id}`}
                              />
                              <span>{morador.nomeCompleto}</span>
                              {morador.unidadeId && (
                                <span className="text-muted-foreground text-sm">
                                  - Unidade {morador.unidadeId}
                                </span>
                              )}
                            </div>
                          ))}
                        </ScrollArea>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedMoradores.length > 0 
                            ? `${selectedMoradores.length} morador(es) selecionado(s)` 
                            : "Nenhum selecionado = todos os ativos"}
                        </p>
                      </div>

                      <DialogFooter>
                        <Button type="submit" disabled={gerarLoteMutation.isPending} data-testid="button-confirmar-lote">
                          {gerarLoteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Gerar Cobranças
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              <Dialog open={cobrancaDialogOpen} onOpenChange={setCobrancaDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-nova-cobranca">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Cobrança
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Cobrança Individual</DialogTitle>
                  </DialogHeader>
                  <Form {...cobrancaForm}>
                    <form onSubmit={cobrancaForm.handleSubmit((data) => createCobrancaMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={cobrancaForm.control}
                        name="moradorId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Morador</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-cobranca-morador">
                                  <SelectValue placeholder="Selecione o morador" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {moradores.filter(m => m.status === 'ativo').map((morador) => (
                                  <SelectItem key={morador.id} value={morador.id}>
                                    {morador.nomeCompleto} {morador.unidadeId ? `- ${morador.unidadeId}` : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={cobrancaForm.control}
                        name="descricao"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrição</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Taxa de Condomínio - Janeiro/2026" {...field} data-testid="input-cobranca-descricao" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={cobrancaForm.control}
                          name="valor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor (R$)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" {...field} data-testid="input-cobranca-valor" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={cobrancaForm.control}
                          name="dataVencimento"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vencimento</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} data-testid="input-cobranca-vencimento" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={cobrancaForm.control}
                        name="competencia"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Competência</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: 01/2026" {...field} data-testid="input-cobranca-competencia" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={cobrancaForm.control}
                        name="observacoes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Observações</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Observações adicionais" {...field} data-testid="input-cobranca-observacoes" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <DialogFooter>
                        <Button type="submit" disabled={createCobrancaMutation.isPending} data-testid="button-salvar-cobranca">
                          {createCobrancaMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Criar Cobrança
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Morador/Unidade</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Competência</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCobrancas.map((cobranca) => {
                    const morador = moradores.find(m => m.id === cobranca.moradorId);
                    return (
                      <TableRow key={cobranca.id} data-testid={`row-cobranca-${cobranca.id}`}>
                        <TableCell className="font-medium">{cobranca.descricao}</TableCell>
                        <TableCell>
                          {morador?.nomeCompleto || "—"}
                          {cobranca.unidade && <span className="text-muted-foreground text-sm"> ({cobranca.unidade})</span>}
                        </TableCell>
                        <TableCell>R$ {cobranca.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>
                          {cobranca.dataVencimento ? format(new Date(cobranca.dataVencimento), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                        </TableCell>
                        <TableCell>{cobranca.competencia || "—"}</TableCell>
                        <TableCell>{getStatusBadge(cobranca.status)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredCobrancas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhuma cobrança encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
