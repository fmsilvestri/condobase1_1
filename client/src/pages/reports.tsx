import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Download,
  Share2,
  Wrench,
  Waves,
  Droplets,
  Flame,
  Zap,
  Trash2,
  Users,
  Truck,
  Megaphone,
  Loader2,
  CheckSquare,
  Square,
  Package,
  Shield,
  Calendar,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { MaintenanceRequest, MaintenanceCompletion, PoolReading, WaterReading, GasReading, EnergyEvent, OccupancyData, Document, Supplier, Announcement, Equipment, SecurityDevice, MaintenancePlan, MaintenanceExecution } from "@shared/schema";

interface ReportModule {
  id: string;
  label: string;
  icon: any;
  description: string;
}

const availableModules: ReportModule[] = [
  { id: "ativos", label: "Ativos", icon: Package, description: "Equipamentos e status de cada um" },
  { id: "manutencoes", label: "Manutenções", icon: Wrench, description: "Chamados abertos e em andamento" },
  { id: "manutencoes-realizadas", label: "Manutenções Realizadas", icon: CheckSquare, description: "Histórico de manutenções concluídas" },
  { id: "manutencao-preventiva", label: "Manutenção Preventiva", icon: Calendar, description: "Planos e execuções de manutenção preventiva" },
  { id: "piscina", label: "Piscina", icon: Waves, description: "Última leitura de qualidade" },
  { id: "agua", label: "Água", icon: Droplets, description: "Nível dos reservatórios" },
  { id: "gas", label: "Gás", icon: Flame, description: "Nível do gás" },
  { id: "energia", label: "Energia", icon: Zap, description: "Status atual da energia" },
  { id: "seguranca", label: "Segurança", icon: Shield, description: "Dispositivos de segurança e acessos" },
  { id: "residuos", label: "Resíduos", icon: Trash2, description: "Cronograma de coleta" },
  { id: "ocupacao", label: "Ocupação", icon: Users, description: "Dados de ocupação" },
  { id: "fornecedores", label: "Fornecedores", icon: Truck, description: "Lista de fornecedores" },
  { id: "comunicados", label: "Comunicados", icon: Megaphone, description: "Últimos comunicados" },
];

