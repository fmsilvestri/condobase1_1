import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import jsPDF from "jspdf";
import {
  ClipboardList,
  Plus,
  Search,
  Calendar,
  CalendarDays,
  ChevronDown,
  Loader2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Send,
  User,
  ListChecks,
  BarChart3,
  Trash2,
  Eye,
  MessageCircle,
  CheckSquare,
  Square,
  X,
  Image,
  FileText,
  Upload,
  GripVertical,
  Users,
  Filter,
  History,
  Copy,
  Download,
  MapPin,
  Pencil,
  Phone,
  Save,
  FileDown,
  Edit,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useCondominium } from "@/hooks/use-condominium";
import { apiRequest, queryClient, getAuthHeaders } from "@/lib/queryClient";
import { teamMemberRoles, type TeamMember } from "@shared/schema";

const createListFormSchema = z.object({
  titulo: z.string().min(2, "Título deve ter pelo menos 2 caracteres"),
  membroId: z.string().min(1, "Selecione um membro da equipe"),
  dataExecucao: z.string().min(1, "Selecione a data de execução"),
  turno: z.enum(["manha", "tarde", "noite", "integral"]),
  prioridade: z.enum(["baixa", "normal", "alta", "urgente"]).default("normal"),
  observacoes: z.string().optional(),
});

const createTemplateFormSchema = z.object({
  titulo: z.string().min(2, "Título deve ter pelo menos 2 caracteres"),
  descricao: z.string().optional(),
  funcao: z.string().min(1, "Selecione uma função"),
  area: z.string().optional(),
  tempoEstimado: z.coerce.number().optional().nullable(),
  periodicidade: z.string().optional(),
});

type CreateListFormData = z.infer<typeof createListFormSchema>;
type CreateTemplateFormData = z.infer<typeof createTemplateFormSchema>;

interface ActivityTemplate {
  id: string;
  categoriaId: string | null;
  titulo: string;
  descricao: string | null;
  funcao: string;
  area: string | null;
  instrucoes: string | null;
  equipamentosNecessarios: string[] | null;
  checklist: { items: string[] } | null;
  tempoEstimado: number | null;
  periodicidade: string | null;
  ordem: number;
  categoria: { id: string; nome: string; cor: string } | null;
}

interface ActivityList {
  id: string;
  titulo: string;
  membroId: string;
  dataExecucao: string;
  turno: string;
  prioridade: string;
  status: string;
  observacoes: string | null;
  enviadoWhatsapp: boolean;
  dataEnvioWhatsapp: string | null;
  createdAt: string;
  membro: TeamMember | null;
}

interface ActivityListItem {
  id: string;
  activityListId: string;
  activityTemplateId: string | null;
  titulo: string;
  descricao: string | null;
  area: string | null;
  instrucoes: string | null;
  equipamentosNecessarios: string[] | null;
  checklist: { items: string[] } | null;
  fotos: string[] | null;
  concluido: boolean;
  dataConclusao: string | null;
  observacoes: string | null;
  ordem: number;
}

interface ActivityStats {
  totalListas: number;
  listasPendentes: number;
  listasEmAndamento: number;
  listasConcluidas: number;
  totalAtividades: number;
  atividadesConcluidas: number;
  percentualConclusao: number;
}

interface CustomTask {
  id: string;
  titulo: string;
  descricao: string;
  instrucoes: string;
  fotos: string[];
}

const turnoLabels: Record<string, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
  integral: "Integral",
};

const prioridadeLabels: Record<string, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
};

