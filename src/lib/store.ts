import { useSyncExternalStore } from "react";
import logoAsset from "@/assets/prime-logo.jpg.asset.json";
import { calcTotals, formatInvoiceNumber, type PackageLine, type Payment, type Totals } from "./calc";

export interface Business {
  logo: string;
  name: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  taxId: string;
  footer: string;
  defaultNotes: string;
  paymentTerms: string;
  paymentInstructions: string;
}

export interface Numbering {
  prefix: string;
  next: number;
  pad: number;
}

export interface CurrencySettings {
  main: string;
  secondary: string;
  rate: string;
  showSecondary: boolean;
  taxEnabled: boolean;
  taxRate: string;
  defaultRate: string;
}

export interface Design {
  id: string;
  name: string;
  primary: string;
  accent: string;
  highlight: string;
  text: string;
  font: string;
  fontSize: number;
  logoSize: number;
  logoPosition: "left" | "right" | "center";
  tableBorders: boolean;
  headerBg: string;
  labels: Record<string, string>;
  show: Record<string, boolean>;
}

export interface Messaging {
  emailSubject: string;
  emailBody: string;
  whatsappTemplate: string;
}

export interface Settings {
  business: Business;
  numbering: Numbering;
  currency: CurrencySettings;
  paymentMethods: string[];
  messaging: Messaging;
  activeDesignId: string;
}

export interface Customer {
  id: string;
  name: string;
  company: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  shippingAddress: string;
  city: string;
  country: string;
  notes: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  customerId: string;
  customer: Omit<Customer, "id" | "createdAt">;
  packages: PackageLine[];
  payments: Payment[];
  notes: string;
  paymentInfo: string;
  designId: string;
  cancelled: boolean;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
  // snapshot of currency rules at creation, editable on edit
  exchangeRate: string;
  taxEnabled: boolean;
  taxRate: string;
}

export interface Activity {
  id: string;
  at: string;
  action: string;
  ref: string;
}

export interface DB {
  settings: Settings;
  designs: Design[];
  customers: Customer[];
  invoices: Invoice[];
  activity: Activity[];
}

export const DEFAULT_LABELS: Record<string, string> = {
  title: "FACTURE",
  billTo: "FACTURÉ À",
  shipDetails: "DÉTAILS D'EXPÉDITION",
  packagesTitle: "Colis inclus dans cette facture",
  colPkg: "COLIS",
  colTracking: "TRACKING NUMBER",
  colDesc: "DESCRIPTION",
  colQty: "QTÉ",
  colCustoms: "DOUANE (USD)",
  colService: "FRAIS",
  colWeight: "POIDS",
  colShipping: "TRANSPORT",
  colTotal: "TOTAL",
  totals: "Totaux",
  subtotal: "Sous-total",
  serviceFees: "Frais de service",
  discount: "Remise",
  tax: "Taxe",
  totalMain: "Total de la facture (USD)",
  totalSecondary: "Total de la facture (HTG)",
  paid: "Montant payé",
  balance: "Solde restant",
  balanceSecondary: "Equivalent en gourdes",
  paymentHistory: "Historique des paiements",
  noPayments: "Aucun versement enregistré.",
  name: "Nom",
  phone: "Téléphone",
  email: "Email",
  due: "Échéance",
  PAID: "Payée",
  PARTIALLY_PAID: "Partiellement payée",
  UNPAID: "Non payée",
  CANCELLED: "Annulée",
};

export const SHOW_FIELDS: Record<string, string> = {
  logo: "Logo",
  businessAddress: "Business address",
  businessContact: "Business phone / WhatsApp",
  businessEmail: "Business email & website",
  taxId: "Tax / registration number",
  dueDate: "Due date",
  customerCompany: "Customer company",
  customerPhone: "Customer phone",
  customerEmail: "Customer email",
  customerAddress: "Customer address",
  colDesc: "Description column",
  colQty: "Quantity column",
  colCustoms: "Customs column",
  colService: "Service fee column",
  colTotal: "Line total column",
  packageNotes: "Package notes",
  secondaryCurrency: "HTG equivalents",
  paymentHistory: "Payment history",
  notes: "Notes box",
  paymentInstructions: "Payment instructions",
  footer: "Footer",
};

export function defaultDesign(id = "default", name = "Prime Classic"): Design {
  return {
    id,
    name,
    primary: "#C8641E",
    accent: "#1F3A5F",
    highlight: "#F28C1B",
    text: "#1A1A1A",
    font: "Roboto",
    fontSize: 13,
    logoSize: 150,
    logoPosition: "left",
    tableBorders: true,
    headerBg: "#EEF2F4",
    labels: { ...DEFAULT_LABELS },
    show: Object.fromEntries(Object.keys(SHOW_FIELDS).map((k) => [k, !["colDesc", "colQty", "colService", "taxId", "packageNotes"].includes(k)])),
  };
}

