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
  Loader2,
  Phone,
  Shield,
  Building2,
} from "lucide-react";
import { DashboardTile } from "@/components/dashboard-tile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useModulePermissions } from "@/hooks/use-module-permissions";
import { useCondominium } from "@/hooks/use-condominium";

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
  const { selectedCondominium } = useCondominium();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center pb-4">
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="mt-2 h-5 w-48 mx-auto" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "Hoje";
    if (days === 1) return "Ontem";
    return `Há ${days} dias`;
  };

  const modules = [
    {
      title: "Ativos & Manutenções",
      icon: Wrench,
      href: "/manutencoes",
      color: "amber",
      testId: "tile-manutencoes",
      moduleKey: "manutencoes",
    },
    {
      title: "Piscina & Qualidade",
      icon: Waves,
      href: "/piscina",
      color: "cyan",
      testId: "tile-piscina",
      moduleKey: "piscina",
    },
    {
      title: "Água & Reservatórios",
      icon: Droplets,
      href: "/agua",
      color: "blue",
      testId: "tile-agua",
      moduleKey: "agua",
    },
    {
      title: "Gás",
      icon: Flame,
      href: "/gas",
      color: "orange",
      testId: "tile-gas",
      moduleKey: "gas",
    },
    {
      title: "Energia",
      icon: Zap,
      href: "/energia",
      color: "yellow",
      testId: "tile-energia",
      moduleKey: "energia",
    },
    {
      title: "Segurança & Acessos",
      icon: Shield,
      href: "/seguranca",
      color: "indigo",
      testId: "tile-seguranca",
      moduleKey: "seguranca",
    },
    {
      title: "Resíduos & Coleta",
      icon: Trash2,
      href: "/residuos",
      color: "green",
      testId: "tile-residuos",
      moduleKey: "residuos",
    },
    {
      title: "Ocupação & População",
      icon: Users,
      href: "/ocupacao",
      color: "purple",
      testId: "tile-ocupacao",
      moduleKey: "ocupacao",
    },
    {
      title: "Documentos & Licenças",
      icon: FileText,
      href: "/documentos",
      color: "red",
      testId: "tile-documentos",
      moduleKey: "documentos",
    },
    {
      title: "Fornecedores",
      icon: Phone,
      href: "/fornecedores",
      color: "indigo",
      testId: "tile-fornecedores",
      moduleKey: "fornecedores",
    },
    {
      title: "Comunicados",
      icon: Bell,
      href: "/comunicados",
      color: "cyan",
      testId: "tile-comunicados",
      moduleKey: "comunicados",
    },
  ];

  const filteredModules = modules.filter(m => canAccessModule(m.moduleKey));

  return (
    <div className="space-y-8 fade-in">
      <div className="flex items-center gap-3 pb-2 border-b border-border/50">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
          <Building2 className="h-5 w-5 text-cyan-500" />
        </div>
        <div>
          <h1 
            className="text-xl font-semibold text-foreground" 
            data-testid="text-dashboard-title"
          >
            {selectedCondominium?.name || "Painel de Controle"}
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2" data-testid="text-dashboard-subtitle">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {selectedCondominium ? "Painel de Controle" : "Selecione um condomínio"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredModules.map((module) => (
          <DashboardTile
            key={module.href}
            title={module.title}
            icon={module.icon}
            href={module.href}
            color={module.color}
            testId={module.testId}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {canAccessModule("comunicados") && (
          <Card className="relative overflow-visible">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-t-lg" />
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
                  <Bell className="h-4 w-4 text-cyan-500" />
                </div>
                Comunicados Recentes
              </CardTitle>
              <Badge variant="secondary" className="text-xs bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20" data-testid="badge-announcements-count">
                {data.recentAnnouncements.length} novos
              </Badge>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[180px] pr-4">
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
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-amber-600 dark:text-amber-400">
                    Atenção
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {data.expiringDocuments} documento(s) vencem nos próximos 30 dias.{" "}
                    <Link href="/documentos" className="underline font-medium text-amber-600 dark:text-amber-400">
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
  );
}
