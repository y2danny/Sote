import { formatPUSD } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Money({
  units,
  currency = "PUSD",
  className,
  large,
}: { units: number | bigint | string; currency?: string; className?: string; large?: boolean }) {
  return (
    <span className={cn("tabular mono", large && "text-2xl font-medium tracking-tight", className)}>
      {formatPUSD(units)} <span className="text-muted-foreground text-[0.85em] font-sans">{currency}</span>
    </span>
  );
}
