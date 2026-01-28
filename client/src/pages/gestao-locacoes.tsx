import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Home,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Edit,
  Trash2,
  Send,
  User,
  Phone,
  Car,
  MessageCircle,
  Settings,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

interface Hospedagem {
  id: string;
  condominiumId: string;
  nomeHospede: string;
  telefoneHospede: string | null;
  emailHospede: string | null;
  documentoHospede: string | null;
  numeroAcompanhantes: number;
  unidade: string;
  bloco: string | null;
  plataforma: string;
  codigoReserva: string | null;
  dataCheckIn: string;
  horaCheckIn: string | null;
  dataCheckOut: string;
  horaCheckOut: string | null;
  placaVeiculo: string | null;
  modeloVeiculo: string | null;
  corVeiculo: string | null;
  vagaEstacionamento: string | null;
  status: string;
  observacoes: string | null;
  mensagemPersonalizada: string | null;
  boasVindasEnviadas: boolean;
  dataEnvioBoasVindas: string | null;
  urlVideoExplicativo: string | null;
  urlRegimentoInterno: string | null;
  criadoPor: string | null;
  createdAt: string;
  updatedAt: string;
}

const hospedagemSchema = z.object({
  nomeHospede: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  telefoneHospede: z.string().optional(),
  emailHospede: z.string().email("Email inválido").optional().or(z.literal("")),
  documentoHospede: z.string().optional(),
  numeroAcompanhantes: z.coerce.number().min(0).default(0),
  unidade: z.string().min(1, "Unidade é obrigatória"),
  bloco: z.string().optional(),
  plataforma: z.string().default("airbnb"),
  codigoReserva: z.string().optional(),
  dataCheckIn: z.string().min(1, "Data de check-in é obrigatória"),
  horaCheckIn: z.string().optional(),
  dataCheckOut: z.string().min(1, "Data de check-out é obrigatória"),
  horaCheckOut: z.string().optional(),
  placaVeiculo: z.string().optional(),
  modeloVeiculo: z.string().optional(),
  corVeiculo: z.string().optional(),
  vagaEstacionamento: z.string().optional(),
  observacoes: z.string().optional(),
  mensagemPersonalizada: z.string().optional(),
});

const boasVindasSchema = z.object({
  mensagem: z.string().min(10, "Mensagem deve ter pelo menos 10 caracteres"),
  urlVideo: z.string().url("URL inválida").optional().or(z.literal("")),
  urlRegimento: z.string().url("URL inválida").optional().or(z.literal("")),
});

type HospedagemFormData = z.infer<typeof hospedagemSchema>;
type BoasVindasFormData = z.infer<typeof boasVindasSchema>;

