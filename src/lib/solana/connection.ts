import { Connection, clusterApiUrl } from "@solana/web3.js";

/**
 * Singleton devnet connection. Confirmed commitment is plenty for our flow —
 * we don't need finalized for UI updates.
 */
let _conn: Connection | undefined;

export function getConnection(): Connection {
  if (_conn) return _conn;
  const rpcUrl =
    import.meta.env.VITE_SOLANA_RPC_URL ||
    process.env.VITE_SOLANA_RPC_URL ||
    clusterApiUrl("devnet");
  _conn = new Connection(rpcUrl, "confirmed");
  return _conn;
}

export const SOLANA_CLUSTER = "devnet" as const;
