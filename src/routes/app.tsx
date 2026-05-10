import { createFileRoute, Link, Outlet, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/brand/Logo";
import { Home, FileText, Users2, Settings, Plus, LogOut, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { shortAddr } from "@/lib/format";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { loading, user, profile, isOperator, signOut } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [loading, user, nav]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading…</div>;
  }

  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
    const active = loc.pathname === to || (to !== "/app" && loc.pathname.startsWith(to));
    return (
      <Link to={to} className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
        active ? "bg-ink text-bone" : "text-muted-foreground hover:bg-muted hover:text-ink"
      )}>
        <Icon className="h-4 w-4" /> {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-bone">
      <div className="mx-auto flex max-w-[1400px]">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-paper min-h-screen sticky top-0 px-4 py-6">
          <Link to="/"><Logo /></Link>

          <Button asChild className="mt-6 bg-ink text-bone hover:bg-ink/90">
            <Link to="/app/invoices/new"><Plus className="h-4 w-4 mr-1.5" /> New invoice</Link>
          </Button>

          <nav className="mt-6 flex flex-col gap-1">
            <NavItem to="/app" icon={Home} label="Dashboard" />
            <NavItem to="/app/invoices" icon={FileText} label="Invoices" />
            <NavItem to="/app/vendors" icon={Users2} label="Vendors" />
            <NavItem to="/app/settings" icon={Settings} label="Settings" />
          </nav>

          {isOperator && (
            <div className="mt-6">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground px-3 mb-2">Operator</div>
              <NavItem to="/ops" icon={ShieldAlert} label="Live monitor" />
            </div>
          )}

          <div className="mt-auto pt-6 border-t border-border">
            <div className="px-3 text-sm font-medium truncate">{profile?.business_name ?? "—"}</div>
            <div className="px-3 mono text-xs text-muted-foreground truncate" title={profile?.wallet_address ?? ""}>
              {shortAddr(profile?.wallet_address)}
            </div>
            <button
              onClick={async () => { await signOut(); router.invalidate(); nav({ to: "/" }); }}
              className="mt-3 flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-ink"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
