import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Bell, BellOff, Loader2, Smartphone, AlertTriangle, Wrench, Megaphone } from "lucide-react";
import { apiRequest, getAuthHeaders } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface NotificationPreferences {
  id?: string;
  announcements: boolean;
  maintenanceUpdates: boolean;
  urgentMessages: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

export default function NotificationSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const {
    isSupported,
    isSubscribed,
    isLoading: isPushLoading,
    permission,
    subscribe,
    unsubscribe,
    isSubscribing,
    isUnsubscribing,
    error: pushError,
  } = usePushNotifications();

  const { data: preferences, isLoading: isPrefsLoading } = useQuery<NotificationPreferences>({
    queryKey: ["/api/notification-preferences"],
    queryFn: async () => {
      const res = await fetch("/api/notification-preferences", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch preferences");
      return res.json();
    },
  });

  const [localPrefs, setLocalPrefs] = useState<NotificationPreferences>({
    announcements: true,
    maintenanceUpdates: true,
    urgentMessages: true,
    quietHoursStart: null,
    quietHoursEnd: null,
  });

  useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences);
    }
  }, [preferences]);

  const updatePrefsMutation = useMutation({
    mutationFn: async (prefs: Partial<NotificationPreferences>) => {
      return apiRequest("PUT", "/api/notification-preferences", prefs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-preferences"] });
      toast({
        title: "Preferências salvas",
        description: "Suas preferências de notificação foram atualizadas.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as preferências.",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (key: keyof NotificationPreferences) => {
    const newValue = !localPrefs[key];
    setLocalPrefs(prev => ({ ...prev, [key]: newValue }));
    updatePrefsMutation.mutate({ [key]: newValue });
  };

  const handleQuietHoursChange = (key: "quietHoursStart" | "quietHoursEnd", value: string) => {
    setLocalPrefs(prev => ({ ...prev, [key]: value || null }));
  };

  const saveQuietHours = () => {
    updatePrefsMutation.mutate({
      quietHoursStart: localPrefs.quietHoursStart,
      quietHoursEnd: localPrefs.quietHoursEnd,
    });
  };

  const handleSubscribe = () => {
    subscribe();
    toast({
      title: "Ativando notificações...",
      description: "Aguarde enquanto ativamos as notificações push.",
    });
  };

  const handleUnsubscribe = () => {
    unsubscribe();
    toast({
      title: "Desativando notificações...",
      description: "As notificações push foram desativadas.",
    });
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <PageHeader
        title="Configurações de Notificação"
        description="Gerencie suas preferências de notificações"
        backHref="/"
      />

      <div className="space-y-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Notificações Push
            </CardTitle>
            <CardDescription>
              Receba notificações mesmo quando não estiver no aplicativo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isPushLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verificando status...
              </div>
            ) : !isSupported ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <BellOff className="h-4 w-4" />
                Seu navegador não suporta notificações push
              </div>
            ) : permission === "denied" ? (
              <div className="flex items-center gap-2 text-destructive">
                <BellOff className="h-4 w-4" />
                Notificações bloqueadas. Altere nas configurações do navegador.
              </div>
            ) : isSubscribed ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <Bell className="h-4 w-4" />
                  Notificações push ativadas
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnsubscribe}
                  disabled={isUnsubscribing}
                  data-testid="button-unsubscribe-push"
                >
                  {isUnsubscribing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <BellOff className="h-4 w-4 mr-2" />
                  )}
                  Desativar
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BellOff className="h-4 w-4" />
                  Notificações push desativadas
                </div>
                <Button
                  onClick={handleSubscribe}
                  disabled={isSubscribing}
                  data-testid="button-subscribe-push"
                >
                  {isSubscribing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Bell className="h-4 w-4 mr-2" />
                  )}
                  Ativar
                </Button>
              </div>
            )}
            {pushError && (
              <p className="text-sm text-destructive mt-2">
                Erro: {(pushError as Error).message}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tipos de Notificação</CardTitle>
            <CardDescription>
              Escolha quais tipos de notificação você deseja receber
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isPrefsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando preferências...
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Megaphone className="h-5 w-5 text-blue-500" />
                    <div>
                      <Label htmlFor="announcements">Comunicados</Label>
                      <p className="text-sm text-muted-foreground">
                        Novos comunicados e avisos do síndico
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="announcements"
                    checked={localPrefs.announcements}
                    onCheckedChange={() => handleToggle("announcements")}
                    data-testid="switch-announcements"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wrench className="h-5 w-5 text-orange-500" />
                    <div>
                      <Label htmlFor="maintenanceUpdates">Manutenções</Label>
                      <p className="text-sm text-muted-foreground">
                        Atualizações sobre solicitações de manutenção
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="maintenanceUpdates"
                    checked={localPrefs.maintenanceUpdates}
                    onCheckedChange={() => handleToggle("maintenanceUpdates")}
                    data-testid="switch-maintenance"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <div>
                      <Label htmlFor="urgentMessages">Mensagens Urgentes</Label>
                      <p className="text-sm text-muted-foreground">
                        Alertas importantes que requerem atenção imediata
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="urgentMessages"
                    checked={localPrefs.urgentMessages}
                    onCheckedChange={() => handleToggle("urgentMessages")}
                    data-testid="switch-urgent"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Horário de Silêncio</CardTitle>
            <CardDescription>
              Configure um período sem notificações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quietStart">Início</Label>
                <Input
                  id="quietStart"
                  type="time"
                  value={localPrefs.quietHoursStart || ""}
                  onChange={(e) => handleQuietHoursChange("quietHoursStart", e.target.value)}
                  data-testid="input-quiet-start"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quietEnd">Fim</Label>
                <Input
                  id="quietEnd"
                  type="time"
                  value={localPrefs.quietHoursEnd || ""}
                  onChange={(e) => handleQuietHoursChange("quietHoursEnd", e.target.value)}
                  data-testid="input-quiet-end"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={saveQuietHours}
              disabled={updatePrefsMutation.isPending}
              data-testid="button-save-quiet-hours"
            >
              {updatePrefsMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Salvar Horário de Silêncio
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
