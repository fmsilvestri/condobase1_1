import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Building2, 
  Plus, 
  Pencil, 
  Trash2, 
  UserPlus,
  Check,
  X,
  Loader2,
  Users,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Condominium, User } from "@shared/schema";

const condominiumFormSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  address: z.string().min(5, "Endereço é obrigatório"),
  city: z.string().min(2, "Cidade é obrigatória"),
  state: z.string().min(2, "Estado é obrigatório"),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  totalUnits: z.coerce.number().min(1, "Número de unidades é obrigatório"),
  isActive: z.boolean().default(true),
});

const sindicoFormSchema = z.object({
  email: z.string().email("E-mail inválido"),
  name: z.string().min(2, "Nome é obrigatório"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(),
});

type CondominiumFormData = z.infer<typeof condominiumFormSchema>;
type SindicoFormData = z.infer<typeof sindicoFormSchema>;

export default function PlatformAdmin() {
  const [isCondoDialogOpen, setIsCondoDialogOpen] = useState(false);
  const [isSindicoDialogOpen, setIsSindicoDialogOpen] = useState(false);
  const [editingCondo, setEditingCondo] = useState<Condominium | null>(null);
  const [selectedCondoForSindico, setSelectedCondoForSindico] = useState<Condominium | null>(null);
  const [deletingCondo, setDeletingCondo] = useState<Condominium | null>(null);
  const { toast } = useToast();
  const { userRole } = useAuth();

  const isAdmin = userRole === "admin";

  const { data: condominiums = [], isLoading: loadingCondos } = useQuery<Condominium[]>({
    queryKey: ["/api/admin/condominios"],
    enabled: isAdmin,
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/usuarios"],
    enabled: isAdmin,
  });

  const condoForm = useForm<CondominiumFormData>({
    resolver: zodResolver(condominiumFormSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
      email: "",
      totalUnits: 1,
      isActive: true,
    },
  });

  const sindicoForm = useForm<SindicoFormData>({
    resolver: zodResolver(sindicoFormSchema),
    defaultValues: {
      email: "",
      name: "",
      password: "",
    },
  });

  const createCondoMutation = useMutation({
    mutationFn: async (data: CondominiumFormData) => {
      return apiRequest("POST", "/api/admin/condominios", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/condominios"] });
      toast({ title: "Condomínio criado com sucesso!" });
      handleCloseCondoDialog();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar condomínio", description: error.message, variant: "destructive" });
    },
  });

  const updateCondoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CondominiumFormData> }) => {
      return apiRequest("PATCH", `/api/admin/condominios/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/condominios"] });
      toast({ title: "Condomínio atualizado com sucesso!" });
      handleCloseCondoDialog();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar condomínio", description: error.message, variant: "destructive" });
    },
  });

  const deleteCondoMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/condominios/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/condominios"] });
      toast({ title: "Condomínio removido com sucesso!" });
      setDeletingCondo(null);
    },
    onError: (error: any) => {
      toast({ title: "Erro ao remover condomínio", description: error.message, variant: "destructive" });
    },
  });

  const createSindicoMutation = useMutation({
    mutationFn: async ({ condominiumId, data }: { condominiumId: string; data: SindicoFormData }) => {
      return apiRequest("POST", `/api/admin/condominios/${condominiumId}/sindico`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/usuarios"] });
      toast({ title: "Síndico criado e associado com sucesso!" });
      handleCloseSindicoDialog();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar síndico", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenCondoDialog = (condo?: Condominium) => {
    if (condo) {
      setEditingCondo(condo);
      condoForm.reset({
        name: condo.name,
        address: condo.address ?? "",
        city: condo.city ?? "",
        state: condo.state ?? "",
        zipCode: condo.zipCode ?? "",
        phone: condo.phone ?? "",
        email: condo.email ?? "",
        totalUnits: condo.totalUnits ?? 1,
        isActive: condo.isActive,
      });
    } else {
      setEditingCondo(null);
      condoForm.reset({
        name: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        phone: "",
        email: "",
        totalUnits: 1,
        isActive: true,
      });
    }
    setIsCondoDialogOpen(true);
  };

  const handleCloseCondoDialog = () => {
    setIsCondoDialogOpen(false);
    setEditingCondo(null);
    condoForm.reset();
  };

  const handleOpenSindicoDialog = (condo: Condominium) => {
    setSelectedCondoForSindico(condo);
    sindicoForm.reset({
      email: "",
      name: "",
      password: "",
    });
    setIsSindicoDialogOpen(true);
  };

  const handleCloseSindicoDialog = () => {
    setIsSindicoDialogOpen(false);
    setSelectedCondoForSindico(null);
    sindicoForm.reset();
  };

  const onCondoSubmit = (data: CondominiumFormData) => {
    if (editingCondo) {
      updateCondoMutation.mutate({ id: editingCondo.id, data });
    } else {
      createCondoMutation.mutate(data);
    }
  };

  const onSindicoSubmit = (data: SindicoFormData) => {
    if (selectedCondoForSindico) {
      createSindicoMutation.mutate({ condominiumId: selectedCondoForSindico.id, data });
    }
  };

  const toggleCondoStatus = (condo: Condominium) => {
    updateCondoMutation.mutate({ id: condo.id, data: { isActive: !condo.isActive } });
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Acesso Restrito</h1>
        <p className="text-muted-foreground">
          Esta área é exclusiva para administradores da plataforma.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Painel da Plataforma
          </h1>
          <p className="text-muted-foreground">
            Gerencie condomínios e usuários da plataforma
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Condomínios</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{condominiums.length}</div>
            <p className="text-xs text-muted-foreground">
              {condominiums.filter(c => c.isActive).length} ativos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              {users.filter(u => u.role === "síndico").length} síndicos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unidades Totais</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {condominiums.reduce((acc, c) => acc + (c.totalUnits || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              em todos os condomínios
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="condominios" className="space-y-4">
        <TabsList>
          <TabsTrigger value="condominios" data-testid="tab-condominios">
            <Building2 className="h-4 w-4 mr-2" />
            Condomínios
          </TabsTrigger>
          <TabsTrigger value="usuarios" data-testid="tab-usuarios">
            <Users className="h-4 w-4 mr-2" />
            Usuários
          </TabsTrigger>
        </TabsList>

        <TabsContent value="condominios" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Condomínios Cadastrados</CardTitle>
                <CardDescription>
                  Gerencie os condomínios da plataforma
                </CardDescription>
              </div>
              <Button onClick={() => handleOpenCondoDialog()} data-testid="button-add-condo">
                <Plus className="h-4 w-4 mr-2" />
                Novo Condomínio
              </Button>
            </CardHeader>
            <CardContent>
              {loadingCondos ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : condominiums.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum condomínio cadastrado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cidade/UF</TableHead>
                      <TableHead>Unidades</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {condominiums.map((condo) => (
                      <TableRow key={condo.id} data-testid={`row-condo-${condo.id}`}>
                        <TableCell className="font-medium">{condo.name}</TableCell>
                        <TableCell>{condo.city}/{condo.state}</TableCell>
                        <TableCell>{condo.totalUnits}</TableCell>
                        <TableCell>
                          <Badge variant={condo.isActive ? "default" : "secondary"}>
                            {condo.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleOpenSindicoDialog(condo)}
                              title="Adicionar Síndico"
                              data-testid={`button-add-sindico-${condo.id}`}
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => toggleCondoStatus(condo)}
                              title={condo.isActive ? "Desativar" : "Ativar"}
                              data-testid={`button-toggle-${condo.id}`}
                            >
                              {condo.isActive ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleOpenCondoDialog(condo)}
                              data-testid={`button-edit-condo-${condo.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeletingCondo(condo)}
                              data-testid={`button-delete-condo-${condo.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usuários da Plataforma</CardTitle>
              <CardDescription>
                Visualize todos os usuários cadastrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum usuário cadastrado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "default" : "outline"}>
                            {user.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isCondoDialogOpen} onOpenChange={setIsCondoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCondo ? "Editar Condomínio" : "Novo Condomínio"}
            </DialogTitle>
            <DialogDescription>
              {editingCondo 
                ? "Atualize os dados do condomínio" 
                : "Preencha os dados para cadastrar um novo condomínio"}
            </DialogDescription>
          </DialogHeader>
          <Form {...condoForm}>
            <form onSubmit={condoForm.handleSubmit(onCondoSubmit)} className="space-y-4">
              <FormField
                control={condoForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Condomínio</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Residencial Solar" data-testid="input-condo-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={condoForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Rua, número" data-testid="input-condo-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={condoForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Cidade" data-testid="input-condo-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={condoForm.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="UF" maxLength={2} data-testid="input-condo-state" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={condoForm.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="00000-000" data-testid="input-condo-zip" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={condoForm.control}
                  name="totalUnits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Unidades</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min={1} data-testid="input-condo-units" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={condoForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="(00) 0000-0000" data-testid="input-condo-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={condoForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="contato@condo.com" data-testid="input-condo-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={condoForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-condo-active"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Condomínio Ativo</FormLabel>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseCondoDialog}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createCondoMutation.isPending || updateCondoMutation.isPending}
                  data-testid="button-save-condo"
                >
                  {(createCondoMutation.isPending || updateCondoMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingCondo ? "Salvar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isSindicoDialogOpen} onOpenChange={setIsSindicoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Síndico</DialogTitle>
            <DialogDescription>
              Criar síndico para: <strong>{selectedCondoForSindico?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <Form {...sindicoForm}>
            <form onSubmit={sindicoForm.handleSubmit(onSindicoSubmit)} className="space-y-4">
              <FormField
                control={sindicoForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome do síndico" data-testid="input-sindico-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={sindicoForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="sindico@email.com" data-testid="input-sindico-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={sindicoForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="Senha inicial" data-testid="input-sindico-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseSindicoDialog}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createSindicoMutation.isPending}
                  data-testid="button-save-sindico"
                >
                  {createSindicoMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Criar Síndico
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCondo} onOpenChange={() => setDeletingCondo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o condomínio "{deletingCondo?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCondo && deleteCondoMutation.mutate(deletingCondo.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
