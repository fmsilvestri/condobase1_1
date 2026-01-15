import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Users, 
  Plus, 
  Pencil, 
  Trash2, 
  Shield, 
  ShieldCheck,
  UserCheck,
  UserX,
  Loader2,
  Building2,
  X,
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, Condominium, UserCondominium } from "@shared/schema";
import { userRoles } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

const userFormSchema = z.object({
  email: z.string().email("E-mail inválido"),
  name: z.string().min(2, "Nome é obrigatório"),
  role: z.enum(["condômino", "síndico", "admin"]),
  unit: z.string().optional(),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

type UserFormData = z.infer<typeof userFormSchema>;

export default function Admin() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [managingCondosUser, setManagingCondosUser] = useState<User | null>(null);
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: allCondominiums = [] } = useQuery<Condominium[]>({
    queryKey: ["/api/admin/condominios"],
  });

  const { data: userCondominiums = [], refetch: refetchUserCondos } = useQuery<(UserCondominium & { condominium: Condominium })[]>({
    queryKey: ["/api/users", managingCondosUser?.id, "condominiums"],
    queryFn: async () => {
      if (!managingCondosUser) return [];
      const res = await fetch(`/api/users/${managingCondosUser.id}/condominiums`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!managingCondosUser,
  });

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: "",
      name: "",
      role: "condômino",
      unit: "",
      password: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      return apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Usuário criado com sucesso!" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar usuário", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserFormData> }) => {
      return apiRequest("PATCH", `/api/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Usuário atualizado com sucesso!" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar usuário", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Usuário removido com sucesso!" });
      setDeletingUser(null);
    },
    onError: (error: any) => {
      toast({ title: "Erro ao remover usuário", description: error.message, variant: "destructive" });
    },
  });

  const addCondoMutation = useMutation({
    mutationFn: async ({ userId, condominiumId, role }: { userId: string; condominiumId: string; role: string }) => {
      return apiRequest("POST", "/api/user-condominiums", { userId, condominiumId, role });
    },
    onSuccess: () => {
      refetchUserCondos();
      toast({ title: "Condomínio adicionado com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao adicionar condomínio", description: error.message, variant: "destructive" });
    },
  });

  const removeCondoMutation = useMutation({
    mutationFn: async ({ userId, condominiumId }: { userId: string; condominiumId: string }) => {
      return apiRequest("DELETE", `/api/user-condominiums/${userId}/${condominiumId}`);
    },
    onSuccess: () => {
      refetchUserCondos();
      toast({ title: "Condomínio removido com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao remover condomínio", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenCondosDialog = (user: User) => {
    setManagingCondosUser(user);
  };

  const handleCloseCondosDialog = () => {
    setManagingCondosUser(null);
  };

  const handleToggleCondominium = (condominiumId: string, isAssigned: boolean) => {
    if (!managingCondosUser) return;
    
    if (isAssigned) {
      removeCondoMutation.mutate({ userId: managingCondosUser.id, condominiumId });
    } else {
      const role = managingCondosUser.role === "síndico" ? "síndico" : "condômino";
      addCondoMutation.mutate({ userId: managingCondosUser.id, condominiumId, role });
    }
  };

  const isCondoAssigned = (condominiumId: string): boolean => {
    return userCondominiums.some(uc => uc.condominiumId === condominiumId);
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      form.reset({
        email: user.email,
        name: user.name,
        role: user.role as "condômino" | "síndico" | "admin",
        unit: user.unit || "",
        password: "",
        isActive: user.isActive,
      });
    } else {
      setEditingUser(null);
      form.reset({
        email: "",
        name: "",
        role: "condômino",
        unit: "",
        password: "",
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    form.reset();
  };

  const onSubmit = (data: UserFormData) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleToggleActive = (user: User) => {
    updateMutation.mutate({ id: user.id, data: { isActive: !user.isActive } });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <ShieldCheck className="h-4 w-4" />;
      case "síndico":
        return <Shield className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default";
      case "síndico":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "síndico":
        return "Síndico";
      default:
        return "Condômino";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Painel Administrativo</h1>
          <p className="text-muted-foreground">Gerencie usuários, permissões e configurações do sistema</p>
        </div>
        <Button onClick={() => handleOpenDialog()} data-testid="button-add-user">
          <Plus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-users">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-admin-count">
              {users.filter(u => u.role === "admin").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Síndicos</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-sindico-count">
              {users.filter(u => u.role === "síndico").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-count">
              {users.filter(u => u.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
          <CardDescription>Lista de todos os usuários cadastrados no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum usuário cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.unit || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role) as any} className="gap-1">
                        {getRoleIcon(user.role)}
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={user.isActive}
                          onCheckedChange={() => handleToggleActive(user)}
                          data-testid={`switch-active-${user.id}`}
                        />
                        {user.isActive ? (
                          <span className="text-sm text-green-600 dark:text-green-400">Ativo</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Inativo</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleOpenCondosDialog(user)}
                          data-testid={`button-condos-${user.id}`}
                          title="Gerenciar condomínios"
                        >
                          <Building2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleOpenDialog(user)}
                          data-testid={`button-edit-${user.id}`}
                          title="Editar usuário"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeletingUser(user)}
                          data-testid={`button-delete-${user.id}`}
                          title="Excluir usuário"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Atualize os dados do usuário"
                : "Preencha os dados para criar um novo usuário"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input placeholder="João da Silva" {...field} data-testid="input-user-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="joao@email.com" {...field} data-testid="input-user-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Apt 101, Bloco A" {...field} data-testid="input-user-unit" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Perfil</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-user-role">
                          <SelectValue placeholder="Selecione o perfil" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="condômino">Condômino</SelectItem>
                        <SelectItem value="síndico">Síndico</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{editingUser ? "Nova Senha (deixe vazio para manter)" : "Senha"}</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder={editingUser ? "••••••••" : "Mínimo 6 caracteres"} 
                        {...field} 
                        data-testid="input-user-password" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Usuário Ativo</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Usuários inativos não podem acessar o sistema
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-user-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-user"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingUser ? "Salvar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário "{deletingUser?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingUser && deleteMutation.mutate(deletingUser.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!managingCondosUser} onOpenChange={handleCloseCondosDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Condomínios de {managingCondosUser?.name}
            </DialogTitle>
            <DialogDescription>
              Selecione quais condomínios este usuário pode acessar
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-80 pr-4">
            <div className="space-y-3">
              {allCondominiums.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum condomínio cadastrado
                </p>
              ) : (
                allCondominiums.map((condo) => {
                  const isAssigned = isCondoAssigned(condo.id);
                  const isLoading = addCondoMutation.isPending || removeCondoMutation.isPending;
                  
                  return (
                    <div
                      key={condo.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover-elevate"
                      data-testid={`condo-item-${condo.id}`}
                    >
                      <Checkbox
                        id={`condo-${condo.id}`}
                        checked={isAssigned}
                        disabled={isLoading}
                        onCheckedChange={() => handleToggleCondominium(condo.id, isAssigned)}
                        data-testid={`checkbox-condo-${condo.id}`}
                      />
                      <label
                        htmlFor={`condo-${condo.id}`}
                        className="flex-1 text-sm font-medium cursor-pointer"
                      >
                        {condo.name}
                      </label>
                      {isAssigned && (
                        <Badge variant="secondary" className="text-xs">
                          Vinculado
                        </Badge>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseCondosDialog}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
