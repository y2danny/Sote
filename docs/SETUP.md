# Soté Local Setup — 10 minute quickstart

## Prereqs

- Bun 1.1+ (or Node 20 + npm)
- Supabase project (free tier is fine) — keep `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` handy
- Privy app — already created, ID is `cmosl5nnf00uz0dkz3gcqxtlj`. Get the app secret from Privy dashboard.
- A Solana CLI is helpful but not required; the sim-PUSD script handles everything via JS.

## 1. Install

```bash
bun install
bun add @privy-io/server-auth jsonwebtoken @solana/spl-token bs58
bun add -d @types/jsonwebtoken
```

## 2. Env

```bash
cp .env.example .env.local
```

Fill in:

```
VITE_PRIVY_APP_ID=cmosl5nnf00uz0dkz3gcqxtlj
PRIVY_APP_SECRET=<from Privy dashboard>

VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
SUPABASE_JWT_SECRET=<JWT secret from Settings → API>

VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_SIM_PUSD_MINT=<filled in step 4>
VITE_TREASURY_ADDRESS=<filled in step 4>

VITE_ENABLE_DEMO_SEED=true
VITE_SIMULATE_SIGNING=false
VITE_AUTOFUND_NEW_WALLETS=true
```

## 3. Database

Apply both new migrations to your Supabase project:

```bash
# Option A: Supabase CLI
supabase link --project-ref <your-ref>
supabase db push

# Option B: copy-paste each file in /supabase/migrations/ into Supabase SQL editor
#   (in chronological order)
```

If your DB is fresh, you're done. If you have existing user data, see `PRIVY_INTEGRATION.md` → "Migrating existing users".

## 4. Sim PUSD

```bash
bun run scripts/create-sim-pusd.ts
```

Copy the printed `Sim PUSD mint` into `VITE_SIM_PUSD_MINT`, and `Treasury public key` into `VITE_TREASURY_ADDRESS`. Save the secret key somewhere safe.

## 5. Privy app config

In the Privy dashboard for app `cmosl5nnf00uz0dkz3gcqxtlj`:

- **Allowed origins:** `http://localhost:5173`, `http://localhost:3000`, your production URL
- **Login methods:** turn on Email, Google, Wallet
- **Embedded wallets:** turn on Solana, set "Create on login" = "Users without wallets"
- **Appearance:** optional — tweak to match Soté's bone/ink palette
- Copy the **App secret** into `PRIVY_APP_SECRET`

## 6. Run

```bash
bun run dev
```

Visit `http://localhost:5173`. Sign in with email OTP. You should see the dashboard with your business name and a real Solana embedded wallet address.

## 7. End-to-end smoke test

1. Sign up → check `profiles` table in Supabase, you should see a row with `privy_id` populated
2. Click "Become an operator"
3. Click "Load demo data"
4. Click "+ New invoice" → "Direct PUSD" → pick BlockShip Forwarders → enter `10` → "Sign with wallet"
5. Privy modal should pop, asking you to confirm a Solana transaction. Confirm.
6. You'll be redirected to the invoice detail page. The signature shown is a real devnet tx — click it to verify on Solscan.
7. The state machine advances: `on_chain_pending → on_chain_confirmed → delivered` (about 7 seconds total for direct_pusd).
8. Visit `/r/{invoice_id}` to see the public vendor receipt.

## Troubleshooting

- **`Missing Privy app ID`** — your `.env.local` isn't being read. Restart `bun run dev`.
- **`No embedded wallet found`** — Privy hasn't finished provisioning. Wait 1-2s and try again, or check the Privy modal didn't error.
- **`insufficient funds for rent`** — embedded wallet has 0 SOL. Airdrop in `scripts/fund-wallet.ts` or use the dev sponsor.
- **`Invalid JWT`** on Supabase queries — `SUPABASE_JWT_SECRET` mismatch. Re-copy from Supabase Settings → API → JWT Secret.
- **Browser console: `getAccessToken returned null`** — user isn't authenticated yet. The bridge call is happening before Privy is ready. The current `AuthProvider` guards against this; if you've changed it, make sure you wait for `ready && authenticated` before calling the bridge.
