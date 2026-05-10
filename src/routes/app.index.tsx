import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useInvoices, addInvoice } from "@/lib/invoice-store";
import { useWallets as useSolanaWallets } from "@privy-io/react-auth/solana";
import { Money } from "@/components/brand/Money";
import { StatusPip } from "@/components/brand/StatusPip";
import { Button } from "@/components/ui/button";
import { Plus, ArrowUpRight, Wallet, ShieldCheck, Sparkles } from "lucide-react";
import { corridorLabel, relTime } from "@/lib/format";
import { toast } from "sonner";
import { getConnection } from "@/lib/solana/connection";
import { getPusdBalance } from "@/lib/solana/pusd";

// Demo seed visibility — flip VITE_ENABLE_DEMO_SEED=false in production
const ENABLE_DEMO_SEED =
  (import.meta.env.VITE_ENABLE_DEMO_SEED ?? "true").toString().toLowerCase() === "true";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Dashboard — Soté" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, profile } = useAuth();
  const { wallets } = useSolanaWallets();
  const allInvoices = useInvoices();
  const invoices = allInvoices.slice(0, 8);
  const [pusdBalance, setPusdBalance] = useState<number | null>(null);

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthInvoices = allInvoices.filter(i => new Date(i.created_at) >= monthStart);
  const stats = {
    inFlight: monthInvoices.filter(i => !["delivered", "refunded", "cancelled"].includes(i.status)).length,
    monthVolume: monthInvoices.reduce((s, i) => s + Number(i.total_pusd), 0),
  };

  // Real PUSD balance from the embedded wallet (devnet sim-PUSD).
  // Falls back to null while loading; UI shows "—" in that case.
  const wallet = wallets[0];
  useEffect(() => {
    if (!wallet?.address) return;
    let stale = false;
    (async () => {
      try {
        const bal = await getPusdBalance(getConnection(), wallet.address);
        if (!stale) setPusdBalance(bal);
      } catch {
        if (!stale) setPusdBalance(0);
      }
    })();
    return () => { stale = true; };
  }, [wallet?.address, invoices.length]);

  const seedDemo = () => {
    if (!user) return;
    const now = Date.now();
    const seeds = [
      { display_name: "Copart Auctions LLC", corridor: "usd_offramp", amount: 8420, ref: "Copart 41928374", desc: "Toyota Camry 2019 — auction win", dest: { bank_name: "JPMorgan Chase", routing_number: "021000021", account_number: "***4827", beneficiary_name: "Copart Inc." }, offset: 4 },
      { display_name: "SG Global Trade Pte Ltd", corridor: "sgd_offramp", amount: 12500, ref: "Order YT-2026-118", desc: "200 units — bluetooth headsets", dest: { bank_name: "DBS Bank", account_number: "***9012", beneficiary_name: "SG Global Trade Pte Ltd" }, offset: 2 },
      { display_name: "BlockShip Forwarders", corridor: "direct_pusd", amount: 3216, ref: "BS-INV-9M2P5", desc: "Freight forwarding April", dest: { solana_address: "9xQa7K3vL2nB8mP1tF6rJ4dS5wH9cE7gA2bM8kN6vT3" }, offset: 1 },
    ];
    for (const s of seeds) {
      const amtMicros = Math.round(s.amount * 1_000_000);
      const sote = Math.round(amtMicros * 0.005);
      const off = s.corridor === "usd_offramp" ? 25_000_000 : s.corridor === "sgd_offramp" ? 15_000_000 : 0;
      addInvoice({
        importer_id: user.id,
        vendor_id: null,
        vendor_snapshot: { display_name: s.display_name, corridor: s.corridor, ...s.dest },
        corridor: s.corridor,
        amount_pusd: amtMicros,
        sote_fee_pusd: sote,
        offramp_fee_pusd: off,
        total_pusd: amtMicros + sote + off + 500,
        reference: s.ref,
        description: s.desc,
        status: "awaiting_payment",
      });
    }
    toast.success("Demo data loaded");
  };

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Welcome back</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{profile?.business_name ?? "Your account"}</h1>
        </div>
        <Button asChild className="bg-ink text-bone hover:bg-ink/90">
          <Link to="/app/invoices/new"><Plus className="h-4 w-4 mr-1.5" /> New invoice</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <StatCard
          label="PUSD balance"
          value={pusdBalance === null
            ? "—"
            : pusdBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          sub={wallet ? "devnet · sim-PUSD" : "wallet provisioning…"}
          icon={<Wallet className="h-4 w-4" />}
          mono
        />
        <StatCard label="In flight" value={String(stats.inFlight)} sub="invoices currently settling" icon={<Sparkles className="h-4 w-4" />} />
        <StatCard label="This month" value={(stats.monthVolume / 1_000_000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sub="PUSD sent" icon={<ShieldCheck className="h-4 w-4" />} mono />
      </div>

      {/* Demo bar — gated by VITE_ENABLE_DEMO_SEED */}
      {invoices.length === 0 && ENABLE_DEMO_SEED && (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-paper p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-medium">First time here?</div>
            <div className="text-sm text-muted-foreground mt-1">Load a few demo vendors and invoices to walk through the full flow.</div>
          </div>
          <div className="flex gap-2">
            <Button onClick={seedDemo} className="bg-kola text-bone hover:bg-kola/90">Load demo data</Button>
          </div>
        </div>
      )}

      {/* Recent */}
      <div className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Recent invoices</h2>
          <Link to="/app/invoices" className="text-sm text-muted-foreground hover:text-ink inline-flex items-center gap-1">View all <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </div>
        <div className="mt-4 rounded-xl border border-border bg-paper overflow-hidden">
          {invoices.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No invoices yet. <Link to="/app/invoices/new" className="text-ink font-medium hover:underline">Create your first invoice →</Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border">
                <tr><Th>Vendor</Th><Th>Reference</Th><Th>Corridor</Th><Th right>Amount</Th><Th>Status</Th><Th>Created</Th></tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <Td><Link to="/app/invoices/$id" params={{ id: i.id }} className="font-medium hover:underline">{i.vendor_snapshot?.display_name ?? "Vendor"}</Link></Td>
                    <Td muted><span className="mono text-xs">{i.reference ?? "—"}</span></Td>
                    <Td muted>{corridorLabel(i.corridor)}</Td>
                    <Td right><Money units={i.total_pusd} /></Td>
                    <Td><StatusPip status={i.status} /></Td>
                    <Td muted>{relTime(i.created_at)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="mt-12 text-xs text-muted-foreground border-t border-border pt-6">
        About this demo: balances and on-chain signatures are simulated.
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, mono }: { label: string; value: string; sub: string; icon: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-paper p-5">
      <div className="flex items-center justify-between text-muted-foreground text-sm">
        <span>{label}</span><span>{icon}</span>
      </div>
      <div className={`mt-2 text-2xl font-semibold tracking-tight tabular ${mono ? "mono" : ""}`}>{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`px-4 py-2.5 font-medium text-left ${right ? "text-right" : ""}`}>{children}</th>;
}
function Td({ children, muted, right }: { children: React.ReactNode; muted?: boolean; right?: boolean }) {
  return <td className={`px-4 py-3 ${muted ? "text-muted-foreground" : ""} ${right ? "text-right" : ""}`}>{children}</td>;
}
