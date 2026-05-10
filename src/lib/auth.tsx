import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { supabase, setSupabaseToken } from "@/integrations/supabase/client";
import { exchangePrivyToken } from "@/routes/api.privy-bridge";

/**
 * AuthProvider — Privy-backed identity, Supabase-backed data.
 *
 * On Privy `authenticated`:
 *   1. Get Privy access token
 *   2. POST to /api/privy-bridge → returns a Supabase-compatible JWT + profile
 *   3. supabase.auth.setSession(...) so RLS policies kick in
 *   4. Load roles
 *
 * On Privy `unauthenticated`:
 *   - supabase.auth.signOut() and clear local state
 *
 * Re-mints the Supabase JWT every 50 minutes (it expires in 60).
 */

interface Profile {
  id: string;
  privy_id: string | null;
  email: string | null;
  business_name: string | null;
  wallet_address: string | null;
}

interface AuthCtx {
  loading: boolean;
  user: { id: string; email: string | null } | null;
  profile: Profile | null;
  roles: string[];
  isOperator: boolean;
  privyReady: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, getAccessToken, logout } = usePrivy();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [user, setUser] = useState<AuthCtx["user"]>(null);

  // Used by setInterval cleanup
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const exchangeAndSetSession = useCallback(async () => {
    if (!authenticated) return null;
    const token = await getAccessToken();
    if (!token) return null;

    let data: Awaited<ReturnType<typeof exchangePrivyToken>>;
    try {
      data = await exchangePrivyToken({ data: { privyAccessToken: token } });
    } catch (err) {
      console.error("[auth] privy-bridge failed", err);
      return null;
    }
    setSupabaseToken(data.access_token);
    return data.profile as Profile;
  }, [authenticated, getAccessToken]);

  const loadRoles = useCallback(async (uid: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles((data ?? []).map((r: any) => r.role));
  }, []);

  const refresh = useCallback(async () => {
    if (!authenticated) return;
    const prof = await exchangeAndSetSession();
    if (prof) {
      setProfile(prof);
      setUser({ id: prof.id, email: prof.email });
      await loadRoles(prof.id);
    }
  }, [authenticated, exchangeAndSetSession, loadRoles]);

  // Main effect: react to Privy auth state changes
  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      if (authenticated) {
        const prof = await exchangeAndSetSession();
        if (cancelled) return;
        if (prof) {
          setProfile(prof);
          setUser({ id: prof.id, email: prof.email });
          await loadRoles(prof.id);
        } else {
          // Bridge failed; treat as logged out to avoid a half-state
          setProfile(null);
          setUser(null);
          setRoles([]);
        }
      } else {
        setSupabaseToken(null);
        setProfile(null);
        setUser(null);
        setRoles([]);
      }
      if (!cancelled) setLoading(false);
    })();

    // Re-mint the Supabase JWT every 50 minutes
    if (refreshTimer.current) clearInterval(refreshTimer.current);
    if (authenticated) {
      refreshTimer.current = setInterval(() => {
        exchangeAndSetSession().catch(() => {/* ignore */});
      }, 50 * 60 * 1000);
    }

    return () => {
      cancelled = true;
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [ready, authenticated, exchangeAndSetSession, loadRoles]);

  const value: AuthCtx = {
    loading: !ready || loading,
    user,
    profile,
    roles,
    isOperator: roles.includes("operator"),
    privyReady: ready,
    signOut: async () => {
      setSupabaseToken(null);
      await logout();
    },
    refresh,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
