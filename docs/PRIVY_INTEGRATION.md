# Privy Integration Guide for Soté

Pattern: **Privy on top, Supabase JWT bridge underneath.** Read `ARCHITECTURE.md` first if you haven't.

## App ID (already set)

```
cmosl5nnf00uz0dkz3gcqxtlj
```

That goes in `VITE_PRIVY_APP_ID`. The matching app secret lives in the Privy dashboard → App Settings → Basic — copy it into `PRIVY_APP_SECRET`.

## Login methods we expose

- Email OTP
- Google OAuth
- External wallet (Phantom, Solflare via wallet-standard)

All three share one Privy modal. Embedded Solana wallets are auto-created for users who sign in with email or Google.

## Step-by-step

### 1. Install dependencies

```bash
bun add @privy-io/server-auth jsonwebtoken @solana/spl-token
bun add -d @types/jsonwebtoken
```

`@privy-io/react-auth` is already installed at `^3.23.1`.

### 2. Add env vars

Copy `.env.example` to `.env.local` and fill it in. The two non-obvious ones:

- `SUPABASE_JWT_SECRET` — Supabase Studio → Project Settings → API → "JWT Secret". This is what Supabase uses to verify JWTs on every RLS call. We use it to *sign* JWTs in the bridge so RLS treats our minted tokens as legit.
- `PRIVY_APP_SECRET` — Privy dashboard → App settings → Basic.

### 3. Wrap the app with `PrivyProvider`

`src/lib/privy/config.ts` exports a single `privyConfig` object. `src/routes/__root.tsx` imports and applies it. You should not need to touch `__root.tsx` again unless you want to change the modal appearance.

If you want to add Apple OAuth, more wallets, MFA, etc., edit `src/lib/privy/config.ts` only.

### 4. Run the bridge route locally

The route lives at `src/routes/api.privy-bridge.ts`. TanStack Start picks up `api.*` files as JSON endpoints automatically. `vite dev` is enough — no extra config.

### 5. Apply the migrations

```bash
# Either via supabase CLI:
supabase db push

# Or paste each migration into Supabase SQL editor in chronological order:
#   20260505000000_privy_bridge.sql
#   20260505000100_sign_and_pay_v2.sql
```

If your existing dev database has user data tied to `auth.users` you want to keep, see "Migrating existing users" below. For a fresh dev DB, no extra steps.

### 6. Create the sim-PUSD mint

```bash
bun run scripts/create-sim-pusd.ts
```

The script prints a mint address. Paste it into `.env.local` as `VITE_SIM_PUSD_MINT`. It also prints a treasury keypair — paste the public key into `VITE_TREASURY_ADDRESS` and store the secret key in a password manager (you'll need it for any minting later).

### 7. Test the happy path

1. `bun run dev`
2. Open `http://localhost:5173`, click "Open account"
3. Sign in with email OTP. Privy will create an embedded Solana wallet automatically.
4. You'll see the dashboard with the bridge having created your `profiles` row and importer role.
5. Click "Become an operator" if you want to test `/ops`.
6. Click "Load demo data" — three vendors and three invoices are inserted.
7. Click "+ New invoice" → pick Direct PUSD → pick a vendor → enter $10 → "Sign with wallet" → Privy modal appears → confirm.
8. Watch the invoice detail page advance through the state machine.

### 8. Common gotchas

- **`Invalid token` from the bridge route.** Your `PRIVY_APP_SECRET` is wrong, or the access token is expired. Privy access tokens last ~1 hour; `usePrivy()` rotates them.
- **`new row violates row-level security policy` after sign-in.** Your minted Supabase JWT doesn't have `role: "authenticated"` or the `sub` doesn't match `profiles.id`. Inspect with `console.log(jwtDecode(token))` after the bridge call.
- **`Wallet not connected` when signing.** The user opened the form before Privy finished creating the embedded wallet. Add a guard: don't enable the "Sign with wallet" button until `wallets.length > 0`.
- **`Insufficient SOL` on devnet.** Embedded wallets start with 0 SOL. Either airdrop SOL to them in `scripts/create-sim-pusd.ts` or pay tx fees from a sponsor wallet (out of scope here — for now, airdrop).

## Migrating existing users

If your dev DB already has rows in `auth.users` you want to keep:

1. Add a temporary column `profiles.legacy_supabase_uid uuid` and copy the current `id`s into it.
2. After Privy signup, call a one-off RPC `claim_legacy_account(legacy_supabase_uid)` that re-points `profiles.id` to the new Privy-derived UUID. (Not yet written — file an issue if you need it.)
3. Reassign FKs (`vendors.importer_id`, `invoices.importer_id`, `quotes.importer_id`, `audit_log.operator_id`) from the old uid to the new one.

For a fresh dev DB this is irrelevant.

## What the bridge route actually does

```ts
// src/routes/api.privy-bridge.ts (excerpt)

POST /api/privy-bridge
Body: { privyAccessToken: string }

1. const claims = await privy.verifyAuthToken(privyAccessToken)
2. const user   = await privy.getUserById(claims.userId)
3. const email  = user.email?.address ?? user.google?.email ?? null
4. const wallet = user.linkedAccounts.find(a => a.chainType === 'solana' && a.walletClientType === 'privy')?.address
5. const profile = await supabaseAdmin.rpc('ensure_user_from_privy', {
     _privy_id: claims.userId,
     _email: email,
     _business_name: <split email or fallback>,
     _wallet_address: wallet ?? null,
   })
6. const supabaseJwt = jwt.sign(
     { sub: profile.id, role: 'authenticated', privy_id: claims.userId, exp: now + 3600 },
     SUPABASE_JWT_SECRET,
     { algorithm: 'HS256' },
   )
7. return { access_token: supabaseJwt, profile_id: profile.id }
```

Then the client does `supabase.auth.setSession({ access_token, refresh_token: access_token })`. Supabase parses the JWT, validates the HS256 signature against its known secret, and treats the request as authenticated for that `sub`.

## Server-side: when do you actually need to verify Privy yourself?

- **In `/api/privy-bridge`.** Yes — that's the trust boundary.
- **In Supabase RPC functions.** No. Once the bridge has minted a Supabase JWT, every RPC trusts it via the standard Postgres → JWT verification. `auth.uid()` returns the `sub` directly.
- **In any other server route you add.** Use `requireSupabaseAuth` (already in `src/integrations/supabase/auth-middleware.ts`) — it's the same pattern.

## Token lifecycle

- Privy access token: ~1 hour, refreshes silently while the tab is open.
- Supabase JWT we mint: 1 hour. Re-mint by calling the bridge again. The `AuthProvider` does this on mount and on Privy `authenticated` change.

If you want longer-lived sessions, mint a 24h JWT in step 6 above and have the `AuthProvider` re-mint when the JWT is within 5 minutes of expiry.

## Removing Supabase email/password auth

The `auth.users` trigger `on_auth_user_created` is dropped in the new migration. Existing users in `auth.users` are orphaned (no FK pointing at them anymore). If your Supabase project still has email auth turned on in the dashboard, leave it on — it just won't be reachable from the UI. Turn it off in Authentication → Providers when you're confident the bridge is solid.
