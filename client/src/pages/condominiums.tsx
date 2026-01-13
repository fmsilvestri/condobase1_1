import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Plus, Edit, Trash2, Users, UserPlus } from "lucide-react";
import type { Condominium, InsertCondominium, User, UserCondominium } from "@shared/schema";

export default function Condominiums() {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [selectedCondominium, setSelectedCondominium] = useState<Condominium | null>(null);
  const [formData, setFormData] = useState<Partial<InsertCondominium>>({
    name: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    email: "",
    totalUnits: undefined,
  });
  const [newUserData, setNewUserData] = useState({
    userId: "",
    role: "condômino",
    unit: "",
  });

  const { data: condominiums = [], isLoading } = useQuery<Condominium[]>({
    queryKey: ["/api/condominiums"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: condominiumUsers = [] } = useQuery<(UserCondominium & { user?: User })[]>({
    queryKey: ["/api/condominiums", selectedCondominium?.id, "users"],
    enabled: !!selectedCondominium?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCondominium) => {
      return await apiRequest("/api/condominiums", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/condominiums"] });
      toast({ title: "Condomínio criado com sucesso" });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar condomínio", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertCondominium> }) => {
      return await apiRequest(`/api/condominiums/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/condominiums"] });
      toast({ title: "Condomínio atualizado com sucesso" });
      setIsEditOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar condomínio", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/condominiums/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/condominiums"] });
      toast({ title: "Condomínio excluído com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao excluir condomínio", description: error.message, variant: "destructive" });
    },
  });

  const addUserMutation = useMutation({
    mutationFn: async (data: { userId: string; condominiumId: string; role: string; unit?: string }) => {
      return await apiRequest("/api/user-condominiums", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/condominiums", selectedCondominium?.id, "users"] });
      toast({ title: "Usuário adicionado ao condomínio" });
      setIsAddUserOpen(false);
      setNewUserData({ userId: "", role: "condômino", unit: "" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao adicionar usuário", description: error.message, variant: "destructive" });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async ({ userId, condominiumId }: { userId: string; condominiumId: string }) => {
      return await apiRequest(`/api/user-condominiums/${userId}/${condominiumId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/condominiums", selectedCondominium?.id, "users"] });
      toast({ title: "Usuário removido do condomínio" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao remover usuário", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
      email: "",
      totalUnits: undefined,
    });
    setSelectedCondominium(null);
  };

  const handleEdit = (condominium: Condominium) => {
    setSelectedCondominium(condominium);
    setFormData({
      name: condominium.name,
      address: condominium.address || "",
      city: condominium.city || "",
      state: condominium.state || "",
      zipCode: condominium.zipCode || "",
      phone: condominium.phone || "",
      email: condominium.email || "",
      totalUnits: condominium.totalUnits || undefined,
    });
    setIsEditOpen(true);
  };

  const handleViewUsers = (condominium: Condominium) => {
    setSelectedCondominium(condominium);
    setIsUsersOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCondominium) {
      updateMutation.mutate({ id: selectedCondominium.id, data: formData });
    } else {
      createMutation.mutate(formData as InsertCondominium);
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCondominium && newUserData.userId) {
      addUserMutation.mutate({
        userId: newUserData.userId,
        condominiumId: selectedCondominium.id,
        role: newUserData.role,
        unit: newUserData.unit || undefined,
      });
    }
  };

  if (userRole !== "admin") {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-6">
          <CardContent>
            <p className="text-muted-foreground">Apenas administradores podem gerenciar condomínios.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Condomínios</h1>
            <p className="text-muted-foreground">Gerencie os condomínios do sistema</p>
          </div>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-condominium">
              <Plus className="h-4 w-4 mr-2" />
              Novo Condomínio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar Condomínio</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  data-testid="input-condominium-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    data-testid="input-condominium-city"
                    value={formData.city || ""}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    data-testid="input-condominium-state"
                    value={formData.state || ""}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  data-testid="input-condominium-address"
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    data-testid="input-condominium-phone"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="totalUnits">Total de Unidades</Label>
                  <Input
                    id="totalUnits"
                    type="number"
                    data-testid="input-condominium-units"
                    value={formData.totalUnits || ""}
                    onChange={(e) => setFormData({ ...formData, totalUnits: e.target.value ? parseInt(e.target.value) : undefined })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  data-testid="input-condominium-email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button type="submit" data-testid="button-submit-condominium" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Criando..." : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Condomínios</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : condominiums.length === 0 ? (
            <p className="text-muted-foreground">Nenhum condomínio cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cidade/Estado</TableHead>
                  <TableHead>Unidades</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {condominiums.map((condo) => (
                  <TableRow key={condo.id} data-testid={`row-condominium-${condo.id}`}>
                    <TableCell className="font-medium">{condo.name}</TableCell>
                    <TableCell>{condo.city && condo.state ? `${condo.city}/${condo.state}` : "-"}</TableCell>
                    <TableCell>{condo.totalUnits || "-"}</TableCell>
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
                          onClick={() => handleViewUsers(condo)}
                          data-testid={`button-users-${condo.id}`}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(condo)}
                          data-testid={`button-edit-${condo.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(condo.id)}
                          data-testid={`button-delete-${condo.id}`}
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

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Condomínio</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-city">Cidade</Label>
                <Input
                  id="edit-city"
                  value={formData.city || ""}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-state">Estado</Label>
                <Input
                  id="edit-state"
                  value={formData.state || ""}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-address">Endereço</Label>
              <Input
                id="edit-address"
                value={formData.address || ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-phone">Telefone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-totalUnits">Total de Unidades</Label>
                <Input
                  id="edit-totalUnits"
                  type="number"
                  value={formData.totalUnits || ""}
                  onChange={(e) => setFormData({ ...formData, totalUnits: e.target.value ? parseInt(e.target.value) : undefined })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setIsEditOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isUsersOpen} onOpenChange={setIsUsersOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Usuários - {selectedCondominium?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setIsAddUserOpen(true)} data-testid="button-add-user-to-condominium">
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Usuário
              </Button>
            </div>
            {condominiumUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhum usuário vinculado a este condomínio.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {condominiumUsers.map((uc) => (
                    <TableRow key={uc.id}>
                      <TableCell>{uc.user?.name || "-"}</TableCell>
                      <TableCell>{uc.user?.email || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={uc.role === "síndico" ? "default" : "secondary"}>
                          {uc.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{uc.unit || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => selectedCondominium && removeUserMutation.mutate({ 
                            userId: uc.userId, 
                            condominiumId: selectedCondominium.id 
                          })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Usuário ao Condomínio</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <Label htmlFor="userId">Usuário *</Label>
              <Select
                value={newUserData.userId}
                onValueChange={(value) => setNewUserData({ ...newUserData, userId: value })}
              >
                <SelectTrigger data-testid="select-user">
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter(u => !condominiumUsers.some(cu => cu.userId === u.id))
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="role">Função *</Label>
              <Select
                value={newUserData.role}
                onValueChange={(value) => setNewUserData({ ...newUserData, role: value })}
              >
                <SelectTrigger data-testid="select-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="condômino">Condômino</SelectItem>
                  <SelectItem value="síndico">Síndico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="unit">Unidade</Label>
              <Input
                id="unit"
                data-testid="input-user-unit"
                value={newUserData.unit}
                onChange={(e) => setNewUserData({ ...newUserData, unit: e.target.value })}
                placeholder="Ex: Bloco A, Apto 101"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddUserOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" data-testid="button-confirm-add-user" disabled={addUserMutation.isPending}>
                {addUserMutation.isPending ? "Adicionando..." : "Adicionar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