const statusColors: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  em_andamento: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  concluida: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const prioridadeColors: Record<string, string> = {
  baixa: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  normal: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  alta: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  urgente: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const roleLabels: Record<string, string> = {
  zelador: "Zelador",
  porteiro: "Porteiro",
  faxineiro: "Faxineiro",
  jardineiro: "Jardineiro",
  manutencao: "Manutenção",
  administrativo: "Administrativo",
  seguranca: "Segurança",
  piscineiro: "Piscineiro",
  outro: "Outro",
};

const periodicidadeLabels: Record<string, string> = {
  diaria: "Diária",
  semanal: "Semanal",
  mensal: "Mensal",
  eventual: "Eventual",
};

export default function ActivityManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedCondominium } = useCondominium();
  const [activeTab, setActiveTab] = useState("templates");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFuncao, setSelectedFuncao] = useState<string>("");
  const [selectedPeriodicidade, setSelectedPeriodicidade] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<ActivityTemplate | null>(null);
  const [selectedTemplates, setSelectedTemplates] = useState<ActivityTemplate[]>([]);
  const [viewListDialog, setViewListDialog] = useState<ActivityList | null>(null);
  const [whatsappDialog, setWhatsappDialog] = useState<{ list: ActivityList; url: string; message: string } | null>(null);
  const [customWhatsappDialog, setCustomWhatsappDialog] = useState<{ list: ActivityList; pdfBlob: Blob; fileName: string; message: string } | null>(null);
  const [customWhatsappNumber, setCustomWhatsappNumber] = useState("");
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ActivityTemplate | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [isBatchSending, setIsBatchSending] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [memberTemplateAssignments, setMemberTemplateAssignments] = useState<Record<string, string[]>>({});
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [workflowType, setWorkflowType] = useState<"diario" | "semanal">("diario");
  const [batchWhatsappMode, setBatchWhatsappMode] = useState<"registered" | "custom" | "none">("registered");
  const [batchCustomWhatsappNumbers, setBatchCustomWhatsappNumbers] = useState<Record<string, string>>({});
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([]);
  const [isAddingCustomTask, setIsAddingCustomTask] = useState(false);
  const [newCustomTask, setNewCustomTask] = useState<Omit<CustomTask, "id">>({
    titulo: "",
    descricao: "",
    instrucoes: "",
    fotos: [],
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const batchForm = useForm<CreateListFormData>({
    resolver: zodResolver(createListFormSchema.omit({ membroId: true })),
    defaultValues: {
      titulo: "",
      dataExecucao: new Date().toISOString().split("T")[0],
      turno: "manha",
      prioridade: "normal",
      observacoes: "",
    },
  });

  const templateForm = useForm<CreateTemplateFormData>({
    resolver: zodResolver(createTemplateFormSchema),
    defaultValues: {
      titulo: "",
      descricao: "",
      funcao: "",
      area: "",
      tempoEstimado: null,
      periodicidade: "",
    },
  });

  const { data: teamMembers = [], isLoading: loadingMembers } = useQuery<TeamMember[]>({
    queryKey: ["/api/team-members"],
    enabled: !!selectedCondominium,
  });

  const { data: templates = [], isLoading: loadingTemplates } = useQuery<ActivityTemplate[]>({
    queryKey: ["/api/activity-templates", selectedFuncao, selectedPeriodicidade],
    queryFn: async () => {
      let url = "/api/activity-templates";
      const params = new URLSearchParams();
      if (selectedFuncao) params.append("funcao", selectedFuncao);
      if (selectedPeriodicidade) params.append("periodicidade", selectedPeriodicidade);
      if (params.toString()) url += `?${params.toString()}`;
      const headers = getAuthHeaders();
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
    enabled: !!selectedCondominium,
  });

  const { data: allTemplates = [] } = useQuery<ActivityTemplate[]>({
    queryKey: ["/api/activity-templates"],
    enabled: !!selectedCondominium,
  });

  const { data: lists = [], isLoading: loadingLists } = useQuery<ActivityList[]>({
    queryKey: ["/api/activity-lists"],
    enabled: !!selectedCondominium,
  });

  const { data: stats, isLoading: loadingStats } = useQuery<ActivityStats>({
    queryKey: ["/api/activity-statistics"],
    enabled: !!selectedCondominium,
  });

  const createListMutation = useMutation({
    mutationFn: async (data: CreateListFormData & { atividades: ActivityTemplate[]; tarefasPersonalizadas: CustomTask[] }): Promise<ActivityList> => {
      const res = await apiRequest("POST", "/api/activity-lists", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Lista criada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-statistics"] });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar lista", description: error.message, variant: "destructive" });
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/activity-lists/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Lista excluída com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-statistics"] });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao excluir lista", description: error.message, variant: "destructive" });
    },
  });

  const sendWhatsAppMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/activity-lists/${id}/enviar-whatsapp`);
      return res.json();
    },
    onSuccess: (data: any, listId: string) => {
      const list = lists.find(l => l.id === listId);
      if (list && data.urlWhatsApp) {
        setWhatsappDialog({ list, url: data.urlWhatsApp, message: data.mensagem });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/activity-lists"] });
      toast({ title: "Mensagem gerada com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao gerar mensagem", description: error.message, variant: "destructive" });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: CreateTemplateFormData) => {
      return apiRequest("POST", "/api/activity-templates", data);
    },
    onSuccess: () => {
      toast({ title: "Template criado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-templates"] });
      templateForm.reset();
      setIsTemplateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar template", description: error.message, variant: "destructive" });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateTemplateFormData }) => {
      return apiRequest("PATCH", `/api/activity-templates/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Template atualizado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-templates"] });
      templateForm.reset();
      setEditingTemplate(null);
      setIsTemplateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar template", description: error.message, variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/activity-templates/${id}`);
    },
    onSuccess: (_data, deletedId) => {
      toast({ title: "Template excluído com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-templates"] });
      setDeleteTemplateId(null);
      setSelectedTemplates(prev => prev.filter(t => t.id !== deletedId));
    },
    onError: (error: any) => {
      toast({ title: "Erro ao excluir template", description: error.message, variant: "destructive" });
    },
  });

  const handleTemplateSubmit = (data: CreateTemplateFormData) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  const handleEditTemplate = (template: ActivityTemplate) => {
    setEditingTemplate(template);
    templateForm.reset({
      titulo: template.titulo,
      descricao: template.descricao || "",
      funcao: template.funcao,
      area: template.area || "",
      tempoEstimado: template.tempoEstimado,
      periodicidade: template.periodicidade || "",
    });
    setIsTemplateDialogOpen(true);
  };

  const handleCloseTemplateDialog = () => {
    templateForm.reset();
    setEditingTemplate(null);
    setIsTemplateDialogOpen(false);
  };

  const handleBatchSend = async (mode: "save" | "whatsapp" | "pdf") => {
    const membersWithAssignments = getMembersWithAssignments();
    
    if (membersWithAssignments.length === 0) {
      toast({ title: "Atribua templates a pelo menos um funcionário", variant: "destructive" });
      return;
    }

    const isValid = await batchForm.trigger();
    if (!isValid) {
      toast({ title: "Preencha os campos obrigatórios corretamente", variant: "destructive" });
      return;
    }

    const formData = batchForm.getValues();
    if (!formData.dataExecucao) {
      toast({ title: "Selecione a data de execução", variant: "destructive" });
      return;
    }

    // Validate WhatsApp numbers based on mode
    if (mode === "whatsapp" && batchWhatsappMode !== "none") {
      const missingNumbers: string[] = [];
      for (const [membroId] of membersWithAssignments) {
        const member = teamMembers.find(m => m.id === membroId);
        if (batchWhatsappMode === "custom") {
          const customNumber = batchCustomWhatsappNumbers[membroId];
          if (!customNumber || customNumber.replace(/\D/g, "").length < 10) {
            missingNumbers.push(member?.name || "Funcionário");
          }
        } else if (batchWhatsappMode === "registered") {
          const registeredNumber = member?.whatsapp?.replace(/\D/g, "") || "";
          if (!registeredNumber || registeredNumber.length < 10) {
            missingNumbers.push(member?.name || "Funcionário");
          }
        }
      }
      if (missingNumbers.length > 0) {
        toast({ 
          title: `WhatsApp inválido ou ausente`, 
          description: `Funcionários: ${missingNumbers.join(", ")}`,
          variant: "destructive" 
        });
        return;
      }
    }

    setIsBatchSending(true);
    setBatchProgress({ current: 0, total: membersWithAssignments.length });

    const results = { success: 0, error: 0 };
    const workflowLabel = workflowType === "diario" ? "Diário" : "Semanal";
    const createdLists: { list: ActivityList; member: any; items: ActivityListItem[] }[] = [];

    for (let i = 0; i < membersWithAssignments.length; i++) {
      const [membroId, templateIds] = membersWithAssignments[i];
      const member = teamMembers.find(m => m.id === membroId);
      const memberTemplates = allTemplates.filter(t => templateIds.includes(t.id));
      
      try {
        const newList = await createListMutation.mutateAsync({
          ...formData,
          membroId,
          titulo: formData.titulo || `Fluxo ${workflowLabel} - ${member?.name || ""} - ${new Date(formData.dataExecucao).toLocaleDateString("pt-BR")}`,
          atividades: memberTemplates,
          tarefasPersonalizadas: customTasks,
        });
        
        // Fetch items for PDF generation with auth headers
        const headers = getAuthHeaders();
        const itemsRes = await fetch(`/api/activity-lists/${newList.id}/items`, { headers });
        if (!itemsRes.ok) throw new Error("Erro ao buscar itens da lista");
        const items = await itemsRes.json();
        
        createdLists.push({ list: newList, member, items });
        results.success++;
      } catch (err) {
        results.error++;
      }
      setBatchProgress({ current: i + 1, total: membersWithAssignments.length });
    }

    // Handle PDF export or WhatsApp sending
    if (mode === "pdf" && createdLists.length > 0) {
      for (const { list, member, items } of createdLists) {
        const { pdfBlob, fileName } = await generatePDF(list, items);
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
      toast({ title: `${createdLists.length} PDF(s) exportado(s)` });
    } else if (mode === "whatsapp" && createdLists.length > 0) {
      let whatsappSent = 0;
      for (const { list, member, items } of createdLists) {
        const { pdfBlob, fileName } = await generatePDF(list, items);
        const dataFormatada = new Date(list.dataExecucao).toLocaleDateString("pt-BR");
        const mensagem = `*Lista de Atividades*\n*${list.titulo}*\nData: ${dataFormatada}\nTurno: ${turnoLabels[list.turno]}\n\nPor favor, confira o PDF anexado com as atividades do dia.`;
        
        // Determine WhatsApp number
        let telefone = "";
        if (batchWhatsappMode === "registered") {
          telefone = member?.whatsapp?.replace(/\D/g, "") || "";
        } else if (batchWhatsappMode === "custom") {
          telefone = batchCustomWhatsappNumbers[list.membroId]?.replace(/\D/g, "") || "";
        }
        
        if (telefone && telefone.length >= 10) {
          // Download PDF first
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(url);
          
          // Open WhatsApp
          const whatsappUrl = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
          window.open(whatsappUrl, "_blank");
          
          // Mark as sent
          await apiRequest("POST", `/api/activity-lists/${list.id}/enviar-whatsapp`);
          whatsappSent++;
        }
      }
      toast({ title: `PDF baixado e WhatsApp aberto: ${whatsappSent} de ${createdLists.length}` });
    }

    setIsBatchSending(false);
    setBatchProgress({ current: 0, total: 0 });
    
    toast({
      title: "Envio em lote concluído",
      description: `${results.success} lista(s) criada(s), ${results.error} erro(s)`,
    });

    if (results.success > 0) {
      setSelectedTemplates([]);
      setMemberTemplateAssignments({});
      setExpandedMember(null);
      setCustomTasks([]);
      setBatchCustomWhatsappNumbers({});
      batchForm.reset();
      setActiveTab("historico");
    }
  };

  const handleAddCustomTask = () => {
    if (!newCustomTask.titulo.trim()) {
      toast({ title: "Preencha o título da tarefa", variant: "destructive" });
      return;
    }
    setCustomTasks(prev => [...prev, { ...newCustomTask, id: crypto.randomUUID() }]);
    setNewCustomTask({ titulo: "", descricao: "", instrucoes: "", fotos: [] });
    setIsAddingCustomTask(false);
  };

  const handleRemoveCustomTask = (id: string) => {
    setCustomTasks(prev => prev.filter(t => t.id !== id));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setNewCustomTask(prev => ({
        ...prev,
        fotos: [...prev.fotos, base64]
      }));
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemovePhoto = (index: number) => {
    setNewCustomTask(prev => ({
      ...prev,
      fotos: prev.fotos.filter((_, i) => i !== index)
    }));
  };

  const generatePDF = async (list: ActivityList, items: ActivityListItem[]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFillColor(102, 126, 234);
    doc.rect(0, 0, pageWidth, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(list.titulo, pageWidth / 2, 18, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const dataFormatada = new Date(list.dataExecucao).toLocaleDateString("pt-BR");
    doc.text(`Data: ${dataFormatada} | Turno: ${turnoLabels[list.turno]} | Prioridade: ${prioridadeLabels[list.prioridade]}`, pageWidth / 2, 30, { align: "center" });
    
    y = 50;
    doc.setTextColor(0, 0, 0);

    doc.setFillColor(245, 245, 245);
    doc.rect(10, y, pageWidth - 20, 25, "F");
    
    doc.setFontSize(10);
    doc.text(`Funcionário: ${list.membro?.name || "N/A"}`, 15, y + 8);
    doc.text(`Função: ${list.membro?.role || "N/A"}`, 15, y + 16);
    y += 35;

    if (list.observacoes) {
      doc.setFillColor(232, 245, 233);
      const obsLines = doc.splitTextToSize(list.observacoes, pageWidth - 40);
      const obsHeight = obsLines.length * 5 + 15;
      doc.rect(10, y, pageWidth - 20, obsHeight, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Observações:", 15, y + 8);
      doc.setFont("helvetica", "normal");
      doc.text(obsLines, 15, y + 16);
      y += obsHeight + 10;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(102, 126, 234);
    doc.text("Atividades", 15, y);
    y += 10;
    doc.setTextColor(0, 0, 0);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(255, 255, 255);
      
      let itemHeight = 25;
      if (item.descricao) itemHeight += 8;
      if (item.instrucoes) itemHeight += 15;
      if (item.area) itemHeight += 6;
      if (item.fotos && item.fotos.length > 0) itemHeight += 50;
      
      doc.roundedRect(10, y, pageWidth - 20, itemHeight, 3, 3, "FD");

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`${i + 1}. ${item.titulo}`, 15, y + 8);
      let itemY = y + 14;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");

      if (item.descricao) {
        doc.setTextColor(100, 100, 100);
        doc.text(item.descricao.substring(0, 80), 15, itemY);
        itemY += 6;
      }

      if (item.area) {
        doc.setTextColor(0, 0, 0);
        doc.text(`Local: ${item.area}`, 15, itemY);
        itemY += 6;
      }

      if (item.instrucoes) {
        doc.setFillColor(240, 247, 255);
        doc.rect(15, itemY, pageWidth - 35, 12, "F");
        doc.setTextColor(0, 0, 0);
        const instrLines = doc.splitTextToSize(`Instruções: ${item.instrucoes}`, pageWidth - 40);
        doc.text(instrLines.slice(0, 2), 17, itemY + 6);
        itemY += 14;
      }

      if (item.fotos && item.fotos.length > 0) {
        for (const foto of item.fotos) {
          if (itemY > 220) {
            doc.addPage();
            itemY = 20;
          }
          try {
            let format = "JPEG";
            if (foto.startsWith("data:image/png")) format = "PNG";
            doc.addImage(foto, format, 15, itemY, 40, 30);
            itemY += 35;
          } catch (imgErr) {
            doc.text("[Imagem]", 15, itemY);
            itemY += 8;
          }
        }
      }

      doc.rect(pageWidth - 25, y + 5, 4, 4);
      y += itemHeight + 5;
    }

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });

    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    return { pdfBlob, pdfUrl, fileName: `atividades_${list.titulo.replace(/\s+/g, "_")}.pdf` };
  };

  const handleSharePDF = async (list: ActivityList, openWhatsappDialog = false) => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`/api/activity-lists/${list.id}/items`, { headers });
      if (!res.ok) throw new Error("Erro ao buscar itens");
      const items = await res.json();

      const { pdfBlob, fileName } = await generatePDF(list, items);

      const membro = teamMembers.find(m => m.id === list.membroId);
      const dataFormatada = new Date(list.dataExecucao).toLocaleDateString("pt-BR");
      const mensagem = `*Lista de Atividades*\n*${list.titulo}*\nData: ${dataFormatada}\nTurno: ${turnoLabels[list.turno]}\n\nPor favor, confira o PDF anexado com as atividades do dia.`;

      if (openWhatsappDialog) {
        setCustomWhatsappNumber(membro?.whatsapp || "");
        setCustomWhatsappDialog({ list, pdfBlob, fileName, message: mensagem });
      } else {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "PDF baixado com sucesso!" });
      }
    } catch (error: any) {
      toast({ title: "Erro ao gerar PDF", description: error.message, variant: "destructive" });
    }
  };

  const handleSendToCustomWhatsapp = () => {
    if (!customWhatsappDialog) return;
    
    const telefone = customWhatsappNumber.replace(/\D/g, "");
    if (!telefone || telefone.length < 10) {
      toast({ title: "Digite um número de WhatsApp válido", variant: "destructive" });
      return;
    }

    const url = URL.createObjectURL(customWhatsappDialog.pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = customWhatsappDialog.fileName;
    a.click();
    URL.revokeObjectURL(url);

    const whatsappUrl = `https://wa.me/${telefone}?text=${encodeURIComponent(customWhatsappDialog.message)}`;
    toast({ title: "PDF baixado! Abrindo WhatsApp..." });
    setTimeout(() => window.open(whatsappUrl, "_blank"), 500);
    
    setCustomWhatsappDialog(null);
    setCustomWhatsappNumber("");
  };

  const generateTemplatePDF = (template: ActivityTemplate) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFillColor(102, 126, 234);
    doc.rect(0, 0, pageWidth, 35, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Template de Atividade", pageWidth / 2, 15, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(template.titulo, pageWidth / 2, 27, { align: "center" });
    
    y = 50;
    doc.setTextColor(0, 0, 0);

    doc.setFillColor(240, 240, 240);
    doc.rect(10, y, pageWidth - 20, 30, "F");
    doc.setFontSize(10);
    doc.text(`Função: ${roleLabels[template.funcao] || template.funcao}`, 15, y + 10);
    if (template.area) doc.text(`Local: ${template.area}`, 15, y + 18);
    if (template.periodicidade) doc.text(`Periodicidade: ${periodicidadeLabels[template.periodicidade] || template.periodicidade}`, 15, y + 26);
    if (template.tempoEstimado) doc.text(`Tempo estimado: ${template.tempoEstimado} min`, pageWidth / 2, y + 10);
    y += 40;

    if (template.descricao) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Descrição:", 15, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      const descLines = doc.splitTextToSize(template.descricao, pageWidth - 30);
      doc.text(descLines, 15, y);
      y += descLines.length * 6 + 10;
    }

    if (template.instrucoes) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Instruções:", 15, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      const instrLines = doc.splitTextToSize(template.instrucoes, pageWidth - 30);
      doc.text(instrLines, 15, y);
      y += instrLines.length * 6 + 10;
    }

    if (template.checklist?.items && template.checklist.items.length > 0) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Checklist:", 15, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      template.checklist.items.forEach((item, i) => {
        doc.rect(15, y - 3, 4, 4);
        doc.text(`${item}`, 22, y);
        y += 8;
      });
      y += 5;
    }

    if (template.equipamentosNecessarios && template.equipamentosNecessarios.length > 0) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Equipamentos Necessários:", 15, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      template.equipamentosNecessarios.forEach((eq) => {
        doc.text(`• ${eq}`, 15, y);
        y += 6;
      });
    }

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });

    const fileName = `template_${template.titulo.replace(/\s+/g, "_")}.pdf`;
    doc.save(fileName);
    toast({ title: "PDF do template exportado!" });
  };

  const toggleTemplate = (template: ActivityTemplate) => {
    setSelectedTemplates(prev => {
      const exists = prev.find(t => t.id === template.id);
      if (exists) {
        return prev.filter(t => t.id !== template.id);
      }
      return [...prev, template];
    });
  };

  const clearAllAssignments = () => {
    setMemberTemplateAssignments({});
    setExpandedMember(null);
  };

  const toggleMemberTemplateAssignment = (memberId: string, templateId: string) => {
    setMemberTemplateAssignments(prev => {
      const current = prev[memberId] || [];
      if (current.includes(templateId)) {
        return { ...prev, [memberId]: current.filter(id => id !== templateId) };
      }
      return { ...prev, [memberId]: [...current, templateId] };
    });
  };

  const assignAllTemplatesToMember = (memberId: string) => {
    setMemberTemplateAssignments(prev => ({
      ...prev,
      [memberId]: allTemplates.map(t => t.id),
    }));
  };

  const clearMemberTemplates = (memberId: string) => {
    setMemberTemplateAssignments(prev => ({
      ...prev,
      [memberId]: [],
    }));
  };

  const getMemberTemplateCount = (memberId: string) => {
    return memberTemplateAssignments[memberId]?.length || 0;
  };

  const getTotalAssignments = () => {
    return Object.values(memberTemplateAssignments).reduce((acc, arr) => acc + arr.length, 0);
  };

  const getMembersWithAssignments = () => {
    return Object.entries(memberTemplateAssignments).filter(([_, templates]) => templates.length > 0);
  };

  const filteredLists = lists.filter(list => {
    if (!searchQuery) return true;
    return (
      list.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      list.membro?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredTemplates = templates.filter(t => {
    if (searchQuery) {
      return t.titulo.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const activeMembers = teamMembers.filter(m => m.status === "ativo");

  const sentLists = lists.filter(l => l.enviadoWhatsapp).sort((a, b) => 
    new Date(b.dataEnvioWhatsapp || b.createdAt).getTime() - new Date(a.dataEnvioWhatsapp || a.createdAt).getTime()
  );

  if (!selectedCondominium) {
    return (
      <div className="p-6">
        <EmptyState
          icon={ClipboardList}
          title="Selecione um condomínio"
          description="Escolha um condomínio para gerenciar as atividades da equipe"
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Gestão de Atividades"
        description="Crie listas prontas, replique e envie via WhatsApp em PDF"
        icon={ClipboardList}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0" data-testid="stat-total-templates">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold" data-testid="value-total-templates">{templates.length}</div>
              <div className="text-sm opacity-90 mt-1">Templates</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0" data-testid="stat-listas-enviadas">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold" data-testid="value-listas-enviadas">{sentLists.length}</div>
              <div className="text-sm opacity-90 mt-1">Listas Enviadas</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white border-0" data-testid="stat-funcionarios">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold" data-testid="value-funcionarios">{activeMembers.length}</div>
              <div className="text-sm opacity-90 mt-1">Funcionários Ativos</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white border-0" data-testid="stat-taxa-conclusao">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold" data-testid="value-taxa-conclusao">{stats?.percentualConclusao || 0}%</div>
              <div className="text-sm opacity-90 mt-1">Taxa de Conclusão</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates" data-testid="tab-templates">
            <ListChecks className="w-4 h-4 mr-2" />
            Templates de Listas
          </TabsTrigger>
          <TabsTrigger value="envio" data-testid="tab-envio">
            <Send className="w-4 h-4 mr-2" />
            Enviar em Lote
          </TabsTrigger>
          <TabsTrigger value="historico" data-testid="tab-historico">
            <History className="w-4 h-4 mr-2" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Templates de Listas Prontas</CardTitle>
                  <CardDescription>Selecione um template para visualizar ou usar</CardDescription>
                </div>
                <Button onClick={() => setIsTemplateDialogOpen(true)} data-testid="button-novo-template">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Filtrar por Função:</label>
                  <Select value={selectedFuncao || "all"} onValueChange={(v) => setSelectedFuncao(v === "all" ? "" : v)}>
                    <SelectTrigger data-testid="select-filtro-funcao">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {teamMemberRoles.map(role => (
                        <SelectItem key={role} value={role} data-testid={`filter-funcao-${role}`}>{roleLabels[role] || role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Filtrar por Periodicidade:</label>
                  <Select value={selectedPeriodicidade || "all"} onValueChange={(v) => setSelectedPeriodicidade(v === "all" ? "" : v)}>
                    <SelectTrigger data-testid="select-filtro-periodicidade">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {Object.entries(periodicidadeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value} data-testid={`filter-periodicidade-${value}`}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Buscar:</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar templates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-templates"
                    />
                  </div>
                </div>
              </div>

              {loadingTemplates ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-40" />
                  ))}
                </div>
              ) : filteredTemplates.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Nenhum template encontrado"
                  description="Crie templates de atividades para sua equipe"
                  action={{
                    label: "Criar Template",
                    onClick: () => setIsTemplateDialogOpen(true)
                  }}
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredTemplates.map((template) => {
                    const isSelected = selectedTemplates.some(t => t.id === template.id);
                    return (
                      <Card
                        key={template.id}
                        className={`cursor-pointer transition-all hover-elevate ${
                          isSelected ? "ring-2 ring-primary bg-primary/5" : ""
                        }`}
                        onClick={() => toggleTemplate(template)}
                        data-testid={`template-card-${template.id}`}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <h3 className="font-semibold text-lg line-clamp-2" data-testid={`template-titulo-${template.id}`}>
                              {template.titulo}
                            </h3>
                            <Badge className="shrink-0" data-testid={`template-badge-${template.id}`}>
                              {roleLabels[template.funcao] || template.funcao}
                            </Badge>
                          </div>
                          
                          {template.descricao && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {template.descricao}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            {template.area && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {template.area}
                              </span>
                            )}
                            {template.tempoEstimado && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {template.tempoEstimado} min
                              </span>
                            )}
                            {template.periodicidade && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {periodicidadeLabels[template.periodicidade] || template.periodicidade}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            {isSelected ? (
                              <div className="flex items-center gap-2 text-sm text-primary font-medium">
                                <CheckCircle className="w-4 h-4" />
                                Selecionado
                              </div>
                            ) : (
                              <div />
                            )}
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditTemplate(template);
                                }}
                                title="Editar"
                                data-testid={`button-edit-template-${template.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTemplateId(template.id);
                                }}
                                title="Excluir"
                                className="text-destructive"
                                data-testid={`button-delete-template-${template.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  generateTemplatePDF(template);
                                }}
                                title="Exportar PDF"
                                data-testid={`button-export-template-${template.id}`}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {selectedTemplates.length > 0 && (
                <div className="mt-6 p-4 bg-primary/10 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    <span className="font-medium">{selectedTemplates.length} template(s) selecionado(s)</span>
                  </div>
                  <Button onClick={() => setActiveTab("envio")} data-testid="button-ir-para-envio">
                    Ir para Envio em Lote
                    <Send className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="envio" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Montar Fluxo de Trabalho</CardTitle>
                  <CardDescription>
                    Atribua templates de atividades para cada funcionário e envie via WhatsApp
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Tipo de Fluxo:</span>
                  <div className="flex rounded-lg border p-1 gap-1">
                    <Button
                      variant={workflowType === "diario" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setWorkflowType("diario")}
                      data-testid="button-fluxo-diario"
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Diário
                    </Button>
                    <Button
                      variant={workflowType === "semanal" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setWorkflowType("semanal")}
                      data-testid="button-fluxo-semanal"
                    >
                      <CalendarDays className="w-4 h-4 mr-1" />
                      Semanal
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg text-sm border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <ListChecks className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <strong>Como funciona:</strong> Clique em um funcionário para expandir e selecionar quais templates de atividades deseja atribuir a ele. Você pode atribuir templates diferentes para cada funcionário.
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Funcionários e Templates
                    </h3>
                    <Button variant="outline" size="sm" onClick={clearAllAssignments} data-testid="button-limpar-selecao">
                      <X className="w-4 h-4 mr-1" />
                      Limpar Tudo
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg max-h-[500px] overflow-y-auto">
                    {loadingMembers ? (
                      <div className="p-4 space-y-2">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
                      </div>
                    ) : activeMembers.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        Nenhum funcionário ativo
                      </div>
                    ) : (
                      activeMembers.map(member => {
                        const isExpanded = expandedMember === member.id;
                        const assignedCount = getMemberTemplateCount(member.id);
                        const memberAssignedTemplates = memberTemplateAssignments[member.id] || [];
                        
                        return (
                          <div key={member.id} className="border-b last:border-b-0">
                            <div
                              className={`p-3 flex items-center gap-3 cursor-pointer transition-colors ${
                                assignedCount > 0 ? "bg-green-50 dark:bg-green-950" : "hover:bg-secondary/50"
                              }`}
                              onClick={() => setExpandedMember(isExpanded ? null : member.id)}
                              data-testid={`button-expand-member-${member.id}`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                                assignedCount > 0 ? "bg-green-600" : "bg-gray-400"
                              }`}>
                                {assignedCount > 0 ? assignedCount : <User className="w-4 h-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate" data-testid={`membro-nome-${member.id}`}>
                                  {member.name}
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                  <span>{roleLabels[member.role] || member.role}</span>
                                  {member.whatsapp && (
                                    <span className="text-green-600 flex items-center gap-1">
                                      <MessageCircle className="w-3 h-3" />
                                      {member.whatsapp}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </div>
                            
                            {isExpanded && (
                              <div className="p-3 bg-secondary/30 border-t">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-sm font-medium">Selecione os templates:</span>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => assignAllTemplatesToMember(member.id)}
                                      data-testid={`button-todos-templates-${member.id}`}
                                    >
                                      Todos
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => clearMemberTemplates(member.id)}
                                      data-testid={`button-limpar-templates-${member.id}`}
                                    >
                                      Limpar
                                    </Button>
                                  </div>
                                </div>
                                
                                {loadingTemplates ? (
                                  <Skeleton className="h-20" />
                                ) : allTemplates.length === 0 ? (
                                  <p className="text-sm text-muted-foreground text-center py-2">
                                    Nenhum template disponível. Crie templates na aba anterior.
                                  </p>
                                ) : (
                                  <div className="grid gap-2 max-h-[200px] overflow-y-auto">
                                    {allTemplates.map(template => {
                                      const isAssigned = memberAssignedTemplates.includes(template.id);
                                      return (
                                        <div
                                          key={template.id}
                                          className={`p-2 rounded-md flex items-center gap-2 cursor-pointer transition-colors ${
                                            isAssigned ? "bg-primary/10 ring-1 ring-primary" : "bg-background hover:bg-secondary"
                                          }`}
                                          onClick={() => toggleMemberTemplateAssignment(member.id, template.id)}
                                          data-testid={`template-assign-${member.id}-${template.id}`}
                                        >
                                          <Checkbox checked={isAssigned} className="pointer-events-none" />
                                          <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium truncate">{template.titulo}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                              <Badge variant="secondary" className="text-xs">
                                                {roleLabels[template.funcao] || template.funcao}
                                              </Badge>
                                              {template.periodicidade && (
                                                <span>{periodicidadeLabels[template.periodicidade]}</span>
                                              )}
                                            </div>
                                          </div>
                                          {isAssigned && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  {getTotalAssignments() > 0 && (
                    <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">
                          {getMembersWithAssignments().length} funcionário(s) com {getTotalAssignments()} template(s) atribuído(s)
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Configuração do Fluxo
                  </h3>
                  
                  <Form {...batchForm}>
                    <form className="space-y-4">
                      <FormField
                        control={batchForm.control}
                        name="titulo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Título (opcional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={`Ex: Fluxo ${workflowType === "diario" ? "Diário" : "Semanal"} - Segunda-feira`}
                                {...field}
                                data-testid="input-batch-titulo"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={batchForm.control}
                          name="dataExecucao"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {workflowType === "diario" ? "Data de Execução" : "Data de Início"}
                              </FormLabel>
                              <FormControl>
                                <Input type="date" {...field} data-testid="input-batch-data" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={batchForm.control}
                          name="turno"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Turno</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-batch-turno">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.entries(turnoLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={batchForm.control}
                        name="prioridade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prioridade</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger data-testid="select-batch-prioridade">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(prioridadeLabels).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={batchForm.control}
                        name="observacoes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Observações</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Instruções adicionais para o fluxo de trabalho..."
                                rows={3}
                                {...field}
                                data-testid="input-batch-observacoes"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>

                  <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <ListChecks className="w-4 h-4" />
                      Resumo do Fluxo
                    </h4>
                    {getMembersWithAssignments().length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Clique em um funcionário na lista ao lado para atribuir templates.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto" data-testid="resumo-fluxo-lista">
                        {getMembersWithAssignments().map(([memberId, templateIds]) => {
                          const member = teamMembers.find(m => m.id === memberId);
                          const memberTemplates = allTemplates.filter(t => templateIds.includes(t.id));
                          return (
                            <div key={memberId} className="p-2 bg-background rounded-md" data-testid={`resumo-membro-${memberId}`}>
                              <div className="font-medium text-sm" data-testid={`resumo-membro-nome-${memberId}`}>{member?.name}</div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {memberTemplates.map(t => (
                                  <Badge key={t.id} variant="secondary" className="text-xs" data-testid={`resumo-template-${memberId}-${t.id}`}>
                                    {t.titulo}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isBatchSending && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Criando listas e enviando...</span>
                    <span>{batchProgress.current} / {batchProgress.total}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* WhatsApp Options */}
              {getMembersWithAssignments().length > 0 && (
                <Card className="bg-secondary/50">
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Enviar via WhatsApp:</label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant={batchWhatsappMode === "registered" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setBatchWhatsappMode("registered")}
                          data-testid="button-whatsapp-cadastrado"
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          WhatsApp Cadastrado
                        </Button>
                        <Button
                          type="button"
                          variant={batchWhatsappMode === "custom" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setBatchWhatsappMode("custom")}
                          data-testid="button-whatsapp-personalizado"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Digitar Outro
                        </Button>
                        <Button
                          type="button"
                          variant={batchWhatsappMode === "none" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setBatchWhatsappMode("none")}
                          data-testid="button-whatsapp-nenhum"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Não Enviar
                        </Button>
                      </div>
                    </div>

                    {batchWhatsappMode === "custom" && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Digite os números de WhatsApp:</label>
                        {getMembersWithAssignments().map(([memberId]) => {
                          const member = teamMembers.find(m => m.id === memberId);
                          return (
                            <div key={memberId} className="flex items-center gap-2">
                              <span className="text-sm w-32 truncate">{member?.name}:</span>
                              <Input
                                placeholder="Ex: 5511999998888"
                                value={batchCustomWhatsappNumbers[memberId] || ""}
                                onChange={(e) => setBatchCustomWhatsappNumbers(prev => ({
                                  ...prev,
                                  [memberId]: e.target.value
                                }))}
                                className="flex-1"
                                data-testid={`input-whatsapp-custom-${memberId}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMemberTemplateAssignments({});
                    setExpandedMember(null);
                    setCustomTasks([]);
                    setBatchCustomWhatsappNumbers({});
                    batchForm.reset();
                  }}
                  disabled={isBatchSending}
                  data-testid="button-limpar-envio"
                >
                  Limpar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleBatchSend("save")}
                  disabled={isBatchSending || getMembersWithAssignments().length === 0}
                  data-testid="button-salvar-lote"
                >
                  {isBatchSending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Apenas Salvar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleBatchSend("pdf")}
                  disabled={isBatchSending || getMembersWithAssignments().length === 0}
                  data-testid="button-exportar-pdf-lote"
                >
                  {isBatchSending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4 mr-2" />
                  )}
                  Salvar + PDF
                </Button>
                <Button
                  onClick={() => handleBatchSend("whatsapp")}
                  disabled={isBatchSending || getMembersWithAssignments().length === 0 || batchWhatsappMode === "none"}
                  data-testid="button-enviar-lote"
                >
                  {isBatchSending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Salvar + WhatsApp ({getMembersWithAssignments().length})
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Histórico de Listas</CardTitle>
                  <CardDescription>Visualize todas as listas criadas e enviadas</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-historico"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingLists ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : filteredLists.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="Nenhuma lista encontrada"
                  description="Crie listas na aba de envio em lote"
                />
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Funcionário</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>WhatsApp</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLists.map(list => (
                        <TableRow key={list.id} data-testid={`historico-row-${list.id}`}>
                          <TableCell className="font-medium">
                            <span className="line-clamp-1" data-testid={`historico-titulo-${list.id}`}>
                              {list.titulo}
                            </span>
                          </TableCell>
                          <TableCell data-testid={`historico-membro-${list.id}`}>
                            {list.membro?.name || "N/A"}
                          </TableCell>
                          <TableCell data-testid={`historico-data-${list.id}`}>
                            {new Date(list.dataExecucao).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[list.status]} data-testid={`historico-status-${list.id}`}>
                              {statusLabels[list.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {list.enviadoWhatsapp ? (
                              <Badge variant="outline" className="text-green-600" data-testid={`historico-enviado-${list.id}`}>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Enviado
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">Pendente</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setViewListDialog(list)}
                                data-testid={`button-ver-${list.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSharePDF(list)}
                                title="Baixar PDF"
                                data-testid={`button-pdf-${list.id}`}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSharePDF(list, true)}
                                title="Enviar via WhatsApp"
                                data-testid={`button-whatsapp-${list.id}`}
                              >
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive"
                                    data-testid={`button-delete-${list.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir lista?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteListMutation.mutate(list.id)}
                                      className="bg-destructive text-destructive-foreground"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ViewListDialog
        list={viewListDialog}
        onClose={() => setViewListDialog(null)}
      />

      <Dialog open={!!whatsappDialog} onOpenChange={() => setWhatsappDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar via WhatsApp</DialogTitle>
            <DialogDescription>
              Clique no botão abaixo para abrir o WhatsApp com a mensagem formatada
            </DialogDescription>
          </DialogHeader>
          {whatsappDialog && (
            <div className="space-y-4">
              <div className="p-3 bg-secondary rounded-lg max-h-60 overflow-y-auto" data-testid="container-whatsapp-message">
                <pre className="whitespace-pre-wrap text-sm font-mono" data-testid="text-whatsapp-message">{whatsappDialog.message}</pre>
              </div>
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => {
                  window.open(whatsappDialog.url, "_blank");
                  setWhatsappDialog(null);
                }}
                data-testid="button-abrir-whatsapp"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Abrir WhatsApp
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!customWhatsappDialog} onOpenChange={() => { setCustomWhatsappDialog(null); setCustomWhatsappNumber(""); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar PDF via WhatsApp</DialogTitle>
            <DialogDescription>
              Digite o número do WhatsApp ou use o cadastrado
            </DialogDescription>
          </DialogHeader>
          {customWhatsappDialog && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Número do WhatsApp:</label>
                <Input
                  placeholder="Ex: 48999999999"
                  value={customWhatsappNumber}
                  onChange={(e) => setCustomWhatsappNumber(e.target.value)}
                  data-testid="input-custom-whatsapp"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Digite apenas números com DDD (sem espaços ou traços)
                </p>
              </div>
              <div className="p-3 bg-secondary rounded-lg max-h-40 overflow-y-auto" data-testid="container-custom-whatsapp-message">
                <pre className="whitespace-pre-wrap text-sm font-mono" data-testid="text-custom-whatsapp-message">{customWhatsappDialog.message}</pre>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const url = URL.createObjectURL(customWhatsappDialog.pdfBlob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = customWhatsappDialog.fileName;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast({ title: "PDF baixado!" });
                  }}
                  data-testid="button-apenas-pdf"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Apenas PDF
                </Button>
                <Button
                  className="flex-1 bg-green-600"
                  onClick={handleSendToCustomWhatsapp}
                  data-testid="button-enviar-whatsapp-custom"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Enviar WhatsApp
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isTemplateDialogOpen} onOpenChange={(open) => !open && handleCloseTemplateDialog()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Editar Template" : "Novo Template de Atividade"}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? "Atualize os dados do template" : "Cadastre um novo template para usar nas listas"}
            </DialogDescription>
          </DialogHeader>
          <Form {...templateForm}>
            <form onSubmit={templateForm.handleSubmit(handleTemplateSubmit)} className="space-y-4">
              <FormField
                control={templateForm.control}
                name="titulo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título da Atividade *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Limpeza do hall de entrada" {...field} data-testid="input-template-titulo" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={templateForm.control}
                name="funcao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Função *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-template-funcao">
                          <SelectValue placeholder="Selecione a função" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teamMemberRoles.map((role) => (
                          <SelectItem key={role} value={role} data-testid={`option-funcao-${role}`}>
                            {roleLabels[role] || role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={templateForm.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descreva a atividade..." {...field} data-testid="textarea-template-descricao" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={templateForm.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local/Área</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Hall de entrada" {...field} data-testid="input-template-area" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={templateForm.control}
                  name="tempoEstimado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tempo (min)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Ex: 30"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                          data-testid="input-template-tempo"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={templateForm.control}
                name="periodicidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Periodicidade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-template-periodicidade">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(periodicidadeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseTemplateDialog}
                  data-testid="button-cancelar-template"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                  data-testid="button-salvar-template"
                >
                  {(createTemplateMutation.isPending || updateTemplateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingTemplate ? "Atualizar" : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTemplateId} onOpenChange={(open) => !open && setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O template será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancelar-delete-template">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTemplateId && deleteTemplateMutation.mutate(deleteTemplateId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirmar-delete-template"
            >
              {deleteTemplateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


function ViewListDialog({ list, onClose }: { list: ActivityList | null; onClose: () => void }) {
  const { data: items = [], isLoading } = useQuery<ActivityListItem[]>({
    queryKey: ["/api/activity-lists", list?.id, "items"],
    queryFn: async () => {
      if (!list) return [];
      const headers = getAuthHeaders();
      const res = await fetch(`/api/activity-lists/${list.id}/items`, { headers });
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
    enabled: !!list,
  });

  const markItemMutation = useMutation({
    mutationFn: async ({ id, concluido }: { id: string; concluido: boolean }) => {
      return apiRequest("PATCH", `/api/activity-list-items/${id}/concluir`, { concluido });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activity-lists", list?.id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-statistics"] });
    },
  });

  if (!list) return null;

  return (
    <Dialog open={!!list} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="dialog-list-titulo">{list.titulo}</DialogTitle>
          <DialogDescription data-testid="dialog-list-descricao">
            {list.membro?.name} - {new Date(list.dataExecucao).toLocaleDateString("pt-BR")} ({turnoLabels[list.turno]})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge className={statusColors[list.status]} data-testid="dialog-badge-status">{statusLabels[list.status]}</Badge>
            <Badge className={prioridadeColors[list.prioridade]} variant="outline" data-testid="dialog-badge-prioridade">
              {prioridadeLabels[list.prioridade]}
            </Badge>
          </div>

          {list.observacoes && (
            <div className="p-3 bg-secondary rounded-lg" data-testid="dialog-observacoes">
              <p className="text-sm font-medium mb-1">Observações:</p>
              <p className="text-sm text-muted-foreground">{list.observacoes}</p>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="font-medium" data-testid="dialog-atividades-count">Atividades ({items.length})</h4>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 border rounded-lg ${
                      item.concluido ? "bg-green-50 dark:bg-green-950 border-green-200" : ""
                    }`}
                    data-testid={`list-item-${item.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={item.concluido}
                        onCheckedChange={(checked) => {
                          markItemMutation.mutate({ id: item.id, concluido: !!checked });
                        }}
                        data-testid={`checkbox-item-${item.id}`}
                      />
                      <div className="flex-1">
                        <p className={`font-medium ${item.concluido ? "line-through text-muted-foreground" : ""}`} data-testid={`item-titulo-${item.id}`}>
                          {item.titulo}
                        </p>
                        {item.area && (
                          <p className="text-sm text-muted-foreground" data-testid={`item-area-${item.id}`}>Local: {item.area}</p>
                        )}
                        {item.dataConclusao && (
                          <p className="text-xs text-green-600 mt-1" data-testid={`item-conclusao-${item.id}`}>
                            Concluído em: {new Date(item.dataConclusao).toLocaleString("pt-BR")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-fechar-dialog">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
