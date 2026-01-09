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
  const colorClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    yellow: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  };

  return (
    <Link href={href}>
      <Card
        className="group cursor-pointer transition-all hover-elevate"
        data-testid={testId}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                colorClasses[color]
              )}
            >
              <Icon className="h-5 w-5" />
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
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight">{value}</span>
                {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto gap-1 text-muted-foreground group-hover:text-foreground"
            >
              Ver mais
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
