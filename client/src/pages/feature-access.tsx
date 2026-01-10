import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Settings,
  Wrench,
  Waves,
  Droplet,
  Flame,
  Zap,
  Trash2,
  Users,
  FileText,
  Building2,
  Megaphone,
  Loader2,
  CheckCircle2,
  XCircle,
  LucideIcon,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ModulePermission } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

const iconMap: Record<string, LucideIcon> = {
  Wrench,
  Waves,
  Droplet,
  Flame,
  Zap,
  Trash2,
  Users,
  FileText,
  Building2,
  Megaphone,
};

export default function FeatureAccess() {
  const { toast } = useToast();
  const { userId, userRole } = useAuth();

  const isAdmin = userRole === "admin" || userRole === "síndico";

  if (!isAdmin) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <ShieldAlert className="h-16 w-16 text-red-500" />
        <h1 className="text-2xl font-bold">Acesso Restrito</h1>
        <p className="text-muted-foreground text-center max-w-md">
          Apenas síndicos e administradores podem acessar o controle de funcionalidades.
        </p>
        <Button asChild>
          <Link href="/">Voltar ao Dashboard</Link>
        </Button>
      </div>
    );
  }

  const { data: permissions = [], isLoading } = useQuery<ModulePermission[]>({
    queryKey: ["/api/module-permissions"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ moduleKey, isEnabled }: { moduleKey: string; isEnabled: boolean }) => {
      return apiRequest("PATCH", `/api/module-permissions/${moduleKey}`, { 
        isEnabled,
        updatedBy: userId 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/module-permissions"] });
    },
    onError: () => {
      toast({ 
        title: "Erro ao atualizar permissão", 
        variant: "destructive" 
      });
    },
  });

  const enabledCount = permissions.filter(p => p.isEnabled).length;
  const disabledCount = permissions.filter(p => !p.isEnabled).length;

  const handleToggle = (moduleKey: string, currentState: boolean) => {
    updateMutation.mutate({ moduleKey, isEnabled: !currentState });
    toast({
      title: !currentState ? "Módulo habilitado" : "Módulo desabilitado",
      description: `Os condôminos ${!currentState ? "agora podem" : "não podem mais"} acessar este módulo.`,
    });
  };

  const handleEnableAll = () => {
    permissions.forEach(permission => {
      if (!permission.isEnabled) {
        updateMutation.mutate({ moduleKey: permission.moduleKey, isEnabled: true });
      }
    });
    toast({ title: "Todos os módulos foram habilitados" });
  };

  const handleDisableAll = () => {
    permissions.forEach(permission => {
      if (permission.isEnabled) {
        updateMutation.mutate({ moduleKey: permission.moduleKey, isEnabled: false });
      }
    });
    toast({ title: "Todos os módulos foram desabilitados" });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-cyan-400 dark:to-blue-500 bg-clip-text text-transparent" data-testid="text-page-title">
            Controle de Acesso
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie quais funcionalidades estão disponíveis para os condôminos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleEnableAll}
            disabled={updateMutation.isPending}
            data-testid="button-enable-all"
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Habilitar Todos
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDisableAll}
            disabled={updateMutation.isPending}
            data-testid="button-disable-all"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Desabilitar Todos
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Módulos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-cyan-500" data-testid="text-total-modules">{permissions.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Habilitados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500" data-testid="text-enabled-count">{enabledCount}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-rose-500/10 border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Desabilitados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500" data-testid="text-disabled-count">{disabledCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-cyan-500" />
            Módulos do Sistema
          </CardTitle>
          <CardDescription>
            Ative ou desative os módulos que os condôminos podem acessar. As alterações são aplicadas imediatamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {permissions.map((permission) => {
              const IconComponent = iconMap[permission.moduleIcon || "Settings"] || Settings;
              return (
                <div
                  key={permission.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                    permission.isEnabled 
                      ? "bg-card border-green-500/30 hover:border-green-500/50" 
                      : "bg-muted/30 border-muted hover:border-muted-foreground/30"
                  }`}
                  data-testid={`module-card-${permission.moduleKey}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      permission.isEnabled 
                        ? "bg-cyan-500/10 text-cyan-500" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className={`font-medium ${!permission.isEnabled && "text-muted-foreground"}`}>
                        {permission.moduleLabel}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {permission.isEnabled ? "Acessível para condôminos" : "Bloqueado para condôminos"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={permission.isEnabled}
                    onCheckedChange={() => handleToggle(permission.moduleKey, permission.isEnabled)}
                    disabled={updateMutation.isPending}
                    data-testid={`switch-${permission.moduleKey}`}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="text-amber-500 text-sm font-medium">Nota Importante</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Os módulos desabilitados não aparecerão no menu lateral dos condôminos e eles não terão acesso às respectivas páginas.
            Síndicos e administradores sempre terão acesso completo a todos os módulos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
