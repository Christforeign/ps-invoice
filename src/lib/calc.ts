// Precise invoice math: money in integer cents, weight in integer milli-pounds.
export type WeightUnit = "lb" | "oz" | "kg" | "g";

const TO_LB: Record<WeightUnit, number> = { lb: 1, oz: 1 / 16, kg: 2.20462262, g: 0.00220462262 };

/** Parse a decimal string to integer cents without float drift. */
export function toCents(v: string | number | undefined | null): number {
  if (v === undefined || v === null || v === "") return 0;
  const s = String(v).trim().replace(",", ".");
  if (!/^-?\d*(\.\d*)?$/.test(s)) return NaN;
  const neg = s.startsWith("-");
  const [i = "0", f = ""] = s.replace("-", "").split(".");
  const frac = (f + "000").slice(0, 3);
  let cents = parseInt(i || "0", 10) * 100 + parseInt(frac.slice(0, 2), 10);
  if (parseInt(frac[2], 10) >= 5) cents += 1;
  return neg ? -cents : cents;
}

export function isValidNumber(v: string | number | undefined, allowEmpty = true): boolean {
  if (v === undefined || v === "") return allowEmpty;
  const s = String(v).trim().replace(",", ".");
  return /^\d*(\.\d+)?$/.test(s) && s !== "." && Number(s) >= 0;
}

export function num(v: string | number | undefined): number {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Weight converted to milli-pounds (integer). */
export function toMilliLb(weight: string | number, unit: WeightUnit): number {
  return Math.round(num(weight) * TO_LB[unit] * 1000);
}

export function convertWeight(weight: number, from: WeightUnit, to: WeightUnit): number {
  return Math.round(((weight * TO_LB[from]) / TO_LB[to]) * 10000) / 10000;
}

/** Shipping cost in cents = weight(lb) × rate($/lb), rounded half-up to the cent. */
export function shippingCents(weight: string | number, unit: WeightUnit, rate: string | number): number {
  const milli = toMilliLb(weight, unit);
  const rateC = toCents(rate) || 0;
  return Math.round((milli * rateC) / 1000);
}

export interface PackageLine {
  id: string;
  trackingNumber: string;
  description: string;
  itemName: string;
  quantity: string;
  weight: string;
  weightUnit: WeightUnit;
  rate: string;
  customs: string;
  serviceFee: string;
  discount: string;
  notes: string;
}

export interface LineCalc {
  milliLb: number;
  shipping: number;
  customs: number;
  service: number;
  discount: number;
  total: number;
}

export function calcLine(p: PackageLine): LineCalc {
  const shipping = shippingCents(p.weight, p.weightUnit, p.rate);
  const customs = toCents(p.customs) || 0;
  const service = toCents(p.serviceFee) || 0;
  const discount = toCents(p.discount) || 0;
  return {
    milliLb: toMilliLb(p.weight, p.weightUnit),
    shipping,
    customs,
    service,
    discount,
    total: shipping + customs + service - discount,
  };
}

export interface Payment {
  id: string;
  date: string;
  method: string;
  amount: string;
  note?: string;
}

export type InvoiceStatus = "PAID" | "PARTIALLY_PAID" | "UNPAID" | "CANCELLED";

export interface Totals {
  milliLb: number;
  shipping: number;
  customs: number;
  service: number;
  discount: number;
  subtotal: number;
  tax: number;
  total: number;
  paid: number;
  balance: number;
  status: InvoiceStatus;
}

export function calcTotals(
  packages: PackageLine[],
  payments: Payment[],
  taxRatePct: number,
  taxEnabled: boolean,
  cancelled = false,
): Totals {
  const t = { milliLb: 0, shipping: 0, customs: 0, service: 0, discount: 0 };
  for (const p of packages) {
    const c = calcLine(p);
    t.milliLb += c.milliLb;
    t.shipping += c.shipping;
    t.customs += c.customs;
    t.service += c.service;
    t.discount += c.discount;
  }
  const subtotal = t.shipping + t.customs + t.service - t.discount;
  const tax = taxEnabled ? Math.round((subtotal * Math.round(taxRatePct * 100)) / 10000) : 0;
  const total = subtotal + tax;
  const paid = payments.reduce((s, p) => s + (toCents(p.amount) || 0), 0);
  const balance = Math.max(0, total - paid);
  let status: InvoiceStatus = paid <= 0 ? "UNPAID" : paid >= total ? "PAID" : "PARTIALLY_PAID";
  if (cancelled) status = "CANCELLED";
  return { ...t, subtotal, tax, total, paid, balance, status };
}

/** HTG cents from USD cents with a decimal exchange rate (e.g. 132.50). */
export function toHtgCents(usdCents: number, rate: string | number): number {
  const rateC = toCents(rate) || 0; // rate × 100
  return Math.round((usdCents * rateC) / 100);
}

export function fmtMoney(cents: number, code = "USD"): string {
  const neg = cents < 0;
  const a = Math.abs(cents);
  const s = `${Math.floor(a / 100).toLocaleString("en-US")}.${String(a % 100).padStart(2, "0")}`;
  return `${neg ? "-" : ""}${s} ${code}`;
}

export function fmtWeight(milliLb: number): string {
  return `${(milliLb / 1000).toFixed(2)} lbs`;
}

export function formatInvoiceNumber(prefix: string, n: number, pad: number): string {
  return `${prefix}${String(n).padStart(pad, "0")}`;
}
