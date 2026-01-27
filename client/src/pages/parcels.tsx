import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  Clock,
  Bell,
  Undo2,
  User,
  Building2,
  Truck,
  MessageCircle,
  Phone,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useCondominium } from "@/hooks/use-condominium";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  parcelStatuses,
  parcelTypes,
  type Parcel,
} from "@shared/schema";

const parcelFormSchema = z.object({
  unit: z.string().min(1, "Unidade é obrigatória"),
  recipientName: z.string().min(2, "Nome do destinatário é obrigatório"),
  senderName: z.string().optional(),
  carrier: z.string().optional(),
  trackingCode: z.string().optional(),
  type: z.string().min(1, "Tipo é obrigatório"),
  receivedBy: z.string().min(2, "Recebedor é obrigatório"),
  notes: z.string().optional(),
});

type ParcelFormValues = z.infer<typeof parcelFormSchema>;

const statusLabels: Record<string, string> = {
  aguardando: "Aguardando Retirada",
  notificado: "Notificado",
  retirado: "Retirado",
  devolvido: "Devolvido",
};

const statusColors: Record<string, string> = {
  aguardando: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  notificado: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  retirado: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  devolvido: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const typeLabels: Record<string, string> = {
  carta: "Carta",
  pacote: "Pacote",
  caixa: "Caixa",
  envelope: "Envelope",
  outros: "Outros",
};

const typeIcons: Record<string, React.ReactNode> = {
  carta: <Package className="h-4 w-4" />,
  pacote: <Package className="h-4 w-4" />,
  caixa: <Package className="h-4 w-4" />,
  envelope: <Package className="h-4 w-4" />,
  outros: <Package className="h-4 w-4" />,
};

export default function Parcels() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedCondominium } = useCondominium();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingParcel, setEditingParcel] = useState<Parcel | null>(null);

  const canEdit = user?.role === "admin" || user?.role === "síndico" || user?.role === "porteiro" || user?.role === "zelador";

  const form = useForm<ParcelFormValues>({
    resolver: zodResolver(parcelFormSchema),
    defaultValues: {
      unit: "",
      recipientName: "",
      senderName: "",
      carrier: "",
      trackingCode: "",
      type: "",
      receivedBy: "",
      notes: "",
    },
  });

  const { data: parcels, isLoading } = useQuery<Parcel[]>({
    queryKey: ["/api/parcels"],
    enabled: !!selectedCondominium,
  });

  const createMutation = useMutation({
    mutationFn: async (data: ParcelFormValues) => {
      return apiRequest("POST", "/api/parcels", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parcels"] });
      toast({ title: "Encomenda registrada com sucesso!" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Erro ao registrar encomenda", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ParcelFormValues> }) => {
      return apiRequest("PATCH", `/api/parcels/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parcels"] });
      toast({ title: "Encomenda atualizada com sucesso!" });
      setIsDialogOpen(false);
      setEditingParcel(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Erro ao atualizar encomenda", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, pickedUpBy }: { id: string; status: string; pickedUpBy?: string }) => {
      const updateData: any = { status };
      if (status === "notificado") {
        updateData.notifiedAt = new Date().toISOString();
      } else if (status === "retirado") {
        updateData.pickedUpAt = new Date().toISOString();
        updateData.pickedUpBy = pickedUpBy;
      }
      return apiRequest("PATCH", `/api/parcels/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parcels"] });
      toast({ title: "Status atualizado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/parcels/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parcels"] });
      toast({ title: "Encomenda excluída com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir encomenda", variant: "destructive" });
    },
  });

  const onSubmit = (data: ParcelFormValues) => {
    if (editingParcel) {
      updateMutation.mutate({ id: editingParcel.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (parcel: Parcel) => {
    setEditingParcel(parcel);
    form.reset({
      unit: parcel.unit,
      recipientName: parcel.recipientName,
      senderName: parcel.senderName || "",
      carrier: parcel.carrier || "",
      trackingCode: parcel.trackingCode || "",
      type: parcel.type,
      receivedBy: parcel.receivedBy,
      notes: parcel.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleMarkAsNotified = (parcel: Parcel) => {
    updateStatusMutation.mutate({ id: parcel.id, status: "notificado" });
  };

  const handleMarkAsPickedUp = (parcel: Parcel) => {
    const pickedUpBy = prompt("Nome de quem retirou:");
    if (pickedUpBy) {
      updateStatusMutation.mutate({ id: parcel.id, status: "retirado", pickedUpBy });
    }
  };

  const handleMarkAsReturned = (parcel: Parcel) => {
    updateStatusMutation.mutate({ id: parcel.id, status: "devolvido" });
  };

  const sendWhatsAppNotification = (parcel: Parcel) => {
    const message = encodeURIComponent(
      `Olá! Você tem uma encomenda aguardando retirada na portaria.\n\n` +
      `Tipo: ${typeLabels[parcel.type]}\n` +
      `Unidade: ${parcel.unit}\n` +
      `Destinatário: ${parcel.recipientName}\n` +
      (parcel.carrier ? `Transportadora: ${parcel.carrier}\n` : "") +
      (parcel.trackingCode ? `Código: ${parcel.trackingCode}\n` : "") +
      `Recebido em: ${format(new Date(parcel.receivedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n\n` +
      `Por favor, retire na portaria o mais breve possível.`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  const filteredParcels = parcels?.filter((parcel) => {
    const matchesSearch =
      parcel.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parcel.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (parcel.trackingCode?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (parcel.carrier?.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "all" || parcel.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = parcels?.filter((p) => p.status === "aguardando" || p.status === "notificado").length || 0;

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <PageHeader
        title="Encomendas"
        description="Gerencie as encomendas e entregas do condomínio"
        icon={Package}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="input-search"
              placeholder="Buscar por unidade, nome, código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {parcelStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {canEdit && (
          <Button
            data-testid="button-add-parcel"
            onClick={() => {
              setEditingParcel(null);
              form.reset();
              setIsDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Encomenda
          </Button>
        )}
      </div>

      {pendingCount > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="p-4 flex items-center gap-3">
            <Bell className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <span className="text-yellow-800 dark:text-yellow-200">
              {pendingCount} encomenda(s) aguardando retirada
            </span>
          </CardContent>
        </Card>
      )}

      {!filteredParcels?.length ? (
        <EmptyState
          icon={Package}
          title="Nenhuma encomenda encontrada"
          description={searchTerm || statusFilter !== "all" 
            ? "Tente ajustar os filtros de busca" 
            : "Registre a primeira encomenda para começar"}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredParcels.map((parcel) => (
            <Card key={parcel.id} className="hover-elevate" data-testid={`card-parcel-${parcel.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-md bg-primary/10">
                      {typeIcons[parcel.type]}
                    </div>
                    <div>
                      <CardTitle className="text-base">{parcel.recipientName}</CardTitle>
                      <p className="text-sm text-muted-foreground">Unidade {parcel.unit}</p>
                    </div>
                  </div>
                  <Badge className={statusColors[parcel.status]}>
                    {statusLabels[parcel.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Package className="h-3.5 w-3.5" />
                    <span>{typeLabels[parcel.type]}</span>
                  </div>
                  {parcel.carrier && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Truck className="h-3.5 w-3.5" />
                      <span className="truncate">{parcel.carrier}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      Recebido em {format(new Date(parcel.receivedAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  {parcel.trackingCode && (
                    <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                        {parcel.trackingCode}
                      </span>
                    </div>
                  )}
                  {parcel.pickedUpAt && (
                    <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 col-span-2">
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>
                        Retirado por {parcel.pickedUpBy} em {format(new Date(parcel.pickedUpAt), "dd/MM", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {parcel.status === "aguardando" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAsNotified(parcel)}
                        data-testid={`button-notify-${parcel.id}`}
                      >
                        <Bell className="h-3.5 w-3.5 mr-1" />
                        Notificar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendWhatsAppNotification(parcel)}
                        data-testid={`button-whatsapp-${parcel.id}`}
                      >
                        <MessageCircle className="h-3.5 w-3.5 mr-1" />
                        WhatsApp
                      </Button>
                    </>
                  )}
                  {(parcel.status === "aguardando" || parcel.status === "notificado") && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleMarkAsPickedUp(parcel)}
                      data-testid={`button-pickup-${parcel.id}`}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      Retirar
                    </Button>
                  )}
                  {(parcel.status === "aguardando" || parcel.status === "notificado") && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleMarkAsReturned(parcel)}
                      data-testid={`button-return-${parcel.id}`}
                    >
                      <Undo2 className="h-3.5 w-3.5 mr-1" />
                      Devolver
                    </Button>
                  )}
                  {canEdit && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(parcel)}
                        data-testid={`button-edit-${parcel.id}`}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            data-testid={`button-delete-${parcel.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir encomenda?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. A encomenda será removida permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(parcel.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingParcel ? "Editar Encomenda" : "Registrar Nova Encomenda"}
            </DialogTitle>
            <DialogDescription>
              {editingParcel
                ? "Atualize as informações da encomenda"
                : "Preencha os dados da encomenda recebida"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ex: 101, Bloco A"
                          data-testid="input-unit"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-type">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {parcelTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {typeLabels[type]}
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
                name="recipientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Destinatário *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Nome do morador"
                        data-testid="input-recipient"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="senderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remetente</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Nome do remetente"
                          data-testid="input-sender"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="carrier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transportadora</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ex: Correios, Jadlog"
                          data-testid="input-carrier"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="trackingCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código de Rastreio</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Código de rastreio"
                          data-testid="input-tracking"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="receivedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recebido por *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Nome do porteiro/zelador"
                          data-testid="input-received-by"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Observações adicionais..."
                        rows={2}
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingParcel ? "Salvar" : "Registrar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
