/**
 * Sim-PUSD on devnet.
 *
 * Real PalmUSD lives only on Solana mainnet. For development we use a
 * standard SPL-Token mint (6 decimals) to mimic PUSD. The address comes
 * from VITE_SIM_PUSD_MINT, populated by `bun run scripts/create-sim-pusd.ts`.
 *
 * To go to mainnet later, swap the env var for the real PalmUSD mint and
 * — if PalmUSD is on Token-2022 — change TOKEN_PROGRAM_ID below to
 * TOKEN_2022_PROGRAM_ID. Verify the decimals match.
 */
import {
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
} from "@solana/spl-token";

export const PUSD_DECIMALS = 6;

/** Convert UI PUSD (e.g. 12.50) → micros (12_500_000). */
export const toPusdMicros = (uiAmount: number): bigint =>
  BigInt(Math.round(uiAmount * 10 ** PUSD_DECIMALS));

/** Convert micros → UI PUSD. */
export const fromPusdMicros = (micros: bigint | number): number =>
  Number(micros) / 10 ** PUSD_DECIMALS;

export function getSimPusdMint(): PublicKey {
  const mint = import.meta.env.VITE_SIM_PUSD_MINT;
  if (!mint) {
    throw new Error(
      "VITE_SIM_PUSD_MINT is not set. Run `bun run scripts/create-sim-pusd.ts` and put the address in .env.local.",
    );
  }
  return new PublicKey(mint);
}

export function getTreasuryAddress(): PublicKey {
  const addr = import.meta.env.VITE_TREASURY_ADDRESS;
  if (!addr) {
    throw new Error(
      "VITE_TREASURY_ADDRESS is not set. Run `bun run scripts/create-sim-pusd.ts` and put the treasury public key in .env.local.",
    );
  }
  return new PublicKey(addr);
}

/**
 * Read the user's sim-PUSD balance. Returns 0 if the token account doesn't
 * exist yet (i.e. they've never received PUSD).
 */
export async function getPusdBalance(
  connection: Connection,
  walletAddress: string | PublicKey,
): Promise<number> {
  const owner =
    walletAddress instanceof PublicKey ? walletAddress : new PublicKey(walletAddress);
  const mint = getSimPusdMint();
  const ata = await getAssociatedTokenAddress(mint, owner);
  try {
    const acct = await getAccount(connection, ata, "confirmed", TOKEN_PROGRAM_ID);
    return fromPusdMicros(acct.amount);
  } catch {
    return 0;
  }
}

/**
 * Build (but do not sign or send) a sim-PUSD transfer transaction.
 *
 * Behavior:
 *  - If the recipient's ATA doesn't exist, prepends a create-ATA instruction.
 *    The fee payer (`from`) covers that ~0.002 SOL.
 *  - Sets a recent blockhash. Caller is responsible for signing & submitting.
 */
export async function buildPusdTransferTx(params: {
  connection: Connection;
  from: PublicKey;
  to: PublicKey;
  amountMicros: bigint;
}): Promise<Transaction> {
  const { connection, from, to, amountMicros } = params;
  const mint = getSimPusdMint();

  const fromAta = await getAssociatedTokenAddress(mint, from);
  const toAta = await getAssociatedTokenAddress(mint, to);

  const tx = new Transaction();

  // Create destination ATA if missing
  const toInfo = await connection.getAccountInfo(toAta);
  if (!toInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        from, // payer
        toAta,
        to,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      ),
    );
  }

  tx.add(
    createTransferInstruction(
      fromAta,
      toAta,
      from,
      amountMicros,
      [],
      TOKEN_PROGRAM_ID,
    ),
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = from;

  return tx;
}

/**
 * Solscan link for a tx. We always link to devnet because that's where sim-PUSD lives.
 * When you swap to mainnet, drop the `?cluster=devnet` query param.
 */
export function solscanTx(signature: string): string {
  return `https://solscan.io/tx/${signature}?cluster=devnet`;
}

export function solscanAddress(addr: string): string {
  return `https://solscan.io/account/${addr}?cluster=devnet`;
}
