import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Send,
  Users,
  Filter,
  Search,
  Loader2,
  MessageSquare,
  CheckCircle,
  XCircle,
  FileText,
  Image,
  Upload,
  Building2,
  Home,
  UserCheck,
  Phone,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useCondominium } from "@/hooks/use-condominium";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Morador, Servico, CategoriaServico } from "@shared/schema";

const campanhaFormSchema = z.object({
  titulo: z.string().min(3, "Titulo deve ter pelo menos 3 caracteres"),
  mensagem: z.string().min(10, "Mensagem deve ter pelo menos 10 caracteres"),
  servicoId: z.string().optional(),
  categoriaId: z.string().optional(),
  mediaUrl: z.string().url("URL invalida").optional().or(z.literal("")),
});

type CampanhaFormValues = z.infer<typeof campanhaFormSchema>;

const tipoLabels: Record<string, string> = {
  proprietario: "Proprietario",
  inquilino: "Inquilino",
  dependente: "Dependente",
};

const statusLabels: Record<string, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
};

export default function MarketplaceCampanhas() {
  const { toast } = useToast();
  const { selectedCondominium } = useCondominium();
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [blocoFilter, setBlocoFilter] = useState<string>("all");
  const [selectedMoradores, setSelectedMoradores] = useState<string[]>([]);
  const [showCampanhaDialog, setShowCampanhaDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [sendResults, setSendResults] = useState<any[]>([]);

  const form = useForm<CampanhaFormValues>({
    resolver: zodResolver(campanhaFormSchema),
    defaultValues: {
      titulo: "",
      mensagem: "",
      servicoId: "",
      categoriaId: "",
      mediaUrl: "",
    },
  });

  const { data: moradores, isLoading: moradoresLoading } = useQuery<Morador[]>({
    queryKey: ["/api/moradores"],
    enabled: !!selectedCondominium,
  });

  const { data: categorias } = useQuery<CategoriaServico[]>({
    queryKey: ["/api/categorias-servicos"],
    enabled: !!selectedCondominium,
  });

  const { data: servicos } = useQuery<Servico[]>({
    queryKey: ["/api/servicos-marketplace"],
    enabled: !!selectedCondominium,
  });

  const sendCampanhaMutation = useMutation({
    mutationFn: async (data: { moradorIds: string[]; mensagem: string; titulo: string; mediaUrl?: string }) => {
      const response = await apiRequest("POST", "/api/marketplace/campanhas/enviar", data);
      return response.json();
    },
    onSuccess: (data) => {
      setSendResults(data.results || []);
      setShowResultsDialog(true);
      setShowCampanhaDialog(false);
      setSelectedMoradores([]);
      form.reset();
      toast({
        title: "Campanha enviada",
        description: `Mensagens enviadas para ${data.results?.length || 0} moradores`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar campanha",
        description: error.message || "Ocorreu um erro ao enviar as mensagens",
        variant: "destructive",
      });
    },
  });

  const blocos = useMemo(() => {
    if (!moradores) return [];
    const blocoSet = new Set<string>();
    moradores.forEach(m => {
      if (m.bloco) blocoSet.add(m.bloco);
    });
    return Array.from(blocoSet).sort();
  }, [moradores]);

  const filteredMoradores = useMemo(() => {
    if (!moradores) return [];
    return moradores.filter((morador) => {
      if (morador.status !== "ativo") return false;
      if (!morador.telefone) return false;
      
      const matchesSearch =
        morador.nomeCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        morador.unidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        morador.bloco?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTipo = tipoFilter === "all" || morador.tipoMorador === tipoFilter;
      const matchesBloco = blocoFilter === "all" || morador.bloco === blocoFilter;

      return matchesSearch && matchesTipo && matchesBloco;
    });
  }, [moradores, searchTerm, tipoFilter, blocoFilter]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMoradores(filteredMoradores.map((m) => m.id));
    } else {
      setSelectedMoradores([]);
    }
  };

  const handleSelectMorador = (moradorId: string, checked: boolean) => {
    if (checked) {
      setSelectedMoradores((prev) => [...prev, moradorId]);
    } else {
      setSelectedMoradores((prev) => prev.filter((id) => id !== moradorId));
    }
  };

  const onSubmit = (data: CampanhaFormValues) => {
    if (selectedMoradores.length === 0) {
      toast({
        title: "Nenhum morador selecionado",
        description: "Selecione pelo menos um morador para enviar a campanha",
        variant: "destructive",
      });
      return;
    }

    sendCampanhaMutation.mutate({
      moradorIds: selectedMoradores,
      titulo: data.titulo,
      mensagem: data.mensagem,
      mediaUrl: data.mediaUrl || undefined,
    });
  };

  const openCampanhaDialog = () => {
    if (selectedMoradores.length === 0) {
      toast({
        title: "Nenhum morador selecionado",
        description: "Selecione pelo menos um morador para criar uma campanha",
        variant: "destructive",
      });
      return;
    }
    setShowCampanhaDialog(true);
  };

  const selectedMoradoresData = useMemo(() => {
    if (!moradores) return [];
    return moradores.filter((m) => selectedMoradores.includes(m.id));
  }, [moradores, selectedMoradores]);

  if (moradoresLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Campanhas de Marketing"
          description="Envie ofertas e propagandas para moradores via WhatsApp"
        />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campanhas de Marketing"
        description="Envie ofertas e propagandas para moradores via WhatsApp"
        actions={
          <Button
            onClick={openCampanhaDialog}
            disabled={selectedMoradores.length === 0}
            data-testid="button-criar-campanha"
          >
            <Send className="mr-2 h-4 w-4" />
            Enviar Campanha ({selectedMoradores.length})
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{moradores?.filter((m) => m.status === "ativo").length || 0}</p>
                <p className="text-sm text-muted-foreground">Moradores Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Phone className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{moradores?.filter((m) => m.status === "ativo" && m.telefone).length || 0}</p>
                <p className="text-sm text-muted-foreground">Com WhatsApp</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <UserCheck className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{selectedMoradores.length}</p>
                <p className="text-sm text-muted-foreground">Selecionados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{filteredMoradores.length}</p>
                <p className="text-sm text-muted-foreground">Filtrados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtrar Moradores
          </CardTitle>
          <CardDescription>
            Selecione moradores por perfil, bloco ou busque por nome/unidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, unidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-buscar-morador"
                />
              </div>
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-tipo-morador">
                <SelectValue placeholder="Tipo de Morador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="proprietario">Proprietarios</SelectItem>
                <SelectItem value="inquilino">Inquilinos</SelectItem>
                <SelectItem value="dependente">Dependentes</SelectItem>
              </SelectContent>
            </Select>
            <Select value={blocoFilter} onValueChange={setBlocoFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-bloco">
                <SelectValue placeholder="Bloco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Blocos</SelectItem>
                {blocos.map((bloco) => (
                  <SelectItem key={bloco} value={bloco || ""}>
                    Bloco {bloco}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => handleSelectAll(selectedMoradores.length !== filteredMoradores.length)}
              data-testid="button-selecionar-todos"
            >
              {selectedMoradores.length === filteredMoradores.length && filteredMoradores.length > 0
                ? "Desmarcar Todos"
                : "Selecionar Todos"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Moradores Disponiveis</CardTitle>
          <CardDescription>
            Selecione os moradores que receberao a campanha (apenas moradores ativos com telefone cadastrado)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMoradores.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum morador encontrado"
              description="Nao ha moradores que correspondam aos filtros selecionados ou com telefone cadastrado"
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedMoradores.length === filteredMoradores.length && filteredMoradores.length > 0}
                        onCheckedChange={handleSelectAll}
                        data-testid="checkbox-selecionar-todos"
                      />
                    </TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Bloco/Unidade</TableHead>
                    <TableHead>Telefone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMoradores.map((morador) => (
                    <TableRow key={morador.id} data-testid={`row-morador-${morador.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedMoradores.includes(morador.id)}
                          onCheckedChange={(checked) => handleSelectMorador(morador.id, checked as boolean)}
                          data-testid={`checkbox-morador-${morador.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{morador.nomeCompleto}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{tipoLabels[morador.tipoMorador]}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {morador.bloco && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {morador.bloco}
                            </span>
                          )}
                          {morador.unidade && (
                            <span className="flex items-center gap-1 ml-2">
                              <Home className="h-3 w-3" />
                              {morador.unidade}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-green-600" />
                          {morador.telefone}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCampanhaDialog} onOpenChange={setShowCampanhaDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar Campanha de Marketing</DialogTitle>
            <DialogDescription>
              Envie uma mensagem promocional para {selectedMoradores.length} morador(es) selecionado(s)
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="titulo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titulo da Campanha</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Promocao de Fim de Ano" {...field} data-testid="input-titulo-campanha" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="categoriaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria (opcional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-categoria">
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categorias?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.nome}
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
                  name="servicoId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Servico (opcional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-servico">
                            <SelectValue placeholder="Selecione um servico" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {servicos?.map((srv) => (
                            <SelectItem key={srv.id} value={srv.id}>
                              {srv.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="mensagem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensagem</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Digite a mensagem promocional que sera enviada via WhatsApp..."
                        className="min-h-[150px]"
                        {...field}
                        data-testid="textarea-mensagem"
                      />
                    </FormControl>
                    <FormDescription>
                      A mensagem sera enviada para o WhatsApp de cada morador selecionado
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mediaUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da Imagem/Arquivo (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://exemplo.com/imagem.jpg"
                        {...field}
                        data-testid="input-media-url"
                      />
                    </FormControl>
                    <FormDescription>
                      Insira uma URL publica de imagem ou arquivo para enviar junto com a mensagem
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Destinatarios ({selectedMoradores.length})</h4>
                <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto">
                  {selectedMoradoresData.slice(0, 10).map((m) => (
                    <Badge key={m.id} variant="secondary">
                      {m.nomeCompleto}
                    </Badge>
                  ))}
                  {selectedMoradoresData.length > 10 && (
                    <Badge variant="outline">+{selectedMoradoresData.length - 10} mais</Badge>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCampanhaDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={sendCampanhaMutation.isPending} data-testid="button-enviar-campanha">
                  {sendCampanhaMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar Campanha
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Resultado do Envio</DialogTitle>
            <DialogDescription>
              Veja o status de cada mensagem enviada
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {sendResults.map((result, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  result.success ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"
                }`}
              >
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm">{result.nome || result.to}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {result.success ? "Enviado" : result.error || "Falha"}
                </span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowResultsDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
