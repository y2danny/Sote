import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets as useSolanaWallets } from "@privy-io/react-auth/solana";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ExternalLink, Wallet as WalletIcon, Plus, Unlink } from "lucide-react";
import { solscanAddress, getPusdBalance } from "@/lib/solana/pusd";
import { getConnection } from "@/lib/solana/connection";
import { shortAddr } from "@/lib/format";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — Soté" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, profile, refresh, isOperator } = useAuth();
  const { user: privyUser, linkWallet, unlinkWallet } = usePrivy();
  const { wallets: solanaWallets } = useSolanaWallets();

  const [name, setName] = useState("");
  const [embeddedBalance, setEmbeddedBalance] = useState<number | null>(null);

  useEffect(() => { setName(profile?.business_name ?? ""); }, [profile?.business_name]);

  // Linked Solana account list from Privy's user record (covers wallets that
  // aren't in the live `solanaWallets` array, e.g. linked but not connected this session)
  const linkedSolanaAccounts = useMemo(() => {
    const accounts = (privyUser as any)?.linkedAccounts ?? [];
    return accounts.filter((a: any) => a.type === "wallet" && a.chainType === "solana");
  }, [privyUser]);

  // Identify the embedded wallet by address — walletClientType lives on linkedAccounts,
  // not on ConnectedStandardSolanaWallet in Privy v3.
  const embeddedAccountAddress = useMemo(
    () => linkedSolanaAccounts.find((a: any) => a.walletClientType === "privy")?.address ?? null,
    [linkedSolanaAccounts],
  );
  const embeddedWallet = useMemo(
    () => solanaWallets.find((w) => w.address === embeddedAccountAddress),
    [solanaWallets, embeddedAccountAddress],
  );
  const externalWallets = useMemo(
    () => solanaWallets.filter((w) => w.address !== embeddedAccountAddress),
    [solanaWallets, embeddedAccountAddress],
  );

  // Read sim-PUSD balance for the embedded wallet
  useEffect(() => {
    if (!embeddedWallet?.address) return;
    let stale = false;
    (async () => {
      try {
        const bal = await getPusdBalance(getConnection(), embeddedWallet.address);
        if (!stale) setEmbeddedBalance(bal);
      } catch {
        if (!stale) setEmbeddedBalance(0);
      }
    })();
    return () => { stale = true; };
  }, [embeddedWallet?.address]);

  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ business_name: name }).eq("id", user.id);
    if (error) toast.error(error.message); else { toast.success("Saved"); await refresh(); }
  };

  const becomeOp = async () => {
    const { error } = await supabase.rpc("grant_operator");
    if (error) toast.error(error.message); else { toast.success("Operator role granted"); await refresh(); }
  };

  const onUnlink = async (address: string) => {
    try {
      await unlinkWallet(address);
      toast.success("Wallet unlinked");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to unlink");
    }
  };

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your business profile, wallets, and access.</p>

      {/* Business profile */}
      <div className="mt-8 rounded-xl border border-border bg-paper p-6 space-y-5">
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={profile?.email ?? ""} readOnly disabled />
        </div>
        <div className="space-y-1.5">
          <Label>Business name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex justify-end">
          <Button onClick={save} className="bg-ink text-bone hover:bg-ink/90">Save</Button>
        </div>
      </div>

      {/* Wallets */}
      <div className="mt-6 rounded-xl border border-border bg-paper p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Wallets</h2>
          <Button onClick={linkWallet} variant="outline" size="sm">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Link a wallet
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Soté creates a self-custodial Solana wallet for you. Connect Phantom, Solflare, or Backpack any time — all your linked wallets can sign invoices.
        </p>

        {/* Embedded */}
        <div className="mt-5 rounded-lg border border-border p-4 bg-bone">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <WalletIcon className="h-3.5 w-3.5" /> Embedded — Soté wallet
          </div>
          {embeddedWallet ? (
            <>
              <div className="mt-2 flex items-center justify-between">
                <a href={solscanAddress(embeddedWallet.address)} target="_blank" rel="noreferrer" className="mono text-sm hover:underline">
                  {shortAddr(embeddedWallet.address)}
                  <ExternalLink className="h-3 w-3 inline-block ml-1" />
                </a>
                <div className="text-sm">
                  <span className="text-muted-foreground">Balance: </span>
                  <span className="mono">
                    {embeddedBalance === null ? "—" : embeddedBalance.toFixed(2)} PUSD
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Devnet · sim-PUSD. Real PUSD ships on mainnet — see <code>docs/PUSD_DEVNET.md</code>.
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Embedded wallet not provisioned yet. Refresh in a moment.</p>
          )}
        </div>

        {/* External / linked */}
        <div className="mt-3">
          <div className="text-xs text-muted-foreground mb-2">Linked external wallets</div>
          {linkedSolanaAccounts.filter((a: any) => a.walletClientType !== "privy").length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              None yet. Click "Link a wallet" above to connect Phantom, Solflare, or Backpack.
            </div>
          ) : (
            linkedSolanaAccounts
              .filter((a: any) => a.walletClientType !== "privy")
              .map((a: any) => {
                const liveWallet = externalWallets.find((w) => w.address === a.address);
                return (
                  <div key={a.address} className="flex items-center justify-between rounded-lg border border-border p-3 mb-2">
                    <div>
                      <div className="text-sm font-medium capitalize">
                        {a.walletClientType ?? "Wallet"}
                        {liveWallet ? (
                          <span className="ml-2 text-[10px] uppercase tracking-wider text-forest">connected</span>
                        ) : (
                          <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">linked</span>
                        )}
                      </div>
                      <a href={solscanAddress(a.address)} target="_blank" rel="noreferrer" className="mono text-xs text-muted-foreground hover:underline">
                        {shortAddr(a.address)} <ExternalLink className="h-2.5 w-2.5 inline-block ml-0.5" />
                      </a>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => onUnlink(a.address)}>
                      <Unlink className="h-3.5 w-3.5 mr-1" /> Unlink
                    </Button>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Operator */}
      <div className="mt-6 rounded-xl border border-dashed border-border bg-paper p-6">
        <h2 className="font-medium">Operator access</h2>
        <p className="mt-1 text-sm text-muted-foreground">For demo purposes, grant yourself operator privileges to view the live monitor and run retries / refunds.</p>
        <div className="mt-4">
          <Button variant={isOperator ? "outline" : "default"} disabled={isOperator} onClick={becomeOp} className={isOperator ? "" : "bg-kola text-bone hover:bg-kola/90"}>
            {isOperator ? "You are an operator" : "Grant operator role"}
          </Button>
        </div>
      </div>
    </div>
  );
}
