/**
 * One-off devnet setup script.
 *
 * Run: `npx tsx scripts/create-sim-pusd.ts`
 *
 * Generates a treasury keypair, airdrops 2 SOL on devnet, mints an SPL token
 * to use as a stand-in for PUSD (6 decimals, classic Token program), and
 * pre-mints 100M sim-PUSD to the treasury.
 *
 * If the public devnet faucet is rate-limited, the script will print the
 * treasury address and exit. Fund it at https://faucet.solana.com then
 * re-run with TREASURY_SECRET_KEY_B58=<secret> — the script will skip the
 * airdrop if the wallet already has enough SOL.
 *
 * SAFETY:
 *   - This script writes to STDOUT only. It does NOT write to .env.local
 *     automatically — copy/paste is intentional so you don't overwrite a
 *     working config.
 *   - Save the treasury secret key somewhere safe. You'll need it to mint
 *     more sim-PUSD when funding test wallets.
 */
import { Connection, Keypair, LAMPORTS_PER_SOL, clusterApiUrl } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import bs58 from "bs58";

const DEVNET_RPCS = [
  clusterApiUrl("devnet"),
  "https://rpc.ankr.com/solana_devnet",
];

const MIN_SOL = 0.05 * LAMPORTS_PER_SOL;

async function getConnection(): Promise<Connection> {
  for (const rpc of DEVNET_RPCS) {
    try {
      const conn = new Connection(rpc, "confirmed");
      await conn.getVersion();
      console.log(`Using RPC: ${rpc}`);
      return conn;
    } catch {
      console.log(`  ${rpc} unreachable, trying next…`);
    }
  }
  throw new Error("No devnet RPC reachable");
}

async function airdropWithRetry(
  conn: Connection,
  pubkey: import("@solana/web3.js").PublicKey,
  lamports: number,
  attempts = 3,
): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    try {
      const sig = await conn.requestAirdrop(pubkey, lamports);
      await conn.confirmTransaction(sig, "confirmed");
      return sig;
    } catch (err) {
      if (i === attempts - 1) throw err;
      const wait = (i + 1) * 4000;
      console.log(`  attempt ${i + 1} failed, retrying in ${wait / 1000}s…`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw new Error("unreachable");
}

async function main() {
  const conn = await getConnection();

  // Allow re-use of an existing keypair so the user can fund it manually
  // and re-run without losing the address.
  let treasury: Keypair;
  const existingSecret = process.env.TREASURY_SECRET_KEY_B58;
  if (existingSecret) {
    treasury = Keypair.fromSecretKey(bs58.decode(existingSecret));
    console.log("\nReusing existing treasury keypair");
  } else {
    treasury = Keypair.generate();
    console.log("\nGenerated treasury keypair");
  }
  console.log("  public:", treasury.publicKey.toBase58());
  console.log("  secret (b58):", bs58.encode(treasury.secretKey));

  const balance = await conn.getBalance(treasury.publicKey);
  console.log(`\nCurrent balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

  if (balance < MIN_SOL) {
    console.log("Airdropping SOL on devnet (1 SOL × 2)…");
    try {
      const sig1 = await airdropWithRetry(conn, treasury.publicKey, 1 * LAMPORTS_PER_SOL);
      console.log("  airdrop 1:", sig1);
      const sig2 = await airdropWithRetry(conn, treasury.publicKey, 1 * LAMPORTS_PER_SOL);
      console.log("  airdrop 2:", sig2);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429") || msg.includes("airdrop limit") || msg.includes("faucet")) {
        console.error("\n⚠  Devnet faucet rate-limited. To continue:");
        console.error("  1. Fund this address at https://faucet.solana.com :");
        console.error(`       ${treasury.publicKey.toBase58()}`);
        console.error("  2. Re-run with your secret key:");
        console.error(`       TREASURY_SECRET_KEY_B58=${bs58.encode(treasury.secretKey)} npx tsx scripts/create-sim-pusd.ts`);
        process.exit(1);
      }
      throw err;
    }
  } else {
    console.log("  balance sufficient — skipping airdrop");
  }

  console.log("\nCreating SPL-Token mint (6 decimals)…");
  const mint = await createMint(
    conn,
    treasury,
    treasury.publicKey,
    treasury.publicKey,
    6,
    undefined,
    { commitment: "confirmed" },
    TOKEN_PROGRAM_ID,
  );
  console.log("  mint:", mint.toBase58());

  console.log("\nCreating treasury ATA + minting 100,000,000 sim-PUSD…");
  const treasuryAta = await getOrCreateAssociatedTokenAccount(
    conn,
    treasury,
    mint,
    treasury.publicKey,
  );
  await mintTo(
    conn,
    treasury,
    mint,
    treasuryAta.address,
    treasury,
    BigInt(100_000_000) * BigInt(10 ** 6),
  );
  console.log("  treasury ATA:", treasuryAta.address.toBase58());

  console.log("\n=== Copy these into .env.local ===");
  console.log(`VITE_SIM_PUSD_MINT=${mint.toBase58()}`);
  console.log(`VITE_TREASURY_ADDRESS=${treasury.publicKey.toBase58()}`);
  console.log("\n=== Save this somewhere safe (secret manager) ===");
  console.log(`TREASURY_SECRET_KEY_B58=${bs58.encode(treasury.secretKey)}`);
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
