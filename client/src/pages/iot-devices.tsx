import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Power, PowerOff, Wifi, WifiOff, LogIn, LogOut, RefreshCw, Router } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface EwelinkDevice {
  deviceid: string;
  name: string;
  state: "on" | "off" | "unknown";
  online: boolean;
  brandName?: string;
  productModel?: string;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const condominiumId = localStorage.getItem("selectedCondominiumId");
  const dbUserId = localStorage.getItem("dbUserId");
  const token = localStorage.getItem("authToken");
  const ewelinkSession = localStorage.getItem("ewelinkSessionKey");
  
  if (condominiumId) headers["x-condominium-id"] = condominiumId;
  if (dbUserId) headers["x-user-id"] = dbUserId;
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (ewelinkSession) headers["x-ewelink-session"] = ewelinkSession;
  
  return headers;
}

export default function IotDevices() {
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [devices, setDevices] = useState<EwelinkDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [controllingDevice, setControllingDevice] = useState<string | null>(null);

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
    region: "br",
  });

  useEffect(() => {
    const savedSession = localStorage.getItem("ewelinkSessionKey");
    if (savedSession) {
      setSessionKey(savedSession);
      setIsLoggedIn(true);
      fetchDevices(savedSession);
    }
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; region: string }) => {
      const response = await apiRequest("POST", "/api/ewelink/login", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.sessionKey) {
        localStorage.setItem("ewelinkSessionKey", data.sessionKey);
        setSessionKey(data.sessionKey);
        setIsLoggedIn(true);
        toast({
          title: "Login realizado",
          description: "Conectado à sua conta eWeLink com sucesso.",
        });
        fetchDevices(data.sessionKey);
      } else {
        toast({
          title: "Erro no login",
          description: data.message || "Não foi possível fazer login.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Erro de conexão",
        description: "Não foi possível conectar ao servidor eWeLink.",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/ewelink/logout", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
      });
      return response.json();
    },
    onSuccess: () => {
      localStorage.removeItem("ewelinkSessionKey");
      setSessionKey(null);
      setIsLoggedIn(false);
      setDevices([]);
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado da conta eWeLink.",
      });
    },
  });

  const fetchDevices = useCallback(async (session: string) => {
    setLoadingDevices(true);
    try {
      const response = await fetch("/api/ewelink/devices", {
        headers: {
          ...getAuthHeaders(),
          "x-ewelink-session": session,
        },
      });
      const data = await response.json();
      
      if (data.success) {
        setDevices(data.devices || []);
      } else {
        if (data.message?.includes("expirada") || data.message?.includes("login")) {
          localStorage.removeItem("ewelinkSessionKey");
          setIsLoggedIn(false);
          setSessionKey(null);
          toast({
            title: "Sessão expirada",
            description: "Faça login novamente.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro",
            description: data.message || "Erro ao carregar dispositivos.",
            variant: "destructive",
          });
        }
      }
    } catch {
      toast({
        title: "Erro de conexão",
        description: "Não foi possível carregar os dispositivos.",
        variant: "destructive",
      });
    } finally {
      setLoadingDevices(false);
    }
  }, [toast]);

  const controlDevice = async (deviceId: string, action: "on" | "off") => {
    if (!sessionKey) return;
    
    setControllingDevice(deviceId);
    try {
      const response = await fetch(`/api/ewelink/device/${action}`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "x-ewelink-session": sessionKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deviceid: deviceId }),
      });
      const data = await response.json();
      
      if (data.success) {
        setDevices(prev =>
          prev.map(d =>
            d.deviceid === deviceId ? { ...d, state: action } : d
          )
        );
        toast({
          title: "Sucesso",
          description: data.message,
        });
      } else {
        toast({
          title: "Erro",
          description: data.message || "Não foi possível controlar o dispositivo.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erro de conexão",
        description: "Não foi possível enviar o comando.",
        variant: "destructive",
      });
    } finally {
      setControllingDevice(null);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginForm);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dispositivos IoT</h1>
          <p className="text-muted-foreground">
            Gerencie dispositivos Sonoff via eWeLink Cloud
          </p>
        </div>
        {isLoggedIn && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => sessionKey && fetchDevices(sessionKey)}
              disabled={loadingDevices}
              data-testid="button-refresh-devices"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingDevices ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              data-testid="button-ewelink-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Desconectar
            </Button>
          </div>
        )}
      </div>

      {!isLoggedIn ? (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Router className="h-5 w-5" />
              Login eWeLink
            </CardTitle>
            <CardDescription>
              Conecte sua conta eWeLink para gerenciar dispositivos Sonoff
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                  data-testid="input-ewelink-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Sua senha eWeLink"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  required
                  data-testid="input-ewelink-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="region">Região</Label>
                <Select
                  value={loginForm.region}
                  onValueChange={(value) => setLoginForm(prev => ({ ...prev, region: value }))}
                >
                  <SelectTrigger id="region" data-testid="select-ewelink-region">
                    <SelectValue placeholder="Selecione a região" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="br">Brasil</SelectItem>
                    <SelectItem value="us">Américas (US)</SelectItem>
                    <SelectItem value="eu">Europa (EU)</SelectItem>
                    <SelectItem value="as">Ásia (AS)</SelectItem>
                    <SelectItem value="cn">China (CN)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
                data-testid="button-ewelink-login"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Entrar
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 text-sm text-muted-foreground">
              <p>
                Use suas credenciais do app eWeLink. Sua senha não é armazenada.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {loadingDevices ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : devices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Router className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhum dispositivo encontrado</p>
                <p className="text-sm text-muted-foreground">
                  Adicione dispositivos Sonoff no app eWeLink primeiro.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {devices.map((device) => (
                <Card key={device.deviceid} className="relative" data-testid={`card-device-${device.deviceid}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{device.name}</CardTitle>
                      <Badge variant={device.online ? "default" : "secondary"}>
                        {device.online ? (
                          <>
                            <Wifi className="h-3 w-3 mr-1" />
                            Online
                          </>
                        ) : (
                          <>
                            <WifiOff className="h-3 w-3 mr-1" />
                            Offline
                          </>
                        )}
                      </Badge>
                    </div>
                    {device.productModel && (
                      <CardDescription>{device.productModel}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {device.state === "on" ? (
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                            <span className="font-medium text-green-600 dark:text-green-400">Ligado</span>
                          </div>
                        ) : device.state === "off" ? (
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-gray-400" />
                            <span className="font-medium text-muted-foreground">Desligado</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Estado desconhecido</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant={device.state === "on" ? "default" : "outline"}
                          size="sm"
                          onClick={() => controlDevice(device.deviceid, "on")}
                          disabled={!device.online || controllingDevice === device.deviceid}
                          data-testid={`button-on-${device.deviceid}`}
                        >
                          {controllingDevice === device.deviceid ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant={device.state === "off" ? "default" : "outline"}
                          size="sm"
                          onClick={() => controlDevice(device.deviceid, "off")}
                          disabled={!device.online || controllingDevice === device.deviceid}
                          data-testid={`button-off-${device.deviceid}`}
                        >
                          {controllingDevice === device.deviceid ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <PowerOff className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Controle rápido</span>
                      <Switch
                        checked={device.state === "on"}
                        onCheckedChange={(checked) => controlDevice(device.deviceid, checked ? "on" : "off")}
                        disabled={!device.online || controllingDevice === device.deviceid}
                        data-testid={`switch-${device.deviceid}`}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
