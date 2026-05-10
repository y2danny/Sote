import { useEffect, useState } from "react";

const KEY = "sote_invoices";
const EV = "sote:invoices";

export interface LocalInvoice {
  id: string;
  importer_id: string;
  vendor_id: string | null;
  vendor_snapshot: Record<string, any>;
  corridor: string;
  amount_pusd: number;
  sote_fee_pusd: number;
  offramp_fee_pusd: number;
  total_pusd: number;
  reference: string | null;
  description: string | null;
  status: string;
  created_at: string;
}

export function getInvoices(): LocalInvoice[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addInvoice(inv: Omit<LocalInvoice, "id" | "created_at">): LocalInvoice {
  const full: LocalInvoice = { ...inv, id: crypto.randomUUID(), created_at: new Date().toISOString() };
  const list = getInvoices();
  list.unshift(full);
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EV));
  return full;
}

export function useInvoices(): LocalInvoice[] {
  const [invoices, setInvoices] = useState<LocalInvoice[]>(getInvoices);
  useEffect(() => {
    const handler = () => setInvoices(getInvoices());
    window.addEventListener(EV, handler);
    return () => window.removeEventListener(EV, handler);
  }, []);
  return invoices;
}
