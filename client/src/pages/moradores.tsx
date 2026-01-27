import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCondominium } from "@/hooks/use-condominium";
import {
  type Morador,
  tipoMoradorOptions,
  statusMoradorOptions,
  perfilAcessoOptions,
  canalPreferidoOptions,
} from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  MoreHorizontal,
  Phone,
  Mail,
  Building,
  UserCheck,
  UserX,
  Eye,
  MessageCircle,
} from "lucide-react";

const moradorFormSchema = z.object({
  nomeCompleto: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  cpf: z.string().min(11, "CPF deve ter 11 digitos").max(14),
  dataNascimento: z.string().optional(),
  email: z.string().email("Email invalido").optional().or(z.literal("")),
  telefone: z.string().optional(),
  tipoMorador: z.enum(["proprietario", "inquilino", "dependente"]),
  status: z.enum(["ativo", "inativo"]).optional(),
  bloco: z.string().optional(),
  torre: z.string().optional(),
  unidade: z.string().optional(),
  inicioOcupacao: z.string().optional(),
  fimOcupacao: z.string().optional(),
  responsavelFinanceiro: z.boolean().optional(),
  perfilAcesso: z.enum(["morador", "sindico", "conselheiro", "administrador"]).optional(),
  canalPreferido: z.enum(["whatsapp", "email", "app"]).optional(),
  contatoEmergenciaNome: z.string().optional(),
  contatoEmergenciaTelefone: z.string().optional(),
  observacoes: z.string().optional(),
});

type MoradorFormValues = z.infer<typeof moradorFormSchema>;

const tipoLabels: Record<string, string> = {
  proprietario: "Proprietario",
  inquilino: "Inquilino",
  dependente: "Dependente",
};

const statusLabels: Record<string, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
};

const perfilLabels: Record<string, string> = {
  morador: "Morador",
  sindico: "Sindico",
  conselheiro: "Conselheiro",
  administrador: "Administrador",
};

const canalLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  app: "Aplicativo",
};

