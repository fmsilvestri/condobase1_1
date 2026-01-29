import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ShieldCheck,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Phone,
  Mail,
  Search,
  Loader2,
  FileText,
  Building2,
  Pencil,
  Upload,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { queryClient, apiRequest, getAuthHeaders } from "@/lib/queryClient";

const insuranceSchema = z.object({
  policyNumber: z.string().min(1, "Número da apólice é obrigatório"),
  insuranceCompany: z.string().min(1, "Seguradora é obrigatória"),
  coverageType: z.string(),
  coverageAmount: z.coerce.number().positive("Valor de cobertura deve ser positivo"),
  premium: z.coerce.number().positive("Prêmio deve ser positivo"),
  startDate: z.string(),
  endDate: z.string(),
  broker: z.string().optional(),
  brokerPhone: z.string().optional(),
});

type InsuranceFormData = z.infer<typeof insuranceSchema>;

interface InsurancePolicy {
  id: string;
  policyNumber: string;
  insuranceCompany: string;
  coverageType: string;
  coverageAmount: number;
  premium: number;
  startDate: string;
  endDate: string;
  broker: string | null;
  brokerPhone: string | null;
  brokerEmail: string | null;
  documentUrl: string | null;
  status: string;
  daysUntilExpiry: number;
}

const coverageTypeLabels: Record<string, string> = {
  incendio: "Incêndio",
  responsabilidade_civil: "Responsabilidade Civil",
  danos_eletricos: "Danos Elétricos",
  vendaval: "Vendaval / Granizo",
  roubo: "Roubo / Furto",
  alagamento: "Alagamento",
  vida_sindico: "Vida do Síndico",
  condominio_completo: "Condomínio Completo",
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  ativo: { label: "Ativo", color: "emerald", icon: CheckCircle2 },
  vencido: { label: "Vencido", color: "red", icon: AlertTriangle },
  cancelado: { label: "Cancelado", color: "gray", icon: null },
};

