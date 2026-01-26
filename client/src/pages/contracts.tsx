import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ScrollText,
  Plus,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Star,
  Search,
  Filter,
  Loader2,
  Building2,
  Phone,
  Mail,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { queryClient, apiRequest } from "@/lib/queryClient";

const contractSchema = z.object({
  title: z.string().min(3, "Título é obrigatório"),
  category: z.string(),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  monthlyValue: z.coerce.number().optional(),
  slaDescription: z.string().optional(),
  status: z.string(),
});

type ContractFormData = z.infer<typeof contractSchema>;

interface Contract {
  id: string;
  title: string;
  category: string;
  description: string | null;
  supplierName: string;
  startDate: string;
  endDate: string;
  monthlyValue: number | null;
  status: string;
  slaDescription: string | null;
  adjustmentIndex: string | null;
  daysUntilExpiry: number;
}

interface SupplierEvaluation {
  id: string;
  supplierName: string;
  overallScore: number;
  qualityScore: number;
  punctualityScore: number;
  priceScore: number;
  communicationScore: number;
  evaluationDate: string;
  wouldRecommend: boolean;
}

const categoryLabels: Record<string, string> = {
  manutencao: "Manutenção",
  seguranca: "Segurança",
  limpeza: "Limpeza",
  portaria: "Portaria",
  elevadores: "Elevadores",
  piscina: "Piscina",
  jardinagem: "Jardinagem",
  administrativo: "Administrativo",
  outros: "Outros",
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  ativo: { label: "Ativo", color: "emerald", icon: CheckCircle2 },
  vencido: { label: "Vencido", color: "red", icon: XCircle },
  renovado: { label: "Renovado", color: "blue", icon: CheckCircle2 },
  cancelado: { label: "Cancelado", color: "gray", icon: XCircle },
};

