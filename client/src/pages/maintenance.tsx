import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Wrench,
  Plus,
  Search,
  Filter,
  MessageCircle,
  Image,
  Calendar,
  MapPin,
  Loader2,
  AlertTriangle,
  Edit,
  CheckCircle,
  Clock,
  CircleDot,
  Camera,
  X,
  Zap,
  Droplets,
  Waves,
  Building2,
  Container,
  Dumbbell,
  Gamepad2,
  PawPrint,
  Goal,
  DoorOpen,
  Fence,
  KeyRound,
  Paintbrush,
  Hammer,
  Sparkles,
  Grid3X3,
  TreePine,
  Flame,
  Fan,
  Cog,
  Upload,
  FileText,
  Paperclip,
  type LucideIcon,
} from "lucide-react";
import { useUpload } from "@/hooks/use-upload";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useCondominium } from "@/hooks/use-condominium";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { equipmentCategories, type Equipment, type MaintenanceRequest, type MaintenanceCompletion } from "@shared/schema";

const equipmentIcons: { name: string; icon: LucideIcon; label: string }[] = [
  { name: "zap", icon: Zap, label: "Elétrico" },
  { name: "droplets", icon: Droplets, label: "Hidráulico" },
  { name: "waves", icon: Waves, label: "Piscina" },
  { name: "building2", icon: Building2, label: "Elevador" },
  { name: "container", icon: Container, label: "Cisterna" },
  { name: "fan", icon: Fan, label: "Bomba" },
  { name: "dumbbell", icon: Dumbbell, label: "Academia" },
  { name: "gamepad2", icon: Gamepad2, label: "Brinquedoteca" },
  { name: "pawprint", icon: PawPrint, label: "Pet Place" },
  { name: "goal", icon: Goal, label: "Campo" },
  { name: "dooropen", icon: DoorOpen, label: "Porta" },
  { name: "fence", icon: Fence, label: "Portão" },
  { name: "keyround", icon: KeyRound, label: "Acesso" },
  { name: "paintbrush", icon: Paintbrush, label: "Pintura" },
  { name: "hammer", icon: Hammer, label: "Reboco" },
  { name: "sparkles", icon: Sparkles, label: "Limpeza" },
  { name: "grid3x3", icon: Grid3X3, label: "Piso" },
  { name: "treepine", icon: TreePine, label: "Jardim" },
  { name: "flame", icon: Flame, label: "Gás" },
  { name: "cog", icon: Cog, label: "Geral" },
  { name: "wrench", icon: Wrench, label: "Manutenção" },
];

const getEquipmentIcon = (iconName?: string | null): LucideIcon => {
  const found = equipmentIcons.find(i => i.name === iconName);
  return found?.icon || Wrench;
};

const equipmentFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  location: z.string().min(1, "Localização é obrigatória"),
  description: z.string().optional(),
  icon: z.string().optional(),
  status: z.string().default("operacional"),
  photos: z.array(z.string()).optional(),
});

const requestFormSchema = z.object({
  equipmentId: z.string().min(1, "Equipamento é obrigatório"),
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  priority: z.string().optional().default("normal"),
  status: z.string().optional().default("aberto"),
});

