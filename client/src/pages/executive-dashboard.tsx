import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Target,
  Landmark,
  DollarSign,
  Wrench,
  ScrollText,
  Scale,
  Zap,
  Megaphone,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useCondominium } from "@/hooks/use-condominium";

interface PillarScore {
  pillar: string;
  score: number;
  riskLevel: string;
  maturityLevel: string;
  weight: number;
}

interface SmartAlert {
  id: string;
  pillar: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  suggestedAction: string;
  financialImpact: number | null;
  createdAt: string;
}

interface ExecutiveDashboardData {
  overallScore: number;
  maturityLevel: string;
  pillarScores: PillarScore[];
  alerts: SmartAlert[];
  financialImpact: number;
  riskDistribution: {
    high: number;
    medium: number;
    low: number;
  };
}

const pillarConfig: Record<string, { label: string; icon: any; color: string }> = {
  governanca: { label: "Governança", icon: Landmark, color: "emerald" },
  financeiro: { label: "Financeiro", icon: DollarSign, color: "blue" },
  manutencao: { label: "Manutenção", icon: Wrench, color: "amber" },
  contratos: { label: "Contratos", icon: ScrollText, color: "purple" },
  conformidade: { label: "Conformidade", icon: Scale, color: "red" },
  operacao: { label: "Operação", icon: Zap, color: "cyan" },
  transparencia: { label: "Transparência", icon: Megaphone, color: "indigo" },
};

const maturityLabels: Record<string, { label: string; color: string }> = {
  iniciante: { label: "Iniciante", color: "red" },
  em_evolucao: { label: "Em Evolução", color: "amber" },
  estruturado: { label: "Estruturado", color: "blue" },
  inteligente: { label: "Inteligente", color: "emerald" },
};

