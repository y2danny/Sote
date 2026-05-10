# Soté MVP — Progress Tracker

> Single source of truth for what is done, in flight, and pending. Update this file whenever you complete a step. Anything marked **DONE** has actual code in the repo. Anything marked **TODO** is a checklist item for the human dev (env vars, secrets, DB push, etc.) — Claude can't do these for you.

Last updated: 2026-05-05

---

## Quick pointer for the editor (Cursor / Copilot / Claude Code)

If you've just opened this repo, read these in order:

1. `docs/ARCHITECTURE.md` — how the pieces fit together
2. `docs/PRIVY_INTEGRATION.md` — how the auth flow works end to end
3. `docs/PUSD_DEVNET.md` — why we mint a sim token instead of using real PUSD
4. `docs/MIGRATION_NOTES.md` — the exact sequence to get this running locally
5. `docs/SETUP.md` — 10-minute quickstart
6. **This file** — what's done, what's a remaining TODO

The active code touchpoints are:

- `src/routes/__root.tsx` — wraps the whole app in `<PrivyProvider>`
- `src/lib/privy/config.ts` — login methods + embedded wallet config
- `src/lib/auth.tsx` — Privy → Supabase JWT bridge consumer
- `src/routes/api.privy-bridge.ts` — the bridge server route
- `src/routes/login.tsx` — single-button Privy login UI
- `src/routes/app.settings.tsx` — wallet linking UI
- `src/routes/app.invoices.new.tsx` — real Solana signing flow
- `src/lib/solana/{connection,pusd}.ts` — Solana helpers
- `scripts/create-sim-pusd.ts` — one-off devnet mint creator
- `supabase/migrations/20260505000000_privy_bridge.sql`
- `supabase/migrations/20260505000100_sign_and_pay_v2.sql`

---

## Phase 0 — Foundation that already shipped

Everything below was built before the Privy work started. Treat as the baseline.

- [x] TanStack Start + Vite + Tailwind 4 + shadcn/Radix scaffold
- [x] Supabase project with seven tables, RLS, realtime, six RPC functions
- [x] Importer flows: dashboard, invoices list, invoice creation wizard, invoice detail, vendors CRUD, settings
- [x] Operator flow: live monitor at `/ops` with retry / refund and auto-advance polling
- [x] Public vendor receipt at `/r/$id`
- [x] Demo seed button on the dashboard
- [x] Brand: Soté palette, logo, fonts, hero / FAQ landing page
- [x] Email/password auth via Supabase (replaced in Phase 1 below)

---

## Phase 1 — Privy integration (Pattern B: JWT bridging) ✅ CODE DONE

Goal: keep all existing RLS policies and `auth.uid()` references working, but make Privy the source of truth for identity.

### 1a. Documentation

- [x] `docs/PROGRESS.md` (this file)
- [x] `docs/ARCHITECTURE.md`
- [x] `docs/PRIVY_INTEGRATION.md`
- [x] `docs/PUSD_DEVNET.md`
- [x] `docs/SETUP.md`
- [x] `docs/MIGRATION_NOTES.md`

### 1b. Environment & dependencies

- [x] `.env.example` written with every required variable
- [ ] **TODO (you):** copy `.env.example` to `.env.local` and fill in real values
- [ ] **TODO (you):** `bun add @privy-io/server-auth jsonwebtoken @solana/spl-token bs58`
- [ ] **TODO (you):** `bun add -d @types/jsonwebtoken`

### 1c. PrivyProvider in `__root.tsx`

- [x] `src/lib/privy/config.ts` — central config (email + Google + wallet, embedded Solana wallet, Soté palette)
- [x] `src/routes/__root.tsx` rewritten to wrap `<Outlet />` with `<PrivyProvider>` then `<AuthProvider>`

### 1d. Privy → Supabase JWT bridge

- [x] `src/routes/api.privy-bridge.ts` — TanStack Start API route (`createServerFileRoute`) that exchanges a Privy access token for a Supabase JWT
- [x] `src/lib/auth.tsx` rewritten on top of `usePrivy()` + the bridge, with 50-min auto-remint
- [ ] **TODO (you):** generate `SUPABASE_JWT_SECRET` (Supabase → Settings → API → JWT Secret) and put it in `.env.local`
- [ ] **TODO (you):** put `PRIVY_APP_SECRET` in `.env.local`

### 1e. Database migration for Privy identity

- [x] `supabase/migrations/20260505000000_privy_bridge.sql` — adds `profiles.privy_id`, drops the `auth.users` FKs, adds `ensure_user_from_privy()` RPC
- [ ] **TODO (you):** run `supabase db push` to apply

### 1f. Login page

- [x] `src/routes/login.tsx` rewritten — single-button Privy login (email + Google + wallet) with three method tags below

### 1g. Wallet linking UI

- [x] `src/routes/app.settings.tsx` rewritten — shows embedded wallet + sim-PUSD balance, lists external wallets, link / unlink buttons, Solscan link

---

## Phase 2 — Real Solana signing on devnet (with simulated PUSD) ✅ CODE DONE

Privy hands us a real Solana wallet. We replace the server-side fake `gen_random_bytes(32)` signature with a real client-side signed transaction.

### 2a. Simulated PUSD

