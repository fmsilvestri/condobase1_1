import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ReadingCardProps {
  label: string;
  value: string | number;
  unit?: string;
  status?: "ok" | "atenção" | "alerta";
  ideal?: string;
  testId?: string;
}

export function ReadingCard({
  label,
  value,
  unit,
  status = "ok",
  ideal,
  testId,
}: ReadingCardProps) {
  const statusColors = {
    ok: "border-l-emerald-500",
    atenção: "border-l-amber-500",
    alerta: "border-l-red-500",
  };

  const statusBg = {
    ok: "bg-emerald-500/5",
    atenção: "bg-amber-500/5",
    alerta: "bg-red-500/5",
  };

  return (
    <Card
      className={cn("border-l-4", statusColors[status], statusBg[status])}
      data-testid={testId}
    >
      <CardContent className="p-4">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-2xl font-bold">{value}</span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
        {ideal && (
          <p className="mt-1 text-xs text-muted-foreground">Ideal: {ideal}</p>
        )}
      </CardContent>
    </Card>
  );
}