function RadarChart({ scores }: { scores: PillarScore[] }) {
  const size = 280;
  const center = size / 2;
  const maxRadius = 100;
  const levels = 4;

  const pillars = scores.length > 0 ? scores : Object.keys(pillarConfig).map(k => ({
    pillar: k,
    score: 0,
    riskLevel: "baixo",
    maturityLevel: "iniciante",
    weight: pillarConfig[k] ? 15 : 0,
  }));

  const angleStep = (2 * Math.PI) / pillars.length;

  const getPoint = (index: number, value: number) => {
    const angle = index * angleStep - Math.PI / 2;
    const radius = (value / 100) * maxRadius;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  const polygonPoints = pillars
    .map((p, i) => {
      const point = getPoint(i, p.score);
      return `${point.x},${point.y}`;
    })
    .join(" ");

  return (
    <div className="relative">
      <svg width={size} height={size} className="mx-auto">
        {[...Array(levels)].map((_, i) => {
          const radius = ((i + 1) / levels) * maxRadius;
          const points = pillars
            .map((_, j) => {
              const angle = j * angleStep - Math.PI / 2;
              return `${center + radius * Math.cos(angle)},${center + radius * Math.sin(angle)}`;
            })
            .join(" ");
          return (
            <polygon
              key={i}
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-border/50"
            />
          );
        })}

        {pillars.map((_, i) => {
          const end = getPoint(i, 100);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={end.x}
              y2={end.y}
              stroke="currentColor"
              strokeWidth="1"
              className="text-border/30"
            />
          );
        })}

        <polygon
          points={polygonPoints}
          fill="hsl(var(--primary) / 0.2)"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
        />

        {pillars.map((p, i) => {
          const point = getPoint(i, p.score);
          return (
            <circle
              key={i}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="hsl(var(--primary))"
            />
          );
        })}

        {pillars.map((p, i) => {
          const config = pillarConfig[p.pillar];
          const labelPoint = getPoint(i, 130);
          return (
            <text
              key={i}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground text-[10px] font-medium"
            >
              {config?.label || p.pillar}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function PillarCard({ pillar }: { pillar: PillarScore }) {
  const config = pillarConfig[pillar.pillar];
  if (!config) return null;

  const Icon = config.icon;
  const scoreColor = pillar.score >= 70 ? "text-emerald-600" : pillar.score >= 40 ? "text-amber-600" : "text-red-600";
  const TrendIcon = pillar.score >= 70 ? TrendingUp : pillar.score >= 40 ? Minus : TrendingDown;

  return (
    <Card className="hover-elevate cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-${config.color}-500/10`}>
            <Icon className={`h-4 w-4 text-${config.color}-500`} />
          </div>
          <Badge 
            variant={pillar.riskLevel === "alto" ? "destructive" : pillar.riskLevel === "medio" ? "secondary" : "outline"}
            className="text-xs"
          >
            {pillar.riskLevel === "alto" ? "Alto Risco" : pillar.riskLevel === "medio" ? "Médio" : "Baixo"}
          </Badge>
        </div>
        <h3 className="font-medium text-sm mb-1">{config.label}</h3>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${scoreColor}`}>{pillar.score}</span>
          <TrendIcon className={`h-4 w-4 ${scoreColor}`} />
        </div>
        <Progress value={pillar.score} className="mt-2 h-1.5" />
        <p className="text-xs text-muted-foreground mt-2">Peso: {pillar.weight}%</p>
      </CardContent>
    </Card>
  );
}

export default function ExecutiveDashboard() {
  const { selectedCondominium } = useCondominium();

  const { data, isLoading, error } = useQuery<ExecutiveDashboardData>({
    queryKey: ["/api/executive-dashboard"],
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3 pb-2 border-b">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32 mt-1" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 col-span-1" />
          <Skeleton className="h-80 col-span-2" />
        </div>
      </div>
    );
  }

  const dashboardData: ExecutiveDashboardData = data || {
    overallScore: 65,
    maturityLevel: "em_evolucao",
    pillarScores: [
      { pillar: "governanca", score: 72, riskLevel: "baixo", maturityLevel: "estruturado", weight: 20 },
      { pillar: "financeiro", score: 58, riskLevel: "medio", maturityLevel: "em_evolucao", weight: 20 },
      { pillar: "manutencao", score: 85, riskLevel: "baixo", maturityLevel: "inteligente", weight: 20 },
      { pillar: "contratos", score: 45, riskLevel: "alto", maturityLevel: "iniciante", weight: 15 },
      { pillar: "conformidade", score: 62, riskLevel: "medio", maturityLevel: "em_evolucao", weight: 15 },
      { pillar: "operacao", score: 78, riskLevel: "baixo", maturityLevel: "estruturado", weight: 5 },
      { pillar: "transparencia", score: 70, riskLevel: "baixo", maturityLevel: "estruturado", weight: 5 },
    ],
    alerts: [
      { id: "1", pillar: "contratos", category: "vencimento_contrato", severity: "alto", title: "Contrato de manutenção vence em 15 dias", description: "O contrato com ElevaTec está próximo do vencimento.", suggestedAction: "Iniciar negociação de renovação", financialImpact: 15000, createdAt: new Date().toISOString() },
      { id: "2", pillar: "conformidade", category: "vencimento_documento", severity: "medio", title: "AVCB precisa ser renovado", description: "O AVCB do condomínio vence no próximo mês.", suggestedAction: "Agendar vistoria do Corpo de Bombeiros", financialImpact: 2500, createdAt: new Date().toISOString() },
      { id: "3", pillar: "financeiro", category: "orcamento_excedido", severity: "medio", title: "Orçamento de manutenção excedido em 12%", description: "Gastos com manutenção acima do planejado.", suggestedAction: "Revisar planejamento orçamentário", financialImpact: 8000, createdAt: new Date().toISOString() },
    ],
    financialImpact: 25500,
    riskDistribution: { high: 1, medium: 2, low: 4 },
  };

  const maturity = maturityLabels[dashboardData.maturityLevel] || maturityLabels.iniciante;

  return (
    <div className="space-y-8 fade-in">
      <div className="flex items-center gap-3 pb-2 border-b border-border/50">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20">
          <Target className="h-5 w-5 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground" data-testid="text-executive-title">
            {selectedCondominium?.name || "Painel Executivo"}
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Sistema Operacional Inteligente
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="relative overflow-visible">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 rounded-t-lg" />
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>Score Geral</span>
              <Badge className={`bg-${maturity.color}-500/10 text-${maturity.color}-600 border-${maturity.color}-500/20`}>
                {maturity.label}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="text-5xl font-bold text-center">{dashboardData.overallScore}</div>
                <Progress value={dashboardData.overallScore} className="mt-2 h-2" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t">
              <div className="text-center">
                <div className="text-xl font-bold text-red-600">{dashboardData.riskDistribution.high}</div>
                <p className="text-xs text-muted-foreground">Alto Risco</p>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-amber-600">{dashboardData.riskDistribution.medium}</div>
                <p className="text-xs text-muted-foreground">Médio</p>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-emerald-600">{dashboardData.riskDistribution.low}</div>
                <p className="text-xs text-muted-foreground">Baixo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 relative overflow-visible">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 rounded-t-lg" />
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Radar dos 7 Pilares</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <RadarChart scores={dashboardData.pillarScores} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {dashboardData.pillarScores.map((pillar) => (
          <PillarCard key={pillar.pillar} pillar={pillar} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="relative overflow-visible">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 via-amber-500 to-yellow-500 rounded-t-lg" />
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              Alertas Inteligentes
            </CardTitle>
            <Badge variant="destructive" className="text-xs">
              {dashboardData.alerts.length} pendentes
            </Badge>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px] pr-4">
              <div className="space-y-3">
                {dashboardData.alerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum alerta pendente
                  </p>
                ) : (
                  dashboardData.alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start gap-3 rounded-lg p-3 border hover-elevate cursor-pointer"
                      data-testid={`alert-${alert.id}`}
                    >
                      <div
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                          alert.severity === "alto" || alert.severity === "critico"
                            ? "bg-red-500"
                            : alert.severity === "medio"
                            ? "bg-amber-500"
                            : "bg-blue-500"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium leading-tight">{alert.title}</p>
                          {alert.financialImpact && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              R$ {alert.financialImpact.toLocaleString()}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                        {alert.suggestedAction && (
                          <p className="text-xs text-primary mt-1 font-medium">
                            Sugestão: {alert.suggestedAction}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="relative overflow-visible">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-t-lg" />
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
                <DollarSign className="h-4 w-4 text-blue-500" />
              </div>
              Impacto Financeiro Estimado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center py-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">
                  R$ {dashboardData.financialImpact.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Total de riscos identificados
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <Link href="/financeiro" className="block">
                <div className="rounded-lg p-3 border hover-elevate cursor-pointer text-center">
                  <DollarSign className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                  <p className="text-sm font-medium">Ver Financeiro</p>
                </div>
              </Link>
              <Link href="/contratos" className="block">
                <div className="rounded-lg p-3 border hover-elevate cursor-pointer text-center">
                  <ScrollText className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                  <p className="text-sm font-medium">Ver Contratos</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
