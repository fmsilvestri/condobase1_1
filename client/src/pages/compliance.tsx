import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Scale,
  Plus,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Search,
  Filter,
  Loader2,
  FileText,
  Shield,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface LegalChecklistItem {
  id: string;
  name: string;
  itemType: string;
  description: string | null;
  isMandatory: boolean;
  frequency: string;
  lastCompletedDate: string | null;
  nextDueDate: string | null;
  status: string;
  daysUntilDue: number | null;
}

const itemTypeLabels: Record<string, { label: string; icon: any }> = {
  documento: { label: "Documento", icon: FileText },
  certificado: { label: "Certificado", icon: FileCheck },
  licenca: { label: "Licença", icon: Shield },
  seguro: { label: "Seguro", icon: Shield },
  inspecao: { label: "Inspeção", icon: FileCheck },
  laudo: { label: "Laudo", icon: FileText },
};

const frequencyLabels: Record<string, string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
  unica: "Única",
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  em_dia: { label: "Em Dia", color: "emerald", icon: CheckCircle2 },
  pendente: { label: "Pendente", color: "amber", icon: Clock },
  vencido: { label: "Vencido", color: "red", icon: XCircle },
  nao_aplicavel: { label: "N/A", color: "gray", icon: null },
};

export default function Compliance() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();

  const mockChecklist: LegalChecklistItem[] = [
    {
      id: "1",
      name: "AVCB - Auto de Vistoria do Corpo de Bombeiros",
      itemType: "certificado",
      description: "Certificado obrigatório para funcionamento",
      isMandatory: true,
      frequency: "anual",
      lastCompletedDate: "2023-06-15",
      nextDueDate: "2024-06-15",
      status: "em_dia",
      daysUntilDue: 150,
    },
    {
      id: "2",
      name: "Alvará de Funcionamento",
      itemType: "licenca",
      description: "Licença municipal obrigatória",
      isMandatory: true,
      frequency: "anual",
      lastCompletedDate: "2024-01-10",
      nextDueDate: "2025-01-10",
      status: "em_dia",
      daysUntilDue: 350,
    },
    {
      id: "3",
      name: "Certificado de Dedetização",
      itemType: "certificado",
      description: "Controle de pragas nas áreas comuns",
      isMandatory: true,
      frequency: "semestral",
      lastCompletedDate: "2023-12-01",
      nextDueDate: "2024-02-01",
      status: "pendente",
      daysUntilDue: 15,
    },
    {
      id: "4",
      name: "Limpeza de Caixas d'Água",
      itemType: "certificado",
      description: "Higienização e análise microbiológica",
      isMandatory: true,
      frequency: "semestral",
      lastCompletedDate: "2023-07-15",
      nextDueDate: "2024-01-15",
      status: "vencido",
      daysUntilDue: -5,
    },
    {
      id: "5",
      name: "Laudo de Para-raios",
      itemType: "laudo",
      description: "Inspeção e certificação do SPDA",
      isMandatory: true,
      frequency: "anual",
      lastCompletedDate: "2023-08-20",
      nextDueDate: "2024-08-20",
      status: "em_dia",
      daysUntilDue: 220,
    },
    {
      id: "6",
      name: "Relatório de Inspeção de Elevadores",
      itemType: "inspecao",
      description: "Vistoria técnica obrigatória",
      isMandatory: true,
      frequency: "anual",
      lastCompletedDate: "2023-09-10",
      nextDueDate: "2024-09-10",
      status: "em_dia",
      daysUntilDue: 245,
    },
    {
      id: "7",
      name: "ART de Manutenção Predial",
      itemType: "documento",
      description: "Anotação de Responsabilidade Técnica",
      isMandatory: true,
      frequency: "anual",
      lastCompletedDate: "2023-11-01",
      nextDueDate: "2024-11-01",
      status: "em_dia",
      daysUntilDue: 300,
    },
    {
      id: "8",
      name: "Seguro Predial Obrigatório",
      itemType: "seguro",
      description: "Cobertura contra incêndio e eventos naturais",
      isMandatory: true,
      frequency: "anual",
      lastCompletedDate: "2023-05-01",
      nextDueDate: "2024-05-01",
      status: "pendente",
      daysUntilDue: 100,
    },
  ];

  const checklist = mockChecklist;

  const filteredChecklist = checklist.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: checklist.length,
    emDia: checklist.filter((i) => i.status === "em_dia").length,
    pendente: checklist.filter((i) => i.status === "pendente").length,
    vencido: checklist.filter((i) => i.status === "vencido").length,
  };

  const complianceScore = Math.round((stats.emDia / stats.total) * 100);

  const updateItemStatus = (id: string, newStatus: string) => {
    toast({ title: `Status atualizado para "${statusConfig[newStatus]?.label}"` });
  };

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Conformidade Legal"
        description="Checklist legal e gestão de documentos obrigatórios"
        icon={Scale}
        iconColor="red"
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Score de Conformidade</p>
                <p className={`text-3xl font-bold ${complianceScore >= 80 ? "text-emerald-600" : complianceScore >= 50 ? "text-amber-600" : "text-red-600"}`}>
                  {complianceScore}%
                </p>
              </div>
              <div className={`flex h-14 w-14 items-center justify-center rounded-full ${complianceScore >= 80 ? "bg-emerald-500/10" : complianceScore >= 50 ? "bg-amber-500/10" : "bg-red-500/10"}`}>
                <Scale className={`h-7 w-7 ${complianceScore >= 80 ? "text-emerald-500" : complianceScore >= 50 ? "text-amber-500" : "text-red-500"}`} />
              </div>
            </div>
            <Progress 
              value={complianceScore} 
              className={`mt-3 h-2 ${complianceScore >= 80 ? "[&>div]:bg-emerald-500" : complianceScore >= 50 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500"}`}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.emDia}</p>
                <p className="text-xs text-muted-foreground">Em Dia</p>
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
                <p className="text-2xl font-bold">{stats.pendente}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
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
                <p className="text-2xl font-bold">{stats.vencido}</p>
                <p className="text-xs text-muted-foreground">Vencidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar itens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36" data-testid="select-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="em_dia">Em Dia</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="vencido">Vencidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" data-testid="button-export">
          <Download className="h-4 w-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-450px)]">
        <div className="space-y-3 pr-4">
          {filteredChecklist.map((item) => {
            const status = statusConfig[item.status] || statusConfig.pendente;
            const StatusIcon = status.icon;
            const typeConfig = itemTypeLabels[item.itemType] || itemTypeLabels.documento;
            const TypeIcon = typeConfig.icon;

            return (
              <Card 
                key={item.id} 
                className={`hover-elevate ${item.status === "vencido" ? "border-red-500/50" : item.status === "pendente" ? "border-amber-500/50" : ""}`}
                data-testid={`checklist-${item.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-${status.color}-500/10`}>
                      <TypeIcon className={`h-5 w-5 text-${status.color}-500`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm">{item.name}</h3>
                        {item.isMandatory && (
                          <Badge variant="outline" className="text-xs">Obrigatório</Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Frequência: {frequencyLabels[item.frequency] || item.frequency}
                        </span>
                        {item.lastCompletedDate && (
                          <span>
                            Última: {new Date(item.lastCompletedDate).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                        {item.nextDueDate && (
                          <span className={item.status === "vencido" ? "text-red-600 font-medium" : item.status === "pendente" ? "text-amber-600" : ""}>
                            Próxima: {new Date(item.nextDueDate).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={`bg-${status.color}-500/10 text-${status.color}-600 border-${status.color}-500/20`}>
                        {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                        {status.label}
                      </Badge>
                      {item.daysUntilDue !== null && item.status !== "em_dia" && (
                        <span className={`text-xs font-medium ${item.daysUntilDue < 0 ? "text-red-600" : "text-amber-600"}`}>
                          {item.daysUntilDue < 0 
                            ? `Vencido há ${Math.abs(item.daysUntilDue)} dias`
                            : `Vence em ${item.daysUntilDue} dias`
                          }
                        </span>
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
