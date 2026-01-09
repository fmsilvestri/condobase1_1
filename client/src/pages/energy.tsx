import { useState } from "react";
import { Zap, Plus, AlertTriangle, Check, Clock, Calendar } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";

interface EnergyEvent {
  id: string;
  status: "ok" | "falta de energia" | "meia fase";
  description: string;
  createdAt: string;
  resolvedAt?: string;
}

const mockEvents: EnergyEvent[] = [
  { id: "1", status: "ok", description: "Energia restabelecida após manutenção da CELESC", createdAt: "2024-01-15T10:30:00", resolvedAt: "2024-01-15T10:30:00" },
  { id: "2", status: "falta de energia", description: "Queda de energia em toda a região", createdAt: "2024-01-15T08:00:00", resolvedAt: "2024-01-15T10:30:00" },
  { id: "3", status: "meia fase", description: "Problema na rede da CELESC - meia fase", createdAt: "2024-01-10T14:00:00", resolvedAt: "2024-01-10T16:30:00" },
  { id: "4", status: "falta de energia", description: "Temporal causou interrupção", createdAt: "2024-01-05T20:00:00", resolvedAt: "2024-01-05T22:00:00" },
];

const currentStatus = "ok";

export default function Energy() {
  const [isNewEventOpen, setIsNewEventOpen] = useState(false);
  const { canEdit } = useAuth();

  const totalOutages = mockEvents.filter((e) => e.status !== "ok").length;
  const lastOutage = mockEvents.find((e) => e.status !== "ok");
  const averageDowntime = 2.5;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ok":
        return <Check className="h-5 w-5 text-emerald-500" />;
      case "falta de energia":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "meia fase":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default:
        return <Zap className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ok":
        return "bg-emerald-500/10";
      case "falta de energia":
        return "bg-red-500/10";
      case "meia fase":
        return "bg-amber-500/10";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Energia"
        description="Monitoramento do status de energia e ocorrências"
        backHref="/"
        actions={
          canEdit && (
            <Dialog open={isNewEventOpen} onOpenChange={setIsNewEventOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-energy-event">
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar Ocorrência
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Registrar Ocorrência de Energia</DialogTitle>
                  <DialogDescription>
                    Registre eventos relacionados ao fornecimento de energia.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select>
                      <SelectTrigger data-testid="select-energy-status">
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ok">Energia OK</SelectItem>
                        <SelectItem value="falta de energia">Falta de Energia</SelectItem>
                        <SelectItem value="meia fase">Meia Fase</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      placeholder="Descreva a ocorrência..."
                      data-testid="input-energy-description"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewEventOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => setIsNewEventOpen(false)} data-testid="button-save-energy-event">
                    Registrar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <Card
        className={`${
          currentStatus === "ok"
            ? "border-emerald-500/50 bg-emerald-500/5"
            : currentStatus === "falta de energia"
            ? "border-red-500/50 bg-red-500/5"
            : "border-amber-500/50 bg-amber-500/5"
        }`}
      >
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full ${
                currentStatus === "ok"
                  ? "bg-emerald-500/20"
                  : currentStatus === "falta de energia"
                  ? "bg-red-500/20"
                  : "bg-amber-500/20"
              }`}
            >
              {currentStatus === "ok" ? (
                <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle
                  className={`h-8 w-8 ${
                    currentStatus === "falta de energia"
                      ? "text-red-600 dark:text-red-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                />
              )}
            </div>
            <div>
              <h2
                className={`text-2xl font-bold ${
                  currentStatus === "ok"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : currentStatus === "falta de energia"
                    ? "text-red-600 dark:text-red-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {currentStatus === "ok"
                  ? "Energia Normal"
                  : currentStatus === "falta de energia"
                  ? "Sem Energia"
                  : "Meia Fase"}
              </h2>
              <p className="text-muted-foreground">
                Status CELESC: Fornecimento normal
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Status Atual"
          value="OK"
          icon={Zap}
          color="green"
          testId="stat-energy-status"
        />
        <StatCard
          title="Ocorrências (30 dias)"
          value={totalOutages}
          icon={AlertTriangle}
          color="amber"
          testId="stat-energy-outages"
        />
        <StatCard
          title="Tempo Médio de Queda"
          value={`${averageDowntime}h`}
          icon={Clock}
          color="blue"
          testId="stat-energy-downtime"
        />
        <StatCard
          title="Última Ocorrência"
          value={
            lastOutage
              ? new Date(lastOutage.createdAt).toLocaleDateString("pt-BR")
              : "Nenhuma"
          }
          icon={Calendar}
          color="purple"
          testId="stat-energy-last"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Histórico de Eventos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mockEvents.length === 0 ? (
            <EmptyState
              icon={Zap}
              title="Nenhum evento registrado"
              description="Registre ocorrências de energia para manter o histórico."
            />
          ) : (
            <div className="space-y-4">
              {mockEvents.map((event) => {
                const duration =
                  event.resolvedAt && event.status !== "ok"
                    ? Math.round(
                        (new Date(event.resolvedAt).getTime() -
                          new Date(event.createdAt).getTime()) /
                          (1000 * 60 * 60)
                      )
                    : null;

                return (
                  <div
                    key={event.id}
                    className={`flex items-start gap-4 rounded-lg p-4 ${getStatusColor(
                      event.status
                    )}`}
                  >
                    <div className="mt-0.5">{getStatusIcon(event.status)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          status={
                            event.status === "ok"
                              ? "ok"
                              : event.status === "falta de energia"
                              ? "alerta"
                              : "atenção"
                          }
                          size="sm"
                        />
                        {duration !== null && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="mr-1 h-3 w-3" />
                            {duration}h de duração
                          </Badge>
                        )}
                      </div>
                      <p className="mt-2 text-sm">{event.description}</p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          {new Date(event.createdAt).toLocaleString("pt-BR")}
                        </span>
                        {event.resolvedAt && event.status !== "ok" && (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Resolvido:{" "}
                            {new Date(event.resolvedAt).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