- [x] `docs/PUSD_DEVNET.md` explains the why and how
- [x] `scripts/create-sim-pusd.ts` — one-off script that mints a 6-decimal SPL token on devnet
- [ ] **TODO (you):** `bun run scripts/create-sim-pusd.ts`, copy printed values into `VITE_SIM_PUSD_MINT` + `VITE_TREASURY_ADDRESS`

### 2b. Solana helpers

- [x] `src/lib/solana/connection.ts` — singleton devnet `Connection`
- [x] `src/lib/solana/pusd.ts` — sim-PUSD mint constant + `buildPusdTransferTx`, `getPusdBalance`, Solscan helpers, decimals math

### 2c. Real signing in invoice creation

- [x] `src/routes/app.invoices.new.tsx` updated — calls `useSendTransaction` from Privy and passes the real signature into `sign_and_pay_v2` RPC
- [x] `supabase/migrations/20260505000100_sign_and_pay_v2.sql` — RPC that accepts an externally-produced signature
- [x] Bypass path: when `VITE_SIMULATE_SIGNING=true`, falls back to the legacy `sign_and_pay` (server-invented signature) for offline demos
- [ ] **TODO (you):** apply the migration

### 2d. Live PUSD balance

- [x] Dashboard reads real PUSD balance from the embedded wallet via `getPusdBalance` instead of the hardcoded `50,000.00`
- [x] Ops console treasury balance reads from `VITE_TREASURY_ADDRESS` via the same helper

---

## Phase 3 — Demo polish ✅ CODE DONE

Recommendation on your "keep demo data button or not": **keep it on for now.** Demos are 10× smoother when a fresh signup can click one button and have populated state. We've gated it behind `VITE_ENABLE_DEMO_SEED` so flipping it off later is one env var.

- [x] `Load demo data` button on the dashboard gated behind `VITE_ENABLE_DEMO_SEED === "true"`
- [x] Default value in `.env.example`: `true`
- [ ] **TODO (you):** in production, set `VITE_ENABLE_DEMO_SEED=false`
- [ ] **TODO (you):** decide whether to keep the operator self-grant button visible in production (currently shown unconditionally; flip it the same way if needed)
- [ ] **TODO (you):** test full happy path end-to-end:
  1. Visit `/login` → sign in with email
  2. Land on `/app` — should see your business name + a real Solana address in the sidebar
  3. Open `/app/settings` — embedded wallet visible + 0.00 PUSD balance
  4. Run `scripts/fund-wallet.ts` (when written) to mint 1,000 sim-PUSD to your wallet
  5. Click "Load demo data" → 3 vendors + 3 invoices appear
  6. Click "+ New invoice" → Direct PUSD → BlockShip → enter $10 → Sign with wallet
  7. Privy modal pops → confirm → real devnet tx submitted
  8. Land on invoice detail; click `pay_tx_signature` to verify on Solscan
  9. Watch state machine advance to `delivered`
  10. Visit `/r/{invoice_id}` to see the public receipt

---

## Phase 4 — Out of scope for this MVP (intentional)

- Real Anchor escrow program (current sim-PUSD transfer is wallet → treasury, not into per-invoice PDA)
- Real off-ramp partner integration (Bridge.xyz / Conduit / etc.) — still time-driven via `advance_invoice`
- KYC/AML
- Mainnet deployment (mainnet requires the real PalmUSD mint and real off-ramp partners)
- iOS / Android native apps
- Test suite (Vitest setup is recommended next)
- Auto-fund script for new embedded wallets (`scripts/fund-wallet.ts` — write when needed)
- Per-invoice escrow PDA (replaces "send to treasury" with "send to escrow program")

---

## How to update this file

When you finish a TODO, change `[ ]` to `[x]` and add a one-line note if anything diverged from the plan. When you discover a new TODO, append it to the relevant phase. When a phase is fully verified end-to-end (not just code-done, but smoke-tested), move it under "Phase 0 — Foundation that already shipped" so the active phases stay tight.

## Diff summary (what this branch added)

```
.env.example                                       (new)
docs/ARCHITECTURE.md                               (new)
docs/MIGRATION_NOTES.md                            (new)
docs/PRIVY_INTEGRATION.md                          (new)
docs/PROGRESS.md                                   (new)
docs/PUSD_DEVNET.md                                (new)
docs/SETUP.md                                      (new)
scripts/create-sim-pusd.ts                         (new)
src/lib/privy/config.ts                            (new)
src/lib/solana/connection.ts                       (new)
src/lib/solana/pusd.ts                             (new)
src/routes/api.privy-bridge.ts                     (new)
supabase/migrations/20260505000000_privy_bridge.sql       (new)
supabase/migrations/20260505000100_sign_and_pay_v2.sql    (new)

src/lib/auth.tsx                                   (rewritten — Privy-backed)
src/routes/__root.tsx                              (now wraps <PrivyProvider>)
src/routes/login.tsx                               (Privy-only login)
src/routes/app.settings.tsx                        (wallet linking UI)
src/routes/app.invoices.new.tsx                    (real Solana signing)
src/routes/app.index.tsx                           (live PUSD balance + demo gate)
src/routes/ops.tsx                                 (live treasury balance)
```
