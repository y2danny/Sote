# Migration notes — order of operations

If you cloned this repo or pulled the Privy branch into an existing local setup, do these steps in order. Skipping ahead will leave you with a broken sign-in.

## 1. Install new dependencies

```bash
bun add @privy-io/server-auth jsonwebtoken @solana/spl-token bs58
bun add -d @types/jsonwebtoken
```

If you're on npm: replace `bun add` with `npm i`.

## 2. Fill in `.env.local`

Copy `.env.example` → `.env.local`. Required keys (the rest are optional flags):

- `VITE_PRIVY_APP_ID` — already set to `cmosl5nnf00uz0dkz3gcqxtlj`
- `PRIVY_APP_SECRET` — Privy dashboard → App Settings → Basic
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase project → Settings → API
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — same as above (client-side variants)
- `SUPABASE_JWT_SECRET` — Supabase → Settings → API → "JWT Secret"

Sim-PUSD vars come in step 4.

## 3. Apply migrations to Supabase

```bash
supabase db push
```

The two new files are:

- `supabase/migrations/20260505000000_privy_bridge.sql` — drops auth.users FKs, adds `profiles.privy_id`, creates `ensure_user_from_privy` RPC
- `supabase/migrations/20260505000100_sign_and_pay_v2.sql` — adds `sign_and_pay_v2` RPC that accepts a real signature

If you cannot run `supabase db push`, paste each file into Supabase Studio → SQL Editor in chronological order.

> **Existing user data warning.** The migration drops the FK from `profiles.id` to `auth.users(id)`. If you already have rows in `profiles`, they are preserved as-is but become orphans (no Privy ID). On next sign-in via Privy, a new `profiles` row is created. To remap legacy rows, see `docs/PRIVY_INTEGRATION.md` → "Migrating existing users".

## 4. Mint sim-PUSD on devnet

```bash
bun run scripts/create-sim-pusd.ts
```

Copy the printed `VITE_SIM_PUSD_MINT` and `VITE_TREASURY_ADDRESS` into `.env.local`. Save the `TREASURY_SECRET_KEY_B58` somewhere safe.

## 5. Configure Privy dashboard

In <https://dashboard.privy.io> for app `cmosl5nnf00uz0dkz3gcqxtlj`:

- Allowed origins: add `http://localhost:5173`
- Login methods: enable Email, Google, Wallet
- Embedded wallets → Solana: enable, "Create on login" = Users without wallets
- Branding: optional

## 6. Run

```bash
bun run dev
```

Visit `http://localhost:5173`. The flow now uses Privy login + sim-PUSD on devnet.

---

## Rollback

If something is broken and you need to revert:

1. Comment out the `<PrivyProvider>` wrap in `src/routes/__root.tsx`
2. Restore the previous `src/lib/auth.tsx` from git (`git checkout HEAD~1 -- src/lib/auth.tsx`)
3. Re-enable Supabase email auth in Supabase Studio → Authentication → Providers
4. The `sign_and_pay` (v1) RPC is still installed and usable — set `VITE_SIMULATE_SIGNING=true`

The two SQL migrations are *not* destructive (no DROP TABLE / DROP COLUMN), so the rollback is purely on the application layer.

## What changed in the schema

| Object | Change |
|---|---|
| `profiles.privy_id text unique` | New column |
| FK `profiles.id → auth.users(id)` | Dropped |
| FKs `vendors/invoices/quotes/audit_log → auth.users(id)` | Dropped |
| Trigger `on_auth_user_created` | Dropped |
| Function `handle_new_user()` | Dropped |
| Function `ensure_user_from_privy(text, text, text, text)` | New |
| Function `sign_and_pay_v2(uuid, text, text)` | New |

Existing tables, RLS policies, and the rest of the schema are untouched.
