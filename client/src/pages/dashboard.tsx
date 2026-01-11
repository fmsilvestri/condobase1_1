import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Wrench,
  Waves,
  Droplets,
  Flame,
  Zap,
  Trash2,
  Users,
  FileText,
  AlertTriangle,
  Bell,
  Calendar,
  Loader2,
  Phone,
} from "lucide-react";
import { ModuleCard } from "@/components/module-card";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useModulePermissions } from "@/hooks/use-module-permissions";

interface DashboardData {
  openRequests: number;
  totalEquipment: number;
  latestPoolReading?: { ph: number; chlorine: number };
  latestWaterReading?: { tankLevel: number };
  latestGasReading?: { level: number };
  currentEnergyStatus: string;
  occupancy?: { occupiedUnits: number; totalUnits: number };
  expiringDocuments: number;
  recentAnnouncements: Array<{
    id: string;
    title: string;
    priority: string;
    createdAt: string;
  }>;
}

export default function Dashboard() {
  const { data: dashboardData, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });
  const { canAccessModule } = useModulePermissions();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="mt-2 h-5 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-36" />
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-lg font-semibold">Erro ao carregar dados</h2>
        <p className="text-muted-foreground">Tente recarregar a página.</p>
      </div>
    );
  }

  const data = dashboardData!;

  const getPoolStatus = () => {
    if (!data.latestPoolReading) return "ok";
    const ph = data.latestPoolReading.ph;
    if (ph >= 7.2 && ph <= 7.6) return "ok";
    if (ph >= 6.8 && ph <= 8.0) return "atenção";
    return "alerta";
  };

  const getWaterStatus = () => {
    if (!data.latestWaterReading) return "ok";
    const level = data.latestWaterReading.tankLevel;
    if (level >= 70) return "ok";
    if (level >= 40) return "atenção";
    return "alerta";
  };

  const getMaintenanceStatus = () => {
    if (data.openRequests === 0) return "ok";
    if (data.openRequests <= 3) return "atenção";
    return "alerta";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "Hoje";
    if (days === 1) return "Ontem";
    return `Há ${days} dias`;
  };

  return (
    <div className="space-y-8 fade-in">
      <div className="relative">
        <h1 
          className="text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 bg-clip-text text-transparent" 
          data-testid="text-dashboard-title"
        >
          Dashboard
        </h1>
        <p className="text-muted-foreground flex items-center gap-2" data-testid="text-dashboard-subtitle">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Visão geral do condomínio
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {canAccessModule("manutencoes") && (
          <StatCard
            title="Chamados Abertos"
            value={data.openRequests}
            icon={Wrench}
            color="amber"
            testId="stat-chamados"
          />
        )}
        {canAccessModule("ocupacao") && (
          <StatCard
            title="Unidades Ocupadas"
            value={`${data.occupancy?.occupiedUnits || 0}/${data.occupancy?.totalUnits || 0}`}
            icon={Users}
            color="green"
            testId="stat-ocupacao"
          />
        )}
        {canAccessModule("gas") && (
          <StatCard
            title="Nível de Gás"
            value={`${data.latestGasReading?.level || 0}%`}
            icon={Flame}
            color="blue"
            testId="stat-gas"
          />
        )}
        {canAccessModule("documentos") && (
          <StatCard
            title="Documentos a Vencer"
            value={data.expiringDocuments}
            icon={FileText}
            color="red"
            testId="stat-documentos"
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
              <span className="h-5 w-1 rounded-full bg-gradient-to-b from-cyan-500 to-blue-500" />
              Módulos do Sistema
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {canAccessModule("manutencoes") && (
                <ModuleCard
                  title="Ativos & Manutenções"
                  description="Equipamentos e chamados"
                  icon={Wrench}
                  status={getMaintenanceStatus()}
                  value={data.openRequests}
                  unit="chamados"
                  href="/manutencoes"
                  color="amber"
                  testId="card-manutencoes"
                />
              )}
              {canAccessModule("piscina") && (
                <ModuleCard
                  title="Piscina & Qualidade"
                  description="Leituras e análises"
                  icon={Waves}
                  status={getPoolStatus()}
                  value={data.latestPoolReading?.ph || 0}
                  unit="pH"
                  href="/piscina"
                  color="cyan"
                  testId="card-piscina"
                />
              )}
              {canAccessModule("agua") && (
                <ModuleCard
                  title="Água & Reservatórios"
                  description="Níveis e qualidade"
                  icon={Droplets}
                  status={getWaterStatus()}
                  value={data.latestWaterReading?.tankLevel || 0}
                  unit="%"
                  href="/agua"
                  color="blue"
                  testId="card-agua"
                />
              )}
              {canAccessModule("energia") && (
                <ModuleCard
                  title="Energia"
                  description="Status e ocorrências"
                  icon={Zap}
                  status={data.currentEnergyStatus === "ok" ? "ok" : "alerta"}
                  value={data.currentEnergyStatus === "ok" ? "OK" : "Alerta"}
                  href="/energia"
                  color="yellow"
                  testId="card-energia"
                />
              )}
              {canAccessModule("gas") && (
                <ModuleCard
                  title="Gás"
                  description="Nível e histórico"
                  icon={Flame}
                  status={data.latestGasReading && data.latestGasReading.level < 30 ? "alerta" : "ok"}
                  value={data.latestGasReading?.level || 0}
                  unit="%"
                  href="/gas"
                  color="orange"
                  testId="card-gas"
                />
              )}
              {canAccessModule("residuos") && (
                <ModuleCard
                  title="Resíduos & Coleta"
                  description="Regras e calendário"
                  icon={Trash2}
                  href="/residuos"
                  color="green"
                  testId="card-residuos"
                />
              )}
              {canAccessModule("ocupacao") && (
                <ModuleCard
                  title="Ocupação & População"
                  description="Unidades e consumo"
                  icon={Users}
                  value={data.occupancy?.occupiedUnits || 0}
                  unit="unid."
                  href="/ocupacao"
                  color="purple"
                  testId="card-ocupacao"
                />
              )}
              {canAccessModule("documentos") && (
                <ModuleCard
                  title="Documentos & Licenças"
                  description="Certificados e alvarás"
                  icon={FileText}
                  status={data.expiringDocuments > 0 ? "atenção" : "ok"}
                  value={data.expiringDocuments}
                  unit="a vencer"
                  href="/documentos"
                  color="red"
                  testId="card-documentos"
                />
              )}
              {canAccessModule("fornecedores") && (
                <ModuleCard
                  title="Fornecedores"
                  description="Contatos e serviços"
                  icon={Phone}
                  href="/fornecedores"
                  color="indigo"
                  testId="card-fornecedores"
                />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {canAccessModule("comunicados") && (
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
                    <Bell className="h-4 w-4 text-cyan-500" />
                  </div>
                  Comunicados
                </CardTitle>
                <Badge variant="secondary" className="text-xs bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20" data-testid="badge-announcements-count">
                  {data.recentAnnouncements.length} novos
                </Badge>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px] pr-4">
                  <div className="space-y-3">
                    {data.recentAnnouncements.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum comunicado recente.
                      </p>
                    ) : (
                      data.recentAnnouncements.map((announcement) => (
                        <Link key={announcement.id} href="/comunicados">
                          <div
                            className="flex items-start gap-3 rounded-lg p-2 hover-elevate cursor-pointer"
                            data-testid={`announcement-${announcement.id}`}
                          >
                            <div
                              className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                                announcement.priority === "alta"
                                  ? "bg-red-500"
                                  : "bg-blue-500"
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium leading-tight">
                                {announcement.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatDate(announcement.createdAt)}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {canAccessModule("documentos") && data.expiringDocuments > 0 && (
            <Card className="border-amber-500/50 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-amber-600 dark:text-amber-400">
                      Atenção
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {data.expiringDocuments} documento(s) vencem nos próximos 30 dias.{" "}
                      <Link href="/documentos" className="underline">
                        Ver documentos
                      </Link>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
