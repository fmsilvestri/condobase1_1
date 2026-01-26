import { type ReactNode } from "react";
import { ArrowLeft, LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  actions?: ReactNode;
  icon?: LucideIcon;
  iconColor?: string;
  children?: ReactNode;
}

const colorClasses: Record<string, { bg: string; text: string }> = {
  primary: { bg: "from-primary/20 to-primary/10", text: "text-primary" },
  emerald: { bg: "from-emerald-500/20 to-emerald-500/10", text: "text-emerald-500" },
  blue: { bg: "from-blue-500/20 to-blue-500/10", text: "text-blue-500" },
  purple: { bg: "from-purple-500/20 to-purple-500/10", text: "text-purple-500" },
  red: { bg: "from-red-500/20 to-red-500/10", text: "text-red-500" },
  amber: { bg: "from-amber-500/20 to-amber-500/10", text: "text-amber-500" },
  cyan: { bg: "from-cyan-500/20 to-cyan-500/10", text: "text-cyan-500" },
  indigo: { bg: "from-indigo-500/20 to-indigo-500/10", text: "text-indigo-500" },
};

export function PageHeader({ title, description, backHref, actions, icon: Icon, iconColor = "primary", children }: PageHeaderProps) {
  const colors = colorClasses[iconColor] || colorClasses.primary;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/50">
      <div className="flex items-center gap-4">
        {backHref && (
          <Link href={backHref}>
            <Button 
              variant="ghost" 
              size="icon" 
              data-testid="button-back"
              className="rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        )}
        {Icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${colors.bg}`}>
            <Icon className={`h-5 w-5 ${colors.text}`} />
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
      </div>
      {(actions || children) && <div className="flex items-center gap-2">{actions || children}</div>}
    </div>
  );
}
