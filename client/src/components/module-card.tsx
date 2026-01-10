import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  status?: "ok" | "atenção" | "alerta";
  value?: string | number;
  unit?: string;
  href: string;
  color?: string;
  testId?: string;
}

export function ModuleCard({
  title,
  description,
  icon: Icon,
  status,
  value,
  unit,
  href,
  color = "primary",
  testId,
}: ModuleCardProps) {
  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    primary: { 
      bg: "bg-gradient-to-br from-blue-500/15 to-indigo-500/15", 
      text: "text-blue-500 dark:text-blue-400",
      border: "group-hover:border-blue-500/30"
    },
    blue: { 
      bg: "bg-gradient-to-br from-blue-500/15 to-blue-600/15", 
      text: "text-blue-500 dark:text-blue-400",
      border: "group-hover:border-blue-500/30"
    },
    cyan: { 
      bg: "bg-gradient-to-br from-cyan-500/15 to-cyan-600/15", 
      text: "text-cyan-500 dark:text-cyan-400",
      border: "group-hover:border-cyan-500/30"
    },
    amber: { 
      bg: "bg-gradient-to-br from-amber-500/15 to-orange-500/15", 
      text: "text-amber-500 dark:text-amber-400",
      border: "group-hover:border-amber-500/30"
    },
    yellow: { 
      bg: "bg-gradient-to-br from-yellow-500/15 to-amber-500/15", 
      text: "text-yellow-500 dark:text-yellow-400",
      border: "group-hover:border-yellow-500/30"
    },
    green: { 
      bg: "bg-gradient-to-br from-emerald-500/15 to-green-500/15", 
      text: "text-emerald-500 dark:text-emerald-400",
      border: "group-hover:border-emerald-500/30"
    },
    red: { 
      bg: "bg-gradient-to-br from-red-500/15 to-rose-500/15", 
      text: "text-red-500 dark:text-red-400",
      border: "group-hover:border-red-500/30"
    },
    purple: { 
      bg: "bg-gradient-to-br from-purple-500/15 to-violet-500/15", 
      text: "text-purple-500 dark:text-purple-400",
      border: "group-hover:border-purple-500/30"
    },
    orange: { 
      bg: "bg-gradient-to-br from-orange-500/15 to-red-500/15", 
      text: "text-orange-500 dark:text-orange-400",
      border: "group-hover:border-orange-500/30"
    },
  };

  const colorStyle = colorClasses[color] || colorClasses.primary;

  return (
    <Link href={href}>
      <Card
        className={cn(
          "group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
          colorStyle.border
        )}
        data-testid={testId}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
                colorStyle.bg
              )}
            >
              <Icon className={cn("h-5 w-5", colorStyle.text)} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
              <p className="text-sm text-muted-foreground line-clamp-1">{description}</p>
            </div>
          </div>
          {status && <StatusBadge status={status} size="sm" />}
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-4">
            {value !== undefined && (
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tracking-tight">{value}</span>
                {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "ml-auto gap-1.5 text-muted-foreground transition-colors",
                "group-hover:text-foreground"
              )}
            >
              Ver mais
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
