import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Mail, Wallet, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Soté" },
      { name: "description", content: "Sign in to Soté to pay foreign vendors in minutes." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading } = useAuth();
  const { ready, authenticated, login } = usePrivy();
  const nav = useNavigate();

  useEffect(() => {
    if (user) nav({ to: "/app" });
  }, [user, nav]);

  const busy = !ready || loading;

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left: form */}
      <div className="flex flex-col px-6 py-8 md:px-16 md:py-12">
        <Link to="/"><Logo /></Link>
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-sm mx-auto">
            <h1 className="text-3xl font-semibold tracking-tight">
              {authenticated ? "Signing you in…" : "Welcome to Soté"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in with email, Google, or your Solana wallet. We create an embedded wallet for you on first sign-in — no extension needed.
            </p>

            <div className="mt-8 space-y-3">
              <Button
                onClick={login}
                disabled={busy || authenticated}
                className="w-full bg-ink text-bone hover:bg-ink/90 h-11"
              >
                {busy ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…</>
                ) : authenticated ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Finishing setup…</>
                ) : (
                  <>Continue</>
                )}
              </Button>

              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <MethodTag icon={<Mail className="h-3 w-3" />} label="Email" />
                <MethodTag icon={<GoogleMark />} label="Google" />
                <MethodTag icon={<Wallet className="h-3 w-3" />} label="Wallet" />
              </div>
            </div>

            <div className="mt-10 rounded-lg border border-border bg-paper p-4 text-xs text-muted-foreground flex gap-3">
              <ShieldCheck className="h-4 w-4 shrink-0 text-forest mt-0.5" />
              <div>
                Your keys, your wallet. Soté never holds your private key — Privy creates a self-custodial Solana wallet on your behalf the first time you sign in. You can connect Phantom, Solflare, or Backpack any time.
              </div>
            </div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">© 2026 Soté</div>
      </div>

      {/* Right: brand panel */}
      <div className="hidden md:flex bg-ink text-bone p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="relative z-10 flex flex-col justify-between w-full">
          <div className="text-sm text-sage">A note from the team</div>
          <blockquote className="text-3xl font-semibold tracking-tight leading-tight max-w-md">
            "We built Soté for the importer who's lost an auction waiting on a wire. Pay once, settle in hours, sleep at night."
          </blockquote>
          <div className="text-sm text-sage">— Soté founders, Lagos &amp; Dubai</div>
        </div>
      </div>
    </div>
  );
}

function MethodTag({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5 rounded-md border border-border bg-paper py-2">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function GoogleMark() {
  // Tiny inline Google "G" mark; avoids loading an extra asset.
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden>
      <path fill="#4285F4" d="M23.06 12.25c0-.83-.07-1.62-.21-2.39H12v4.51h6.21a5.31 5.31 0 0 1-2.31 3.49v2.9h3.74c2.19-2.02 3.42-5 3.42-8.51z"/>
      <path fill="#34A853" d="M12 24c3.13 0 5.76-1.04 7.68-2.84l-3.74-2.9c-1.04.7-2.37 1.11-3.94 1.11-3.03 0-5.6-2.05-6.51-4.8H1.62v3.02A11.99 11.99 0 0 0 12 24z"/>
      <path fill="#FBBC05" d="M5.49 14.57A7.2 7.2 0 0 1 5.1 12c0-.89.15-1.76.39-2.57V6.4H1.62A11.99 11.99 0 0 0 .12 12c0 1.94.46 3.78 1.5 5.6l3.87-3.03z"/>
      <path fill="#EA4335" d="M12 4.75c1.71 0 3.24.59 4.45 1.74l3.32-3.32C17.75 1.18 15.13 0 12 0 7.31 0 3.27 2.69 1.62 6.6l3.87 3.02C6.4 6.8 8.97 4.75 12 4.75z"/>
    </svg>
  );
}
