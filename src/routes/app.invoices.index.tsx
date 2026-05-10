import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useInvoices } from "@/lib/invoice-store";
import { Money } from "@/components/brand/Money";
import { StatusPip } from "@/components/brand/StatusPip";
import { corridorLabel, relTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/app/invoices/")({
  head: () => ({ meta: [{ title: "Invoices — Soté" }] }),
  component: InvoiceList,
});

function InvoiceList() {
  const rows = useInvoices();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  const visible = rows.filter(r => {
    if (filter === "in_flight" && ["delivered","refunded","cancelled"].includes(r.status)) return false;
    if (filter === "delivered" && r.status !== "delivered") return false;
    if (filter === "failed" && r.status !== "offramp_failed") return false;
    if (q && !(`${r.reference ?? ""} ${r.vendor_snapshot?.display_name ?? ""}`).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every payment you've sent, with on-chain proof.</p>
        </div>
        <Button asChild className="bg-ink text-bone hover:bg-ink/90">
          <Link to="/app/invoices/new"><Plus className="h-4 w-4 mr-1.5" /> New invoice</Link>
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reference or vendor" className="pl-9 bg-paper" />
        </div>
        <div className="flex gap-1 rounded-md bg-paper p-1 border border-border">
          {[["all","All"],["in_flight","In flight"],["delivered","Delivered"],["failed","Failed"]].map(([k,l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1 text-xs rounded ${filter===k?"bg-ink text-bone":"text-muted-foreground hover:text-ink"}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-paper overflow-hidden">
        {visible.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No invoices match.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Vendor</th>
                <th className="px-4 py-2.5 text-left font-medium">Reference</th>
                <th className="px-4 py-2.5 text-left font-medium">Corridor</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-4 py-2.5 text-left font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((i) => (
                <tr key={i.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3"><Link to="/app/invoices/$id" params={{ id: i.id }} className="font-medium hover:underline">{i.vendor_snapshot?.display_name}</Link></td>
                  <td className="px-4 py-3 mono text-xs text-muted-foreground">{i.reference ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{corridorLabel(i.corridor)}</td>
                  <td className="px-4 py-3 text-right"><Money units={i.total_pusd} /></td>
                  <td className="px-4 py-3"><StatusPip status={i.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{relTime(i.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
