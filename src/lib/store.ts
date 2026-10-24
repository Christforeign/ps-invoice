import { useSyncExternalStore } from "react";
import logoAsset from "@/assets/prime-logo.jpg.asset.json";
import { calcTotals, convertCents, docCode, formatInvoiceNumber, toCents, type PackageLine, type Payment, type Totals } from "./calc";

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

/** BOTH = old method (USD + HTG equivalent); USD or HTG = amounts entered and shown only in that currency. */
export type CurrencyMode = "BOTH" | "USD" | "HTG";

export interface CurrencySettings {
  mode?: CurrencyMode;
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
  labels: Labels;
  show: Record<ShowKey, boolean>;
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

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: string;
  stock: number;
  lowStock: number;
  notes: string;
  createdAt: string;
  /** Small compressed data-URL photo shown in inventory and POS. */
  image?: string;
  /** Currency the price is written in (old products = USD). */
  currency?: "USD" | "HTG";
}

export interface SaleLine {
  productId?: string; // empty for items not in inventory
  name: string;
  price: string; // unit price USD
  qty: number;
}

export interface Sale {
  id: string;
  number: string;
  at: string;
  lines: SaleLine[];
  discount: string;
  method: string;
  received: string;
  customerName: string;
  /** Currency of all amounts in this sale (old sales = USD). */
  currency?: "USD" | "HTG";
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
  /** Old invoices have none and keep the USD + HTG display. */
  currencyMode?: CurrencyMode;
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
  products: Product[];
  sales: Sale[];
  parcels: Parcel[];
  closures: DailyClosure[];
}

export const PARCEL_STATUSES = ["Reçu à Miami", "En transit", "Arrivé en Haïti", "Prêt au retrait", "Livré"] as const;
export interface Parcel {
  id: string; tracking: string; sender: string; recipient: string; phone: string;
  origin: string; destination: string; carrier: string; description: string;
  weight: string; rate: string; status: typeof PARCEL_STATUSES[number];
  receivedAt: string; updatedAt: string; invoiceId?: string;
  history: { at: string; status: string }[];
}
export interface DailyClosure { id: string; date: string; total: number; methods: Record<string, number>; at: string }

export const DEFAULT_LABELS = {
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
export type Labels = Record<keyof typeof DEFAULT_LABELS, string>;

export const SHOW_FIELDS = {
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
export type ShowKey = keyof typeof SHOW_FIELDS;

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
    show: Object.fromEntries(Object.keys(SHOW_FIELDS).map((k) => [k, !["colDesc", "colQty", "colService", "taxId", "packageNotes"].includes(k)])) as Record<ShowKey, boolean>,
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
    products: [],
    sales: [],
    parcels: [],
    closures: [],
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
      state = normalize(JSON.parse(raw) as DB);
    } else state = base;
  } catch {
    state = defaultDB();
  }
  return state ?? SERVER_DB;
}

export function normalize(p: Partial<DB>): DB {
  const base = defaultDB();
  const settings = { ...base.settings, ...(p.settings || {}) } as Settings & { security?: unknown };
  delete settings.security;
  return { ...base, ...p, settings, products: p.products ?? [], sales: p.sales ?? [], parcels: p.parcels ?? [], closures: p.closures ?? [] } as DB;
}

type SyncFn = (db: DB) => void;
let syncFn: SyncFn | null = null;
/** Cloud sync hook: called after every local change. */
export function setSyncHandler(fn: SyncFn | null) {
  syncFn = fn;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
/** Writing the whole DB (with photos) is slow, so it runs after the click has been painted. */
function persistLocal(next: DB) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // local cache full; cloud copy remains the source of truth
    }
  }, 250);
}
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => { if (persistTimer && state) { clearTimeout(persistTimer); persistTimer = null; try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* full */ } } });
}

function commit(next: DB) {
  state = next;
  persistLocal(next);
  listeners.forEach((l) => l());
  syncFn?.(next);
}

/** Replace the whole DB with data loaded from the cloud (no re-upload). */
export function replaceDB(next: DB) {
  state = normalize(next);
  persistLocal(state);
  listeners.forEach((l) => l());
}

