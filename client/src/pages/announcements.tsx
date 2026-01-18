import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Megaphone,
  Plus,
  Calendar,
  Clock,
  AlertTriangle,
  Search,
  Edit,
  Trash2,
  Loader2,
  Smile,
  Paperclip,
  X,
  Share2,
  MessageCircle,
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
  DialogTrigger,
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
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useCondominium } from "@/hooks/use-condominium";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Announcement, Condominium } from "@shared/schema";

const announcementFormSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  content: z.string().min(1, "Conteúdo é obrigatório"),
  priority: z.string().default("normal"),
  expiresAt: z.string().optional(),
  photos: z.array(z.string()).optional(),
});

const commonEmojis = ["📢", "⚠️", "🔧", "🎉", "📅", "🧹", "💧", "⚡", "🔥", "🏠", "🤝", "💡"];

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "alta":
      return "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400";
    case "normal":
      return "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "baixa":
      return "border-gray-500/30 bg-gray-500/10 text-gray-600 dark:text-gray-400";
    default:
      return "";
  }
};

export default function Announcements() {
  const [isNewAnnouncementOpen, setIsNewAnnouncementOpen] = useState(false);
  const [isEditAnnouncementOpen, setIsEditAnnouncementOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [announcementPhotos, setAnnouncementPhotos] = useState<string[]>([]);
  const { toast } = useToast();
  const { canEdit } = useAuth();
  const { selectedCondominium } = useCondominium();

  const shareViaWhatsApp = (announcement: Announcement) => {
    const condoName = selectedCondominium?.name || "Condomínio";
    const priorityText = announcement.priority === "alta" ? "URGENTE: " : "";
    
    const message = `${priorityText}*${condoName}*\n\n*${announcement.title}*\n\n${announcement.content}`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    window.open(whatsappUrl, "_blank");
    toast({ title: "Abrindo WhatsApp para compartilhar..." });
  };

  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
  });

  const form = useForm<z.infer<typeof announcementFormSchema>>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: {
      title: "",
      content: "",
      priority: "normal",
      expiresAt: "",
      photos: [],
    },
  });

  const editForm = useForm<z.infer<typeof announcementFormSchema>>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: {
      title: "",
      content: "",
      priority: "normal",
      expiresAt: "",
      photos: [],
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: "Máximo 5MB", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAnnouncementPhotos(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index: number) => {
    setAnnouncementPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const addEmoji = (emoji: string, isEdit = false) => {
    const currentForm = isEdit ? editForm : form;
    const currentContent = currentForm.getValues("content") || "";
    currentForm.setValue("content", currentContent + emoji);
  };

  const createAnnouncementMutation = useMutation({
    mutationFn: (data: z.infer<typeof announcementFormSchema>) => {
      const payload = {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined,
        photos: announcementPhotos,
      };
      return apiRequest("POST", "/api/announcements", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Comunicado publicado com sucesso!" });
      setIsNewAnnouncementOpen(false);
      setAnnouncementPhotos([]);
      form.reset();
    },
    onError: () => {
      toast({ title: "Erro ao publicar comunicado", variant: "destructive" });
    },
  });

  const updateAnnouncementMutation = useMutation({
    mutationFn: (data: z.infer<typeof announcementFormSchema> & { id: string }) => {
      const { id, ...rest } = data;
      const payload = {
        ...rest,
        expiresAt: rest.expiresAt ? new Date(rest.expiresAt).toISOString() : undefined,
        photos: announcementPhotos,
      };
      return apiRequest("PATCH", `/api/announcements/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Comunicado atualizado com sucesso!" });
      setIsEditAnnouncementOpen(false);
      setEditingAnnouncement(null);
      setAnnouncementPhotos([]);
      editForm.reset();
    },
    onError: () => {
      toast({ title: "Erro ao atualizar comunicado", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (editingAnnouncement) {
      editForm.reset({
        title: editingAnnouncement.title,
        content: editingAnnouncement.content,
        priority: editingAnnouncement.priority,
        expiresAt: editingAnnouncement.expiresAt 
          ? new Date(editingAnnouncement.expiresAt).toISOString().split('T')[0] 
          : "",
      });
      setAnnouncementPhotos(editingAnnouncement.photos || []);
    }
  }, [editingAnnouncement, editForm]);

  const deleteAnnouncementMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/announcements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Comunicado removido com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao remover comunicado", variant: "destructive" });
    },
  });

  const handleEditClick = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setIsEditAnnouncementOpen(true);
  };

  const handleEditSubmit = (data: z.infer<typeof announcementFormSchema>) => {
    if (editingAnnouncement) {
      updateAnnouncementMutation.mutate({ ...data, id: editingAnnouncement.id });
    }
  };

  const filteredAnnouncements = announcements.filter((announcement) =>
    announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    announcement.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateValue: string | Date | null) => {
    if (!dateValue) return "-";
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (dateValue: string | Date | null) => {
    if (!dateValue) return "-";
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comunicados"
        description="Avisos e comunicados para os condôminos"
        backHref="/"
        actions={
          canEdit && (
            <Dialog open={isNewAnnouncementOpen} onOpenChange={setIsNewAnnouncementOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-announcement">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Comunicado
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Criar Comunicado</DialogTitle>
                  <DialogDescription>
                    Crie um novo comunicado para os condôminos.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => createAnnouncementMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Manutenção programada" {...field} data-testid="input-announcement-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prioridade</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-announcement-priority">
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
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Conteúdo</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 px-2">
                                  <Smile className="h-4 w-4 mr-1" />
                                  Emojis
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-2" align="end">
                                <div className="grid grid-cols-6 gap-2">
                                  {commonEmojis.map(emoji => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => addEmoji(emoji)}
                                      className="text-xl hover:bg-muted p-1 rounded"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <FormControl>
                            <Textarea
                              placeholder="Digite o conteúdo do comunicado..."
                              className="min-h-[150px]"
                              {...field}
                              data-testid="input-announcement-content"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />
                        Anexar Fotos / Arquivos
                      </Label>
                      <Input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => handlePhotoChange(e)}
                        data-testid="input-announcement-file"
                      />
                      {announcementPhotos.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          {announcementPhotos.map((photo, index) => (
                            <div key={index} className="relative group rounded-md overflow-hidden border">
                              <img src={photo} alt="Preview" className="w-full h-16 object-cover" />
                              <button
                                type="button"
                                onClick={() => removePhoto(index)}
                                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <FormField
                      control={form.control}
                      name="expiresAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Expiração (opcional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-announcement-expires" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsNewAnnouncementOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createAnnouncementMutation.isPending} data-testid="button-save-announcement">
                        {createAnnouncementMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Publicar
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      {/* Edit Dialog */}
      <Dialog open={isEditAnnouncementOpen} onOpenChange={(open) => {
        setIsEditAnnouncementOpen(open);
        if (!open) setEditingAnnouncement(null);
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Comunicado</DialogTitle>
            <DialogDescription>
              Atualize as informações do comunicado.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Manutenção programada" {...field} data-testid="input-edit-announcement-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-announcement-priority">
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
                  control={editForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Conteúdo</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 px-2">
                              <Smile className="h-4 w-4 mr-1" />
                              Emojis
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-2" align="end">
                            <div className="grid grid-cols-6 gap-2">
                              {commonEmojis.map(emoji => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => addEmoji(emoji, true)}
                                  className="text-xl hover:bg-muted p-1 rounded"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <FormControl>
                        <Textarea
                          placeholder="Digite o conteúdo do comunicado..."
                          className="min-h-[150px]"
                          {...field}
                          data-testid="input-edit-announcement-content"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Anexar Fotos / Arquivos
                  </Label>
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handlePhotoChange(e, true)}
                    data-testid="input-edit-announcement-file"
                  />
                  {announcementPhotos.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {announcementPhotos.map((photo, index) => (
                        <div key={index} className="relative group rounded-md overflow-hidden border">
                          <img src={photo} alt="Preview" className="w-full h-16 object-cover" />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              <FormField
                control={editForm.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Expiração (opcional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-edit-announcement-expires" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsEditAnnouncementOpen(false);
                  setEditingAnnouncement(null);
                }}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateAnnouncementMutation.isPending} data-testid="button-update-announcement">
                  {updateAnnouncementMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar comunicado..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
          data-testid="input-search-announcement"
        />
      </div>

      {filteredAnnouncements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Nenhum comunicado encontrado"
          description="Crie comunicados para manter os condôminos informados."
          action={{
            label: "Criar Comunicado",
            onClick: () => setIsNewAnnouncementOpen(true),
          }}
        />
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((announcement) => (
            <Card
              key={announcement.id}
              className={`hover-elevate ${
                announcement.priority === "alta" ? "border-l-4 border-l-red-500" : ""
              }`}
              data-testid={`announcement-card-${announcement.id}`}
            >
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg" data-testid={`text-announcement-title-${announcement.id}`}>
                      {announcement.title}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={getPriorityColor(announcement.priority)}
                    >
                      {announcement.priority === "alta" && (
                        <AlertTriangle className="mr-1 h-3 w-3" />
                      )}
                      {announcement.priority.charAt(0).toUpperCase() +
                        announcement.priority.slice(1)}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(announcement.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(announcement.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-green-600 hover:text-green-700"
                    onClick={() => shareViaWhatsApp(announcement)}
                    title="Enviar via WhatsApp"
                    data-testid={`button-whatsapp-${announcement.id}`}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  {canEdit && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={() => handleEditClick(announcement)}
                        data-testid={`button-edit-${announcement.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteAnnouncementMutation.mutate(announcement.id)}
                        disabled={deleteAnnouncementMutation.isPending}
                        data-testid={`button-delete-${announcement.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed" data-testid={`text-announcement-content-${announcement.id}`}>
                  {announcement.content}
                </p>
                {announcement.photos && announcement.photos.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {announcement.photos.map((photo, idx) => (
                      <div key={idx} className="rounded-md overflow-hidden border aspect-video">
                        <img src={photo} alt="Anexo" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
                {announcement.expiresAt && (
                  <div className="mt-4 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Válido até {formatDate(announcement.expiresAt)}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
