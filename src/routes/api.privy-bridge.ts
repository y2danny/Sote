/**
 * Exchanges a Privy access token for a Supabase-compatible JWT.
 * All server-only imports are inside the handler so this module is safe to
 * import on the client — TanStack Start replaces the handler with an RPC stub.
 */
import { createServerFn } from "@tanstack/react-start";

export const exchangePrivyToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (
      !input ||
      typeof input !== "object" ||
      !("privyAccessToken" in input) ||
      typeof (input as any).privyAccessToken !== "string"
    ) {
      throw new Error("missing_token");
    }
    return input as { privyAccessToken: string };
  })
  .handler(async ({ data }: { data: { privyAccessToken: string } }) => {
    // Dynamic imports keep server-only packages out of the client bundle.
    const { PrivyClient } = await import("@privy-io/server-auth");
    const { default: jwt } = await import("jsonwebtoken");
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // ------- Privy helpers -------
    const appId =
      process.env.VITE_PRIVY_APP_ID || "cmosl5nnf00uz0dkz3gcqxtlj";
    const appSecret = process.env.PRIVY_APP_SECRET;
    if (!appSecret) throw new Error("PRIVY_APP_SECRET missing from server env");
    const privy = new PrivyClient(appId, appSecret);

    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret)
      throw new Error("SUPABASE_JWT_SECRET missing from server env");

    function pickEmail(user: any): string | null {
      if (user.email?.address) return user.email.address;
      const google = user.linkedAccounts?.find(
        (a: any) => a.type === "google_oauth",
      );
      return google?.email ?? null;
    }

    function pickSolanaAddress(user: any): string | null {
      const linked: any[] = user.linkedAccounts ?? [];
      const embedded = linked.find(
        (a) =>
          a.type === "wallet" &&
          a.chainType === "solana" &&
          a.walletClientType === "privy",
      );
      if (embedded?.address) return embedded.address;
      return linked.find((a) => a.type === "wallet" && a.chainType === "solana")
        ?.address ?? null;
    }

    // 1. Verify the Privy access token
    let claims: { userId: string };
    try {
      claims = await privy.verifyAuthToken(data.privyAccessToken);
    } catch (err: any) {
      throw new Error(`invalid_token: ${err?.message ?? String(err)}`);
    }

    // 2. Fetch the full Privy user record
    let user: any;
    try {
      user = await privy.getUserById(claims.userId);
    } catch (err: any) {
      throw new Error(`privy_user_lookup_failed: ${err?.message ?? String(err)}`);
    }

    const email = pickEmail(user);
    const walletAddress = pickSolanaAddress(user);
    const businessName = email ? email.split("@")[0] : null;

    // 3. Upsert profile via service-role RPC
    const { data: profile, error } = await (supabaseAdmin as any).rpc(
      "ensure_user_from_privy",
      {
        _privy_id: claims.userId,
        _email: email,
        _business_name: businessName,
        _wallet_address: walletAddress,
      },
    );

    if (error || !profile) {
      throw new Error(`profile_upsert_failed: ${error?.message ?? "unknown"}`);
    }

    const profileRow = Array.isArray(profile) ? profile[0] : profile;

    // 4. Mint a Supabase-compatible JWT
    const nowSec = Math.floor(Date.now() / 1000);
    // PostgREST treats the JWT secret as base64-encoded; decode before signing
    // so the HMAC key matches what PostgREST uses for verification.
    const signingKey = Buffer.from(jwtSecret, "base64");
    const supabaseJwt = jwt.sign(
      {
        aud: "authenticated",
        role: "authenticated",
        sub: profileRow.id,
        privy_id: claims.userId,
        email: profileRow.email,
        iat: nowSec,
        exp: nowSec + 60 * 60,
      },
      signingKey,
      { algorithm: "HS256" },
    );

    return {
      access_token: supabaseJwt,
      refresh_token: supabaseJwt,
      expires_in: 60 * 60,
      token_type: "bearer",
      profile: {
        id: profileRow.id,
        privy_id: profileRow.privy_id,
        email: profileRow.email,
        business_name: profileRow.business_name,
        wallet_address: profileRow.wallet_address,
      },
    };
  });
