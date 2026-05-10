import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Archive } from "lucide-react";
import { corridorLabel } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/app/vendors")({
  head: () => ({ meta: [{ title: "Vendors — Soté" }] }),
  component: VendorsPage,
});

function VendorsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [corridor, setCorridor] = useState<"usd_offramp"|"sgd_offramp"|"direct_pusd">("usd_offramp");
  const [dest, setDest] = useState<Record<string,string>>({});

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("vendors").select("*").eq("importer_id", user.id).is("archived_at", null).order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [user?.id]);

  const create = async () => {
    if (!user) return;
    const { error } = await supabase.from("vendors").insert({ importer_id: user.id, display_name: name, corridor, destination: dest });
    if (error) { toast.error(error.message); return; }
    toast.success("Vendor saved");
    setOpen(false); setName(""); setDest({}); await load();
  };

  const archive = async (id: string) => {
    await supabase.from("vendors").update({ archived_at: new Date().toISOString() }).eq("id", id);
    await load();
  };

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Vendors</h1>
          <p className="mt-1 text-sm text-muted-foreground">Save vendors you pay regularly.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-ink text-bone hover:bg-ink/90"><Plus className="h-4 w-4 mr-1.5" /> New vendor</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New vendor</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5"><Label>Vendor name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Corridor</Label>
                <Select value={corridor} onValueChange={(v) => { setCorridor(v as any); setDest({}); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd_offramp">USD wire</SelectItem>
                    <SelectItem value="sgd_offramp">SGD transfer</SelectItem>
                    <SelectItem value="direct_pusd">Direct PUSD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {corridor === "usd_offramp" && (<>
                <FieldRow label="Beneficiary" v={dest.beneficiary_name ?? ""} on={(v) => setDest({ ...dest, beneficiary_name: v })} />
                <FieldRow label="Bank" v={dest.bank_name ?? ""} on={(v) => setDest({ ...dest, bank_name: v })} />
                <FieldRow label="Routing #" v={dest.routing_number ?? ""} on={(v) => setDest({ ...dest, routing_number: v })} />
                <FieldRow label="Account #" v={dest.account_number ?? ""} on={(v) => setDest({ ...dest, account_number: v })} />
              </>)}
              {corridor === "sgd_offramp" && (<>
                <FieldRow label="Beneficiary" v={dest.beneficiary_name ?? ""} on={(v) => setDest({ ...dest, beneficiary_name: v })} />
                <FieldRow label="Bank" v={dest.bank_name ?? ""} on={(v) => setDest({ ...dest, bank_name: v })} />
                <FieldRow label="Account #" v={dest.account_number ?? ""} on={(v) => setDest({ ...dest, account_number: v })} />
                <FieldRow label="PayNow ID" v={dest.paynow_id ?? ""} on={(v) => setDest({ ...dest, paynow_id: v })} />
              </>)}
              {corridor === "direct_pusd" && (
                <FieldRow label="Solana address" v={dest.solana_address ?? ""} on={(v) => setDest({ ...dest, solana_address: v })} />
              )}
            </div>
            <DialogFooter><Button onClick={create} className="bg-ink text-bone hover:bg-ink/90">Save vendor</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-paper overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No saved vendors yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border">
              <tr><th className="px-4 py-2.5 text-left font-medium">Vendor</th><th className="px-4 py-2.5 text-left font-medium">Corridor</th><th className="px-4 py-2.5 text-left font-medium">Destination</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map(v => (
                <tr key={v.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{v.display_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{corridorLabel(v.corridor)}</td>
                  <td className="px-4 py-3 mono text-xs text-muted-foreground">{v.destination?.bank_name ?? v.destination?.solana_address ?? ""}{v.destination?.account_number ? ` · ${v.destination.account_number}` : ""}</td>
                  <td className="px-4 py-3 text-right"><button onClick={() => archive(v.id)} className="text-muted-foreground hover:text-failure inline-flex items-center gap-1 text-xs"><Archive className="h-3.5 w-3.5" /> Archive</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FieldRow({ label, v, on }: { label: string; v: string; on: (s: string) => void }) {
  return <div className="space-y-1.5"><Label>{label}</Label><Input value={v} onChange={(e) => on(e.target.value)} /></div>;
}
