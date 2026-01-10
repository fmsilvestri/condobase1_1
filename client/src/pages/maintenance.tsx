import { useState } from "react";
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
} from "lucide-react";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { equipmentCategories, type Equipment, type MaintenanceRequest } from "@shared/schema";

const equipmentFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  location: z.string().min(1, "Localização é obrigatória"),
  description: z.string().optional(),
  status: z.string().default("operacional"),
});

const requestFormSchema = z.object({
  equipmentId: z.string().min(1, "Equipamento é obrigatório"),
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  priority: z.string().optional().default("normal"),
  status: z.string().optional().default("aberto"),
});

export default function Maintenance() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isNewEquipmentOpen, setIsNewEquipmentOpen] = useState(false);
  const { toast } = useToast();
  const { canEdit, userId } = useAuth();

  const { data: equipment = [], isLoading: loadingEquipment } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment"],
  });

  const { data: requests = [], isLoading: loadingRequests } = useQuery<MaintenanceRequest[]>({
    queryKey: ["/api/maintenance"],
  });

  const equipmentForm = useForm<z.infer<typeof equipmentFormSchema>>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: {
      name: "",
      category: "",
      location: "",
      description: "",
      status: "operacional",
    },
  });

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

  const createEquipmentMutation = useMutation({
    mutationFn: (data: z.infer<typeof equipmentFormSchema>) =>
      apiRequest("POST", "/api/equipment", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Equipamento cadastrado com sucesso!" });
      setIsNewEquipmentOpen(false);
      equipmentForm.reset();
    },
    onError: () => {
      toast({ title: "Erro ao cadastrar equipamento", variant: "destructive" });
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data: z.infer<typeof requestFormSchema>) => {
      console.log("[maintenance] Submitting request:", data, "userId:", userId);
      return apiRequest("POST", "/api/maintenance", {
        ...data,
        requestedBy: userId || null,
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

  const canEditRequest = (request: MaintenanceRequest) => {
    if (canEdit) return true;
    return request.requestedBy === userId;
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
      `Olá! Gostaria de solicitar manutenção para:\n\nEquipamento: ${equipmentName}\nDescrição: ${description}`
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
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsNewEquipmentOpen(false)}>
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
              {filteredEquipment.map((eq) => (
                <Card key={eq.id} className="hover-elevate" data-testid={`equipment-card-${eq.id}`}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base" data-testid={`text-equipment-name-${eq.id}`}>{eq.name}</CardTitle>
                      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {eq.location}
                      </div>
                    </div>
                    <StatusBadge status={eq.status as any} size="sm" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {eq.category.charAt(0).toUpperCase() + eq.category.slice(1)}
                      </Badge>
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
                  </CardContent>
                </Card>
              ))}
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
                        <Button variant="outline" size="sm" data-testid={`button-view-${req.id}`}>
                          Ver Detalhes
                        </Button>
                        {canEditRequest(req) && (
                          <Button variant="outline" size="sm" data-testid={`button-edit-request-${req.id}`}>
                            Editar
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
      </Tabs>
    </div>
  );
}