export default function Insurance() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingPolicy, setEditingPolicy] = useState<InsurancePolicy | null>(null);
  const [pendingDocumentUrl, setPendingDocumentUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const form = useForm<InsuranceFormData>({
    resolver: zodResolver(insuranceSchema),
    defaultValues: {
      policyNumber: "",
      insuranceCompany: "",
      coverageType: "incendio",
      coverageAmount: 0,
      premium: 0,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    },
  });

  const createInsurance = useMutation({
    mutationFn: async (data: InsuranceFormData) => {
      return apiRequest("POST", "/api/insurance/policies", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insurance/policies"] });
      handleCloseDialog();
      toast({ title: "Seguro cadastrado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao cadastrar seguro", variant: "destructive" });
    },
  });

  const updateInsurance = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsuranceFormData }) => {
      return apiRequest("PATCH", `/api/insurance/policies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insurance/policies"] });
      handleCloseDialog();
      toast({ title: "Seguro atualizado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar seguro", variant: "destructive" });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPolicy(null);
    setPendingDocumentUrl(null);
    form.reset({
      policyNumber: "",
      insuranceCompany: "",
      coverageType: "incendio",
      coverageAmount: 0,
      premium: 0,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      broker: "",
      brokerPhone: "",
    });
  };

  const handleEditPolicy = (policy: InsurancePolicy) => {
    setEditingPolicy(policy);
    setPendingDocumentUrl(policy.documentUrl);
    form.reset({
      policyNumber: policy.policyNumber,
      insuranceCompany: policy.insuranceCompany,
      coverageType: policy.coverageType,
      coverageAmount: policy.coverageAmount,
      premium: policy.premium,
      startDate: policy.startDate ? new Date(policy.startDate).toISOString().split("T")[0] : "",
      endDate: policy.endDate ? new Date(policy.endDate).toISOString().split("T")[0] : "",
      broker: policy.broker || "",
      brokerPhone: policy.brokerPhone || "",
    });
    setIsDialogOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Tipo de arquivo não permitido. Use PDF, JPG ou PNG.", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande. Máximo 10MB.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const authHeaders = getAuthHeaders();
      const response = await fetch("/api/insurance/upload-document", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: authHeaders,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const { documentUrl } = await response.json();
      setPendingDocumentUrl(documentUrl);
      toast({ title: "Documento enviado com sucesso" });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({ title: error.message || "Erro ao enviar documento", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = (data: InsuranceFormData) => {
    const payload = { ...data, documentUrl: pendingDocumentUrl };
    if (editingPolicy) {
      updateInsurance.mutate({ id: editingPolicy.id, data: payload as any });
    } else {
      createInsurance.mutate(payload as any);
    }
  };

  const { data: policiesData = [], isLoading } = useQuery<InsurancePolicy[]>({
    queryKey: ["/api/insurance/policies"],
  });

  const policies = policiesData.map((p) => ({
    ...p,
    daysUntilExpiry: p.endDate ? Math.ceil((new Date(p.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0,
  }));

  const filteredPolicies = policies.filter(
    (p) =>
      p.policyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.insuranceCompany.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coverageTypeLabels[p.coverageType]?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: policies.length,
    active: policies.filter((p) => p.status === "ativo").length,
    expiringSoon: policies.filter((p) => p.daysUntilExpiry > 0 && p.daysUntilExpiry <= 60).length,
    totalCoverage: policies.filter((p) => p.status === "ativo").reduce((sum, p) => sum + p.coverageAmount, 0),
    totalPremium: policies.filter((p) => p.status === "ativo").reduce((sum, p) => sum + p.premium, 0),
  };

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Seguros"
        description="Gestão de apólices e coberturas"
        icon={ShieldCheck}
        iconColor="indigo"
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Apólices Ativas</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vencendo em 60 dias</p>
                <p className="text-2xl font-bold text-amber-600">{stats.expiringSoon}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cobertura Total</p>
                <p className="text-lg font-bold">R$ {(stats.totalCoverage / 1000000).toFixed(1)}M</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <ShieldCheck className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Prêmio Anual</p>
                <p className="text-lg font-bold">R$ {stats.totalPremium.toLocaleString()}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <DollarSign className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar apólices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); else setIsDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-insurance">
              <Plus className="h-4 w-4 mr-2" />
              Nova Apólice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingPolicy ? "Editar Apólice de Seguro" : "Cadastrar Apólice de Seguro"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="policyNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nº da Apólice</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="POL-2024-XXXXX" data-testid="input-policy-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="insuranceCompany"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seguradora</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Porto Seguro" data-testid="input-company" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="coverageType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Cobertura</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-coverage">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(coverageTypeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="coverageAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor da Cobertura (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} placeholder="0" data-testid="input-coverage" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="premium"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prêmio Anual (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} placeholder="0" data-testid="input-premium" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Início da Vigência</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-start-date" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fim da Vigência</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-end-date" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="broker"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Corretor</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome do corretor" data-testid="input-broker" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="brokerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(00) 00000-0000" data-testid="input-broker-phone" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel>Documento da Apólice</FormLabel>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="cursor-pointer"
                        data-testid="input-document"
                      />
                    </div>
                    {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                  {pendingDocumentUrl && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4 text-emerald-500" />
                      <span>Documento anexado</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(pendingDocumentUrl, "_blank")}
                        data-testid="button-view-document"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Visualizar
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => setPendingDocumentUrl(null)}
                        data-testid="button-remove-document"
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">PDF, JPG ou PNG (máx. 10MB)</p>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createInsurance.isPending || updateInsurance.isPending || isUploading} data-testid="button-submit">
                    {(createInsurance.isPending || updateInsurance.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingPolicy ? "Salvar" : "Cadastrar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="h-[calc(100vh-400px)]">
        <div className="space-y-3 pr-4">
          {filteredPolicies.map((policy) => {
            const status = statusConfig[policy.status] || statusConfig.ativo;
            const StatusIcon = status.icon;
            const isExpiringSoon = policy.daysUntilExpiry > 0 && policy.daysUntilExpiry <= 60;

            return (
              <Card 
                key={policy.id} 
                className={`hover-elevate ${isExpiringSoon ? "border-amber-500/50" : ""}`}
                data-testid={`policy-${policy.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm">
                          {coverageTypeLabels[policy.coverageType] || policy.coverageType}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {policy.policyNumber}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Building2 className="h-3 w-3" />
                        <span>{policy.insuranceCompany}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Cobertura</p>
                          <p className="text-sm font-medium">R$ {policy.coverageAmount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Prêmio</p>
                          <p className="text-sm font-medium">R$ {policy.premium.toLocaleString()}/ano</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Vigência</p>
                          <p className="text-sm">
                            {new Date(policy.startDate).toLocaleDateString("pt-BR")} - {new Date(policy.endDate).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        {policy.broker && (
                          <div>
                            <p className="text-xs text-muted-foreground">Corretor</p>
                            <p className="text-sm">{policy.broker}</p>
                            {policy.brokerPhone && (
                              <p className="text-xs text-muted-foreground">{policy.brokerPhone}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        {policy.documentUrl && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => window.open(policy.documentUrl!, "_blank")}
                            title="Ver documento da apólice"
                            data-testid={`button-document-${policy.id}`}
                          >
                            <FileText className="h-4 w-4 text-blue-500" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEditPolicy(policy)}
                          data-testid={`button-edit-${policy.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Badge className={`bg-${status.color}-500/10 text-${status.color}-600 border-${status.color}-500/20`}>
                          {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                          {status.label}
                        </Badge>
                      </div>
                      {isExpiringSoon && (
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Vence em {policy.daysUntilExpiry} dias
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