export function defaultDB(): DB {
  return {
    settings: {
      business: {
        logo: logoAsset.url,
        name: "PRIME SHIPPING",
        address: "Rue Petion, anfas shekina",
        city: "Jacmel, Sud-Est",
        country: "Haïti",
        phone: "+50934668316",
        whatsapp: "+50934668316",
        email: "",
        website: "",
        taxId: "",
        footer: "PRIME EXPRESS SHIPPING - JACMEL, HAÏTI",
        defaultNotes: "Veuillez vérifier votre colis avant de partir. Aucun retour ne sera accepté après votre départ.",
        paymentTerms: "Paiement à la réception",
        paymentInstructions: "",
      },
      numbering: { prefix: "INV-PS", next: 1, pad: 4 },
      currency: { main: "USD", secondary: "HTG", rate: "132.50", showSecondary: true, taxEnabled: false, taxRate: "0", defaultRate: "5.80" },
      paymentMethods: ["Cash", "Card", "Bank Transfer", "MonCash", "NatCash", "Check", "Other"],
      messaging: {
        emailSubject: "Prime Shipping invoice {number}",
        emailBody: "Hello {name},\n\nPlease find attached your Prime Shipping invoice {number}.\nTotal: {total}\nPaid: {paid}\nBalance: {balance}\n\nThank you.",
        whatsappTemplate: "Hello {name}, here is your Prime Shipping invoice {number}. Total: {total}. Paid: {paid}. Balance: {balance}. Thank you.",
      },
      activeDesignId: "default",
    },
    designs: [defaultDesign()],
    customers: [],
    invoices: [],
    activity: [],
  };
}

const KEY = "prime-shipping-db-v1";
let state: DB | null = null;
const listeners = new Set<() => void>();
const SERVER_DB = defaultDB();

function load(): DB {
  if (state) return state;
  if (typeof window === "undefined") return SERVER_DB;
  try {
    const raw = localStorage.getItem(KEY);
    const base = defaultDB();
    if (raw) {
      const p = JSON.parse(raw) as DB;
      state = { ...base, ...p, settings: { ...base.settings, ...p.settings } };
    } else state = base;
  } catch {
    state = defaultDB();
  }
  return state!;
}

function commit(next: DB) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch (e) {
    alert("Storage is full. Try a smaller logo image.");
    throw e;
  }
  listeners.forEach((l) => l());
}

export function getDB() {
  return load();
}

export function useDB(): DB {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    load,
    () => SERVER_DB,
  );
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function log(db: DB, action: string, ref: string): Activity[] {
  return [{ id: uid(), at: new Date().toISOString(), action, ref }, ...db.activity].slice(0, 2000);
}

export function invoiceTotals(inv: Invoice): Totals {
  return calcTotals(inv.packages, inv.payments, Number(inv.taxRate) || 0, inv.taxEnabled, inv.cancelled);
}

export function designFor(db: DB, id?: string): Design {
  const d = db.designs.find((x) => x.id === id) ?? db.designs.find((x) => x.id === db.settings.activeDesignId) ?? db.designs[0] ?? defaultDesign();
  const base = defaultDesign();
  return { ...base, ...d, labels: { ...base.labels, ...d.labels }, show: { ...base.show, ...d.show } };
}

// ---------- actions ----------
export function updateSettings(patch: Partial<Settings>, action = "Settings updated") {
  const db = load();
  commit({ ...db, settings: { ...db.settings, ...patch }, activity: log(db, action, "Settings") });
}

export function setNextNumber(prefix: string, next: number, pad: number) {
  const db = load();
  commit({
    ...db,
    settings: { ...db.settings, numbering: { prefix, next, pad } },
    activity: log(db, "Invoice number changed", `Next: ${formatInvoiceNumber(prefix, next, pad)}`),
  });
}

export function saveDesign(d: Design) {
  const db = load();
  const exists = db.designs.some((x) => x.id === d.id);
  commit({
    ...db,
    designs: exists ? db.designs.map((x) => (x.id === d.id ? d : x)) : [...db.designs, d],
    activity: log(db, exists ? "Template settings changed" : "Template created", d.name),
  });
}

export function deleteDesign(id: string) {
  const db = load();
  if (db.designs.length <= 1) return;
  const designs = db.designs.filter((d) => d.id !== id);
  commit({
    ...db,
    designs,
    settings: { ...db.settings, activeDesignId: db.settings.activeDesignId === id ? designs[0].id : db.settings.activeDesignId },
    activity: log(db, "Template deleted", id),
  });
}

