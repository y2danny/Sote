# Simulated PUSD on Devnet

## Why simulate

Real **PalmUSD (PUSD)** — the Shariah-compliant stablecoin backed 1:1 by AED and SAR reserves — is live on **Solana mainnet only**. There is no PalmUSD devnet deployment, and PalmUSD reserves can't be backed by test funds. So for development, we mint our own SPL token on devnet that mimics PUSD's behavior:

- 6 decimals (matches PUSD on mainnet)
- Standard SPL Token program (not Token-2022 — keeps our adapter code simple)
- A treasury wallet that we control as the mint authority

This lets us exercise every part of the system — wallet signing, transfers, balance reads, escrow logic — without touching real assets.

## When to swap to real PUSD

Only when going to mainnet. The swap is one constant: change `VITE_SIM_PUSD_MINT` to the real PalmUSD mint address from <https://www.palmusd.com/pages/developers.html>. Everything else (transfer logic, balance reads, decimals) is identical because PUSD is a standard SPL token.

You will also need to:

- Switch `VITE_SOLANA_RPC_URL` to a mainnet endpoint (Helius, QuickNode, etc.)
- Confirm PalmUSD is on classic SPL Token (not Token-2022). If it's Token-2022, swap our `@solana/spl-token` calls to use the Token-2022 program ID — small change in `src/lib/solana/pusd.ts`.
- Coordinate liquidity / treasury with PalmUSD or a market-maker.

## Creating the sim mint

We provide a one-off script. Run it once per environment:

```bash
bun run scripts/create-sim-pusd.ts
```

The script:

1. Generates a fresh treasury keypair
2. Airdrops 2 SOL to it on devnet
3. Creates an SPL token mint (6 decimals, mint authority = treasury)
4. Creates an associated token account for the treasury
5. Mints 100,000,000 sim-PUSD to the treasury
6. Prints all the addresses you need

Sample output:

```
Treasury public key:   7ZfFkX9...
Treasury secret (b58): 4uK8...   ← keep secret, used for minting more later
Sim PUSD mint:         8mVf2...   ← put in VITE_SIM_PUSD_MINT
Treasury PUSD ATA:     Hh3R7...   ← informational
```

Save the secret somewhere safe (1Password, dotenv-vault, etc.). You'll need it if you want to mint more sim-PUSD to test wallets.

## Funding test wallets

After a user signs up via Privy and gets an embedded wallet, mint them some sim-PUSD so they can pay invoices. Two options:

### Option A — manual one-off

```ts
// scripts/fund-wallet.ts (write this when you need it)
import { mintTo } from "@solana/spl-token";

await mintTo(
  connection,
  treasuryKeypair,
  simPusdMint,
  recipientATA,
  treasuryKeypair, // mint authority
  10_000 * 1_000_000, // 10,000 PUSD with 6 decimals
);
```

### Option B — auto-fund on signup (recommended for demo)

Add a server function called from `/api/privy-bridge` after `ensure_user_from_privy` that mints 50,000 sim-PUSD to the new user's wallet. This makes the demo feel real with zero manual setup. Hide behind `VITE_AUTOFUND_NEW_WALLETS=true` so production won't accidentally print money.

## Reading balance

`src/lib/solana/pusd.ts` exposes `getPusdBalance(connection, walletAddress)` which:

1. Derives the user's associated token account (ATA) for the sim mint
2. Calls `getTokenAccountBalance` on the RPC
3. Returns the UI amount as a number (already divided by 10^6)

If the ATA doesn't exist (user has never received sim-PUSD), it returns `0` rather than throwing.

## Transferring (the signing step)

`buildPusdTransferTx(connection, from, to, amountMicros)` builds a `Transaction` that:

1. Ensures the recipient ATA exists (creates with `createAssociatedTokenAccountInstruction` if not)
2. Adds a `createTransferInstruction` for the requested amount in micros
3. Sets a recent blockhash and feePayer

The caller (the invoice form) then passes this `Transaction` into Privy's `useSendTransaction({ wallet }).sendTransaction(tx, connection)`, which handles signing in the embedded-wallet iframe and submitting to devnet.

## Things to remember

- 1 PUSD = 1,000,000 micros. The DB stores micros (`amount_pusd bigint`). Don't double-divide when displaying.
- Devnet is rate-limited and occasionally flaky. If `getTokenAccountBalance` 429s, fall back to last-known-good in localStorage and toast a soft warning.
- Privy embedded wallets start with 0 SOL. SPL transfers cost lamports for the rent-exempt ATA creation (~0.002 SOL). Either airdrop or sponsor.
- Devnet airdrop limit is 2 SOL/day per IP. Keep a small "faucet wallet" with extra SOL for funding embedded wallets.
