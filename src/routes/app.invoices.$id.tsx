import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useInvoices } from "@/lib/invoice-store";
import { Money } from "@/components/brand/Money";
import { StatusPip } from "@/components/brand/StatusPip";
import { Stepper } from "@/components/brand/Stepper";
import { ArrowLeft, ExternalLink, Printer, ShieldAlert } from "lucide-react";
import { corridorLabel, formatPUSD, shortAddr, solscanUrl } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/invoices/$id")({
  head: () => ({ meta: [{ title: "Invoice — Soté" }] }),
  component: InvoiceDetail,
});

function InvoiceDetail() {
  const { id } = useParams({ from: "/app/invoices/$id" });
  const invoices = useInvoices();
  const inv = invoices.find(i => i.id === id) ?? null;

  if (!inv) return <div className="p-10 text-sm text-muted-foreground">Invoice not found.</div>;

  const isDirect = inv.corridor === "direct_pusd";
  const stepIndex = ((): number => {
    if (inv.status === "awaiting_payment") return 0;
    if (inv.status === "on_chain_pending") return 1;
    if (inv.status === "on_chain_confirmed") return 2;
    if (inv.status === "offramp_processing") return isDirect ? 3 : 2;
    if (inv.status === "delivered") return isDirect ? 3 : 3;
    if (inv.status === "offramp_failed") return 2;
    if (inv.status === "refunded") return 3;
    return 0;
  })();
  const failedAt = inv.status === "offramp_failed" ? 2 : undefined;

  const steps = isDirect
    ? [
        { key: "sign", label: "Signed", description: "Wallet authorized the payment" },
        { key: "submit", label: "Submitted to Solana", description: "Transaction propagated" },
        { key: "confirm", label: "Confirmed on Solana", description: "Slot finalized" },
        { key: "deliver", label: "Vendor wallet credited", description: "PUSD released" },
      ]
    : [
        { key: "sign", label: "Signed", description: "Wallet authorized the payment" },
        { key: "confirm", label: "Confirmed on Solana", description: "PUSD locked in escrow" },
        { key: "offramp", label: "Off-ramp processing", description: `${corridorLabel(inv.corridor)} initiated` },
        { key: "deliver", label: "Vendor paid", description: "Funds delivered to beneficiary" },
      ];

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-5xl">
      <Link to="/app/invoices" className="text-sm text-muted-foreground hover:text-ink inline-flex items-center gap-1.5 mb-4"><ArrowLeft className="h-3.5 w-3.5" /> All invoices</Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">{corridorLabel(inv.corridor)} · {inv.reference ?? "—"}</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{inv.vendor_snapshot?.display_name}</h1>
          <div className="mt-2 flex items-center gap-3"><StatusPip status={inv.status} /></div>
        </div>
        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1.5" /> Print receipt</Button>
      </div>

      {inv.status === "offramp_failed" && (
        <div className="mt-6 rounded-lg border border-failure/30 bg-failure/5 p-4 text-sm flex gap-3">
          <ShieldAlert className="h-4 w-4 text-failure shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-failure">Off-ramp returned an error</div>
            <div className="text-muted-foreground mt-0.5">{inv.offramp_error}. An operator can retry or refund — your funds remain in escrow.</div>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {/* Stepper */}
        <div className="md:col-span-2 rounded-xl border border-border bg-paper p-6">
          <h2 className="text-sm font-medium mb-5">Settlement progress</h2>
          <Stepper steps={steps} current={stepIndex} failedAt={failedAt} />
        </div>

        {/* Receipt */}
        <div className="rounded-xl border border-border bg-paper p-6">
          <h2 className="text-sm font-medium mb-4">Fee breakdown</h2>
          <div className="space-y-2 text-sm">
            <Row label="Invoice amount" value={`${formatPUSD(inv.amount_pusd)} PUSD`} />
            <Row label="Soté fee" value={`${formatPUSD(inv.sote_fee_pusd)} PUSD`} muted />
            <Row label="Off-ramp fee" value={`${formatPUSD(inv.offramp_fee_pusd)} PUSD`} muted />
            <div className="my-3 border-t border-border" />
            <Row label="Total" value={<Money units={inv.total_pusd} />} bold />
          </div>
        </div>
      </div>

      {/* Vendor + on-chain proof */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card title="Vendor destination">
          <div className="text-sm space-y-1.5">
            <div><span className="text-muted-foreground">Vendor:</span> <span className="font-medium">{inv.vendor_snapshot?.display_name}</span></div>
            {inv.vendor_snapshot?.bank_name && <div><span className="text-muted-foreground">Bank:</span> {inv.vendor_snapshot.bank_name}</div>}
            {inv.vendor_snapshot?.beneficiary_name && <div><span className="text-muted-foreground">Beneficiary:</span> {inv.vendor_snapshot.beneficiary_name}</div>}
            {inv.vendor_snapshot?.routing_number && <div><span className="text-muted-foreground">Routing:</span> <span className="mono">{inv.vendor_snapshot.routing_number}</span></div>}
            {inv.vendor_snapshot?.account_number && <div><span className="text-muted-foreground">Account:</span> <span className="mono">{inv.vendor_snapshot.account_number}</span></div>}
            {inv.vendor_snapshot?.solana_address && <div><span className="text-muted-foreground">Solana address:</span> <span className="mono break-all">{inv.vendor_snapshot.solana_address}</span></div>}
            {inv.offramp_reference && <div><span className="text-muted-foreground">Off-ramp ref:</span> <span className="mono">{inv.offramp_reference}</span></div>}
          </div>
        </Card>

        <Card title="On-chain proof">
          <div className="text-sm space-y-2">
            <ChainRow label="Invoice PDA" value={inv.invoice_pda} />
            <ChainRow label="Pay tx" value={inv.pay_tx_signature} link />
            <ChainRow label="Release tx" value={inv.release_tx_signature} link />
            <ChainRow label="Refund tx" value={inv.refund_tx_signature} link />
          </div>
        </Card>
      </div>

      {/* Event log */}
      <div className="mt-6 rounded-xl border border-border bg-paper p-6">
        <h2 className="text-sm font-medium mb-3">Activity</h2>
        <div className="text-sm text-muted-foreground">No events yet.</div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-paper p-6">
      <h2 className="text-sm font-medium mb-3">{title}</h2>
      {children}
    </div>
  );
}
function Row({ label, value, bold, muted }: { label: string; value: React.ReactNode; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={`mono tabular ${bold ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
function ChainRow({ label, value, link }: { label: string; value?: string | null; link?: boolean }) {
  if (!value) return <div><span className="text-muted-foreground">{label}:</span> <span className="text-muted-foreground">—</span></div>;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      {link ? (
        <a href={solscanUrl(value)} target="_blank" rel="noreferrer" className="mono text-xs hover:underline inline-flex items-center gap-1">
          {shortAddr(value, 6)} <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="mono text-xs" title={value}>{shortAddr(value, 6)}</span>
      )}
    </div>
  );
}
