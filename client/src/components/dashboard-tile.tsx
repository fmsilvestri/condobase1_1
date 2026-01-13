import { Link } from "wouter";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardTileProps {
  title: string;
  icon: LucideIcon;
  href: string;
  color?: string;
  testId?: string;
}

export function DashboardTile({
  title,
  icon: Icon,
  href,
  color = "cyan",
  testId,
}: DashboardTileProps) {
  const colorClasses: Record<string, { iconBg: string; iconText: string; glowBorder: string; hoverGlow: string }> = {
    cyan: {
      iconBg: "bg-gradient-to-br from-cyan-100 to-cyan-50 dark:from-cyan-500/20 dark:to-cyan-600/10",
      iconText: "text-cyan-600 dark:text-cyan-400",
      glowBorder: "border-cyan-200/60 dark:border-cyan-500/20",
      hoverGlow: "hover:shadow-cyan-500/10 dark:hover:shadow-cyan-500/20",
    },
    blue: {
      iconBg: "bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-500/20 dark:to-blue-600/10",
      iconText: "text-blue-600 dark:text-blue-400",
      glowBorder: "border-blue-200/60 dark:border-blue-500/20",
      hoverGlow: "hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20",
    },
    amber: {
      iconBg: "bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-500/20 dark:to-amber-600/10",
      iconText: "text-amber-600 dark:text-amber-400",
      glowBorder: "border-amber-200/60 dark:border-amber-500/20",
      hoverGlow: "hover:shadow-amber-500/10 dark:hover:shadow-amber-500/20",
    },
    orange: {
      iconBg: "bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-500/20 dark:to-orange-600/10",
      iconText: "text-orange-600 dark:text-orange-400",
      glowBorder: "border-orange-200/60 dark:border-orange-500/20",
      hoverGlow: "hover:shadow-orange-500/10 dark:hover:shadow-orange-500/20",
    },
    green: {
      iconBg: "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-500/20 dark:to-emerald-600/10",
      iconText: "text-emerald-600 dark:text-emerald-400",
      glowBorder: "border-emerald-200/60 dark:border-emerald-500/20",
      hoverGlow: "hover:shadow-emerald-500/10 dark:hover:shadow-emerald-500/20",
    },
    red: {
      iconBg: "bg-gradient-to-br from-red-100 to-red-50 dark:from-red-500/20 dark:to-red-600/10",
      iconText: "text-red-600 dark:text-red-400",
      glowBorder: "border-red-200/60 dark:border-red-500/20",
      hoverGlow: "hover:shadow-red-500/10 dark:hover:shadow-red-500/20",
    },
    purple: {
      iconBg: "bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-500/20 dark:to-purple-600/10",
      iconText: "text-purple-600 dark:text-purple-400",
      glowBorder: "border-purple-200/60 dark:border-purple-500/20",
      hoverGlow: "hover:shadow-purple-500/10 dark:hover:shadow-purple-500/20",
    },
    indigo: {
      iconBg: "bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-500/20 dark:to-indigo-600/10",
      iconText: "text-indigo-600 dark:text-indigo-400",
      glowBorder: "border-indigo-200/60 dark:border-indigo-500/20",
      hoverGlow: "hover:shadow-indigo-500/10 dark:hover:shadow-indigo-500/20",
    },
    yellow: {
      iconBg: "bg-gradient-to-br from-yellow-100 to-yellow-50 dark:from-yellow-500/20 dark:to-yellow-600/10",
      iconText: "text-yellow-600 dark:text-yellow-400",
      glowBorder: "border-yellow-200/60 dark:border-yellow-500/20",
      hoverGlow: "hover:shadow-yellow-500/10 dark:hover:shadow-yellow-500/20",
    },
  };

  const colorStyle = colorClasses[color] || colorClasses.cyan;

  return (
    <Link href={href}>
      <div
        className={cn(
          "group flex flex-col items-center justify-center gap-4 p-6 rounded-xl",
          "bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm",
          "border shadow-sm",
          colorStyle.glowBorder,
          "hover:shadow-lg hover:-translate-y-1",
          colorStyle.hoverGlow,
          "transition-all duration-300 cursor-pointer"
        )}
        data-testid={testId}
      >
        <div
          className={cn(
            "flex items-center justify-center w-16 h-16 rounded-2xl",
            "shadow-sm transition-transform duration-300 group-hover:scale-110",
            colorStyle.iconBg
          )}
        >
          <Icon className={cn("w-8 h-8 drop-shadow-sm", colorStyle.iconText)} />
        </div>
        <span className="text-sm font-medium text-center text-foreground leading-tight">
          {title}
        </span>
      </div>
    </Link>
  );
}
