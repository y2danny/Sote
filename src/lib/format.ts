// Money utilities. PUSD is stored as bigint smallest units (6 decimals).
export const PUSD_DECIMALS = 6;

export function pusdToNumber(units: number | bigint | string): number {
  const n = typeof units === "bigint" ? Number(units) : Number(units);
  return n / 10 ** PUSD_DECIMALS;
}

export function usdToPusdUnits(usd: number): number {
  return Math.round(usd * 10 ** PUSD_DECIMALS);
}

export function formatPUSD(units: number | bigint | string, opts: { sign?: boolean } = {}): string {
  const v = pusdToNumber(units);
  const s = v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${opts.sign && v > 0 ? "+" : ""}${s}`;
}

export function formatUSD(usd: number): string {
  return usd.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function shortAddr(a?: string | null, n = 4): string {
  if (!a) return "—";
  if (a.length <= n * 2 + 2) return a;
  return `${a.slice(0, n + 2)}…${a.slice(-n)}`;
}

export function relTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function fakeSig(seed: string): string {
  // Deterministic 88-char base58-ish string from a seed
  const alpha = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  let out = "";
  for (let i = 0; i < 88; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    out += alpha[h % alpha.length];
  }
  return out;
}

export function solscanUrl(sig: string): string {
  return `https://solscan.io/tx/${sig}?cluster=devnet`;
}

export function corridorLabel(c: string): string {
  return c === "usd_offramp" ? "USD wire" : c === "sgd_offramp" ? "SGD transfer" : "Direct PUSD";
}

export function statusLabel(s: string): string {
  switch (s) {
    case "draft": return "Draft";
    case "awaiting_payment": return "Awaiting signature";
    case "on_chain_pending": return "Submitting on-chain";
    case "on_chain_confirmed": return "Confirmed on Solana";
    case "offramp_processing": return "Off-ramp processing";
    case "offramp_failed": return "Off-ramp failed";
    case "delivered": return "Delivered";
    case "refunded": return "Refunded";
    case "cancelled": return "Cancelled";
    default: return s;
  }
}
