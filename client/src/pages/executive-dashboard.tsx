import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { useCondominium } from "@/hooks/use-condominium";
import { 
  BarChart3, Target, Wallet, CheckSquare, FolderOpen, Search,
  Building2, Users, Briefcase, FileText, Wrench, DollarSign,
  Zap, Droplet, FileSignature, AlertTriangle, TrendingUp
} from "lucide-react";
import { 
  ResponsiveContainer, 
  RadarChart as RechartsRadar, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActionItem {
  id: string;
  text: string;
  responsible: string;
  deadline: string;
  urgent: boolean;
  completed: boolean;
}

interface EconomyItem {
  category: string;
  description: string;
  value: number;
  icon: "energy" | "water" | "contracts" | "maintenance";
}

interface DossierMetric {
  label: string;
  value: string | number;
  icon: "building" | "users" | "briefcase" | "contracts" | "equipment" | "documents" | "revenue" | "default";
}

const iconMap = {
  energy: Zap,
  water: Droplet,
  contracts: FileSignature,
  maintenance: Wrench,
  building: Building2,
  users: Users,
  briefcase: Briefcase,
  equipment: Wrench,
  documents: FileText,
  revenue: DollarSign,
  default: BarChart3
};

export default function ExecutiveDashboard() {
  const { selectedCondominium } = useCondominium();
  
  const [actionItems, setActionItems] = useState<ActionItem[]>([
    { id: "1", text: "Renovar certificado do AVCB", responsible: "Síndico", deadline: "15/02", urgent: true, completed: false },
    { id: "2", text: "Trocar lâmpadas por LED", responsible: "Zelador", deadline: "28/02", urgent: false, completed: false },
    { id: "3", text: "Convocar assembleia ordinária", responsible: "Administração", deadline: "10/03", urgent: false, completed: false },
    { id: "4", text: "Revisar contratos de fornecedores", responsible: "Síndico", deadline: "20/03", urgent: false, completed: false },
    { id: "5", text: "Manutenção preventiva elevadores", responsible: "Zelador", deadline: "25/03", urgent: false, completed: false },
  ]);

  const { data: teamMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/team-members"],
  });

  const { data: equipment = [] } = useQuery<any[]>({
    queryKey: ["/api/equipment"],
  });

  const { data: documents = [] } = useQuery<any[]>({
    queryKey: ["/api/documents"],
  });

  const { data: suppliers = [] } = useQuery<any[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: maintenanceStats } = useQuery<any>({
    queryKey: ["/api/maintenance-statistics"],
  });

  const maturityScore = 90;
  const maturityLabel = maturityScore >= 85 ? "EXCELENTE" : maturityScore >= 70 ? "BOM" : maturityScore >= 50 ? "REGULAR" : "CRÍTICO";

  const radarData = [
    { subject: "Financeiro", value: 85 },
    { subject: "Operacional", value: 92 },
    { subject: "Legal", value: 78 },
    { subject: "Manutenção", value: 88 },
    { subject: "Segurança", value: 95 },
    { subject: "Satisfação", value: 90 },
  ];

  const economyItems: EconomyItem[] = [
    { category: "Energia", description: "LED + Sensores", value: 1200, icon: "energy" },
    { category: "Água", description: "Reuso + Redutores", value: 800, icon: "water" },
    { category: "Contratos", description: "Renegociação", value: 1500, icon: "contracts" },
    { category: "Manutenção", description: "Preventiva", value: 600, icon: "maintenance" },
  ];

  const totalEconomy = economyItems.reduce((sum, item) => sum + item.value, 0);

  const dossierMetrics: DossierMetric[] = useMemo(() => [
    { label: "Unidades", value: selectedCondominium?.totalUnits || 84, icon: "building" },
    { label: "Moradores", value: Math.round((selectedCondominium?.totalUnits || 84) * 3.7), icon: "users" },
    { label: "Funcionários", value: teamMembers.length || 12, icon: "briefcase" },
    { label: "Contratos", value: suppliers.length || 18, icon: "contracts" },
    { label: "Equipamentos", value: equipment.length || 45, icon: "equipment" },
    { label: "Documentos", value: documents.length || 156, icon: "documents" },
    { label: "Receita Mensal", value: `R$ ${Math.round((selectedCondominium?.totalUnits || 84) * 1060 / 1000)}k`, icon: "revenue" },
    { label: "Inadimplência", value: "5%", icon: "default" },
  ], [selectedCondominium, teamMembers, suppliers, equipment, documents]);

  const monthlyScoreData = [
    { month: "Jan", score: 82 },
    { month: "Fev", score: 85 },
    { month: "Mar", score: 87 },
    { month: "Abr", score: 89 },
    { month: "Mai", score: 88 },
    { month: "Jun", score: 90 },
  ];

  const scoreChartData = [
    { name: "Score", value: maturityScore },
    { name: "Restante", value: 100 - maturityScore },
  ];

  const toggleAction = (id: string) => {
    setActionItems(items => 
      items.map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const getStatusBadge = () => {
    if (maturityScore >= 85) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Excelente</Badge>;
    if (maturityScore >= 70) return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">Bom</Badge>;
    if (maturityScore >= 50) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">Regular</Badge>;
    return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">Crítico</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-primary/5 to-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="border-0 shadow-lg" data-testid="card-header">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl md:text-3xl font-bold text-primary flex items-center justify-center gap-2" data-testid="text-executive-title">
              <BarChart3 className="w-8 h-8" />
              O Raio-X Completo do Ecossistema Condominial
            </CardTitle>
            <CardDescription className="text-base">
              {selectedCondominium?.name || "Condomínio"} - Diagnóstico técnico, financeiro e operacional gerado automaticamente.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="shadow-md hover-elevate" data-testid="card-maturity-index">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
                <BarChart3 className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Índice de Maturidade</CardTitle>
                <CardDescription className="text-xs">Score de crédito do condomínio</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative w-36 h-36 mx-auto my-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={scoreChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={60}
                      paddingAngle={0}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      <Cell fill="hsl(var(--primary))" />
                      <Cell fill="hsl(var(--muted))" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-primary">{maturityScore}%</span>
                  <span className="text-xs text-muted-foreground">{maturityLabel}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Adimplência</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">95%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Satisfação</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">88%</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Gestão</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">92%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md hover-elevate" data-testid="card-risk-map">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
                <Target className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Mapa de Riscos</CardTitle>
                <CardDescription className="text-xs">Operacionais, legais e financeiros</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsRadar cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="hsl(var(--muted-foreground) / 0.3)" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 100]} 
                      tick={false}
                    />
                    <Radar
                      name="Nível"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </RechartsRadar>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md hover-elevate" data-testid="card-economy">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
                <Wallet className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Oportunidades de Economia</CardTitle>
                <CardDescription className="text-xs">Redução clara de custos</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {economyItems.map((item, index) => {
                  const Icon = iconMap[item.icon];
                  return (
                    <div 
                      key={index}
                      className="flex justify-between items-center p-3 bg-primary/5 rounded-lg"
                      data-testid={`economy-item-${index}`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-primary" />
                        <div>
                          <div className="text-sm font-medium">{item.category}</div>
                          <div className="text-xs text-muted-foreground">{item.description}</div>
                        </div>
                      </div>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        R$ {item.value.toLocaleString("pt-BR")}/mês
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                <div className="text-sm text-muted-foreground">Economia Potencial Total</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  R$ {totalEconomy.toLocaleString("pt-BR")}/mês
                </div>
                <div className="text-xs text-muted-foreground">
                  R$ {(totalEconomy * 12).toLocaleString("pt-BR")}/ano
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md hover-elevate" data-testid="card-action-plan">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
                <CheckSquare className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Plano de Ação</CardTitle>
                <CardDescription className="text-xs">O que fazer, por quem e quando</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {actionItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border-l-4 transition-opacity ${
                      item.urgent 
                        ? "bg-red-50 dark:bg-red-900/20 border-l-red-500" 
                        : "bg-muted/50 border-l-primary"
                    } ${item.completed ? "opacity-50" : ""}`}
                    data-testid={`action-item-${item.id}`}
                  >
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => toggleAction(item.id)}
                      data-testid={`checkbox-action-${item.id}`}
                    />
                    <div className="flex-1">
                      <div className={`text-sm ${item.completed ? "line-through" : ""}`}>
                        {item.text}
                      </div>
                      <div className="text-xs text-muted-foreground italic">
                        {item.responsible} - Até {item.deadline}
                      </div>
                    </div>
                    {item.urgent && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md hover-elevate md:col-span-2" data-testid="card-dossier">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
                <FolderOpen className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Dossiê Permanente</CardTitle>
                <CardDescription className="text-xs">A base para uma sucessão segura</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {dossierMetrics.map((metric, index) => {
                  const Icon = iconMap[metric.icon] || iconMap.default;
                  return (
                    <div 
                      key={index}
                      className="text-center p-4 bg-muted/50 rounded-lg"
                      data-testid={`dossier-metric-${index}`}
                    >
                      <Icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <div className="text-xs text-muted-foreground mb-1">{metric.label}</div>
                      <div className="text-xl font-bold">{metric.value}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md hover-elevate" data-testid="card-diagnostic">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
                <Search className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Diagnóstico ImobCore</CardTitle>
                <CardDescription className="text-xs">Análise centralizada</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-48 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyScoreData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <Bar 
                      dataKey="score" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Status Geral</span>
                  {getStatusBadge()}
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Última Atualização</span>
                  <span className="font-medium text-sm">
                    {format(new Date(), "dd/MM/yyyy, HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Próxima Análise</span>
                  <span className="font-medium text-sm">01/02/2026</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