/** True when this device has invoices/customers/products worth keeping. */
export function hasLocalData(db: DB) {
  return db.invoices.length > 0 || db.customers.length > 0 || db.products.length > 0 || db.sales.length > 0 || db.parcels.length > 0;
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

/** Display currency code for an invoice (old invoices keep the main currency). */
export function invoiceCode(inv: Pick<Invoice, "currencyMode">, main = "USD"): string {
  return docCode(inv.currencyMode, main);
}

/** Convert an invoice amount (cents) into the main currency for cross-invoice stats. */
export function toMainCents(cents: number, inv: Pick<Invoice, "currencyMode" | "exchangeRate">, main = "USD"): number {
  return inv.currencyMode === "HTG" ? convertCents(cents, "HTG", "USD", inv.exchangeRate) : cents;
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
    settings: { ...db.settings, activeDesignId: db.settings.activeDesignId === id ? designs[0]!.id : db.settings.activeDesignId },
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
  commit({ ...normalize(p), activity: log(db, "Backup restored", "Settings") });
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


// ---------- inventory ----------
export function upsertProduct(pr: Product): Product {
  const db = load();
  const exists = db.products.some((x) => x.id === pr.id);
  commit({
    ...db,
    products: exists ? db.products.map((x) => (x.id === pr.id ? pr : x)) : [pr, ...db.products],
    activity: log(db, exists ? "Product updated" : "Product created", pr.name),
  });
  return pr;
}

/** Change stock by delta (e.g. -1 for a sale). Stock never goes below 0. */
export function adjustStock(id: string, delta: number, reason = "") {
  const db = load();
  const pr = db.products.find((x) => x.id === id);
  if (!pr || !Number.isInteger(delta) || delta === 0) return;
  const stock = Math.max(0, pr.stock + delta);
  commit({
    ...db,
    products: db.products.map((x) => (x.id === id ? { ...x, stock } : x)),
    activity: log(db, `Stock ${delta > 0 ? "+" : ""}${delta}${reason ? ` (${reason})` : ""}`, pr.name),
  });
}

export function deleteProduct(id: string) {
  const db = load();
  const pr = db.products.find((x) => x.id === id);
  if (!pr) return;
  commit({ ...db, products: db.products.filter((x) => x.id !== id), activity: log(db, "Product deleted", pr.name) });
}

export function saleTotalCents(sale: Pick<Sale, "lines" | "discount">): number {
  const sub = sale.lines.reduce((a, l) => a + (toCents(l.price) || 0) * l.qty, 0);
  return Math.max(0, sub - (toCents(sale.discount) || 0));
}

/** Records a POS sale and removes sold inventory quantities (never below 0). */
export function recordSale(input: Omit<Sale, "id" | "number" | "at">): Sale {
  const db = load();
  const sale: Sale = { ...input, id: uid(), number: `TK${String(db.sales.length + 1).padStart(5, "0")}`, at: new Date().toISOString() };
  const sold = new Map<string, number>();
  for (const l of sale.lines) {
    if (!Number.isInteger(l.qty) || l.qty < 1 || !Number.isFinite(toCents(l.price)) || toCents(l.price) < 0) throw new Error("Vente invalide");
    if (l.productId) sold.set(l.productId, (sold.get(l.productId) ?? 0) + l.qty);
  }
  for (const [id, qty] of sold) { const p = db.products.find((x) => x.id === id); if (!p || p.stock < qty) throw new Error("Stock insuffisant ; actualisez le panier"); }
  commit({
    ...db,
    sales: [sale, ...db.sales],
    products: db.products.map((x) => ({ ...x, stock: x.stock - (sold.get(x.id) ?? 0) })),
    activity: log(db, `Vente POS ${sale.number}`, `${(saleTotalCents(sale) / 100).toFixed(2)} ${sale.currency ?? "USD"}`),
  });
  return sale;
}

export function saveParcel(p: Parcel) {
  const db = load();
  if (!p.tracking.trim() || !p.recipient.trim() || !p.sender.trim() || !p.origin.trim() || !p.destination.trim()) throw new Error("Tracking, expéditeur, destinataire et trajet requis");
  if (db.parcels.some((x) => x.id !== p.id && x.tracking.toLowerCase() === p.tracking.toLowerCase())) throw new Error("Ce tracking existe déjà");
  const previous = db.parcels.find((x) => x.id === p.id);
  const at = new Date().toISOString();
  const next = { ...p, updatedAt: at, history: previous?.status === p.status ? previous.history : [...(previous?.history ?? []), { at, status: p.status }] };
  commit({ ...db, parcels: previous ? db.parcels.map((x) => x.id === p.id ? next : x) : [next, ...db.parcels], activity: log(db, previous ? `Colis : ${p.status}` : "Colis reçu", p.tracking) });
}

export function invoiceParcel(id: string): Invoice {
  const db = load(); const p = db.parcels.find((x) => x.id === id);
  if (!p) throw new Error("Colis introuvable");
  const linked = db.invoices.find((i) => i.id === p.invoiceId); if (linked) return linked;
  if (!(Number(p.weight) > 0) || !(Number(p.rate) >= 0) || !p.phone.trim()) throw new Error("Téléphone, poids positif et tarif requis pour facturer");
  const inv = createInvoice({ date: new Date().toISOString().slice(0,10), dueDate: "", customerId: "", customer: { ...emptyCustomer(), name: p.recipient, phone: p.phone, address: p.destination }, packages: [{ ...emptyPackage(p.rate), weight: p.weight, trackingNumber: p.tracking, description: p.description, shipment: { sender: p.sender, recipient: p.recipient, origin: p.origin, destination: p.destination, status: p.status, carrier: p.carrier } }], payments: [], notes: db.settings.business.defaultNotes, paymentInfo: db.settings.business.paymentTerms, designId: db.settings.activeDesignId, exchangeRate: db.settings.currency.rate, taxEnabled: db.settings.currency.taxEnabled, taxRate: db.settings.currency.taxRate });
  saveParcel({ ...p, invoiceId: inv.id }); return inv;
}

export function closeDay(date: string) {
  const db = load(); if (db.closures.some((c) => c.date === date)) throw new Error("Journée déjà clôturée");
  const methods: Record<string,number> = {}; let total=0;
  for (const s of db.sales.filter((s) => s.at.slice(0,10)===date)) { const n=saleTotalCents(s); total+=n; methods[s.method]=(methods[s.method]??0)+n; }
  commit({ ...db, closures: [{ id: uid(), date, total, methods, at: new Date().toISOString() }, ...db.closures], activity: log(db,"Clôture journalière",date) });
}