export default function GestaoLocacoesPage() {
  const { toast } = useToast();
  const [hospedagemDialogOpen, setHospedagemDialogOpen] = useState(false);
  const [boasVindasDialogOpen, setBoasVindasDialogOpen] = useState(false);
  const [detalhesDialogOpen, setDetalhesDialogOpen] = useState(false);
  const [editingHospedagem, setEditingHospedagem] = useState<Hospedagem | null>(null);
  const [selectedHospedagem, setSelectedHospedagem] = useState<Hospedagem | null>(null);

  const { data: hospedagens = [], isLoading: hospedagensLoading } = useQuery<Hospedagem[]>({
    queryKey: ["/api/hospedagens"],
  });

  const hospedagemForm = useForm<HospedagemFormData>({
    resolver: zodResolver(hospedagemSchema),
    defaultValues: {
      nomeHospede: "",
      telefoneHospede: "",
      emailHospede: "",
      documentoHospede: "",
      numeroAcompanhantes: 0,
      unidade: "",
      bloco: "",
      plataforma: "airbnb",
      codigoReserva: "",
      dataCheckIn: "",
      horaCheckIn: "15:00",
      dataCheckOut: "",
      horaCheckOut: "11:00",
      placaVeiculo: "",
      modeloVeiculo: "",
      corVeiculo: "",
      vagaEstacionamento: "",
      observacoes: "",
      mensagemPersonalizada: "",
    },
  });

  const boasVindasForm = useForm<BoasVindasFormData>({
    resolver: zodResolver(boasVindasSchema),
    defaultValues: {
      mensagem: "",
      urlVideo: "",
      urlRegimento: "",
    },
  });

  const createHospedagemMutation = useMutation({
    mutationFn: async (data: HospedagemFormData) => {
      return apiRequest("POST", "/api/hospedagens", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hospedagens"] });
      setHospedagemDialogOpen(false);
      hospedagemForm.reset();
      toast({ title: "Hospedagem cadastrada com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao cadastrar hospedagem",
        description: error?.message,
        variant: "destructive",
      });
    },
  });

  const updateHospedagemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<HospedagemFormData> }) => {
      return apiRequest("PATCH", `/api/hospedagens/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hospedagens"] });
      setHospedagemDialogOpen(false);
      setEditingHospedagem(null);
      hospedagemForm.reset();
      toast({ title: "Hospedagem atualizada com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar hospedagem",
        description: error?.message,
        variant: "destructive",
      });
    },
  });

  const deleteHospedagemMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/hospedagens/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hospedagens"] });
      toast({ title: "Hospedagem removida com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover hospedagem",
        description: error?.message,
        variant: "destructive",
      });
    },
  });

  const enviarBoasVindasMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: BoasVindasFormData }) => {
      return apiRequest("POST", `/api/hospedagens/${id}/enviar-boas-vindas`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hospedagens"] });
      setBoasVindasDialogOpen(false);
      setSelectedHospedagem(null);
      boasVindasForm.reset();
      toast({ 
        title: "Mensagem enviada!", 
        description: "A mensagem de boas-vindas foi enviada via WhatsApp." 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar mensagem",
        description: error?.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenHospedagemDialog = (hospedagem?: Hospedagem) => {
    if (hospedagem) {
      setEditingHospedagem(hospedagem);
      hospedagemForm.reset({
        nomeHospede: hospedagem.nomeHospede,
        telefoneHospede: hospedagem.telefoneHospede || "",
        emailHospede: hospedagem.emailHospede || "",
        documentoHospede: hospedagem.documentoHospede || "",
        numeroAcompanhantes: hospedagem.numeroAcompanhantes,
        unidade: hospedagem.unidade,
        bloco: hospedagem.bloco || "",
        plataforma: hospedagem.plataforma,
        codigoReserva: hospedagem.codigoReserva || "",
        dataCheckIn: hospedagem.dataCheckIn.split("T")[0],
        horaCheckIn: hospedagem.horaCheckIn || "15:00",
        dataCheckOut: hospedagem.dataCheckOut.split("T")[0],
        horaCheckOut: hospedagem.horaCheckOut || "11:00",
        placaVeiculo: hospedagem.placaVeiculo || "",
        modeloVeiculo: hospedagem.modeloVeiculo || "",
        corVeiculo: hospedagem.corVeiculo || "",
        vagaEstacionamento: hospedagem.vagaEstacionamento || "",
        observacoes: hospedagem.observacoes || "",
        mensagemPersonalizada: hospedagem.mensagemPersonalizada || "",
      });
    } else {
      setEditingHospedagem(null);
      hospedagemForm.reset();
    }
    setHospedagemDialogOpen(true);
  };

  const handleOpenBoasVindasDialog = (hospedagem: Hospedagem) => {
    setSelectedHospedagem(hospedagem);
    
    const defaultMessage = `Olá ${hospedagem.nomeHospede}! Sejam bem-vindos ao nosso condomínio.\n\nSua reserva:\n- Unidade: ${hospedagem.unidade}${hospedagem.bloco ? ` (Bloco ${hospedagem.bloco})` : ""}\n- Check-in: ${format(new Date(hospedagem.dataCheckIn), "dd/MM/yyyy", { locale: ptBR })}${hospedagem.horaCheckIn ? ` às ${hospedagem.horaCheckIn}` : ""}\n- Check-out: ${format(new Date(hospedagem.dataCheckOut), "dd/MM/yyyy", { locale: ptBR })}${hospedagem.horaCheckOut ? ` às ${hospedagem.horaCheckOut}` : ""}\n\nQualquer dúvida, estamos à disposição!`;

    boasVindasForm.reset({
      mensagem: hospedagem.mensagemPersonalizada || defaultMessage,
      urlVideo: hospedagem.urlVideoExplicativo || "",
      urlRegimento: hospedagem.urlRegimentoInterno || "",
    });
    setBoasVindasDialogOpen(true);
  };

  const handleSubmitHospedagem = (data: HospedagemFormData) => {
    if (editingHospedagem) {
      updateHospedagemMutation.mutate({ id: editingHospedagem.id, data });
    } else {
      createHospedagemMutation.mutate(data);
    }
  };

  const handleSubmitBoasVindas = (data: BoasVindasFormData) => {
    if (selectedHospedagem) {
      enviarBoasVindasMutation.mutate({ id: selectedHospedagem.id, data });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "reservado":
        return <Badge variant="outline" data-testid="badge-status-reservado"><Clock className="w-3 h-3 mr-1" />Reservado</Badge>;
      case "em_andamento":
        return <Badge data-testid="badge-status-em-andamento"><CheckCircle className="w-3 h-3 mr-1" />Em Andamento</Badge>;
      case "concluida":
        return <Badge variant="secondary" data-testid="badge-status-concluida"><CheckCircle className="w-3 h-3 mr-1" />Concluída</Badge>;
      case "cancelada":
        return <Badge variant="destructive" data-testid="badge-status-cancelada"><XCircle className="w-3 h-3 mr-1" />Cancelada</Badge>;
      default:
        return <Badge variant="outline" data-testid="badge-status-default">{status}</Badge>;
    }
  };

  const getPlataformaBadge = (plataforma: string) => {
    switch (plataforma) {
      case "airbnb":
        return <Badge variant="secondary" data-testid="badge-plataforma-airbnb">Airbnb</Badge>;
      case "booking":
        return <Badge variant="secondary" data-testid="badge-plataforma-booking">Booking</Badge>;
      case "direto":
        return <Badge variant="outline" data-testid="badge-plataforma-direto">Direto</Badge>;
      default:
        return <Badge variant="outline" data-testid="badge-plataforma-default">{plataforma}</Badge>;
    }
  };

  const hospedagensAtivas = hospedagens.filter(h => h.status === "reservado" || h.status === "em_andamento");
  const hospedagensConcluidas = hospedagens.filter(h => h.status === "concluida");
  const hospedagensCanceladas = hospedagens.filter(h => h.status === "cancelada");

  const totalHospedes = hospedagensAtivas.reduce((acc, h) => acc + 1 + h.numeroAcompanhantes, 0);

  if (hospedagensLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Gestão de Locações"
        description="Controle de hospedagens temporárias e mensagens de boas-vindas via WhatsApp"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-hospedagens-ativas">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Home className="w-4 h-4" />
              Hospedagens Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-count-ativas">{hospedagensAtivas.length}</div>
            <p className="text-xs text-muted-foreground">reservas em andamento</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-hospedes">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Total de Hóspedes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-count-hospedes">{totalHospedes}</div>
            <p className="text-xs text-muted-foreground">pessoas hospedadas</p>
          </CardContent>
        </Card>

        <Card data-testid="card-mensagens-enviadas">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Boas-vindas Enviadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-count-mensagens">
              {hospedagens.filter(h => h.boasVindasEnviadas).length}
            </div>
            <p className="text-xs text-muted-foreground">mensagens via WhatsApp</p>
          </CardContent>
        </Card>

        <Card data-testid="card-pendentes">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Pendentes de Envio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-count-pendentes">
              {hospedagensAtivas.filter(h => !h.boasVindasEnviadas && h.telefoneHospede).length}
            </div>
            <p className="text-xs text-muted-foreground">aguardando boas-vindas</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={() => handleOpenHospedagemDialog()} data-testid="button-nova-hospedagem">
          <Plus className="w-4 h-4 mr-2" />
          Nova Hospedagem
        </Button>
      </div>

      <Tabs defaultValue="ativas" className="w-full">
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="ativas" data-testid="tab-ativas">
            Ativas ({hospedagensAtivas.length})
          </TabsTrigger>
          <TabsTrigger value="concluidas" data-testid="tab-concluidas">
            Concluídas ({hospedagensConcluidas.length})
          </TabsTrigger>
          <TabsTrigger value="canceladas" data-testid="tab-canceladas">
            Canceladas ({hospedagensCanceladas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ativas">
          <Card>
            <CardContent className="pt-6">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hóspede</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Check-out</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Boas-vindas</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hospedagensAtivas.map((hospedagem) => (
                      <TableRow key={hospedagem.id} data-testid={`row-hospedagem-${hospedagem.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium" data-testid={`text-nome-${hospedagem.id}`}>{hospedagem.nomeHospede}</p>
                            <p className="text-xs text-muted-foreground">
                              {hospedagem.numeroAcompanhantes > 0 && `+${hospedagem.numeroAcompanhantes} acompanhante(s)`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-unidade-${hospedagem.id}`}>
                          {hospedagem.unidade}{hospedagem.bloco ? ` (${hospedagem.bloco})` : ""}
                        </TableCell>
                        <TableCell data-testid={`text-checkin-${hospedagem.id}`}>
                          {format(new Date(hospedagem.dataCheckIn), "dd/MM/yyyy", { locale: ptBR })}
                          {hospedagem.horaCheckIn && <span className="text-xs text-muted-foreground ml-1">{hospedagem.horaCheckIn}</span>}
                        </TableCell>
                        <TableCell data-testid={`text-checkout-${hospedagem.id}`}>
                          {format(new Date(hospedagem.dataCheckOut), "dd/MM/yyyy", { locale: ptBR })}
                          {hospedagem.horaCheckOut && <span className="text-xs text-muted-foreground ml-1">{hospedagem.horaCheckOut}</span>}
                        </TableCell>
                        <TableCell>{getPlataformaBadge(hospedagem.plataforma)}</TableCell>
                        <TableCell>{getStatusBadge(hospedagem.status)}</TableCell>
                        <TableCell>
                          {hospedagem.boasVindasEnviadas ? (
                            <Badge variant="secondary" data-testid={`badge-enviada-${hospedagem.id}`}>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Enviada
                            </Badge>
                          ) : hospedagem.telefoneHospede ? (
                            <Badge variant="outline" data-testid={`badge-pendente-${hospedagem.id}`}>
                              <Clock className="w-3 h-3 mr-1" />
                              Pendente
                            </Badge>
                          ) : (
                            <Badge variant="destructive" data-testid={`badge-sem-telefone-${hospedagem.id}`}>
                              <XCircle className="w-3 h-3 mr-1" />
                              Sem telefone
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedHospedagem(hospedagem);
                                setDetalhesDialogOpen(true);
                              }}
                              data-testid={`button-ver-${hospedagem.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {!hospedagem.boasVindasEnviadas && hospedagem.telefoneHospede && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenBoasVindasDialog(hospedagem)}
                                data-testid={`button-enviar-${hospedagem.id}`}
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenHospedagemDialog(hospedagem)}
                              data-testid={`button-editar-${hospedagem.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteHospedagemMutation.mutate(hospedagem.id)}
                              data-testid={`button-excluir-${hospedagem.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {hospedagensAtivas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Nenhuma hospedagem ativa no momento
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="concluidas">
          <Card>
            <CardContent className="pt-6">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hóspede</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Duração</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hospedagensConcluidas.map((hospedagem) => (
                      <TableRow key={hospedagem.id} data-testid={`row-concluida-${hospedagem.id}`}>
                        <TableCell className="font-medium">{hospedagem.nomeHospede}</TableCell>
                        <TableCell>{hospedagem.unidade}{hospedagem.bloco ? ` (${hospedagem.bloco})` : ""}</TableCell>
                        <TableCell>
                          {format(new Date(hospedagem.dataCheckIn), "dd/MM", { locale: ptBR })} - {format(new Date(hospedagem.dataCheckOut), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>{getPlataformaBadge(hospedagem.plataforma)}</TableCell>
                        <TableCell>
                          {differenceInDays(new Date(hospedagem.dataCheckOut), new Date(hospedagem.dataCheckIn))} dias
                        </TableCell>
                      </TableRow>
                    ))}
                    {hospedagensConcluidas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhuma hospedagem concluída
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="canceladas">
          <Card>
            <CardContent className="pt-6">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hóspede</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Período Previsto</TableHead>
                      <TableHead>Plataforma</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hospedagensCanceladas.map((hospedagem) => (
                      <TableRow key={hospedagem.id} data-testid={`row-cancelada-${hospedagem.id}`}>
                        <TableCell className="font-medium">{hospedagem.nomeHospede}</TableCell>
                        <TableCell>{hospedagem.unidade}{hospedagem.bloco ? ` (${hospedagem.bloco})` : ""}</TableCell>
                        <TableCell>
                          {format(new Date(hospedagem.dataCheckIn), "dd/MM", { locale: ptBR })} - {format(new Date(hospedagem.dataCheckOut), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>{getPlataformaBadge(hospedagem.plataforma)}</TableCell>
                      </TableRow>
                    ))}
                    {hospedagensCanceladas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Nenhuma hospedagem cancelada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={hospedagemDialogOpen} onOpenChange={setHospedagemDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-hospedagem">
              {editingHospedagem ? "Editar Hospedagem" : "Nova Hospedagem"}
            </DialogTitle>
          </DialogHeader>
          <Form {...hospedagemForm}>
            <form onSubmit={hospedagemForm.handleSubmit(handleSubmitHospedagem)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={hospedagemForm.control}
                  name="nomeHospede"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Nome do Hóspede</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-nome-hospede" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={hospedagemForm.control}
                  name="telefoneHospede"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone (WhatsApp)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+55 11 99999-9999" data-testid="input-telefone" />
                      </FormControl>
                      <FormDescription>Necessário para envio de boas-vindas</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={hospedagemForm.control}
                  name="emailHospede"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={hospedagemForm.control}
                  name="documentoHospede"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Documento (CPF/RG)</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-documento" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={hospedagemForm.control}
                  name="numeroAcompanhantes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Acompanhantes</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="0" data-testid="input-acompanhantes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={hospedagemForm.control}
                  name="unidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: 101" data-testid="input-unidade" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={hospedagemForm.control}
                  name="bloco"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bloco</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: A" data-testid="input-bloco" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={hospedagemForm.control}
                  name="plataforma"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plataforma</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-plataforma">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="airbnb">Airbnb</SelectItem>
                          <SelectItem value="booking">Booking</SelectItem>
                          <SelectItem value="direto">Reserva Direta</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={hospedagemForm.control}
                  name="codigoReserva"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código da Reserva</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-codigo-reserva" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={hospedagemForm.control}
                  name="dataCheckIn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Check-in</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-data-checkin" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={hospedagemForm.control}
                  name="horaCheckIn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora Check-in</FormLabel>
                      <FormControl>
                        <Input {...field} type="time" data-testid="input-hora-checkin" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={hospedagemForm.control}
                  name="dataCheckOut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Check-out</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-data-checkout" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={hospedagemForm.control}
                  name="horaCheckOut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora Check-out</FormLabel>
                      <FormControl>
                        <Input {...field} type="time" data-testid="input-hora-checkout" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Car className="w-4 h-4" /> Informações do Veículo (Opcional)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={hospedagemForm.control}
                    name="placaVeiculo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Placa</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ABC-1234" data-testid="input-placa" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={hospedagemForm.control}
                    name="modeloVeiculo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modelo</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Civic" data-testid="input-modelo" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={hospedagemForm.control}
                    name="corVeiculo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Prata" data-testid="input-cor" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={hospedagemForm.control}
                    name="vagaEstacionamento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vaga</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: V-12" data-testid="input-vaga" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={hospedagemForm.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} data-testid="input-observacoes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setHospedagemDialogOpen(false)} data-testid="button-cancelar-hospedagem">
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createHospedagemMutation.isPending || updateHospedagemMutation.isPending}
                  data-testid="button-salvar-hospedagem"
                >
                  {(createHospedagemMutation.isPending || updateHospedagemMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingHospedagem ? "Salvar" : "Cadastrar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={boasVindasDialogOpen} onOpenChange={setBoasVindasDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-boas-vindas">
              Enviar Mensagem de Boas-vindas
            </DialogTitle>
          </DialogHeader>
          {selectedHospedagem && (
            <div className="mb-4 p-3 bg-muted rounded-md">
              <p className="text-sm">
                <strong>Para:</strong> {selectedHospedagem.nomeHospede}
              </p>
              <p className="text-sm text-muted-foreground">
                <Phone className="w-3 h-3 inline mr-1" />
                {selectedHospedagem.telefoneHospede}
              </p>
            </div>
          )}
          <Form {...boasVindasForm}>
            <form onSubmit={boasVindasForm.handleSubmit(handleSubmitBoasVindas)} className="space-y-4">
              <FormField
                control={boasVindasForm.control}
                name="mensagem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensagem</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={8} data-testid="input-mensagem-boas-vindas" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={boasVindasForm.control}
                name="urlVideo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL do Vídeo Explicativo (Opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://..." data-testid="input-url-video" />
                    </FormControl>
                    <FormDescription>Link para vídeo com tour e regras do condomínio</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={boasVindasForm.control}
                name="urlRegimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL do Regimento Interno (Opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://..." data-testid="input-url-regimento" />
                    </FormControl>
                    <FormDescription>Link para PDF do regimento interno</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setBoasVindasDialogOpen(false)} data-testid="button-cancelar-boas-vindas">
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={enviarBoasVindasMutation.isPending}
                  data-testid="button-enviar-boas-vindas"
                >
                  {enviarBoasVindasMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  <Send className="w-4 h-4 mr-2" />
                  Enviar via WhatsApp
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={detalhesDialogOpen} onOpenChange={setDetalhesDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-detalhes">Detalhes da Hospedagem</DialogTitle>
          </DialogHeader>
          {selectedHospedagem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Hóspede</p>
                  <p className="font-medium">{selectedHospedagem.nomeHospede}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Acompanhantes</p>
                  <p className="font-medium">{selectedHospedagem.numeroAcompanhantes}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium">{selectedHospedagem.telefoneHospede || "Não informado"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedHospedagem.emailHospede || "Não informado"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Documento</p>
                  <p className="font-medium">{selectedHospedagem.documentoHospede || "Não informado"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unidade</p>
                  <p className="font-medium">{selectedHospedagem.unidade}{selectedHospedagem.bloco ? ` (${selectedHospedagem.bloco})` : ""}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-in</p>
                  <p className="font-medium">
                    {format(new Date(selectedHospedagem.dataCheckIn), "dd/MM/yyyy", { locale: ptBR })}
                    {selectedHospedagem.horaCheckIn && ` às ${selectedHospedagem.horaCheckIn}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-out</p>
                  <p className="font-medium">
                    {format(new Date(selectedHospedagem.dataCheckOut), "dd/MM/yyyy", { locale: ptBR })}
                    {selectedHospedagem.horaCheckOut && ` às ${selectedHospedagem.horaCheckOut}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plataforma</p>
                  <p className="font-medium">{getPlataformaBadge(selectedHospedagem.plataforma)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Código da Reserva</p>
                  <p className="font-medium">{selectedHospedagem.codigoReserva || "Não informado"}</p>
                </div>
              </div>

              {(selectedHospedagem.placaVeiculo || selectedHospedagem.modeloVeiculo) && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Car className="w-4 h-4" /> Veículo
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Placa</p>
                      <p className="font-medium">{selectedHospedagem.placaVeiculo || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Modelo</p>
                      <p className="font-medium">{selectedHospedagem.modeloVeiculo || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cor</p>
                      <p className="font-medium">{selectedHospedagem.corVeiculo || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Vaga</p>
                      <p className="font-medium">{selectedHospedagem.vagaEstacionamento || "-"}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedHospedagem.observacoes && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Observações</h4>
                  <p className="text-sm">{selectedHospedagem.observacoes}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" /> Status da Mensagem
                </h4>
                {selectedHospedagem.boasVindasEnviadas ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Enviada em {selectedHospedagem.dataEnvioBoasVindas ? format(new Date(selectedHospedagem.dataEnvioBoasVindas), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ""}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Ainda não enviada</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetalhesDialogOpen(false)} data-testid="button-fechar-detalhes">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
