import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  draft:               "bg-muted text-muted-foreground",
  awaiting_payment:    "bg-pending/10 text-pending",
  on_chain_pending:    "bg-pending/10 text-pending",
  on_chain_confirmed:  "bg-pending/10 text-pending",
  offramp_processing:  "bg-pending/10 text-pending",
  offramp_failed:      "bg-failure/10 text-failure",
  delivered:           "bg-success/10 text-success",
  refunded:            "bg-muted text-muted-foreground",
  cancelled:           "bg-muted text-muted-foreground",
};

const labels: Record<string, string> = {
  draft: "Draft",
  awaiting_payment: "Awaiting signature",
  on_chain_pending: "Submitting",
  on_chain_confirmed: "Confirmed",
  offramp_processing: "Processing",
  offramp_failed: "Failed",
  delivered: "Delivered",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

export function StatusPip({ status, className }: { status: string; className?: string }) {
  const cls = styles[status] ?? "bg-muted text-muted-foreground";
  const label = labels[status] ?? status;
  const dot =
    status === "delivered" ? "bg-success" :
    status === "offramp_failed" ? "bg-failure" :
    status === "draft" || status === "refunded" || status === "cancelled" ? "bg-muted-foreground" :
    "bg-pending";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", cls, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot, status !== "delivered" && status !== "draft" && "animate-pulse")} />
      {label}
    </span>
  );
}
