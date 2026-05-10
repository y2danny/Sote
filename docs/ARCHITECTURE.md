# Soté Architecture (Post-Privy)

Single-page reference. Read this before opening a PR that touches auth or signing.

## Stack at a glance

```
Browser (TanStack Start client)
 ├─ PrivyProvider (@privy-io/react-auth)               ← identity + embedded Solana wallet
 │   ├─ login methods: email OTP, Google OAuth, external wallet (Phantom / Solflare)
 │   └─ embeddedWallets.solana.createOnLogin = "users-without-wallets"
 ├─ Supabase JS client (@supabase/supabase-js)         ← DB reads / RPC calls
 │   └─ session set from a Supabase JWT minted by our bridge route
 └─ @solana/web3.js                                     ← devnet RPC for tx confirmation, balance reads

Server (TanStack Start, Cloudflare Workers runtime)
 └─ /api/privy-bridge
     ├─ verifies Privy access token (PrivyClient.verifyAuthToken)
     ├─ pulls the user's email + linked Solana address (PrivyClient.getUserById)
     ├─ upserts profile + importer role via supabaseAdmin.rpc("ensure_user_from_privy", …)
     └─ signs a Supabase-compatible JWT (HS256, sub = profile.id, role = "authenticated", privy_id claim)

Supabase (Postgres + RLS)
 ├─ profiles (id uuid, privy_id text unique, email, business_name, wallet_address)
 ├─ user_roles, vendors, invoices, quotes, offramp_events, audit_log
 ├─ has_role(uuid, app_role) — same as before
 ├─ ensure_user_from_privy(privy_id, email, business_name, wallet_address)
 ├─ sign_and_pay_v2(invoice_id, pay_tx_signature, invoice_pda)
 ├─ advance_invoice / operator_retry / operator_refund — unchanged behavior, just rely on profiles.id
 └─ All RLS uses auth.uid() which Supabase derives from the JWT `sub` claim

Solana (devnet)
 └─ Sim PUSD: an SPL token mint we control. 6-decimal Token program (not Token-2022).
    ─ Real PalmUSD exists only on mainnet, so we simulate the token contract.
    ─ Treasury wallet holds the supply; importers receive funded balances for testing.
```

## Identity flow (sign-in)

1. User clicks "Sign in" on `/login` → `usePrivy().login()` opens the Privy modal.
2. They auth with email OTP / Google / wallet. Privy creates an embedded Solana wallet if they don't have one.
3. `usePrivy()` returns `authenticated: true` + an access token (`getAccessToken()`).
4. `AuthProvider` (in `src/lib/auth.tsx`) fetches that token and POSTs it to `/api/privy-bridge`.
5. The bridge route verifies the token with `@privy-io/server-auth`, ensures a `profiles` row exists, and returns a Supabase JWT.
6. The client calls `supabase.auth.setSession({ access_token, refresh_token: access_token })` so every subsequent Supabase query is authenticated as that user.
7. RLS works exactly as before because the JWT carries `sub = profiles.id` and `role = "authenticated"`.

## Identity flow (sign-out)

1. User clicks "Sign out" → `usePrivy().logout()` and `supabase.auth.signOut()`.
2. The bridge keeps no server-side session — the JWT was self-contained.

## Signing flow (invoice creation)

1. User completes the wizard on `/app/invoices/new`.
2. We insert a `draft` invoice with `status = 'awaiting_payment'`.
3. We build a Solana transaction that transfers `total_pusd` sim-PUSD from the user's embedded wallet to the treasury (later: to an Anchor escrow PDA).
4. `useSendTransaction({ wallet })` from `@privy-io/react-auth/solana` opens the Privy confirmation modal, signs, and submits to devnet.
5. The returned signature is passed to the new `sign_and_pay_v2` RPC, which records it on the invoice and schedules `next_advance_at` 3 seconds out.
6. `advance_invoice` keeps the existing time-driven state machine — that's mocked off-ramp behavior and is intentional for MVP.

## Why Pattern B (JWT bridge) instead of "Privy as primary auth"

- **Preserves all existing RLS.** Every policy uses `auth.uid()`. We don't have to rewrite a single one.
- **Cheaper to roll back.** If Privy goes down or we change our mind, the schema can fall back to email/password by re-enabling Supabase Auth — the data layer is identical.
- **Server-side keys stay clean.** The bridge route is the only thing that knows the `SUPABASE_JWT_SECRET`. No service-role key is exposed to the client.

The cost is one extra round trip on login. That's it.

## Files added in this phase

```
docs/
  ARCHITECTURE.md
  PRIVY_INTEGRATION.md
  PROGRESS.md
  PUSD_DEVNET.md
  SETUP.md
scripts/
  create-sim-pusd.ts
src/
  lib/
    privy/
      config.ts
    solana/
      connection.ts
      pusd.ts
  routes/
    api.privy-bridge.ts
supabase/migrations/
  20260505000000_privy_bridge.sql
  20260505000100_sign_and_pay_v2.sql
.env.example
```

## Files rewritten in this phase

```
src/lib/auth.tsx          (now Privy-backed)
src/routes/__root.tsx     (wraps PrivyProvider)
src/routes/login.tsx      (Privy login UI)
src/routes/app.settings.tsx (wallet linking UI)
src/routes/app.invoices.new.tsx (real Solana signing)
```

## Environment variables

See `.env.example` for the full list. Quick map:

| Variable | Used in | Purpose |
|---|---|---|
| `VITE_PRIVY_APP_ID` | Client | Privy app ID (public) |
| `PRIVY_APP_SECRET` | Server | Privy app secret for token verification |
| `SUPABASE_JWT_SECRET` | Server | HS256 secret used to sign Supabase-compatible JWTs |
| `VITE_SUPABASE_URL` | Client + Server | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Service role key for the bridge route's admin upserts |
| `VITE_SIM_PUSD_MINT` | Client | Devnet SPL mint we use as PUSD |
| `VITE_TREASURY_ADDRESS` | Client | Solana address that holds sim-PUSD treasury |
| `VITE_SOLANA_RPC_URL` | Client | Devnet RPC endpoint (defaults to api.devnet.solana.com) |
| `VITE_ENABLE_DEMO_SEED` | Client | `"true"` to show the demo seed button |
| `VITE_SIMULATE_SIGNING` | Client | `"true"` to bypass real Solana tx and use the legacy fake-bytes path |
