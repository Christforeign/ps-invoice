import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Trash2, Copy, UserPlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { calcLine, calcTotals, convertWeight, fmtMoney, fmtWeight, isValidNumber, num, toHtgCents, type PackageLine, type Payment, type WeightUnit } from "@/lib/calc";
import { createInvoice, emptyCustomer, emptyPackage, peekNextNumber, uid, updateInvoice, upsertCustomer, useDB, type Invoice } from "@/lib/store";
import { StatusBadge } from "./StatusBadge";

const MAX = 20;
const today = () => new Date().toISOString().slice(0, 10);

export function InvoiceEditor({ existing }: { existing?: Invoice }) {
  const db = useDB();
  const s = db.settings;
  const nav = useNavigate();
  const [customerId, setCustomerId] = useState(existing?.customerId ?? "");
  const [customer, setCustomer] = useState(existing?.customer ?? emptyCustomer());
  const [saveCustomer, setSaveCustomer] = useState(true);
  const [date, setDate] = useState(existing?.date ?? today());
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? "");
  const [packages, setPackages] = useState<PackageLine[]>(existing?.packages ?? [emptyPackage(s.currency.defaultRate)]);
  const [payments, setPayments] = useState<Payment[]>(existing?.payments ?? [{ id: uid(), date: today(), method: "Cash", amount: "" }]);
  const [notes, setNotes] = useState(existing?.notes ?? s.business.defaultNotes);
  const [paymentInfo, setPaymentInfo] = useState(existing?.paymentInfo ?? s.business.paymentTerms);
  const [designId, setDesignId] = useState(existing?.designId ?? s.activeDesignId);
  const [exchangeRate, setExchangeRate] = useState(existing?.exchangeRate ?? s.currency.rate);
  const [taxEnabled, setTaxEnabled] = useState(existing?.taxEnabled ?? s.currency.taxEnabled);
  const [taxRate, setTaxRate] = useState(existing?.taxRate ?? s.currency.taxRate);
  const [custSearch, setCustSearch] = useState("");
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const totals = useMemo(() => calcTotals(packages, payments, num(taxRate), taxEnabled), [packages, payments, taxRate, taxEnabled]);
  const number = existing?.number ?? peekNextNumber();

  const custMatches = useMemo(() => {
    const q = custSearch.trim().toLowerCase();
    if (!q) return [];
    return db.customers.filter((c) => [c.name, c.company, c.phone, c.whatsapp, c.email].join(" ").toLowerCase().includes(q)).slice(0, 6);
  }, [custSearch, db.customers]);

  const setPkg = (id: string, patch: Partial<PackageLine>) => setPackages((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const changeUnit = (p: PackageLine, unit: WeightUnit) => {
    const w = p.weight && isValidNumber(p.weight) ? String(convertWeight(num(p.weight), p.weightUnit, unit)) : p.weight;
    setPkg(p.id, { weightUnit: unit, weight: w });
  };
  const setPay = (id: string, patch: Partial<Payment>) => setPayments((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  function validate() {
    const e: { [k: string]: string } & { overpaid?: string } = {};
    if (!customer.name.trim()) e["name"] = "Customer name is required";
    if (!customer.phone.trim() && !customer.whatsapp.trim()) e["phone"] = "Enter a phone or WhatsApp number";
    if (customer.email && !/^\S+@\S+\.\S+$/.test(customer.email)) e["email"] = "Invalid email";
    if (!date) e["date"] = "Invoice date is required";
    if (packages.length < 1) e["packages"] = "At least one package is required";
    packages.forEach((p, i) => {
      if (!p.weight || !isValidNumber(p.weight, false) || num(p.weight) <= 0) e[`w${p.id}`] = `Package ${i + 1}: enter a weight above 0`;
      if (!isValidNumber(p.rate, false)) e[`r${p.id}`] = `Package ${i + 1}: invalid rate`;
      if (!isValidNumber(p.quantity, false) || !/^\d+$/.test(p.quantity) || Number(p.quantity) < 1) e[`q${p.id}`] = `Package ${i + 1}: quantity must be a whole number ≥ 1`;
      (["customs", "serviceFee", "discount"] as const).forEach((k) => { if (!isValidNumber(p[k])) e[`${k}${p.id}`] = `Package ${i + 1}: invalid ${k}`; });
      const c = calcLine(p);
      if (c.total < 0) e[`d${p.id}`] = `Package ${i + 1}: discount larger than line amount`;
    });
    payments.forEach((p, i) => { if (!isValidNumber(p.amount)) e[`p${p.id}`] = `Payment ${i + 1}: invalid amount`; });
    if (totals.paid > totals.total) e.overpaid = `Amount paid (${fmtMoney(totals.paid)}) is more than the invoice total (${fmtMoney(totals.total)})`;
    if (!isValidNumber(exchangeRate, false)) e["rate"] = "Invalid exchange rate";
    setErrors(e);
    return Object.values(e) as string[];
  }

  function submit() {
    const errs = validate();
    if (errs.length) { toast.error(errs[0], { description: errs.length > 1 ? `+${errs.length - 1} more issue(s)` : undefined }); return; }
    let cid = customerId;
    if (saveCustomer) {
      const existingC = db.customers.find((c) => c.id === customerId);
      const c = upsertCustomer({ ...(existingC ?? { id: uid(), createdAt: new Date().toISOString() }), ...customer });
      cid = c.id;
    }
    const cleanPayments = payments.filter((p) => num(p.amount) > 0);
    const draft = { date, dueDate, customerId: cid, customer, packages, payments: cleanPayments, notes, paymentInfo, designId, exchangeRate, taxEnabled, taxRate };
    if (existing) {
      updateInvoice(existing.id, draft);
      toast.success(`Invoice ${existing.number} updated`);
      nav({ to: "/invoices/$id", params: { id: existing.id } });
    } else {
      const inv = createInvoice(draft);
      toast.success(`Invoice ${inv.number} generated`);
      nav({ to: "/invoices/$id", params: { id: inv.id }, search: { pdf: 1 } });
    }
  }

  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-destructive">{errors[k]}</p>;
  const numInput = (v: string, on: (v: string) => void, k?: string, ph = "0.00") => (
    <Input inputMode="decimal" value={v} placeholder={ph} onChange={(e) => on(e.target.value.replace(",", "."))} className={k && errors[k] ? "border-destructive" : ""} />
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        {/* Invoice meta */}
        <section className="rounded-lg border bg-card p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div><Label>Invoice #</Label><Input value={number} readOnly className="bg-muted font-semibold" /></div>
            <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />{err("date")}</div>
            <div><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            <div>
              <Label>Template</Label>
              <select value={designId} onChange={(e) => setDesignId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm">
                {db.designs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Customer */}
        <section className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-bold">Customer</h2>
            {customerId && <Button variant="ghost" size="sm" onClick={() => { setCustomerId(""); setCustomer(emptyCustomer()); }}><UserPlus className="h-4 w-4" /> New customer</Button>}
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={custSearch} onChange={(e) => setCustSearch(e.target.value)} placeholder="Search saved customers by name, phone, email…" className="pl-9" />
            {custMatches.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-lg">
                {custMatches.map((c) => (
                  <button key={c.id} type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { const { id: _i, createdAt: _c, ...rest } = c; setCustomerId(c.id); setCustomer({ ...emptyCustomer(), ...rest }); setCustSearch(""); }}>
                    <b>{c.name}</b> {c.company && `· ${c.company}`} <span className="text-muted-foreground">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Name *</Label><Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} maxLength={100} />{err("name")}</div>
            <div><Label>Company</Label><Input value={customer.company} onChange={(e) => setCustomer({ ...customer, company: e.target.value })} maxLength={100} /></div>
            <div><Label>Phone</Label><Input type="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} maxLength={30} />{err("phone")}</div>
            <div><Label>WhatsApp</Label><Input type="tel" value={customer.whatsapp} onChange={(e) => setCustomer({ ...customer, whatsapp: e.target.value })} maxLength={30} placeholder="+509…" /></div>
            <div><Label>Email</Label><Input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} maxLength={255} />{err("email")}</div>
            <div><Label>City</Label><Input value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} maxLength={80} /></div>
            <div><Label>Billing address</Label><Input value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} maxLength={200} /></div>
            <div><Label>Shipping address</Label><Input value={customer.shippingAddress} onChange={(e) => setCustomer({ ...customer, shippingAddress: e.target.value })} maxLength={200} /></div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm"><Switch checked={saveCustomer} onCheckedChange={setSaveCustomer} /> Save customer for future invoices</label>
        </section>

        {/* Packages */}
        <section className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Packages <span className="text-base font-medium text-muted-foreground">({packages.length}/{MAX})</span></h2>
          </div>
          <div className="space-y-3">
            {packages.map((p, i) => {
              const c = calcLine(p);
              return (
                <div key={p.id} className="rounded-md border border-l-4 border-l-primary bg-background p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-display text-lg font-bold">Package {i + 1}</span>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="icon" title="Duplicate line" disabled={packages.length >= MAX} onClick={() => setPackages((ps) => [...ps.slice(0, i + 1), { ...p, id: uid(), trackingNumber: "" }, ...ps.slice(i + 1)])}><Copy className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" title="Remove" disabled={packages.length <= 1} onClick={() => setPackages((ps) => ps.filter((x) => x.id !== p.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
                    <div className="col-span-2"><Label className="text-xs">Tracking number</Label><Input value={p.trackingNumber} onChange={(e) => setPkg(p.id, { trackingNumber: e.target.value.trim() })} maxLength={60} /></div>
                    <div className="col-span-2"><Label className="text-xs">Item / product</Label><Input value={p.itemName} onChange={(e) => setPkg(p.id, { itemName: e.target.value })} maxLength={100} /></div>
                    <div className="col-span-2"><Label className="text-xs">Description</Label><Input value={p.description} onChange={(e) => setPkg(p.id, { description: e.target.value })} maxLength={200} /></div>
                    <div><Label className="text-xs">Qty</Label><Input inputMode="numeric" value={p.quantity} onChange={(e) => setPkg(p.id, { quantity: e.target.value.replace(/\D/g, "") })} className={errors[`q${p.id}`] ? "border-destructive" : ""} /></div>
                    <div><Label className="text-xs">Weight *</Label>{numInput(p.weight, (v) => setPkg(p.id, { weight: v }), `w${p.id}`, "0.00")}</div>
                    <div>
                      <Label className="text-xs">Unit</Label>
                      <select value={p.weightUnit} onChange={(e) => changeUnit(p, e.target.value as WeightUnit)} className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm">
                        {(["lb", "oz", "kg", "g"] as const).map((u) => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                    <div><Label className="text-xs">Rate ({s.currency.main}/lb)</Label>{numInput(p.rate, (v) => setPkg(p.id, { rate: v }), `r${p.id}`)}</div>
                    <div><Label className="text-xs">Customs / duty</Label>{numInput(p.customs, (v) => setPkg(p.id, { customs: v }), `customs${p.id}`)}</div>
                    <div><Label className="text-xs">Service fee</Label>{numInput(p.serviceFee, (v) => setPkg(p.id, { serviceFee: v }), `serviceFee${p.id}`)}</div>
                    <div><Label className="text-xs">Discount</Label>{numInput(p.discount, (v) => setPkg(p.id, { discount: v }), `discount${p.id}`)}</div>
                    <div className="col-span-2 md:col-span-3"><Label className="text-xs">Notes</Label><Input value={p.notes} onChange={(e) => setPkg(p.id, { notes: e.target.value })} maxLength={200} /></div>
                  </div>
                  {Object.entries(errors).filter(([k]) => k.endsWith(p.id)).map(([k, v]) => <p key={k} className="mt-1 text-xs text-destructive">{v}</p>)}
                  <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 rounded bg-muted px-3 py-2 text-sm">
                    <span>{p.weightUnit !== "lb" && `${fmtWeight(c.milliLb)} · `}Shipping <b>{fmtMoney(c.shipping)}</b></span>
                    <span>Line total <b className="text-primary">{fmtMoney(c.total)}</b></span>
                  </div>
                </div>
              );
            })}
          </div>
          <Button type="button" variant="outline" className="mt-3 w-full border-dashed" disabled={packages.length >= MAX} onClick={() => setPackages((ps) => [...ps, emptyPackage(ps[ps.length - 1]?.rate || s.currency.defaultRate)])}>
            <Plus className="h-4 w-4" /> {packages.length >= MAX ? "Maximum 20 packages reached" : "Add Package"}
          </Button>
        </section>

        {/* Payments */}
        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 font-display text-xl font-bold">Payment</h2>
          <div className="space-y-2">
            {payments.map((p, i) => (
              <div key={p.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 sm:grid-cols-[140px_1fr_1fr_auto]">
                <Input type="date" value={p.date} onChange={(e) => setPay(p.id, { date: e.target.value })} className="col-span-3 sm:col-span-1" />
                <select value={p.method} onChange={(e) => setPay(p.id, { method: e.target.value })} className="h-9 rounded-md border border-input bg-transparent px-2 text-sm">
                  {s.paymentMethods.map((m) => <option key={m}>{m}</option>)}
                </select>
                {numInput(p.amount, (v) => setPay(p.id, { amount: v }), `p${p.id}`, "Amount paid")}
                <Button type="button" variant="ghost" size="icon" onClick={() => setPayments((ps) => ps.filter((x) => x.id !== p.id))} disabled={payments.length === 1 && i === 0 && !p.amount}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setPayments((ps) => [...ps, { id: uid(), date: today(), method: "MonCash", amount: "" }])}><Plus className="h-4 w-4" /> Split payment</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => { const rest = totals.total - totals.paid; if (rest > 0) setPayments((ps) => [...ps.filter((x) => x.amount), { id: uid(), date: today(), method: ps[0]?.method ?? "Cash", amount: (rest / 100).toFixed(2) }]); }}>Pay full balance</Button>
          </div>
          {err("overpaid")}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div><Label>Notes on invoice</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} /></div>
            <div><Label>Payment information / terms</Label><Textarea value={paymentInfo} onChange={(e) => setPaymentInfo(e.target.value)} rows={3} maxLength={1000} /></div>
          </div>
        </section>
      </div>

      {/* Totals */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Totals</h2>
            <StatusBadge status={totals.status} />
          </div>
          <dl className="space-y-1.5 text-sm">
            <TRow k="Packages" v={String(packages.length)} />
            <TRow k="Total weight" v={fmtWeight(totals.milliLb)} />
            <TRow k="Shipping" v={fmtMoney(totals.shipping)} />
            <TRow k="Customs / duty" v={fmtMoney(totals.customs)} />
            <TRow k="Service fees" v={fmtMoney(totals.service)} />
            <TRow k="Discounts" v={totals.discount ? `-${fmtMoney(totals.discount)}` : fmtMoney(0)} />
            <TRow k="Subtotal" v={fmtMoney(totals.subtotal)} />
            <div className="flex items-center justify-between gap-2 py-1">
              <label className="flex items-center gap-2"><Switch checked={taxEnabled} onCheckedChange={setTaxEnabled} /> Tax</label>
              {taxEnabled && <Input value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="h-8 w-20 text-right" inputMode="decimal" />}
              {taxEnabled && <span>%</span>}
            </div>
            {taxEnabled && <TRow k="Tax" v={fmtMoney(totals.tax)} />}
            <div className="my-2 border-t" />
            <div className="flex justify-between font-display text-2xl font-bold"><span>Total</span><span>{fmtMoney(totals.total, s.currency.main)}</span></div>
            {s.currency.showSecondary && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1">@ <Input value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} className="h-7 w-20 text-right" inputMode="decimal" /></span>
                <span>{fmtMoney(toHtgCents(totals.total, exchangeRate), s.currency.secondary)}</span>
              </div>
            )}
            <TRow k="Paid" v={fmtMoney(totals.paid)} />
            <div className="flex justify-between rounded-md bg-primary px-3 py-2 font-bold text-primary-foreground"><span>Balance</span><span>{fmtMoney(totals.balance, s.currency.main)}</span></div>
          </dl>
          <Button size="lg" className="mt-4 h-12 w-full text-base" onClick={submit}>{existing ? "Save changes" : "Generate Invoice"}</Button>
        </div>
      </aside>
    </div>
  );
}

function TRow({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>;
}