function StarRating({ score, size = "sm" }: { score: number; size?: "sm" | "md" }) {
  const stars = [];
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Star
        key={i}
        className={`${iconSize} ${i <= score ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
      />
    );
  }
  return <div className="flex gap-0.5">{stars}</div>;
}

export default function Contracts() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      title: "",
      category: "manutencao",
      description: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "ativo",
    },
  });

  const createContract = useMutation({
    mutationFn: async (data: ContractFormData) => {
      return apiRequest("/api/contracts", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Contrato cadastrado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao cadastrar contrato", variant: "destructive" });
    },
  });

  const onSubmit = (data: ContractFormData) => {
    createContract.mutate(data);
  };

  const mockContracts: Contract[] = [
    {
      id: "1",
      title: "Manutenção de Elevadores",
      category: "elevadores",
      description: "Manutenção preventiva mensal",
      supplierName: "ElevaTec Manutenção",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      monthlyValue: 2800,
      status: "ativo",
      slaDescription: "Atendimento em até 4 horas para emergências",
      adjustmentIndex: "IGPM",
      daysUntilExpiry: 320,
    },
    {
      id: "2",
      title: "Vigilância 24h",
      category: "seguranca",
      description: "Serviço de vigilância armada",
      supplierName: "SecureMax Segurança",
      startDate: "2023-06-01",
      endDate: "2024-05-31",
      monthlyValue: 12500,
      status: "ativo",
      slaDescription: "Resposta imediata a ocorrências",
      adjustmentIndex: "IPCA",
      daysUntilExpiry: 45,
    },
    {
      id: "3",
      title: "Limpeza e Conservação",
      category: "limpeza",
      description: "Limpeza áreas comuns",
      supplierName: "LimpMax Serviços",
      startDate: "2024-02-01",
      endDate: "2025-01-31",
      monthlyValue: 8200,
      status: "ativo",
      slaDescription: "Equipe fixa de 3 funcionários",
      adjustmentIndex: "INPC",
      daysUntilExpiry: 365,
    },
    {
      id: "4",
      title: "Manutenção Piscina",
      category: "piscina",
      description: "Tratamento e limpeza",
      supplierName: "AquaClean",
      startDate: "2023-01-01",
      endDate: "2023-12-31",
      monthlyValue: 1500,
      status: "vencido",
      slaDescription: "Visitas 3x por semana",
      adjustmentIndex: "IGPM",
      daysUntilExpiry: -30,
    },
  ];

  const mockEvaluations: SupplierEvaluation[] = [
    {
      id: "1",
      supplierName: "ElevaTec Manutenção",
      overallScore: 4.5,
      qualityScore: 5,
      punctualityScore: 4,
      priceScore: 4,
      communicationScore: 5,
      evaluationDate: "2024-01-15",
      wouldRecommend: true,
    },
    {
      id: "2",
      supplierName: "SecureMax Segurança",
      overallScore: 4.0,
      qualityScore: 4,
      punctualityScore: 4,
      priceScore: 3,
      communicationScore: 5,
      evaluationDate: "2024-01-10",
      wouldRecommend: true,
    },
    {
      id: "3",
      supplierName: "LimpMax Serviços",
      overallScore: 3.5,
      qualityScore: 4,
      punctualityScore: 3,
      priceScore: 4,
      communicationScore: 3,
      evaluationDate: "2024-01-08",
      wouldRecommend: false,
    },
  ];

  const contracts = mockContracts;
  const evaluations = mockEvaluations;

  const filteredContracts = contracts.filter(
    (c) =>
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: contracts.length,
    active: contracts.filter((c) => c.status === "ativo").length,
    expiringSoon: contracts.filter((c) => c.daysUntilExpiry > 0 && c.daysUntilExpiry <= 60).length,
    expired: contracts.filter((c) => c.status === "vencido" || c.daysUntilExpiry <= 0).length,
    monthlyTotal: contracts.filter((c) => c.status === "ativo").reduce((sum, c) => sum + (c.monthlyValue || 0), 0),
  };

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Contratos e Fornecedores"
        description="Gestão de contratos, SLAs e avaliações"
        icon={ScrollText}
        iconColor="purple"
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <ScrollText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expiringSoon}</p>
                <p className="text-xs text-muted-foreground">Vencendo</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expired}</p>
                <p className="text-xs text-muted-foreground">Vencidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <DollarSign className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-lg font-bold">R$ {stats.monthlyTotal.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Mensal</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="contracts" className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <TabsList>
            <TabsTrigger value="contracts" data-testid="tab-contracts">
              <ScrollText className="h-4 w-4 mr-2" />
              Contratos
            </TabsTrigger>
            <TabsTrigger value="evaluations" data-testid="tab-evaluations">
              <Star className="h-4 w-4 mr-2" />
              Avaliações
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar contratos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-contract">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Contrato
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Cadastrar Contrato</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título do Contrato</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: Manutenção de Elevadores" data-testid="input-title" />
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(categoryLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Descreva o escopo do contrato..." data-testid="input-description" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Início</FormLabel>
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
                            <FormLabel>Término</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-end-date" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="monthlyValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor Mensal (R$)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} placeholder="0.00" data-testid="input-value" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="slaDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SLA / Nível de Serviço</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: Atendimento em até 4 horas" data-testid="input-sla" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createContract.isPending} data-testid="button-submit">
                        {createContract.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Cadastrar
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="contracts" className="space-y-4">
          <ScrollArea className="h-[calc(100vh-450px)]">
            <div className="space-y-3 pr-4">
              {filteredContracts.map((contract) => {
                const status = statusConfig[contract.status] || statusConfig.ativo;
                const StatusIcon = status.icon;
                const isExpiringSoon = contract.daysUntilExpiry > 0 && contract.daysUntilExpiry <= 60;

                return (
                  <Card 
                    key={contract.id} 
                    className={`hover-elevate cursor-pointer ${isExpiringSoon ? "border-amber-500/50" : ""}`}
                    data-testid={`contract-${contract.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-sm">{contract.title}</h3>
                            <Badge variant="outline" className="text-xs">
                              {categoryLabels[contract.category] || contract.category}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Building2 className="h-3 w-3" />
                            <span>{contract.supplierName}</span>
                          </div>
                          {contract.slaDescription && (
                            <p className="text-xs text-muted-foreground mb-2">
                              SLA: {contract.slaDescription}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(contract.startDate).toLocaleDateString("pt-BR")} - {new Date(contract.endDate).toLocaleDateString("pt-BR")}
                            </span>
                            {contract.monthlyValue && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                R$ {contract.monthlyValue.toLocaleString()}/mês
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={`bg-${status.color}-500/10 text-${status.color}-600 border-${status.color}-500/20`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                          {isExpiringSoon && (
                            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Vence em {contract.daysUntilExpiry} dias
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
        </TabsContent>

        <TabsContent value="evaluations" className="space-y-4">
          <ScrollArea className="h-[calc(100vh-450px)]">
            <div className="space-y-3 pr-4">
              {evaluations.map((evaluation) => (
                <Card key={evaluation.id} className="hover-elevate" data-testid={`evaluation-${evaluation.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-sm">{evaluation.supplierName}</h3>
                          <StarRating score={Math.round(evaluation.overallScore)} size="md" />
                          <span className="text-sm font-bold">{evaluation.overallScore.toFixed(1)}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Qualidade</p>
                            <StarRating score={evaluation.qualityScore} />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Pontualidade</p>
                            <StarRating score={evaluation.punctualityScore} />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Preço</p>
                            <StarRating score={evaluation.priceScore} />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Comunicação</p>
                            <StarRating score={evaluation.communicationScore} />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={evaluation.wouldRecommend ? "default" : "secondary"}>
                          {evaluation.wouldRecommend ? "Recomenda" : "Não Recomenda"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(evaluation.evaluationDate).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
