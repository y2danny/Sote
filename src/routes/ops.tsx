import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { StatusPip } from "@/components/brand/StatusPip";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCcw, Undo2 } from "lucide-react";
import { corridorLabel, formatPUSD, relTime, shortAddr } from "@/lib/format";
import { toast } from "sonner";
import { getConnection } from "@/lib/solana/connection";
import { getPusdBalance, getTreasuryAddress } from "@/lib/solana/pusd";

export const Route = createFileRoute("/ops")({
  head: () => ({ meta: [{ title: "Operator monitor — Soté" }] }),
  component: OpsConsole,
});

function OpsConsole() {
  const { loading, user, isOperator } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [treasuryBalance, setTreasuryBalance] = useState<number | null>(null);

  // Live treasury sim-PUSD balance from devnet RPC. Falls back to "—" silently
  // if the env var isn't configured yet.
  useEffect(() => {
    let stale = false;
    (async () => {
      try {
        const treasury = getTreasuryAddress();
        const bal = await getPusdBalance(getConnection(), treasury);
        if (!stale) setTreasuryBalance(bal);
      } catch {
        if (!stale) setTreasuryBalance(null);
      }
    })();
    return () => { stale = true; };
  }, [rows.length]);

  const load = async () => {
    const { data } = await supabase.from("invoices").select("*").order("created_at", { ascending: false }).limit(200);
    setRows(data ?? []);
  };

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [loading, user, nav]);
  useEffect(() => { if (isOperator) load(); }, [isOperator]);

  useEffect(() => {
    if (!isOperator) return;
    const ch = supabase.channel("ops-monitor")
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, load)
      .subscribe();
    // Poll for advances every 2s (simulated cron)
    const t = setInterval(async () => {
      for (const r of rows.filter(r => r.next_advance_at && new Date(r.next_advance_at).getTime() <= Date.now())) {
        await supabase.rpc("advance_invoice", { _invoice_id: r.id });
      }
    }, 2000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, [isOperator, rows]);

  if (loading) return null;
  if (!isOperator) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">Operator only</h1>
          <p className="mt-2 text-sm text-muted-foreground">Grant yourself the operator role from Settings to view the live monitor.</p>
          <Button asChild className="mt-6 bg-ink text-bone hover:bg-ink/90"><Link to="/app/settings">Go to settings</Link></Button>
        </div>
      </div>
    );
  }

  const visible = rows.filter(r => {
    if (filter === "in_flight") return !["delivered","refunded","cancelled","awaiting_payment"].includes(r.status);
    if (filter === "failed") return r.status === "offramp_failed";
    if (filter === "delivered") return r.status === "delivered";
    return true;
  });

  const inEscrow = rows.filter(r => ["on_chain_confirmed","offramp_processing","offramp_failed"].includes(r.status))
    .reduce((s, r) => s + Number(r.amount_pusd), 0);

  const retry = async (id: string) => {
    const { error } = await supabase.rpc("operator_retry", { _invoice_id: id });
    if (error) toast.error(error.message); else toast.success("Retry queued");
  };
  const refund = async (id: string) => {
    const { error } = await supabase.rpc("operator_refund", { _invoice_id: id });
    if (error) toast.error(error.message); else toast.success("Refund issued");
  };

  return (
    <div className="dark min-h-screen bg-ink text-bone">
      <div className="border-b border-white/10 bg-ink/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo variant="dark" />
            <div className="text-xs text-sage uppercase tracking-wider">Operator console</div>
          </div>
          <Link to="/app" className="text-sm text-sage hover:text-bone inline-flex items-center gap-1.5"><ArrowLeft className="h-3.5 w-3.5" /> Back to app</Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <OpStat
            label="Treasury"
            value={treasuryBalance === null
              ? "—"
              : treasuryBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            sub={treasuryBalance === null ? "set VITE_TREASURY_ADDRESS" : "PUSD on devnet"}
          />
          <OpStat label="In escrow" value={(inEscrow/1_000_000).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})} sub="PUSD locked" />
          <OpStat label="In flight" value={String(rows.filter(r => ["on_chain_pending","on_chain_confirmed","offramp_processing"].includes(r.status)).length)} sub="invoices" />
          <OpStat label="Failed" value={String(rows.filter(r => r.status === "offramp_failed").length)} sub="needs review" warn />
        </div>

        {/* Filters */}
        <div className="mt-8 flex items-center gap-1 rounded-md bg-white/5 p-1 w-fit">
          {[["all","All"],["in_flight","In flight"],["failed","Failed"],["delivered","Delivered"]].map(([k,l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1 text-xs rounded ${filter===k?"bg-kola text-ink":"text-sage hover:text-bone"}`}>{l}</button>
          ))}
        </div>

        {/* Table */}
        <div className="mt-4 rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs text-sage border-b border-white/10 bg-white/[0.02]">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Vendor</th>
                <th className="px-4 py-2.5 text-left font-medium">Reference</th>
                <th className="px-4 py-2.5 text-left font-medium">Corridor</th>
                <th className="px-4 py-2.5 text-right font-medium">Total PUSD</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-4 py-2.5 text-left font-medium">PDA</th>
                <th className="px-4 py-2.5 text-left font-medium">Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map(i => (
                <tr key={i.id} className="border-b border-white/10 last:border-0 hover:bg-white/[0.03]">
                  <td className="px-4 py-3"><Link to="/app/invoices/$id" params={{ id: i.id }} className="font-medium hover:text-kola">{i.vendor_snapshot?.display_name}</Link></td>
                  <td className="px-4 py-3 mono text-xs text-sage">{i.reference ?? "—"}</td>
                  <td className="px-4 py-3 text-sage">{corridorLabel(i.corridor)}</td>
                  <td className="px-4 py-3 text-right mono tabular">{formatPUSD(i.total_pusd)}</td>
                  <td className="px-4 py-3"><StatusPip status={i.status} /></td>
                  <td className="px-4 py-3 mono text-xs text-sage">{shortAddr(i.invoice_pda, 5)}</td>
                  <td className="px-4 py-3 text-sage">{relTime(i.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {i.status === "offramp_failed" && (
                      <div className="inline-flex gap-1.5">
                        <button onClick={() => retry(i.id)} className="inline-flex items-center gap-1 rounded border border-white/15 px-2 py-1 text-xs hover:bg-white/10"><RefreshCcw className="h-3 w-3" /> Retry</button>
                        <button onClick={() => refund(i.id)} className="inline-flex items-center gap-1 rounded border border-failure/40 text-failure px-2 py-1 text-xs hover:bg-failure/10"><Undo2 className="h-3 w-3" /> Refund</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && <tr><td colSpan={8} className="p-10 text-center text-sage">No invoices.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function OpStat({ label, value, sub, warn }: { label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${warn ? "border-failure/40 bg-failure/5" : "border-white/10 bg-white/[0.02]"}`}>
      <div className="text-xs text-sage">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight tabular mono">{value}</div>
      <div className="mt-1 text-xs text-sage">{sub}</div>
    </div>
  );
}
