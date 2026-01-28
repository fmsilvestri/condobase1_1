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
  ExternalLink,
  Copy,
  Smartphone,
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
  sendMode: z.enum(["api", "whatsapp_link"]).default("whatsapp_link"),
});

type CampanhaFormValues = z.infer<typeof campanhaFormSchema>;

type SendMode = "api" | "whatsapp_link";

function formatPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits;
  if (digits.length === 11 || digits.length === 10) return `55${digits}`;
  return digits;
}

function generateWhatsAppLink(phone: string, message: string): string {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

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
  const [showWhatsAppLinksDialog, setShowWhatsAppLinksDialog] = useState(false);
  const [whatsAppLinksData, setWhatsAppLinksData] = useState<{
    titulo: string;
    mensagem: string;
    moradores: Morador[];
  } | null>(null);

  const form = useForm<CampanhaFormValues>({
    resolver: zodResolver(campanhaFormSchema),
    defaultValues: {
      titulo: "",
      mensagem: "",
      servicoId: "",
      categoriaId: "",
      mediaUrl: "",
      sendMode: "whatsapp_link",
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

    if (data.sendMode === "whatsapp_link") {
      const moradoresSelecionados = moradores?.filter(m => selectedMoradores.includes(m.id)) || [];
      setWhatsAppLinksData({
        titulo: data.titulo,
        mensagem: `*${data.titulo}*\n\n${data.mensagem}`,
        moradores: moradoresSelecionados,
      });
      setShowCampanhaDialog(false);
      setShowWhatsAppLinksDialog(true);
      return;
    }

    sendCampanhaMutation.mutate({
      moradorIds: selectedMoradores,
      titulo: data.titulo,
      mensagem: data.mensagem,
      mediaUrl: data.mediaUrl || undefined,
    });
  };

  const copyMessageToClipboard = () => {
    if (whatsAppLinksData) {
      navigator.clipboard.writeText(whatsAppLinksData.mensagem);
      toast({
        title: "Mensagem copiada",
        description: "A mensagem foi copiada para a area de transferencia",
      });
    }
  };

  const openWhatsAppLink = (phone: string) => {
    if (whatsAppLinksData) {
      const link = generateWhatsAppLink(phone, whatsAppLinksData.mensagem);
      window.open(link, "_blank");
    }
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

              {form.watch("sendMode") === "api" && (
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
              )}

              <FormField
                control={form.control}
                name="sendMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modo de Envio</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-send-mode">
                          <SelectValue placeholder="Selecione o modo de envio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="whatsapp_link">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4" />
                            <span>Pelo meu WhatsApp</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="api">
                          <div className="flex items-center gap-2">
                            <Send className="h-4 w-4" />
                            <span>Envio automatico (Twilio)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {field.value === "whatsapp_link" 
                        ? "Abre o WhatsApp Web/App para voce enviar manualmente cada mensagem" 
                        : "Envia automaticamente via API do Twilio (requer configuracao)"}
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
                <Button 
                  type="submit" 
                  disabled={form.watch("sendMode") === "api" && sendCampanhaMutation.isPending} 
                  data-testid="button-enviar-campanha"
                >
                  {form.watch("sendMode") === "api" && sendCampanhaMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : form.watch("sendMode") === "whatsapp_link" ? (
                    <>
                      <Smartphone className="mr-2 h-4 w-4" />
                      Gerar Links WhatsApp
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

      <Dialog open={showWhatsAppLinksDialog} onOpenChange={setShowWhatsAppLinksDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-green-600" />
              Enviar pelo seu WhatsApp
            </DialogTitle>
            <DialogDescription>
              Clique em cada morador para abrir o WhatsApp e enviar a mensagem
            </DialogDescription>
          </DialogHeader>
          
          {whatsAppLinksData && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">Mensagem da Campanha</h4>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={copyMessageToClipboard}
                    data-testid="button-copy-message"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {whatsAppLinksData.mensagem}
                </p>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                <h4 className="font-medium text-sm mb-2">
                  Destinatarios ({whatsAppLinksData.moradores.length})
                </h4>
                {whatsAppLinksData.moradores.map((morador) => (
                  <div
                    key={morador.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <Phone className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{morador.nomeCompleto}</p>
                        <p className="text-xs text-muted-foreground">
                          {morador.bloco && `Bloco ${morador.bloco}`}
                          {morador.bloco && morador.unidade && " - "}
                          {morador.unidade && `Unidade ${morador.unidade}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => morador.telefone && openWhatsAppLink(morador.telefone)}
                      disabled={!morador.telefone}
                      data-testid={`button-whatsapp-${morador.id}`}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir WhatsApp
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowWhatsAppLinksDialog(false);
                setWhatsAppLinksData(null);
                setSelectedMoradores([]);
                form.reset();
              }}
            >
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
