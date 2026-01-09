import { cn } from "@/lib/utils";

interface GaugeChartProps {
  value: number;
  max?: number;
  label?: string;
  unit?: string;
  size?: "sm" | "md" | "lg";
  color?: "blue" | "green" | "amber" | "red" | "cyan";
  showValue?: boolean;
}

export function GaugeChart({
  value,
  max = 100,
  label,
  unit = "%",
  size = "md",
  color = "blue",
  showValue = true,
}: GaugeChartProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const strokeDasharray = 251.2;
  const strokeDashoffset = strokeDasharray - (strokeDasharray * percentage) / 100;

  const sizeClasses = {
    sm: { container: "h-24 w-24", text: "text-lg", label: "text-xs" },
    md: { container: "h-32 w-32", text: "text-2xl", label: "text-sm" },
    lg: { container: "h-40 w-40", text: "text-3xl", label: "text-base" },
  };

  const colorClasses = {
    blue: "stroke-blue-500",
    green: "stroke-emerald-500",
    amber: "stroke-amber-500",
    red: "stroke-red-500",
    cyan: "stroke-cyan-500",
  };

  const bgColorClasses = {
    blue: "stroke-blue-500/20",
    green: "stroke-emerald-500/20",
    amber: "stroke-amber-500/20",
    red: "stroke-red-500/20",
    cyan: "stroke-cyan-500/20",
  };

  return (
    <div className={cn("relative", sizeClasses[size].container)}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          strokeWidth="10"
          className={bgColorClasses[color]}
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          className={cn(colorClasses[color], "transition-all duration-500")}
          style={{
            strokeDasharray,
            strokeDashoffset,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showValue && (
          <span className={cn("font-bold", sizeClasses[size].text)}>
            {Math.round(value)}
            <span className="text-muted-foreground">{unit}</span>
          </span>
        )}
        {label && (
          <span className={cn("text-muted-foreground mt-0.5", sizeClasses[size].label)}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
