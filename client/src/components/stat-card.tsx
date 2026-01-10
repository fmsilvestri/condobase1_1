import { Card, CardContent } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  color?: string;
  testId?: string;
}

export function StatCard({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  color = "primary",
  testId,
}: StatCardProps) {
  const colorClasses: Record<string, { bg: string; text: string; glow: string }> = {
    primary: { 
      bg: "bg-gradient-to-br from-blue-500/20 to-indigo-500/20", 
      text: "text-blue-500 dark:text-blue-400",
      glow: "group-hover:shadow-blue-500/20"
    },
    blue: { 
      bg: "bg-gradient-to-br from-blue-500/20 to-blue-600/20", 
      text: "text-blue-500 dark:text-blue-400",
      glow: "group-hover:shadow-blue-500/20"
    },
    cyan: { 
      bg: "bg-gradient-to-br from-cyan-500/20 to-cyan-600/20", 
      text: "text-cyan-500 dark:text-cyan-400",
      glow: "group-hover:shadow-cyan-500/20"
    },
    amber: { 
      bg: "bg-gradient-to-br from-amber-500/20 to-orange-500/20", 
      text: "text-amber-500 dark:text-amber-400",
      glow: "group-hover:shadow-amber-500/20"
    },
    green: { 
      bg: "bg-gradient-to-br from-emerald-500/20 to-green-500/20", 
      text: "text-emerald-500 dark:text-emerald-400",
      glow: "group-hover:shadow-emerald-500/20"
    },
    red: { 
      bg: "bg-gradient-to-br from-red-500/20 to-rose-500/20", 
      text: "text-red-500 dark:text-red-400",
      glow: "group-hover:shadow-red-500/20"
    },
    purple: { 
      bg: "bg-gradient-to-br from-purple-500/20 to-violet-500/20", 
      text: "text-purple-500 dark:text-purple-400",
      glow: "group-hover:shadow-purple-500/20"
    },
  };

  const colorStyle = colorClasses[color] || colorClasses.primary;

  return (
    <Card 
      data-testid={testId}
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
        colorStyle.glow
      )}
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 opacity-80" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tracking-tight">{value}</span>
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </div>
            {trend && (
              <div
                className={cn(
                  "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  trend.isPositive 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                )}
              >
                {trend.isPositive ? "+" : ""}
                {trend.value}% {trend.label}
              </div>
            )}
          </div>
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
              colorStyle.bg
            )}
          >
            <Icon className={cn("h-6 w-6", colorStyle.text)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
