import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { addInvoice } from "@/lib/invoice-store";
import { useWallets as useSolanaWallets, useSignMessage } from "@privy-io/react-auth/solana";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Globe2, Wallet, Check, ArrowLeft, ShieldCheck, Loader2 } from "lucide-react";
import { computeQuote, type Corridor } from "@/lib/quote";
import { formatPUSD, formatUSD } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/app/invoices/new")({
  head: () => ({ meta: [{ title: "New invoice — Soté" }] }),
  component: NewInvoice,
});

type Step = "corridor" | "vendor" | "quote" | "signing";

const SIMULATE_SIGNING =
  (import.meta.env.VITE_SIMULATE_SIGNING ?? "false").toString().toLowerCase() === "true";

function NewInvoice() {
  const { user } = useAuth();
  const { wallets } = useSolanaWallets();
  const { signMessage } = useSignMessage();
  const nav = useNavigate();

  const [step, setStep] = useState<Step>("corridor");
  const [corridor, setCorridor] = useState<Corridor | null>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorMode, setVendorMode] = useState<"saved" | "new">("saved");
  const [savedVendorId, setSavedVendorId] = useState<string | null>(null);
  const [destination, setDestination] = useState<Record<string, string>>({});
  const [displayName, setDisplayName] = useState("");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [secondsLeft, setSecondsLeft] = useState(180);
  const [signing, setSigning] = useState(false);

  const wallet = wallets[0]; // Embedded wallet is preferred; user can pick later

  useEffect(() => {
    if (!user) return;
    supabase.from("vendors").select("*").eq("importer_id", user.id).is("archived_at", null).then(({ data }) => setVendors(data ?? []));
  }, [user?.id]);

  const filteredVendors = vendors.filter(v => v.corridor === corridor);

  const quote = useMemo(() => {
    const a = parseFloat(amount);
    if (!corridor || !a || a <= 0) return null;
    return computeQuote(corridor, a);
  }, [corridor, amount]);

  useEffect(() => {
    if (step !== "quote") return;
    setSecondsLeft(180);
    const t = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [step]);

  const submit = async () => {
    if (!quote || !corridor || !user) return;
    setSigning(true);
    setStep("signing");

    try {
      if (wallet) {
        const msg = new TextEncoder().encode(
          `Pay ${amount} PUSD · ${corridor} · ${new Date().toISOString()}`,
        );
        await signMessage({ message: msg, wallet });
      } else {
        await new Promise(r => setTimeout(r, 1500));
      }
    } catch {
      // demo: proceed regardless of signing result
    }

    const savedVendor = vendors.find(x => x.id === savedVendorId);
    const vendorSnap =
      vendorMode === "saved"
        ? { display_name: savedVendor?.display_name ?? "Vendor", corridor, ...(savedVendor?.destination ?? {}) }
        : { display_name: displayName, corridor, ...destination };

    addInvoice({
      importer_id: user.id,
      vendor_id: vendorMode === "saved" ? savedVendorId : null,
      vendor_snapshot: vendorSnap,
      corridor,
      amount_pusd: quote.invoice_amount_pusd,
      sote_fee_pusd: quote.sote_fee_pusd,
      offramp_fee_pusd: quote.offramp_fee_pusd,
      total_pusd: quote.total_pusd,
      reference: reference || null,
      description: description || null,
      status: "awaiting_payment",
    });

    setSigning(false);
    toast.success("Payment submitted!");
    nav({ to: "/app" });
  };

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-3xl">
      <button onClick={() => step === "corridor" ? nav({ to: "/app" }) : setStep(step === "quote" ? "vendor" : "corridor")} className="text-sm text-muted-foreground hover:text-ink inline-flex items-center gap-1.5 mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <ProgressDots step={step} />

      {step === "corridor" && (
        <div className="mt-8">
          <h1 className="text-3xl font-semibold tracking-tight">Pick a corridor</h1>
          <p className="mt-2 text-sm text-muted-foreground">Choose the rail that matches how your vendor wants to be paid.</p>
          <div className="mt-8 grid gap-4">
            <CorridorOption
              icon={<Building2 className="h-5 w-5" />}
              title="USD wire"
              who="Pay US auction houses (Copart, IAAI), shippers, suppliers."
              arrival="≈ 4 hours"
              fee="0.5% + $25 flat"
              selected={corridor === "usd_offramp"}
              onClick={() => { setCorridor("usd_offramp"); setStep("vendor"); }}
            />
            <CorridorOption
              icon={<Globe2 className="h-5 w-5" />}
              title="SGD transfer"
              who="Pay Singapore suppliers — bank account or PayNow."
              arrival="≈ 6 hours"
              fee="0.5% + $15 flat"
              selected={corridor === "sgd_offramp"}
              onClick={() => { setCorridor("sgd_offramp"); setStep("vendor"); }}
            />
            <CorridorOption
              icon={<Wallet className="h-5 w-5" />}
              title="Direct PUSD"
              who="Pay a Solana wallet directly. Fastest, lowest cost."
              arrival="< 30 seconds"
              fee="0.5%"
              selected={corridor === "direct_pusd"}
              onClick={() => { setCorridor("direct_pusd"); setStep("vendor"); }}
            />
          </div>
        </div>
      )}

      {step === "vendor" && corridor && (
        <div className="mt-8">
          <h1 className="text-3xl font-semibold tracking-tight">Vendor &amp; amount</h1>
          <p className="mt-2 text-sm text-muted-foreground">Where should this payment go?</p>

          <div className="mt-6 flex gap-1 rounded-md bg-paper border border-border p-1 w-fit">
            <button onClick={() => setVendorMode("saved")} className={`px-3 py-1.5 text-sm rounded ${vendorMode==="saved"?"bg-ink text-bone":"text-muted-foreground"}`}>Saved vendors</button>
            <button onClick={() => setVendorMode("new")} className={`px-3 py-1.5 text-sm rounded ${vendorMode==="new"?"bg-ink text-bone":"text-muted-foreground"}`}>New vendor</button>
          </div>

          {vendorMode === "saved" ? (
            <div className="mt-4 space-y-2">
              {filteredVendors.length === 0 && <div className="text-sm text-muted-foreground">No saved vendors for this corridor yet. Switch to "New vendor".</div>}
              {filteredVendors.map(v => (
                <button key={v.id} onClick={() => setSavedVendorId(v.id)} className={cn("w-full text-left rounded-lg border p-4 bg-paper transition", savedVendorId === v.id ? "border-ink ring-1 ring-ink/10" : "border-border hover:border-ink/30")}>
                  <div className="font-medium">{v.display_name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 mono">
                    {v.destination?.bank_name ?? v.destination?.solana_address ?? ""}
                    {v.destination?.account_number ? ` · ${v.destination.account_number}` : ""}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <NewVendorForm corridor={corridor} displayName={displayName} setDisplayName={setDisplayName} destination={destination} setDestination={setDestination} />
          )}

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="amt">Amount in USD</Label>
              <Input id="amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="8420.00" className="bg-paper" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref">Reference</Label>
              <Input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Copart auction 41928374" className="bg-paper" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="desc">Note (optional)</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="bg-paper" />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <Button
              disabled={!amount || (vendorMode === "saved" ? !savedVendorId : !displayName)}
              onClick={() => setStep("quote")}
              className="bg-ink text-bone hover:bg-ink/90"
            >
              Continue to quote
            </Button>
          </div>
        </div>
      )}

      {step === "quote" && quote && corridor && (
        <div className="mt-8">
          <h1 className="text-3xl font-semibold tracking-tight">Review &amp; sign</h1>
          <p className="mt-2 text-sm text-muted-foreground">Locked quote. Sign to start settlement.</p>

          <div className="mt-8 rounded-xl border border-border bg-paper p-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Quote expires in</span>
              <span className="mono">{Math.floor(secondsLeft/60)}:{String(secondsLeft%60).padStart(2,"0")}</span>
            </div>
            <div className="mt-5 space-y-2 text-sm">
              <Line label="Invoice amount" value={formatUSD(quote.amount_usd)} />
              <Line label="Soté fee (0.5%)" value={formatPUSD(quote.sote_fee_pusd) + " PUSD"} muted />
              <Line label="Off-ramp fee" value={formatPUSD(quote.offramp_fee_pusd) + " PUSD"} muted />
              <Line label="Network fee" value={formatPUSD(quote.network_fee_pusd) + " PUSD"} muted />
              <div className="my-3 border-t border-border" />
              <Line label="Total in PUSD" value={formatPUSD(quote.total_pusd) + " PUSD"} bold />
              <Line label="Estimated arrival" value={quote.estimated_arrival_min < 60 ? `~${quote.estimated_arrival_min} min` : `~${Math.round(quote.estimated_arrival_min/60)} hours`} muted />
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-paper p-4 text-xs text-muted-foreground flex gap-3">
            <ShieldCheck className="h-4 w-4 shrink-0 text-forest mt-0.5" />
            <div>
              {SIMULATE_SIGNING
                ? "Simulated signing is on (VITE_SIMULATE_SIGNING=true). The signature will be generated server-side for demo purposes."
                : "By signing, your wallet sends PUSD to the Soté treasury where it's held until your vendor receives the off-ramp. Refundable on-chain if settlement fails."}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setStep("vendor")}>Back</Button>
            <Button
              onClick={submit}
              disabled={secondsLeft === 0 || signing || (!SIMULATE_SIGNING && !wallet)}
              className="bg-kola text-bone hover:bg-kola/90"
            >
              {signing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing</> : "Sign with wallet"}
            </Button>
          </div>
          {!SIMULATE_SIGNING && !wallet && (
            <div className="mt-3 text-xs text-muted-foreground text-right">
              Provisioning your Solana wallet… try again in a few seconds.
            </div>
          )}
        </div>
      )}

      {step === "signing" && (
        <div className="mt-12 flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-full bg-ink text-bone flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <div className="mt-6 text-lg font-medium">Submitting to Solana…</div>
          <div className="mt-1 text-sm text-muted-foreground">{SIMULATE_SIGNING ? "Simulated" : "Devnet · sim-PUSD transfer"}</div>
        </div>
      )}
    </div>
  );
}

function ProgressDots({ step }: { step: Step }) {
  const order: Step[] = ["corridor", "vendor", "quote", "signing"];
  const idx = order.indexOf(step);
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {["Corridor","Vendor","Quote","Sign"].map((l, i) => (
        <div key={l} className="flex items-center gap-1.5">
          <span className={`h-1.5 w-6 rounded-full ${i <= idx ? "bg-ink" : "bg-border"}`} />
          <span className={i === idx ? "text-ink font-medium" : ""}>{l}</span>
          {i < 3 && <span className="mx-1">·</span>}
        </div>
      ))}
    </div>
  );
}

function CorridorOption({ icon, title, who, arrival, fee, selected, onClick }: { icon: React.ReactNode; title: string; who: string; arrival: string; fee: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("w-full text-left rounded-xl border bg-paper p-5 transition", selected ? "border-ink ring-1 ring-ink/10" : "border-border hover:border-ink/40")}>
      <div className="flex items-start gap-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-forest text-bone shrink-0">{icon}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{title}</h3>
            {selected && <Check className="h-4 w-4 text-ink" />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{who}</p>
          <div className="mt-3 flex gap-6 text-xs">
            <span><span className="text-muted-foreground">Arrival:</span> <span className="font-medium">{arrival}</span></span>
            <span><span className="text-muted-foreground">Fee:</span> <span className="font-medium">{fee}</span></span>
          </div>
        </div>
      </div>
    </button>
  );
}

function NewVendorForm({ corridor, displayName, setDisplayName, destination, setDestination }: { corridor: Corridor; displayName: string; setDisplayName: (v: string) => void; destination: Record<string,string>; setDestination: (v: Record<string,string>) => void }) {
  const set = (k: string, v: string) => setDestination({ ...destination, [k]: v });
  return (
    <div className="mt-4 grid gap-4 rounded-xl border border-border bg-paper p-5 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Vendor name</Label>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Copart Auctions LLC" />
      </div>
      {corridor === "usd_offramp" && (
        <>
          <Field label="Beneficiary name" v={destination.beneficiary_name ?? ""} on={(v) => set("beneficiary_name", v)} />
          <Field label="Bank name" v={destination.bank_name ?? ""} on={(v) => set("bank_name", v)} />
          <Field label="Routing number" v={destination.routing_number ?? ""} on={(v) => set("routing_number", v)} mono />
          <Field label="Account number" v={destination.account_number ?? ""} on={(v) => set("account_number", v)} mono />
        </>
      )}
      {corridor === "sgd_offramp" && (
        <>
          <Field label="Beneficiary name" v={destination.beneficiary_name ?? ""} on={(v) => set("beneficiary_name", v)} />
          <Field label="Bank name" v={destination.bank_name ?? ""} on={(v) => set("bank_name", v)} />
          <Field label="Account number" v={destination.account_number ?? ""} on={(v) => set("account_number", v)} mono />
          <Field label="PayNow ID (optional)" v={destination.paynow_id ?? ""} on={(v) => set("paynow_id", v)} />
        </>
      )}
      {corridor === "direct_pusd" && (
        <Field full label="Solana address" v={destination.solana_address ?? ""} on={(v) => set("solana_address", v)} mono />
      )}
    </div>
  );
}
function Field({ label, v, on, mono, full }: { label: string; v: string; on: (v: string) => void; mono?: boolean; full?: boolean }) {
  return (
    <div className={cn("space-y-1.5", full && "sm:col-span-2")}>
      <Label>{label}</Label>
      <Input value={v} onChange={(e) => on(e.target.value)} className={mono ? "mono" : ""} />
    </div>
  );
}
function Line({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={`mono tabular ${bold ? "font-semibold text-base" : ""}`}>{value}</span>
    </div>
  );
}
