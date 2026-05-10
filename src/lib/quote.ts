import { usdToPusdUnits } from "./format";

export type Corridor = "usd_offramp" | "sgd_offramp" | "direct_pusd";

export interface QuoteBreakdown {
  corridor: Corridor;
  amount_usd: number;
  invoice_amount_pusd: number;
  sote_fee_pusd: number;
  offramp_fee_pusd: number;
  network_fee_pusd: number;
  total_pusd: number;
  estimated_arrival_min: number;
}

export function computeQuote(corridor: Corridor, amountUsd: number): QuoteBreakdown {
  const invoice = usdToPusdUnits(amountUsd);
  const soteFee = Math.round(invoice * 0.005); // 0.5%
  const offrampFeeUsd = corridor === "usd_offramp" ? 25 : corridor === "sgd_offramp" ? 15 : 0;
  const offrampFee = usdToPusdUnits(offrampFeeUsd);
  const networkFee = 500; // 0.0005 PUSD just for show
  const total = invoice + soteFee + offrampFee + networkFee;
  const arrival = corridor === "direct_pusd" ? 1 : corridor === "usd_offramp" ? 240 : 360;
  return {
    corridor,
    amount_usd: amountUsd,
    invoice_amount_pusd: invoice,
    sote_fee_pusd: soteFee,
    offramp_fee_pusd: offrampFee,
    network_fee_pusd: networkFee,
    total_pusd: total,
    estimated_arrival_min: arrival,
  };
}
