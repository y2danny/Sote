import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  key: string;
  label: string;
  description?: string;
}

export type StepState = "done" | "active" | "todo" | "failed";

export function Stepper({ steps, current, failedAt }: { steps: Step[]; current: number; failedAt?: number }) {
  return (
    <ol className="space-y-5">
      {steps.map((s, i) => {
        let state: StepState = "todo";
        if (failedAt !== undefined && i === failedAt) state = "failed";
        else if (i < current) state = "done";
        else if (i === current) state = "active";

        return (
          <li key={s.key} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium",
                  state === "done" && "bg-success text-paper border-success",
                  state === "active" && "bg-pending text-paper border-pending animate-pulse",
                  state === "failed" && "bg-failure text-paper border-failure",
                  state === "todo" && "bg-card text-muted-foreground border-border",
                )}
              >
                {state === "done" ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              {i < steps.length - 1 && <div className={cn("mt-1 w-px flex-1 min-h-8", state === "done" ? "bg-success" : "bg-border")} />}
            </div>
            <div className="pb-4">
              <div className={cn("text-sm font-medium", state === "todo" && "text-muted-foreground")}>{s.label}</div>
              {s.description && <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