export default function MoradoresPage() {
  const { toast } = useToast();
  const { selectedCondominium } = useCondominium();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedMorador, setSelectedMorador] = useState<Morador | null>(null);
  const [editingMorador, setEditingMorador] = useState<Morador | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [moradorToDelete, setMoradorToDelete] = useState<Morador | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tipoFilter, setTipoFilter] = useState<string>("all");

  const form = useForm<MoradorFormValues>({
    resolver: zodResolver(moradorFormSchema),
    defaultValues: {
      nomeCompleto: "",
      cpf: "",
      dataNascimento: "",
      email: "",
      telefone: "",
      tipoMorador: "proprietario",
      status: "ativo",
      bloco: "",
      torre: "",
      unidade: "",
      inicioOcupacao: "",
      fimOcupacao: "",
      responsavelFinanceiro: false,
      perfilAcesso: "morador",
      canalPreferido: "whatsapp",
      contatoEmergenciaNome: "",
      contatoEmergenciaTelefone: "",
      observacoes: "",
    },
  });

  const { data: moradores = [], isLoading } = useQuery<Morador[]>({
    queryKey: ["/api/moradores"],
    enabled: !!selectedCondominium,
  });

  const createMutation = useMutation({
    mutationFn: async (data: MoradorFormValues) => {
      return apiRequest("POST", "/api/moradores", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/moradores"] });
      toast({ title: "Morador cadastrado com sucesso!" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      const message = error?.message || "Erro ao cadastrar morador";
      toast({ title: message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MoradorFormValues> }) => {
      return apiRequest("PATCH", `/api/moradores/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/moradores"] });
      toast({ title: "Morador atualizado com sucesso!" });
      setIsDialogOpen(false);
      setEditingMorador(null);
      form.reset();
    },
    onError: (error: any) => {
      const message = error?.message || "Erro ao atualizar morador";
      toast({ title: message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/moradores/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/moradores"] });
      toast({ title: "Morador inativado com sucesso!" });
      setDeleteDialogOpen(false);
      setMoradorToDelete(null);
    },
    onError: () => {
      toast({ title: "Erro ao inativar morador", variant: "destructive" });
    },
  });

  const onSubmit = (data: MoradorFormValues) => {
    if (editingMorador) {
      updateMutation.mutate({ id: editingMorador.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (morador: Morador) => {
    setEditingMorador(morador);
    form.reset({
      nomeCompleto: morador.nomeCompleto,
      cpf: morador.cpf,
      dataNascimento: morador.dataNascimento || "",
      email: morador.email || "",
      telefone: morador.telefone || "",
      tipoMorador: morador.tipoMorador as any,
      status: morador.status as any,
      bloco: morador.bloco || "",
      torre: morador.torre || "",
      unidade: morador.unidade || "",
      inicioOcupacao: morador.inicioOcupacao || "",
      fimOcupacao: morador.fimOcupacao || "",
      responsavelFinanceiro: morador.responsavelFinanceiro || false,
      perfilAcesso: (morador.perfilAcesso as any) || "morador",
      canalPreferido: (morador.canalPreferido as any) || "whatsapp",
      contatoEmergenciaNome: morador.contatoEmergenciaNome || "",
      contatoEmergenciaTelefone: morador.contatoEmergenciaTelefone || "",
      observacoes: morador.observacoes || "",
    });
    setIsDialogOpen(true);
  };

  const handleView = (morador: Morador) => {
    setSelectedMorador(morador);
    setIsViewDialogOpen(true);
  };

  const handleDelete = (morador: Morador) => {
    setMoradorToDelete(morador);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (moradorToDelete) {
      deleteMutation.mutate(moradorToDelete.id);
    }
  };

  const openNewDialog = () => {
    setEditingMorador(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const sendWhatsApp = (morador: Morador) => {
    if (morador.telefone) {
      const phone = morador.telefone.replace(/\D/g, "");
      window.open(`https://wa.me/55${phone}`, "_blank");
    }
  };

  const filteredMoradores = moradores?.filter((morador) => {
    const matchesSearch =
      morador.nomeCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      morador.cpf.includes(searchTerm) ||
      (morador.unidade?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (morador.bloco?.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "all" || morador.status === statusFilter;
    const matchesTipo = tipoFilter === "all" || morador.tipoMorador === tipoFilter;

    return matchesSearch && matchesStatus && matchesTipo;
  });

  const activeCount = moradores?.filter((m) => m.status === "ativo").length || 0;
  const inactiveCount = moradores?.filter((m) => m.status === "inativo").length || 0;

  if (!selectedCondominium) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="p-6">
          <p className="text-muted-foreground">Selecione um condominio para visualizar os moradores.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Cadastro de Moradores</h1>
            <p className="text-muted-foreground">Gerenciamento de proprietarios e moradores</p>
          </div>
        </div>
        <Button onClick={openNewDialog} data-testid="button-new-morador">
          <Plus className="h-4 w-4 mr-2" />
          Novo Morador
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total de Moradores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-count">{moradores.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-active-count">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Inativos</CardTitle>
            <UserX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-inactive-count">{inactiveCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <CardTitle>Lista de Moradores</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF, unidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                  data-testid="input-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="w-full sm:w-40" data-testid="select-tipo-filter">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="proprietario">Proprietario</SelectItem>
                  <SelectItem value="inquilino">Inquilino</SelectItem>
                  <SelectItem value="dependente">Dependente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredMoradores?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum morador encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMoradores?.map((morador) => (
                    <TableRow key={morador.id} data-testid={`row-morador-${morador.id}`}>
                      <TableCell className="font-medium">{morador.nomeCompleto}</TableCell>
                      <TableCell>{morador.cpf}</TableCell>
                      <TableCell>
                        {morador.bloco && morador.unidade
                          ? `${morador.bloco} - ${morador.unidade}`
                          : morador.unidade || morador.bloco || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{tipoLabels[morador.tipoMorador]}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {morador.telefone && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => sendWhatsApp(morador)}
                              title="WhatsApp"
                              data-testid={`button-whatsapp-${morador.id}`}
                            >
                              <MessageCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {morador.email && (
                            <a href={`mailto:${morador.email}`} title="E-mail">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={morador.status === "ativo" ? "default" : "secondary"}>
                          {statusLabels[morador.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-actions-${morador.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(morador)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(morador)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            {morador.status === "ativo" && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(morador)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Inativar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMorador ? "Editar Morador" : "Novo Morador"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Dados Pessoais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nomeCompleto"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Nome Completo *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-nome" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="000.000.000-00" data-testid="input-cpf" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dataNascimento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Nascimento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-nascimento" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="telefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(00) 00000-0000" data-testid="input-telefone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Dados de Moradia</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="tipoMorador"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-tipo">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tipoMoradorOptions.map((tipo) => (
                              <SelectItem key={tipo} value={tipo}>
                                {tipoLabels[tipo]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bloco"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bloco/Torre</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-bloco" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidade</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Apto, Casa..." data-testid="input-unidade" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="inicioOcupacao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inicio da Ocupacao</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-inicio" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fimOcupacao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fim da Ocupacao</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-fim" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="responsavelFinanceiro"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Resp. Financeiro</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-responsavel"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Perfil e Preferencias</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="perfilAcesso"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Perfil de Acesso</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-perfil">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {perfilAcessoOptions.map((perfil) => (
                              <SelectItem key={perfil} value={perfil}>
                                {perfilLabels[perfil]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="canalPreferido"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Canal Preferido</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-canal">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {canalPreferidoOptions.map((canal) => (
                              <SelectItem key={canal} value={canal}>
                                {canalLabels[canal]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {editingMorador && (
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
                              {statusMoradorOptions.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {statusLabels[status]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Contato de Emergencia</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contatoEmergenciaNome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-emergencia-nome" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contatoEmergenciaTelefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(00) 00000-0000" data-testid="input-emergencia-tel" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observacoes</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} data-testid="input-observacoes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Salvando..."
                    : editingMorador
                    ? "Atualizar"
                    : "Cadastrar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Morador</DialogTitle>
          </DialogHeader>
          {selectedMorador && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nome Completo</p>
                  <p className="font-medium">{selectedMorador.nomeCompleto}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CPF</p>
                  <p className="font-medium">{selectedMorador.cpf}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <Badge variant="outline">{tipoLabels[selectedMorador.tipoMorador]}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={selectedMorador.status === "ativo" ? "default" : "secondary"}>
                    {statusLabels[selectedMorador.status]}
                  </Badge>
                </div>
                {selectedMorador.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">E-mail</p>
                    <p className="font-medium">{selectedMorador.email}</p>
                  </div>
                )}
                {selectedMorador.telefone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{selectedMorador.telefone}</p>
                  </div>
                )}
                {(selectedMorador.bloco || selectedMorador.unidade) && (
                  <div>
                    <p className="text-sm text-muted-foreground">Unidade</p>
                    <p className="font-medium">
                      {selectedMorador.bloco && selectedMorador.unidade
                        ? `${selectedMorador.bloco} - ${selectedMorador.unidade}`
                        : selectedMorador.unidade || selectedMorador.bloco}
                    </p>
                  </div>
                )}
                {selectedMorador.perfilAcesso && (
                  <div>
                    <p className="text-sm text-muted-foreground">Perfil de Acesso</p>
                    <p className="font-medium">{perfilLabels[selectedMorador.perfilAcesso]}</p>
                  </div>
                )}
                {selectedMorador.canalPreferido && (
                  <div>
                    <p className="text-sm text-muted-foreground">Canal Preferido</p>
                    <p className="font-medium">{canalLabels[selectedMorador.canalPreferido]}</p>
                  </div>
                )}
                {selectedMorador.responsavelFinanceiro && (
                  <div>
                    <p className="text-sm text-muted-foreground">Responsavel Financeiro</p>
                    <Badge>Sim</Badge>
                  </div>
                )}
              </div>
              {selectedMorador.contatoEmergenciaNome && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Contato de Emergencia</h4>
                  <p>{selectedMorador.contatoEmergenciaNome}</p>
                  {selectedMorador.contatoEmergenciaTelefone && (
                    <p className="text-muted-foreground">{selectedMorador.contatoEmergenciaTelefone}</p>
                  )}
                </div>
              )}
              {selectedMorador.observacoes && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Observacoes</h4>
                  <p className="text-muted-foreground">{selectedMorador.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Inativacao</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja inativar o morador "{moradorToDelete?.nomeCompleto}"?
              Esta acao pode ser revertida posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Inativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
