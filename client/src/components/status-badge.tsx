import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusType = "ok" | "atenção" | "alerta" | "pendente" | "operacional" | "inativo" | "aberto" | "em andamento" | "concluído";

interface StatusBadgeProps {
  status: StatusType | string;
  size?: "sm" | "default";
  showIcon?: boolean;
}

const statusConfig: Record<string, { 
  label: string; 
  className: string; 
  icon: typeof CheckCircle;
}> = {
  ok: { 
    label: "OK", 
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", 
    icon: CheckCircle 
  },
  operacional: { 
    label: "Operacional", 
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", 
    icon: CheckCircle 
  },
  concluído: { 
    label: "Concluído", 
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", 
    icon: CheckCircle 
  },
  atenção: { 
    label: "Atenção", 
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30", 
    icon: AlertTriangle 
  },
  "em andamento": { 
    label: "Em Andamento", 
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30", 
    icon: Clock 
  },
  alerta: { 
    label: "Alerta", 
    className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30", 
    icon: XCircle 
  },
  inativo: { 
    label: "Inativo", 
    className: "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30", 
    icon: XCircle 
  },
  pendente: { 
    label: "Pendente", 
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30", 
    icon: Clock 
  },
  aberto: { 
    label: "Aberto", 
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30", 
    icon: Clock 
  },
};

export function StatusBadge({ status, size = "default", showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status.toLowerCase()] || {
    label: status,
    className: "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30",
    icon: Clock,
  };

  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 border font-medium",
        config.className,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1"
      )}
    >
      {showIcon && <Icon className={cn("shrink-0", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />}
      {config.label}
    </Badge>
  );
}
