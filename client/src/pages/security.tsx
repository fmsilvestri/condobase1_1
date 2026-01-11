import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Shield,
  Plus,
  DoorOpen,
  GaugeCircle,
  Camera,
  ScanFace,
  CircleCheck,
  CircleAlert,
  CircleX,
  Circle,
  Loader2,
  Pencil,
  Trash2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { SecurityDevice, SecurityEvent, InsertSecurityDevice } from "@shared/schema";

const deviceTypeLabels: Record<string, { label: string; icon: any }> = {
  "portão": { label: "Portão", icon: GaugeCircle },
  "porta": { label: "Porta", icon: DoorOpen },
  "câmera": { label: "Câmera", icon: Camera },
  "facial": { label: "Reconhecimento Facial", icon: ScanFace },
};

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  "operacional": { label: "Operacional", icon: CircleCheck, color: "text-green-500" },
  "atenção": { label: "Atenção", icon: CircleAlert, color: "text-yellow-500" },
  "falha": { label: "Falha", icon: CircleX, color: "text-red-500" },
  "inativo": { label: "Inativo", icon: Circle, color: "text-muted-foreground" },
};

const deviceFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.string().min(1, "Tipo é obrigatório"),
  location: z.string().min(1, "Localização é obrigatória"),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  status: z.string().default("operacional"),
  notes: z.string().optional(),
});

type DeviceFormData = z.infer<typeof deviceFormSchema>;

