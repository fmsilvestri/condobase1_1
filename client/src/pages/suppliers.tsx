import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Truck,
  Plus,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Search,
  Filter,
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
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { equipmentCategories, type Supplier } from "@shared/schema";

const supplierFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export default function Suppliers() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { toast } = useToast();
  const { canEdit } = useAuth();

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const form = useForm<z.infer<typeof supplierFormSchema>>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      category: "",
      phone: "",
      whatsapp: "",
      email: "",
      address: "",
      notes: "",
    },
  });

  const createSupplierMutation = useMutation({
    mutationFn: (data: z.infer<typeof supplierFormSchema>) =>
      apiRequest("POST", "/api/suppliers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "Fornecedor cadastrado com sucesso!" });
      handleCloseDialog();
    },
    onError: () => {
      toast({ title: "Erro ao cadastrar fornecedor", variant: "destructive" });
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: (data: z.infer<typeof supplierFormSchema> & { id: string }) =>
      apiRequest("PATCH", `/api/suppliers/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "Fornecedor atualizado com sucesso!" });
      handleCloseDialog();
    },
    onError: () => {
      toast({ title: "Erro ao atualizar fornecedor", variant: "destructive" });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSupplier(null);
    form.reset();
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    form.reset({
      name: supplier.name,
      category: supplier.category,
      phone: supplier.phone || "",
      whatsapp: supplier.whatsapp || "",
      email: supplier.email || "",
      address: supplier.address || "",
      notes: supplier.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleNewSupplier = () => {
    setEditingSupplier(null);
    form.reset({
      name: "",
      category: "",
      phone: "",
      whatsapp: "",
      email: "",
      address: "",
      notes: "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: z.infer<typeof supplierFormSchema>) => {
    if (editingSupplier) {
      updateSupplierMutation.mutate({ ...data, id: editingSupplier.id });
    } else {
      createSupplierMutation.mutate(data);
    }
  };

  const deleteSupplierMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "Fornecedor removido com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao remover fornecedor", variant: "destructive" });
    },
  });

  const filteredSuppliers = suppliers.filter((supplier) => {
    const matchesSearch =
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || supplier.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleWhatsApp = (whatsapp: string, name: string) => {
    const message = encodeURIComponent(
      `Olá ${name}! Gostaria de solicitar um orçamento.`
    );
    window.open(`https://wa.me/${whatsapp}?text=${message}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fornecedores"
        description="Cadastro de fornecedores e prestadores de serviço"
        backHref="/"
        actions={
          canEdit && (
            <>
              <Button onClick={handleNewSupplier} data-testid="button-new-supplier">
                <Plus className="mr-2 h-4 w-4" />
                Novo Fornecedor
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingSupplier ? "Editar Fornecedor" : "Cadastrar Fornecedor"}</DialogTitle>
                  <DialogDescription>
                    {editingSupplier ? "Atualize os dados do fornecedor." : "Adicione um novo fornecedor ou prestador de serviço."}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome / Empresa</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: ElevaTec Manutenção" {...field} data-testid="input-supplier-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-supplier-category">
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
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                              <Input placeholder="(48) 3333-1111" {...field} data-testid="input-supplier-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="whatsapp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>WhatsApp</FormLabel>
                            <FormControl>
                              <Input placeholder="5548999991111" {...field} data-testid="input-supplier-whatsapp" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="contato@empresa.com.br" {...field} data-testid="input-supplier-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço</FormLabel>
                          <FormControl>
                            <Input placeholder="Rua, número, bairro" {...field} data-testid="input-supplier-address" />
                          </FormControl>
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
                            <Textarea placeholder="Observações adicionais..." {...field} data-testid="input-supplier-notes" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={handleCloseDialog}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createSupplierMutation.isPending || updateSupplierMutation.isPending} data-testid="button-save-supplier">
                        {(createSupplierMutation.isPending || updateSupplierMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingSupplier ? "Atualizar" : "Salvar"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            </>
          )
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar fornecedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-supplier"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="filter-supplier-category">
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

      {filteredSuppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Nenhum fornecedor encontrado"
          description="Cadastre fornecedores para facilitar a gestão de manutenções."
          action={{
            label: "Cadastrar Fornecedor",
            onClick: handleNewSupplier,
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSuppliers.map((supplier) => (
            <Card key={supplier.id} className="hover-elevate" data-testid={`supplier-card-${supplier.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base" data-testid={`text-supplier-name-${supplier.id}`}>{supplier.name}</CardTitle>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {supplier.category.charAt(0).toUpperCase() + supplier.category.slice(1)}
                  </Badge>
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditSupplier(supplier)} data-testid={`button-edit-${supplier.id}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteSupplierMutation.mutate(supplier.id)}
                      disabled={deleteSupplierMutation.isPending}
                      data-testid={`button-delete-${supplier.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span data-testid={`text-supplier-phone-${supplier.id}`}>{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span className="truncate" data-testid={`text-supplier-email-${supplier.id}`}>{supplier.email}</span>
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate">{supplier.address}</span>
                    </div>
                  )}
                </div>
                {supplier.whatsapp && (
                  <Button
                    className="mt-4 w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleWhatsApp(supplier.whatsapp!, supplier.name)}
                    data-testid={`button-whatsapp-${supplier.id}`}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Contatar via WhatsApp
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