const completionFormSchema = z.object({
  equipmentId: z.string().min(1, "Equipamento é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  location: z.string().min(1, "Local é obrigatório"),
  completedAt: z.string().min(1, "Data é obrigatória"),
});

export default function Maintenance() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isNewEquipmentOpen, setIsNewEquipmentOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [viewingRequest, setViewingRequest] = useState<MaintenanceRequest | null>(null);
  const [equipmentPhotos, setEquipmentPhotos] = useState<string[]>([]);
  const [equipmentDocuments, setEquipmentDocuments] = useState<string[]>([]);
  const [isNewCompletionOpen, setIsNewCompletionOpen] = useState(false);
  const [completionPhotos, setCompletionPhotos] = useState<string[]>([]);
  const { toast } = useToast();
  const { canEdit, userId, dbUserId, isSindico, isAdmin } = useAuth();
  const { selectedCondominium } = useCondominium();
  
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadFile: uploadPhoto, isUploading: isUploadingPhoto, uploadedUrl: uploadedPhotoUrl } = useUpload({
    onSuccess: (url) => {
      setEquipmentPhotos(prev => [...prev, url]);
      toast({ title: "Foto enviada com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao enviar foto", description: error.message, variant: "destructive" });
    },
  });
  
  const { uploadFile: uploadDocument, isUploading: isUploadingDoc, uploadedUrl: uploadedDocUrl } = useUpload({
    onSuccess: (url) => {
      setEquipmentDocuments(prev => [...prev, url]);
      toast({ title: "Documento enviado com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao enviar documento", description: error.message, variant: "destructive" });
    },
  });
  
  // Only síndicos and admins can update status
  const canUpdateStatus = isSindico || isAdmin;

  const { data: equipment = [], isLoading: loadingEquipment } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment"],
  });

  const { data: requests = [], isLoading: loadingRequests } = useQuery<MaintenanceRequest[]>({
    queryKey: ["/api/maintenance"],
  });

  const { data: completions = [], isLoading: loadingCompletions } = useQuery<MaintenanceCompletion[]>({
    queryKey: ["/api/maintenance-completions"],
  });

  const equipmentForm = useForm<z.infer<typeof equipmentFormSchema>>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: {
      name: "",
      category: "",
      location: "",
      description: "",
      icon: "",
      status: "operacional",
      photos: [],
    },
  });

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: "Máximo 10MB", variant: "destructive" });
        return;
      }
      await uploadPhoto(file);
    }
  };

  const handleDocumentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: "Máximo 10MB", variant: "destructive" });
        return;
      }
      await uploadDocument(file);
    }
  };

  const removeEquipmentPhoto = (index: number) => {
    setEquipmentPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const removeEquipmentDocument = (index: number) => {
    setEquipmentDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const requestForm = useForm<z.infer<typeof requestFormSchema>>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      equipmentId: "",
      title: "",
      description: "",
      priority: "normal",
      status: "aberto",
    },
  });

  const completionForm = useForm<z.infer<typeof completionFormSchema>>({
    resolver: zodResolver(completionFormSchema),
    defaultValues: {
      equipmentId: "",
      description: "",
      location: "",
      completedAt: new Date().toISOString().split("T")[0],
    },
  });

  const handleCompletionPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: "Máximo 5MB", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setCompletionPhotos(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeCompletionPhoto = (index: number) => {
    setCompletionPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const createCompletionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof completionFormSchema>) => {
      const selectedEquipment = equipment.find(e => e.id === data.equipmentId);
      return apiRequest("POST", "/api/maintenance-completions", {
        ...data,
        photos: completionPhotos,
        performedBy: dbUserId || null,
        performedByName: selectedEquipment ? `Manutenção em ${selectedEquipment.name}` : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-completions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Manutenção registrada com sucesso!" });
      setIsNewCompletionOpen(false);
      setCompletionPhotos([]);
      completionForm.reset({
        equipmentId: "",
        description: "",
        location: "",
        completedAt: new Date().toISOString().split("T")[0],
      });
    },
    onError: () => {
      toast({ title: "Erro ao registrar manutenção", variant: "destructive" });
    },
  });

  const createEquipmentMutation = useMutation({
    mutationFn: (data: z.infer<typeof equipmentFormSchema>) => {
      const dataWithFiles = {
        ...data,
        photos: equipmentPhotos.length > 0 ? equipmentPhotos : [],
        documents: equipmentDocuments.length > 0 ? equipmentDocuments : [],
        condominiumId: selectedCondominium?.id,
      };
      return apiRequest("POST", "/api/equipment", dataWithFiles);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Equipamento cadastrado com sucesso!" });
      setIsNewEquipmentOpen(false);
      setEquipmentPhotos([]);
      setEquipmentDocuments([]);
      equipmentForm.reset();
    },
    onError: () => {
      toast({ title: "Erro ao cadastrar equipamento", variant: "destructive" });
    },
  });

  const updateEquipmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: z.infer<typeof equipmentFormSchema> }) => {
      const dataWithFiles = {
        ...data,
        photos: equipmentPhotos.length > 0 ? equipmentPhotos : [],
        documents: equipmentDocuments.length > 0 ? equipmentDocuments : [],
      };
      return apiRequest("PATCH", `/api/equipment/${id}`, dataWithFiles);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Equipamento atualizado com sucesso!" });
      setEditingEquipment(null);
      setEquipmentPhotos([]);
      setEquipmentDocuments([]);
      equipmentForm.reset();
    },
    onError: () => {
      toast({ title: "Erro ao atualizar equipamento", variant: "destructive" });
    },
  });

  const handleEditEquipment = (eq: Equipment) => {
    setEditingEquipment(eq);
    setEquipmentPhotos(eq.photos || []);
    setEquipmentDocuments(eq.documents || []);
    equipmentForm.reset({
      name: eq.name,
      category: eq.category,
      location: eq.location,
      description: eq.description || "",
      icon: eq.icon || "",
      status: eq.status,
    });
  };

  const handleSaveEquipment = (data: z.infer<typeof equipmentFormSchema>) => {
    if (editingEquipment) {
      updateEquipmentMutation.mutate({ id: editingEquipment.id, data });
    }
  };

  const createRequestMutation = useMutation({
    mutationFn: async (data: z.infer<typeof requestFormSchema>) => {
      console.log("[maintenance] Submitting request:", data, "dbUserId:", dbUserId);
      return apiRequest("POST", "/api/maintenance", {
        ...data,
        requestedBy: dbUserId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Chamado aberto com sucesso!" });
      setIsNewRequestOpen(false);
      requestForm.reset();
    },
    onError: (error: Error) => {
      console.error("[maintenance] Error creating request:", error.message || error);
      toast({ 
        title: "Erro ao abrir chamado", 
        description: error.message || "Erro de conexão. Tente novamente.", 
        variant: "destructive" 
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/maintenance/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Status atualizado com sucesso!" });
      setEditingRequest(null);
      setSelectedStatus("");
    },
    onError: () => {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    },
  });

  const handleEditStatus = (request: MaintenanceRequest) => {
    setEditingRequest(request);
    setSelectedStatus(request.status);
  };

  const handleSaveStatus = () => {
    if (editingRequest && selectedStatus) {
      updateStatusMutation.mutate({ id: editingRequest.id, status: selectedStatus });
    }
  };

  const canEditRequest = (request: MaintenanceRequest) => {
    if (canEdit) return true;
    return request.requestedBy === dbUserId;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "aberto":
        return <CircleDot className="h-4 w-4 text-blue-500" />;
      case "em andamento":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "concluído":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "aberto":
        return "Chamado Aberto";
      case "em andamento":
        return "Em Andamento";
      case "concluído":
        return "Concluído";
      default:
        return status;
    }
  };

  const filteredEquipment = equipment.filter((eq) => {
    const matchesSearch = eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || eq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const openRequestsCount = requests.filter(r => r.status !== "concluído").length;

  const handleWhatsAppContact = (equipmentName: string, description: string) => {
    const message = encodeURIComponent(
      `Olá Fornecedor do equipamento ${equipmentName}! Gostaria de solicitar manutenção do equipamento ${equipmentName}.`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  const getEquipmentName = (equipmentId: string) => {
    return equipment.find(e => e.id === equipmentId)?.name || "Equipamento";
  };

  if (loadingEquipment || loadingRequests) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ativos & Manutenções"
        description="Gerencie equipamentos e chamados de manutenção"
        backHref="/"
        actions={
          <div className="flex gap-2">
            {canEdit && (
              <Dialog open={isNewEquipmentOpen} onOpenChange={setIsNewEquipmentOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-new-equipment">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Equipamento
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Cadastrar Equipamento</DialogTitle>
                  <DialogDescription>
                    Adicione um novo equipamento ao inventário do condomínio.
                  </DialogDescription>
                </DialogHeader>
                <Form {...equipmentForm}>
                  <form onSubmit={equipmentForm.handleSubmit((data) => createEquipmentMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={equipmentForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Equipamento</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Bomba d'Água Principal" {...field} data-testid="input-equipment-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={equipmentForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-equipment-category">
                                <SelectValue placeholder="Selecione a categoria" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {equipmentCategories.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={equipmentForm.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Localização</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Casa de Máquinas" {...field} data-testid="input-equipment-location" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={equipmentForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Detalhes adicionais..." {...field} data-testid="input-equipment-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={equipmentForm.control}
                      name="icon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ícone do Equipamento</FormLabel>
                          <div className="grid grid-cols-7 gap-2 p-3 border rounded-lg bg-muted/30">
                            {equipmentIcons.map((iconItem) => {
                              const IconComponent = iconItem.icon;
                              return (
                                <Button
                                  key={iconItem.name}
                                  type="button"
                                  variant={field.value === iconItem.name ? "default" : "ghost"}
                                  size="icon"
                                  onClick={() => field.onChange(iconItem.name)}
                                  title={iconItem.label}
                                  className="h-9 w-9"
                                  data-testid={`icon-${iconItem.name}`}
                                >
                                  <IconComponent className="h-4 w-4" />
                                </Button>
                              );
                            })}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-2">
                      <Label>Foto do Equipamento</Label>
                      <div className="flex items-center gap-4">
                        <Input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhotoChange}
                          className="flex-1"
                          data-testid="input-equipment-photo"
                        />
                        {equipmentPhoto && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEquipmentPhoto(null)}
                          >
                            Remover
                          </Button>
                        )}
                      </div>
                      {equipmentPhoto && (
                        <div className="mt-2 rounded-lg border overflow-hidden">
                          <img
                            src={equipmentPhoto}
                            alt="Preview"
                            className="w-full h-32 object-cover"
                          />
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => { setIsNewEquipmentOpen(false); setEquipmentPhoto(null); }}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createEquipmentMutation.isPending} data-testid="button-save-equipment">
                        {createEquipmentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            )
            }

            {/* Edit Equipment Dialog */}
            <Dialog open={!!editingEquipment} onOpenChange={(open) => !open && setEditingEquipment(null)}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Editar Equipamento</DialogTitle>
                  <DialogDescription>
                    Atualize as informações do equipamento.
                  </DialogDescription>
                </DialogHeader>
                <Form {...equipmentForm}>
                  <form onSubmit={equipmentForm.handleSubmit(handleSaveEquipment)} className="space-y-4">
                    <FormField
                      control={equipmentForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Equipamento</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Bomba d'água principal" {...field} data-testid="input-edit-equipment-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={equipmentForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-equipment-category">
                                <SelectValue placeholder="Selecione a categoria" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {equipmentCategories.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={equipmentForm.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Localização</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Casa de máquinas" {...field} data-testid="input-edit-equipment-location" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={equipmentForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-equipment-status">
                                <SelectValue placeholder="Selecione o status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="operacional">Operacional</SelectItem>
                              <SelectItem value="manutenção">Em Manutenção</SelectItem>
                              <SelectItem value="inoperante">Inoperante</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={equipmentForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Detalhes adicionais..." {...field} data-testid="input-edit-equipment-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={equipmentForm.control}
                      name="icon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ícone do Equipamento</FormLabel>
                          <div className="grid grid-cols-7 gap-2 p-3 border rounded-lg bg-muted/30">
                            {equipmentIcons.map((iconItem) => {
                              const IconComponent = iconItem.icon;
                              return (
                                <Button
                                  key={iconItem.name}
                                  type="button"
                                  variant={field.value === iconItem.name ? "default" : "ghost"}
                                  size="icon"
                                  onClick={() => field.onChange(iconItem.name)}
                                  title={iconItem.label}
                                  className="h-9 w-9"
                                  data-testid={`edit-icon-${iconItem.name}`}
                                >
                                  <IconComponent className="h-4 w-4" />
                                </Button>
                              );
                            })}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setEditingEquipment(null)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={updateEquipmentMutation.isPending} data-testid="button-update-equipment">
                        {updateEquipmentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Atualizar
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-request">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Manutenção
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Abrir Chamado de Manutenção</DialogTitle>
                  <DialogDescription>
                    Descreva o problema e selecione o equipamento afetado.
                  </DialogDescription>
                </DialogHeader>
                <Form {...requestForm}>
                  <form onSubmit={requestForm.handleSubmit(
                    (data) => {
                      console.log("[maintenance] Form submitted with data:", data);
                      createRequestMutation.mutate(data);
                    },
                    (errors) => {
                      console.log("[maintenance] Form validation errors:", errors);
                    }
                  )} className="space-y-4">
                    <FormField
                      control={requestForm.control}
                      name="equipmentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Equipamento</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-request-equipment">
                                <SelectValue placeholder="Selecione o equipamento" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {equipment.map((eq) => (
                                <SelectItem key={eq.id} value={eq.id}>
                                  {eq.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={requestForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título do Chamado</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Bomba fazendo barulho" {...field} data-testid="input-request-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={requestForm.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prioridade</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-request-priority">
                                <SelectValue placeholder="Selecione a prioridade" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="baixa">Baixa</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="alta">Alta</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={requestForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição do Problema</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Descreva o problema em detalhes..." {...field} data-testid="input-request-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsNewRequestOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createRequestMutation.isPending} data-testid="button-save-request">
                        {createRequestMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Abrir Chamado
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <Tabs defaultValue="equipment" className="space-y-4">
        <TabsList>
          <TabsTrigger value="equipment" data-testid="tab-equipment">
            Equipamentos ({equipment.length})
          </TabsTrigger>
          <TabsTrigger value="requests" data-testid="tab-requests">
            Chamados
            {openRequestsCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {openRequestsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completions" data-testid="tab-completions">
            Manutenção Realizada ({completions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="equipment" className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar equipamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-equipment"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[200px]" data-testid="filter-category">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {equipmentCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredEquipment.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="Nenhum equipamento encontrado"
              description="Cadastre equipamentos para gerenciar manutenções."
              action={{
                label: "Cadastrar Equipamento",
                onClick: () => setIsNewEquipmentOpen(true),
              }}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEquipment.map((eq) => {
                const EquipmentIcon = getEquipmentIcon(eq.icon);
                return (
                <Card key={eq.id} className="hover-elevate" data-testid={`equipment-card-${eq.id}`}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className="relative flex-shrink-0 p-2.5 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20"
                        style={{
                          transform: "perspective(100px) rotateX(5deg) rotateY(-5deg)",
                          transformStyle: "preserve-3d",
                          boxShadow: "0 4px 12px -2px rgba(0,0,0,0.15), 0 2px 4px -1px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)",
                        }}
                      >
                        <EquipmentIcon className="h-5 w-5 text-primary drop-shadow-sm" />
                        <div 
                          className="absolute inset-0 rounded-lg bg-gradient-to-t from-transparent to-white/10 pointer-events-none"
                          style={{ transform: "translateZ(2px)" }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base" data-testid={`text-equipment-name-${eq.id}`}>{eq.name}</CardTitle>
                        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {eq.location}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={eq.status as any} size="sm" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {eq.category.charAt(0).toUpperCase() + eq.category.slice(1)}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditEquipment(eq)}
                            data-testid={`button-edit-equipment-${eq.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleWhatsAppContact(eq.name, "Solicitar orçamento")}
                          className="gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                          data-testid={`button-whatsapp-${eq.id}`}
                        >
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          {requests.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="Nenhum chamado aberto"
              description="Todos os chamados foram resolvidos."
            />
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <Card key={req.id} className="hover-elevate" data-testid={`request-card-${req.id}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold" data-testid={`text-request-title-${req.id}`}>{req.title}</h3>
                          <StatusBadge status={req.status as any} size="sm" />
                          {req.priority === "alta" && (
                            <Badge variant="destructive" className="text-xs">
                              Urgente
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {getEquipmentName(req.equipmentId)}
                        </p>
                        <p className="mt-2 text-sm">{req.description}</p>
                        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {req.createdAt ? new Date(req.createdAt).toLocaleDateString("pt-BR") : "-"}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 sm:flex-col">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setViewingRequest(req)}
                          data-testid={`button-view-${req.id}`}
                        >
                          Ver Detalhes
                        </Button>
                        {canUpdateStatus && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEditStatus(req)}
                            data-testid={`button-edit-status-${req.id}`}
                          >
                            <Edit className="mr-1 h-3 w-3" />
                            Status
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleWhatsAppContact(getEquipmentName(req.equipmentId), req.description)}
                          className="gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Fornecedor
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completions" className="space-y-4">
          <div className="flex justify-end">
            {canEdit && (
              <Dialog open={isNewCompletionOpen} onOpenChange={setIsNewCompletionOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-completion">
                    <Plus className="mr-2 h-4 w-4" />
                    Registrar Manutenção
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Registrar Manutenção Realizada</DialogTitle>
                    <DialogDescription>
                      Registre uma manutenção concluída com fotos e detalhes.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...completionForm}>
                    <form onSubmit={completionForm.handleSubmit((data) => createCompletionMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={completionForm.control}
                        name="equipmentId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Equipamento</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-completion-equipment">
                                  <SelectValue placeholder="Selecione o equipamento" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {equipment.map((eq) => (
                                  <SelectItem key={eq.id} value={eq.id}>
                                    {eq.name} - {eq.location}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={completionForm.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Local da Manutenção</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Sala de máquinas, Cobertura..." {...field} data-testid="input-completion-location" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={completionForm.control}
                        name="completedAt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data da Manutenção</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-completion-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={completionForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrição do Serviço</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Descreva o serviço realizado..." {...field} data-testid="input-completion-description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-2">
                        <Label>Fotos do Serviço</Label>
                        <div className="flex flex-wrap gap-2">
                          {completionPhotos.map((photo, index) => (
                            <div key={index} className="relative">
                              <img src={photo} alt={`Foto ${index + 1}`} className="h-20 w-20 object-cover rounded-md border" />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6"
                                onClick={() => removeCompletionPhoto(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleCompletionPhotoChange}
                            />
                            <Camera className="h-6 w-6 text-muted-foreground" />
                          </label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => {
                          setIsNewCompletionOpen(false);
                          setCompletionPhotos([]);
                          completionForm.reset();
                        }}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={createCompletionMutation.isPending} data-testid="button-save-completion">
                          {createCompletionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Registrar
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {completions.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="Nenhuma manutenção registrada"
              description="Registre manutenções realizadas para manter o histórico."
              action={canEdit ? {
                label: "Registrar Manutenção",
                onClick: () => setIsNewCompletionOpen(true),
              } : undefined}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {completions.map((completion) => (
                <Card key={completion.id} className="hover-elevate" data-testid={`completion-card-${completion.id}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {equipment.find(e => e.id === completion.equipmentId)?.name || "Equipamento"}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {completion.location}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm line-clamp-2">{completion.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {completion.completedAt ? new Date(completion.completedAt).toLocaleDateString("pt-BR") : "-"}
                    </div>
                    {completion.photos && completion.photos.length > 0 && (
                      <div className="flex gap-1 overflow-x-auto">
                        {completion.photos.slice(0, 3).map((photo, index) => (
                          <img
                            key={index}
                            src={photo}
                            alt={`Foto ${index + 1}`}
                            className="h-12 w-12 object-cover rounded-md border flex-shrink-0"
                          />
                        ))}
                        {completion.photos.length > 3 && (
                          <div className="h-12 w-12 flex items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                            +{completion.photos.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingRequest} onOpenChange={(open) => !open && setEditingRequest(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Atualizar Status do Chamado</DialogTitle>
            <DialogDescription>
              {editingRequest?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status Atual</Label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {editingRequest && getStatusIcon(editingRequest.status)}
                {editingRequest && getStatusLabel(editingRequest.status)}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Novo Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger data-testid="select-update-status">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberto">
                    <div className="flex items-center gap-2">
                      <CircleDot className="h-4 w-4 text-blue-500" />
                      Chamado Aberto
                    </div>
                  </SelectItem>
                  <SelectItem value="em andamento">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      Em Andamento
                    </div>
                  </SelectItem>
                  <SelectItem value="concluído">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Concluído
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRequest(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveStatus} 
              disabled={updateStatusMutation.isPending || !selectedStatus || selectedStatus === editingRequest?.status}
              data-testid="button-save-status"
            >
              {updateStatusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingRequest} onOpenChange={(open) => !open && setViewingRequest(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Detalhes do Chamado
            </DialogTitle>
          </DialogHeader>
          {viewingRequest && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{viewingRequest.title}</h3>
                  <StatusBadge status={viewingRequest.status as any} />
                </div>
                {viewingRequest.priority === "alta" && (
                  <Badge variant="destructive" className="text-xs">
                    Prioridade Alta
                  </Badge>
                )}
              </div>

              <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Equipamento</p>
                    <p className="font-medium">{getEquipmentName(viewingRequest.equipmentId)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Data de Abertura</p>
                    <p className="font-medium">
                      {viewingRequest.createdAt 
                        ? new Date(viewingRequest.createdAt).toLocaleString("pt-BR", {
                            dateStyle: "long",
                            timeStyle: "short"
                          }) 
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Descrição do Problema</p>
                <p className="text-sm bg-muted/30 rounded-lg p-3 border">
                  {viewingRequest.description}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Histórico</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm bg-muted/30 rounded-lg p-3 border">
                    <CircleDot className="h-4 w-4 text-blue-500" />
                    <span>Chamado aberto em {viewingRequest.createdAt 
                      ? new Date(viewingRequest.createdAt).toLocaleDateString("pt-BR") 
                      : "-"}</span>
                  </div>
                  {viewingRequest.status === "em andamento" && (
                    <div className="flex items-center gap-2 text-sm bg-muted/30 rounded-lg p-3 border">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span>Em atendimento</span>
                    </div>
                  )}
                  {viewingRequest.status === "concluído" && (
                    <div className="flex items-center gap-2 text-sm bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <span>Chamado concluído</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingRequest(null)}>
              Fechar
            </Button>
            {canUpdateStatus && viewingRequest && (
              <Button 
                onClick={() => {
                  setViewingRequest(null);
                  handleEditStatus(viewingRequest);
                }}
              >
                <Edit className="mr-1 h-4 w-4" />
                Alterar Status
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