export function upsertCustomer(c: Customer): Customer {
  const db = load();
  const exists = db.customers.some((x) => x.id === c.id);
  commit({
    ...db,
    customers: exists ? db.customers.map((x) => (x.id === c.id ? c : x)) : [c, ...db.customers],
    activity: log(db, exists ? "Customer updated" : "Customer created", c.name),
  });
  return c;
}

function allocateNumber(db: DB): { number: string; next: number } {
  const { prefix, pad } = db.settings.numbering;
  let n = Math.max(1, db.settings.numbering.next);
  const used = new Set(db.invoices.map((i) => i.number));
  while (used.has(formatInvoiceNumber(prefix, n, pad))) n++;
  return { number: formatInvoiceNumber(prefix, n, pad), next: n + 1 };
}

export function peekNextNumber(): string {
  return allocateNumber(load()).number;
}

export type InvoiceDraft = Omit<Invoice, "id" | "number" | "createdAt" | "updatedAt" | "cancelled">;

export function createInvoice(draft: InvoiceDraft, action = "Invoice created"): Invoice {
  const db = load();
  const { number, next } = allocateNumber(db);
  const now = new Date().toISOString();
  const inv: Invoice = { ...draft, id: uid(), number, cancelled: false, createdAt: now, updatedAt: now };
  commit({
    ...db,
    invoices: [inv, ...db.invoices],
    settings: { ...db.settings, numbering: { ...db.settings.numbering, next } },
    activity: log(db, action, number),
  });
  return inv;
}

export function updateInvoice(id: string, patch: Partial<Invoice>, action = "Invoice edited") {
  const db = load();
  const inv = db.invoices.find((i) => i.id === id);
  if (!inv) return;
  const { number: _n, id: _i, createdAt: _c, ...safe } = patch;
  commit({
    ...db,
    invoices: db.invoices.map((i) => (i.id === id ? { ...i, ...safe, updatedAt: new Date().toISOString() } : i)),
    activity: log(db, action, inv.number),
  });
}

export function duplicateInvoice(id: string): Invoice | undefined {
  const db = load();
  const src = db.invoices.find((i) => i.id === id);
  if (!src) return;
  const today = new Date().toISOString().slice(0, 10);
  return createInvoice(
    {
      ...src,
      date: today,
      payments: [],
      packages: src.packages.map((p) => ({ ...p, id: uid() })),
    },
    `Invoice duplicated from ${src.number}`,
  );
}

export function recordPayment(id: string, p: Payment) {
  const inv = load().invoices.find((i) => i.id === id);
  if (!inv) return;
  updateInvoice(id, { payments: [...inv.payments, p] }, `Payment recorded (${p.method} ${p.amount})`);
}

export function cancelInvoice(id: string, reason: string) {
  updateInvoice(id, { cancelled: true, cancelReason: reason }, "Invoice cancelled");
}

export function restoreInvoice(id: string) {
  updateInvoice(id, { cancelled: false, cancelReason: "" }, "Invoice restored");
}

export function logActivity(action: string, ref: string) {
  const db = load();
  commit({ ...db, activity: log(db, action, ref) });
}

export function exportBackup() {
  return JSON.stringify(load(), null, 2);
}

export function importBackup(json: string) {
  const p = JSON.parse(json) as DB;
  if (!p.settings || !Array.isArray(p.invoices)) throw new Error("Invalid backup file");
  const db = load();
  commit({ ...p, activity: log(db, "Backup restored", "Settings") });
}

export function emptyCustomer(): Omit<Customer, "id" | "createdAt"> {
  return { name: "", company: "", phone: "", whatsapp: "", email: "", address: "", shippingAddress: "", city: "", country: "Haïti", notes: "" };
}

export function emptyPackage(rate: string): PackageLine {
  return { id: uid(), trackingNumber: "", description: "", itemName: "", quantity: "1", weight: "", weightUnit: "lb", rate, customs: "", serviceFee: "", discount: "", notes: "" };
}

export function fillTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

export function searchInvoices(db: DB, q: string): Invoice[] {
  const s = q.trim().toLowerCase();
  if (!s) return db.invoices;
  return db.invoices.filter((i) =>
    [i.number, i.customer.name, i.customer.company, i.customer.phone, i.customer.whatsapp, i.customer.email, i.date, ...i.packages.map((p) => p.trackingNumber)]
      .join(" ")
      .toLowerCase()
      .includes(s),
  );
}