export default function Reports() {
  const [selectedModules, setSelectedModules] = useState<string[]>(["ativos", "manutencoes", "piscina", "agua"]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { canEdit, userName } = useAuth();

  const { data: equipment = [] } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment"],
    enabled: selectedModules.includes("ativos"),
  });

  const { data: maintenance = [] } = useQuery<MaintenanceRequest[]>({
    queryKey: ["/api/maintenance"],
    enabled: selectedModules.includes("manutencoes"),
  });

  const { data: poolReadings = [] } = useQuery<PoolReading[]>({
    queryKey: ["/api/pool"],
    enabled: selectedModules.includes("piscina"),
  });

  const { data: waterReadings = [] } = useQuery<WaterReading[]>({
    queryKey: ["/api/water"],
    enabled: selectedModules.includes("agua"),
  });

  const { data: gasReadings = [] } = useQuery<GasReading[]>({
    queryKey: ["/api/gas"],
    enabled: selectedModules.includes("gas"),
  });

  const { data: energyEvents = [] } = useQuery<EnergyEvent[]>({
    queryKey: ["/api/energy"],
    enabled: selectedModules.includes("energia"),
  });

  const { data: occupancy } = useQuery<OccupancyData>({
    queryKey: ["/api/occupancy"],
    enabled: selectedModules.includes("ocupacao"),
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    enabled: selectedModules.includes("fornecedores"),
  });

  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
    enabled: selectedModules.includes("comunicados"),
  });

  const { data: securityDevices = [] } = useQuery<SecurityDevice[]>({
    queryKey: ["/api/security-devices"],
    enabled: selectedModules.includes("seguranca"),
  });

  const { data: maintenanceCompletions = [] } = useQuery<MaintenanceCompletion[]>({
    queryKey: ["/api/maintenance-completions"],
    enabled: selectedModules.includes("manutencoes-realizadas"),
  });

  const { data: maintenancePlans = [] } = useQuery<MaintenancePlan[]>({
    queryKey: ["/api/maintenance-plans"],
    enabled: selectedModules.includes("manutencao-preventiva"),
  });

  const { data: maintenanceExecutions = [] } = useQuery<MaintenanceExecution[]>({
    queryKey: ["/api/maintenance-executions"],
    enabled: selectedModules.includes("manutencao-preventiva"),
  });

  const toggleModule = (moduleId: string) => {
    setSelectedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(m => m !== moduleId)
        : [...prev, moduleId]
    );
  };

  const selectAll = () => {
    setSelectedModules(availableModules.map(m => m.id));
  };

  const deselectAll = () => {
    setSelectedModules([]);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const generatePDF = async () => {
    if (selectedModules.length === 0) {
      toast({ title: "Selecione pelo menos um módulo", variant: "destructive" });
      return;
    }

    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      doc.setFontSize(20);
      doc.setTextColor(0, 150, 180);
      doc.text("CONDOBASE1", pageWidth / 2, yPos, { align: "center" });
      yPos += 10;

      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.text("Relatório Resumido do Condomínio", pageWidth / 2, yPos, { align: "center" });
      yPos += 8;

      doc.setFontSize(10);
      doc.text(`Gerado em: ${formatDate(new Date())} às ${new Date().toLocaleTimeString("pt-BR")}`, pageWidth / 2, yPos, { align: "center" });
      if (userName) {
        yPos += 5;
        doc.text(`Por: ${userName}`, pageWidth / 2, yPos, { align: "center" });
      }
      yPos += 15;

      doc.setDrawColor(0, 150, 180);
      doc.setLineWidth(0.5);
      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 10;

      if (selectedModules.includes("ativos") && equipment.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Ativos do Condomínio", 20, yPos);
        yPos += 8;

        const statusLabels: Record<string, string> = {
          "operacional": "Operacional",
          "atenção": "Atenção",
          "alerta": "Alerta",
          "inativo": "Inativo",
        };

        const tableData = equipment.map(e => [
          e.name.substring(0, 25),
          e.category,
          e.location.substring(0, 20),
          statusLabels[e.status] || e.status,
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Equipamento", "Categoria", "Localização", "Status"]],
          body: tableData,
          theme: "striped",
          headStyles: { fillColor: [0, 150, 180] },
          margin: { left: 20, right: 20 },
          bodyStyles: { fontSize: 9 },
          didParseCell: (data: any) => {
            if (data.column.index === 3 && data.section === "body") {
              const status = data.cell.raw?.toLowerCase();
              if (status === "operacional") {
                data.cell.styles.textColor = [34, 197, 94];
              } else if (status === "atenção") {
                data.cell.styles.textColor = [234, 179, 8];
              } else if (status === "alerta") {
                data.cell.styles.textColor = [239, 68, 68];
              } else if (status === "inativo") {
                data.cell.styles.textColor = [107, 114, 128];
              }
            }
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;

        const statusCounts = {
          operacional: equipment.filter(e => e.status === "operacional").length,
          atencao: equipment.filter(e => e.status === "atenção").length,
          alerta: equipment.filter(e => e.status === "alerta").length,
          inativo: equipment.filter(e => e.status === "inativo").length,
        };

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Resumo: ${statusCounts.operacional} operacionais | ${statusCounts.atencao} em atenção | ${statusCounts.alerta} em alerta | ${statusCounts.inativo} inativos`, 20, yPos);
        yPos += 10;
      }

      if (selectedModules.includes("manutencoes") && maintenance.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Manutenções", 20, yPos);
        yPos += 8;

        const openRequests = maintenance.filter(m => m.status !== "concluído");
        const tableData = openRequests.slice(0, 10).map(m => [
          m.title.substring(0, 30),
          m.status,
          m.priority,
          formatDate(m.createdAt),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Título", "Status", "Prioridade", "Data"]],
          body: tableData,
          theme: "striped",
          headStyles: { fillColor: [0, 150, 180] },
          margin: { left: 20, right: 20 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      if (selectedModules.includes("manutencoes-realizadas") && maintenanceCompletions.length > 0) {
        if (yPos > 220) { doc.addPage(); yPos = 20; }

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Manutenções Realizadas", 20, yPos);
        yPos += 8;

        const tableData = maintenanceCompletions.slice(0, 15).map(c => [
          c.description.substring(0, 35),
          c.location?.substring(0, 20) || "-",
          formatDate(c.completedAt),
          c.performedBy?.substring(0, 15) || "-",
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Descrição", "Local", "Data", "Responsável"]],
          body: tableData,
          theme: "striped",
          headStyles: { fillColor: [0, 150, 180] },
          margin: { left: 20, right: 20 },
          bodyStyles: { fontSize: 9 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Total: ${maintenanceCompletions.length} manutenções realizadas`, 20, yPos);
        yPos += 10;
      }

      if (selectedModules.includes("manutencao-preventiva") && (maintenancePlans.length > 0 || maintenanceExecutions.length > 0)) {
        if (yPos > 220) { doc.addPage(); yPos = 20; }

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Manutenção Preventiva", 20, yPos);
        yPos += 8;

        if (maintenancePlans.length > 0) {
          doc.setFontSize(12);
          doc.setTextColor(60, 60, 60);
          doc.text("Planos de Manutenção", 20, yPos);
          yPos += 6;

          const periodicityLabels: Record<string, string> = {
            "diario": "Diário",
            "semanal": "Semanal",
            "quinzenal": "Quinzenal",
            "mensal": "Mensal",
            "bimestral": "Bimestral",
            "trimestral": "Trimestral",
            "semestral": "Semestral",
            "anual": "Anual",
          };

          const planTableData = maintenancePlans.slice(0, 10).map(p => [
            p.name.substring(0, 25),
            periodicityLabels[p.periodicity] || p.periodicity,
            p.isActive ? "Ativo" : "Inativo",
            p.nextMaintenanceDate ? formatDate(p.nextMaintenanceDate) : "-",
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [["Plano", "Periodicidade", "Status", "Próxima Execução"]],
            body: planTableData,
            theme: "striped",
            headStyles: { fillColor: [0, 150, 180] },
            margin: { left: 20, right: 20 },
            bodyStyles: { fontSize: 9 },
            didParseCell: (data: any) => {
              if (data.column.index === 2 && data.section === "body") {
                const status = data.cell.raw?.toLowerCase();
                if (status === "ativo") {
                  data.cell.styles.textColor = [34, 197, 94];
                } else if (status === "inativo") {
                  data.cell.styles.textColor = [107, 114, 128];
                }
              }
            },
          });

          yPos = (doc as any).lastAutoTable.finalY + 8;
        }

        if (maintenanceExecutions.length > 0) {
          if (yPos > 240) { doc.addPage(); yPos = 20; }

          doc.setFontSize(12);
          doc.setTextColor(60, 60, 60);
          doc.text("Execuções Recentes", 20, yPos);
          yPos += 6;

          const statusLabels: Record<string, string> = {
            "pendente": "Pendente",
            "em_andamento": "Em Andamento",
            "concluido": "Concluído",
            "atrasado": "Atrasado",
          };

          const executionTableData = maintenanceExecutions.slice(0, 10).map(e => {
            const plan = maintenancePlans.find(p => p.id === e.planId);
            return [
              plan?.name?.substring(0, 20) || "-",
              statusLabels[e.status] || e.status,
              formatDate(e.scheduledDate),
              e.executedDate ? formatDate(e.executedDate) : "-",
            ];
          });

          autoTable(doc, {
            startY: yPos,
            head: [["Plano", "Status", "Agendado", "Concluído"]],
            body: executionTableData,
            theme: "striped",
            headStyles: { fillColor: [0, 150, 180] },
            margin: { left: 20, right: 20 },
            bodyStyles: { fontSize: 9 },
            didParseCell: (data: any) => {
              if (data.column.index === 1 && data.section === "body") {
                const status = data.cell.raw?.toLowerCase();
                if (status === "concluído" || status === "concluido") {
                  data.cell.styles.textColor = [34, 197, 94];
                } else if (status === "atrasado") {
                  data.cell.styles.textColor = [239, 68, 68];
                } else if (status === "em andamento") {
                  data.cell.styles.textColor = [59, 130, 246];
                } else if (status === "pendente") {
                  data.cell.styles.textColor = [234, 179, 8];
                }
              }
            },
          });

          yPos = (doc as any).lastAutoTable.finalY + 8;
        }

        const activePlans = maintenancePlans.filter(p => p.isActive).length;
        const completedExecutions = maintenanceExecutions.filter(e => e.status === "concluido").length;
        const overdueExecutions = maintenanceExecutions.filter(e => e.status === "atrasado").length;

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Resumo: ${activePlans} planos ativos | ${completedExecutions} execuções concluídas | ${overdueExecutions} atrasadas`, 20, yPos);
        yPos += 10;
      }

      if (selectedModules.includes("piscina") && poolReadings.length > 0) {
        if (yPos > 250) { doc.addPage(); yPos = 20; }

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Piscina - Última Leitura", 20, yPos);
        yPos += 8;

        const latest = poolReadings[0];
        const tableData = [
          ["pH", String(latest.ph)],
          ["Cloro (ppm)", String(latest.chlorine)],
          ["Alcalinidade (ppm)", String(latest.alkalinity)],
          ["Dureza Cálcica (ppm)", String(latest.calciumHardness)],
          ["Temperatura (°C)", String(latest.temperature)],
          ["Data", formatDate(latest.createdAt)],
        ];

        autoTable(doc, {
          startY: yPos,
          head: [["Parâmetro", "Valor"]],
          body: tableData,
          theme: "striped",
          headStyles: { fillColor: [0, 150, 180] },
          margin: { left: 20, right: 20 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      if (selectedModules.includes("agua") && waterReadings.length > 0) {
        if (yPos > 250) { doc.addPage(); yPos = 20; }

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Água - Última Leitura", 20, yPos);
        yPos += 8;

        const latest = waterReadings[0];
        const tableData = [
          ["Nível do Tanque", `${latest.tankLevel}%`],
          ["Volume Disponível", `${latest.volumeAvailable} L`],
          ["Qualidade", latest.quality],
          ["Status CASAN", latest.casanStatus || "Normal"],
          ["Data", formatDate(latest.createdAt)],
        ];

        autoTable(doc, {
          startY: yPos,
          head: [["Parâmetro", "Valor"]],
          body: tableData,
          theme: "striped",
          headStyles: { fillColor: [0, 150, 180] },
          margin: { left: 20, right: 20 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      if (selectedModules.includes("gas") && gasReadings.length > 0) {
        if (yPos > 250) { doc.addPage(); yPos = 20; }

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Gás - Última Leitura", 20, yPos);
        yPos += 8;

        const latest = gasReadings[0];
        const tableData = [
          ["Nível", `${latest.level}%`],
          ["Disponível", `${latest.percentAvailable}%`],
          ["Data", formatDate(latest.createdAt)],
        ];

        autoTable(doc, {
          startY: yPos,
          head: [["Parâmetro", "Valor"]],
          body: tableData,
          theme: "striped",
          headStyles: { fillColor: [0, 150, 180] },
          margin: { left: 20, right: 20 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      if (selectedModules.includes("energia") && energyEvents.length > 0) {
        if (yPos > 250) { doc.addPage(); yPos = 20; }

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Energia - Status Atual", 20, yPos);
        yPos += 8;

        const latest = energyEvents[0];
        const statusLabel = latest.status === "ok" ? "Normal" : latest.status === "falta de energia" ? "Sem Energia" : "Meia Fase";
        const tableData = [
          ["Status", statusLabel],
          ["Descrição", latest.description || "-"],
          ["Data", formatDate(latest.createdAt)],
        ];

        autoTable(doc, {
          startY: yPos,
          head: [["Parâmetro", "Valor"]],
          body: tableData,
          theme: "striped",
          headStyles: { fillColor: [0, 150, 180] },
          margin: { left: 20, right: 20 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      if (selectedModules.includes("seguranca") && securityDevices.length > 0) {
        if (yPos > 220) { doc.addPage(); yPos = 20; }

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Segurança & Acessos", 20, yPos);
        yPos += 8;

        const securityStatusLabels: Record<string, string> = {
          "operacional": "Operacional",
          "atenção": "Atenção",
          "falha": "Falha",
          "inativo": "Inativo",
        };

        const securityTypeLabels: Record<string, string> = {
          "portão": "Portão",
          "porta": "Porta",
          "câmera": "Câmera",
          "facial": "Reconhecimento Facial",
        };

        const tableData = securityDevices.map(d => [
          d.name.substring(0, 25),
          securityTypeLabels[d.type] || d.type,
          d.location.substring(0, 20),
          securityStatusLabels[d.status] || d.status,
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Dispositivo", "Tipo", "Localização", "Status"]],
          body: tableData,
          theme: "striped",
          headStyles: { fillColor: [0, 150, 180] },
          margin: { left: 20, right: 20 },
          bodyStyles: { fontSize: 9 },
          didParseCell: (data: any) => {
            if (data.column.index === 3 && data.section === "body") {
              const status = data.cell.raw?.toLowerCase();
              if (status === "operacional") {
                data.cell.styles.textColor = [34, 197, 94];
              } else if (status === "atenção") {
                data.cell.styles.textColor = [234, 179, 8];
              } else if (status === "falha") {
                data.cell.styles.textColor = [239, 68, 68];
              } else if (status === "inativo") {
                data.cell.styles.textColor = [107, 114, 128];
              }
            }
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;

        const securityStatusCounts = {
          operacional: securityDevices.filter(d => d.status === "operacional").length,
          atencao: securityDevices.filter(d => d.status === "atenção").length,
          falha: securityDevices.filter(d => d.status === "falha").length,
          inativo: securityDevices.filter(d => d.status === "inativo").length,
        };

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Resumo: ${securityStatusCounts.operacional} operacionais | ${securityStatusCounts.atencao} em atenção | ${securityStatusCounts.falha} em falha | ${securityStatusCounts.inativo} inativos`, 20, yPos);
        yPos += 10;
      }

      if (selectedModules.includes("ocupacao") && occupancy) {
        if (yPos > 250) { doc.addPage(); yPos = 20; }

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Ocupação", 20, yPos);
        yPos += 8;

        const tableData = [
          ["Total de Unidades", String(occupancy.totalUnits)],
          ["Unidades Ocupadas", String(occupancy.occupiedUnits)],
          ["Unidades Vazias", String(occupancy.vacantUnits)],
          ["População Estimada", String(occupancy.estimatedPopulation)],
        ];

        autoTable(doc, {
          startY: yPos,
          head: [["Parâmetro", "Valor"]],
          body: tableData,
          theme: "striped",
          headStyles: { fillColor: [0, 150, 180] },
          margin: { left: 20, right: 20 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      if (selectedModules.includes("fornecedores") && suppliers.length > 0) {
        if (yPos > 220) { doc.addPage(); yPos = 20; }

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Fornecedores", 20, yPos);
        yPos += 8;

        const tableData = suppliers.slice(0, 10).map(s => [
          s.name.substring(0, 25),
          s.category,
          s.phone || "-",
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Nome", "Categoria", "Telefone"]],
          body: tableData,
          theme: "striped",
          headStyles: { fillColor: [0, 150, 180] },
          margin: { left: 20, right: 20 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      if (selectedModules.includes("comunicados") && announcements.length > 0) {
        if (yPos > 220) { doc.addPage(); yPos = 20; }

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Comunicados Recentes", 20, yPos);
        yPos += 8;

        const tableData = announcements.slice(0, 5).map(a => [
          a.title.substring(0, 30),
          a.priority,
          formatDate(a.createdAt),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Título", "Prioridade", "Data"]],
          body: tableData,
          theme: "striped",
          headStyles: { fillColor: [0, 150, 180] },
          margin: { left: 20, right: 20 },
        });
      }

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
      }

      doc.save(`relatorio-condominio-${new Date().toISOString().split("T")[0]}.pdf`);
      toast({ title: "PDF gerado com sucesso!" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const shareViaWhatsApp = () => {
    const modulesList = selectedModules.map(m => {
      const module = availableModules.find(mod => mod.id === m);
      return module?.label || m;
    }).join(", ");

    let message = `*Relatório do Condomínio - CONDOBASE1*\n`;
    message += `_Gerado em: ${formatDate(new Date())}_\n\n`;

    if (selectedModules.includes("ativos") && equipment.length > 0) {
      const operacional = equipment.filter(e => e.status === "operacional").length;
      const atencao = equipment.filter(e => e.status === "atenção").length;
      const alerta = equipment.filter(e => e.status === "alerta").length;
      message += `📦 *Ativos:* ${equipment.length} equipamentos (${operacional} ok, ${atencao} atenção, ${alerta} alerta)\n`;
    }

    if (selectedModules.includes("manutencoes")) {
      const openCount = maintenance.filter(m => m.status !== "concluído").length;
      message += `*Manutencoes:* ${openCount} chamados abertos\n`;
    }

    if (selectedModules.includes("manutencoes-realizadas") && maintenanceCompletions.length > 0) {
      message += `*Manutencoes Realizadas:* ${maintenanceCompletions.length} registros\n`;
    }

    if (selectedModules.includes("manutencao-preventiva") && (maintenancePlans.length > 0 || maintenanceExecutions.length > 0)) {
      const activePlans = maintenancePlans.filter(p => p.isActive).length;
      const completedExecutions = maintenanceExecutions.filter(e => e.status === "concluido").length;
      const overdueExecutions = maintenanceExecutions.filter(e => e.status === "atrasado").length;
      message += `*Manutencao Preventiva:* ${activePlans} planos ativos | ${completedExecutions} concluidas | ${overdueExecutions} atrasadas\n`;
    }

    if (selectedModules.includes("piscina") && poolReadings.length > 0) {
      const latest = poolReadings[0];
      message += `🏊 *Piscina:* pH ${latest.ph} | Cloro ${latest.chlorine} ppm\n`;
    }

    if (selectedModules.includes("agua") && waterReadings.length > 0) {
      const latest = waterReadings[0];
      message += `💧 *Água:* Nível ${latest.tankLevel}%\n`;
    }

    if (selectedModules.includes("gas") && gasReadings.length > 0) {
      const latest = gasReadings[0];
      message += `🔥 *Gás:* ${latest.percentAvailable}% disponível\n`;
    }

    if (selectedModules.includes("energia") && energyEvents.length > 0) {
      const latest = energyEvents[0];
      const status = latest.status === "ok" ? "Normal" : latest.status;
      message += `*Energia:* ${status}\n`;
    }

    if (selectedModules.includes("seguranca") && securityDevices.length > 0) {
      const operacional = securityDevices.filter(d => d.status === "operacional").length;
      const atencao = securityDevices.filter(d => d.status === "atenção").length;
      const falha = securityDevices.filter(d => d.status === "falha").length;
      message += `*Seguranca:* ${securityDevices.length} dispositivos (${operacional} ok, ${atencao} atencao, ${falha} falha)\n`;
    }

    if (selectedModules.includes("ocupacao") && occupancy) {
      message += `👥 *Ocupação:* ${occupancy.occupiedUnits}/${occupancy.totalUnits} unidades\n`;
    }

    if (selectedModules.includes("comunicados") && announcements.length > 0) {
      message += `📢 *Comunicados:* ${announcements.length} ativos\n`;
    }

    message += `\n_Módulos incluídos: ${modulesList}_`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  if (!canEdit) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center max-w-md">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Acesso Restrito</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Apenas síndicos e administradores podem gerar relatórios.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Gere relatórios resumidos do condomínio para exportar ou compartilhar"
        backHref="/"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-lg">Selecione os Módulos</CardTitle>
                <CardDescription>Escolha quais informações incluir no relatório</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll} data-testid="button-select-all">
                  Todos
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll} data-testid="button-deselect-all">
                  Nenhum
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {availableModules.map((module) => {
                  const isSelected = selectedModules.includes(module.id);
                  const Icon = module.icon;
                  return (
                    <div
                      key={module.id}
                      onClick={() => toggleModule(module.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? "border-cyan-500/50 bg-cyan-500/10"
                          : "border-border hover-elevate"
                      }`}
                      data-testid={`module-toggle-${module.id}`}
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        isSelected ? "bg-cyan-500/20 text-cyan-500" : "bg-muted text-muted-foreground"
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{module.label}</p>
                        <p className="text-xs text-muted-foreground">{module.description}</p>
                      </div>
                      {isSelected ? (
                        <CheckSquare className="h-5 w-5 text-cyan-500" />
                      ) : (
                        <Square className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Gerar Relatório</CardTitle>
              <CardDescription>
                {selectedModules.length} módulo(s) selecionado(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                className="w-full" 
                onClick={generatePDF} 
                disabled={isGenerating || selectedModules.length === 0}
                data-testid="button-generate-pdf"
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Baixar PDF
              </Button>
              <Button 
                variant="outline" 
                className="w-full text-green-600 border-green-600/30 hover:bg-green-600/10"
                onClick={shareViaWhatsApp}
                disabled={selectedModules.length === 0}
                data-testid="button-share-whatsapp"
              >
                <SiWhatsapp className="mr-2 h-4 w-4" />
                Compartilhar via WhatsApp
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-cyan-500" />
                Prévia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {selectedModules.length === 0 ? (
                  <p className="text-muted-foreground">Nenhum módulo selecionado</p>
                ) : (
                  selectedModules.map(moduleId => {
                    const module = availableModules.find(m => m.id === moduleId);
                    if (!module) return null;
                    const Icon = module.icon;
                    return (
                      <div key={moduleId} className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-cyan-500" />
                        <span>{module.label}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