export default function Security() {
  const [isNewDeviceOpen, setIsNewDeviceOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<SecurityDevice | null>(null);
  const [selectedType, setSelectedType] = useState<string>("all");
  const { toast } = useToast();
  const { canEdit } = useAuth();

  const { data: devices = [], isLoading } = useQuery<SecurityDevice[]>({
    queryKey: ["/api/security-devices"],
  });

  const { data: events = [] } = useQuery<SecurityEvent[]>({
    queryKey: ["/api/security-events"],
  });

  const form = useForm<DeviceFormData>({
    resolver: zodResolver(deviceFormSchema),
    defaultValues: {
      name: "",
      type: "",
      location: "",
      brand: "",
      model: "",
      serialNumber: "",
      status: "operacional",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: DeviceFormData) =>
      apiRequest("POST", "/api/security-devices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/security-devices"] });
      toast({ title: "Dispositivo cadastrado com sucesso!" });
      setIsNewDeviceOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Erro ao cadastrar dispositivo", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DeviceFormData> }) =>
      apiRequest("PATCH", `/api/security-devices/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/security-devices"] });
      toast({ title: "Dispositivo atualizado!" });
      setEditingDevice(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Erro ao atualizar dispositivo", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/security-devices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/security-devices"] });
      toast({ title: "Dispositivo removido!" });
    },
    onError: () => {
      toast({ title: "Erro ao remover dispositivo", variant: "destructive" });
    },
  });

  const onSubmit = (data: DeviceFormData) => {
    if (editingDevice) {
      updateMutation.mutate({ id: editingDevice.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditDialog = (device: SecurityDevice) => {
    setEditingDevice(device);
    form.reset({
      name: device.name,
      type: device.type,
      location: device.location,
      brand: device.brand || "",
      model: device.model || "",
      serialNumber: device.serialNumber || "",
      status: device.status,
      notes: device.notes || "",
    });
  };

  const filteredDevices = selectedType === "all" 
    ? devices 
    : devices.filter(d => d.type === selectedType);

  const deviceCounts = {
    total: devices.length,
    portao: devices.filter(d => d.type === "portão").length,
    porta: devices.filter(d => d.type === "porta").length,
    camera: devices.filter(d => d.type === "câmera").length,
    facial: devices.filter(d => d.type === "facial").length,
    operacional: devices.filter(d => d.status === "operacional").length,
    atencao: devices.filter(d => d.status === "atenção").length,
    falha: devices.filter(d => d.status === "falha").length,
    inativo: devices.filter(d => d.status === "inativo").length,
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Controle de Acesso e Segurança"
        description="Gerencie portões, portas, câmeras e sistema de reconhecimento facial"
        backHref="/"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Dispositivos</p>
                <p className="text-3xl font-bold">{deviceCounts.total}</p>
              </div>
              <Shield className="h-10 w-10 text-cyan-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Operacionais</p>
                <p className="text-3xl font-bold text-green-500">{deviceCounts.operacional}</p>
              </div>
              <CircleCheck className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Atenção</p>
                <p className="text-3xl font-bold text-yellow-500">{deviceCounts.atencao}</p>
              </div>
              <CircleAlert className="h-10 w-10 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Falha</p>
                <p className="text-3xl font-bold text-red-500">{deviceCounts.falha}</p>
              </div>
              <CircleX className="h-10 w-10 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover-elevate" onClick={() => setSelectedType(selectedType === "portão" ? "all" : "portão")} data-testid="filter-portao">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${selectedType === "portão" ? "bg-cyan-500/20" : "bg-muted"}`}>
              <GaugeCircle className={`h-5 w-5 ${selectedType === "portão" ? "text-cyan-500" : ""}`} />
            </div>
            <div>
              <p className="font-medium">Portões</p>
              <p className="text-sm text-muted-foreground">{deviceCounts.portao} dispositivos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={() => setSelectedType(selectedType === "porta" ? "all" : "porta")} data-testid="filter-porta">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${selectedType === "porta" ? "bg-cyan-500/20" : "bg-muted"}`}>
              <DoorOpen className={`h-5 w-5 ${selectedType === "porta" ? "text-cyan-500" : ""}`} />
            </div>
            <div>
              <p className="font-medium">Portas</p>
              <p className="text-sm text-muted-foreground">{deviceCounts.porta} dispositivos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={() => setSelectedType(selectedType === "câmera" ? "all" : "câmera")} data-testid="filter-camera">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${selectedType === "câmera" ? "bg-cyan-500/20" : "bg-muted"}`}>
              <Camera className={`h-5 w-5 ${selectedType === "câmera" ? "text-cyan-500" : ""}`} />
            </div>
            <div>
              <p className="font-medium">Câmeras</p>
              <p className="text-sm text-muted-foreground">{deviceCounts.camera} dispositivos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={() => setSelectedType(selectedType === "facial" ? "all" : "facial")} data-testid="filter-facial">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${selectedType === "facial" ? "bg-cyan-500/20" : "bg-muted"}`}>
              <ScanFace className={`h-5 w-5 ${selectedType === "facial" ? "text-cyan-500" : ""}`} />
            </div>
            <div>
              <p className="font-medium">Reconhecimento Facial</p>
              <p className="text-sm text-muted-foreground">{deviceCounts.facial} dispositivos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">
            {selectedType === "all" ? "Todos os Dispositivos" : deviceTypeLabels[selectedType]?.label || selectedType}
          </h3>
          {selectedType !== "all" && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedType("all")}>
              Limpar filtro
            </Button>
          )}
        </div>
        {canEdit && (
          <Dialog open={isNewDeviceOpen} onOpenChange={setIsNewDeviceOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-device">
                <Plus className="mr-2 h-4 w-4" />
                Novo Dispositivo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Cadastrar Dispositivo</DialogTitle>
                <DialogDescription>Adicione um novo dispositivo de segurança</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Portão Principal" {...field} data-testid="input-device-name" />
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
                        <FormLabel>Tipo</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-device-type">
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="portão">Portão</SelectItem>
                            <SelectItem value="porta">Porta</SelectItem>
                            <SelectItem value="câmera">Câmera</SelectItem>
                            <SelectItem value="facial">Reconhecimento Facial</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Localização</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Entrada Principal" {...field} data-testid="input-device-location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marca</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Intelbras" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modelo</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: XPE 3200" {...field} />
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="operacional">Operacional</SelectItem>
                            <SelectItem value="atenção">Atenção</SelectItem>
                            <SelectItem value="falha">Falha</SelectItem>
                            <SelectItem value="inativo">Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Observações adicionais..." {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-device">
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Cadastrar
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredDevices.length === 0 ? (
        <Card className="p-8 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Nenhum dispositivo encontrado</h3>
          <p className="text-sm text-muted-foreground">
            {selectedType === "all" ? "Cadastre um dispositivo de segurança" : "Nenhum dispositivo deste tipo"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDevices.map((device) => {
            const typeInfo = deviceTypeLabels[device.type] || { label: device.type, icon: Shield };
            const statusInfo = statusConfig[device.status] || statusConfig.operacional;
            const TypeIcon = typeInfo.icon;
            const StatusIcon = statusInfo.icon;

            return (
              <Card key={device.id} className="overflow-hidden" data-testid={`device-card-${device.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
                        <TypeIcon className="h-5 w-5 text-cyan-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{device.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{typeInfo.label}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`${statusInfo.color} border-current`}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Localização</p>
                      <p className="font-medium">{device.location}</p>
                    </div>
                    {device.brand && (
                      <div>
                        <p className="text-muted-foreground">Marca</p>
                        <p className="font-medium">{device.brand}</p>
                      </div>
                    )}
                    {device.model && (
                      <div>
                        <p className="text-muted-foreground">Modelo</p>
                        <p className="font-medium">{device.model}</p>
                      </div>
                    )}
                    {device.lastMaintenanceDate && (
                      <div>
                        <p className="text-muted-foreground">Última Manutenção</p>
                        <p className="font-medium">{formatDate(device.lastMaintenanceDate)}</p>
                      </div>
                    )}
                  </div>
                  {device.notes && (
                    <p className="text-sm text-muted-foreground border-t pt-3">{device.notes}</p>
                  )}
                  {canEdit && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Dialog open={editingDevice?.id === device.id} onOpenChange={(open) => !open && setEditingDevice(null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(device)} data-testid={`button-edit-${device.id}`}>
                            <Pencil className="mr-1 h-3 w-3" />
                            Editar
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Editar Dispositivo</DialogTitle>
                          </DialogHeader>
                          <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                              <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Nome</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
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
                                    <FormLabel>Tipo</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="portão">Portão</SelectItem>
                                        <SelectItem value="porta">Porta</SelectItem>
                                        <SelectItem value="câmera">Câmera</SelectItem>
                                        <SelectItem value="facial">Reconhecimento Facial</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="location"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Localização</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="operacional">Operacional</SelectItem>
                                        <SelectItem value="atenção">Atenção</SelectItem>
                                        <SelectItem value="falha">Falha</SelectItem>
                                        <SelectItem value="inativo">Inativo</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Observações</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Alterações
                              </Button>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-600" data-testid={`button-delete-${device.id}`}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover dispositivo?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover "{device.name}"? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(device.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
