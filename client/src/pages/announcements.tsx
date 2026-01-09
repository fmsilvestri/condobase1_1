import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Announcement } from "@shared/schema";

const announcementFormSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  content: z.string().min(1, "Conteúdo é obrigatório"),
  priority: z.string().default("normal"),
  expiresAt: z.string().optional(),
});

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
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

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
    },
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: (data: z.infer<typeof announcementFormSchema>) => {
      const payload = {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined,
      };
      return apiRequest("POST", "/api/announcements", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Comunicado publicado com sucesso!" });
      setIsNewAnnouncementOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Erro ao publicar comunicado", variant: "destructive" });
    },
  });

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

  const filteredAnnouncements = announcements.filter((announcement) =>
    announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    announcement.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("pt-BR", {
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
                        <FormLabel>Conteúdo</FormLabel>
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
        }
      />

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
                      {announcement.createdAt ? formatDate(announcement.createdAt as string) : "-"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {announcement.createdAt ? formatTime(announcement.createdAt as string) : "-"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-edit-${announcement.id}`}>
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
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed" data-testid={`text-announcement-content-${announcement.id}`}>
                  {announcement.content}
                </p>
                {announcement.expiresAt && (
                  <div className="mt-4 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Válido até {formatDate(announcement.expiresAt as string)}
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
