import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "light" | "dark";
  showMark?: boolean;
  className?: string;
}

/** Soté wordmark — Inter Semibold with Kola acute. */
export function Logo({ variant = "light", showMark = true, className }: LogoProps) {
  const text = variant === "dark" ? "text-bone" : "text-ink";
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      {showMark && (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-kola text-bone font-semibold text-[15px] leading-none shadow-sm">
          S
        </span>
      )}
      <span className={cn("font-display font-semibold text-[20px] tracking-[-0.03em]", text)}>
        Sot<span className="text-kola">é</span>
      </span>
    </div>
  );
}
