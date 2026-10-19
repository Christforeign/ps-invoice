import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageTitle } from "@/components/AppShell";
import { InvoicePreview, useHydrated } from "@/components/InvoicePreview";
import { DEFAULT_LABELS, SHOW_FIELDS, defaultDesign, deleteDesign, designFor, exportBackup, getDB, importBackup, peekNextNumber, saveDesign, setNextNumber, uid, updateSettings, useDB, emptyPackage, type Business, type Design } from "@/lib/store";
import { formatInvoiceNumber, isValidNumber } from "@/lib/calc";
import { downloadBlob } from "@/lib/share";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Prime Shipping" },
      { name: "description", content: "Business profile, numbering, currency, payment methods and invoice design." },
      { property: "og:title", content: "Prime Shipping Settings" },
      { property: "og:description", content: "Configure the Prime Shipping invoice system." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const hydrated = useHydrated();
  return (
    <div>
      <PageTitle title="Settings" />
      {hydrated ? (
        <Tabs defaultValue="business">
          <TabsList className="mb-4 h-auto flex-wrap justify-start">
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="numbering">Numbering</TabsTrigger>
            <TabsTrigger value="currency">Currency</TabsTrigger>
            <TabsTrigger value="payments">Payment methods</TabsTrigger>
            <TabsTrigger value="design">Invoice design</TabsTrigger>
            <TabsTrigger value="messaging">Email & WhatsApp</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
          </TabsList>
          <TabsContent value="business"><BusinessTab /></TabsContent>
          <TabsContent value="numbering"><NumberingTab /></TabsContent>
          <TabsContent value="currency"><CurrencyTab /></TabsContent>
          <TabsContent value="payments"><PaymentMethodsTab /></TabsContent>
          <TabsContent value="design"><DesignTab /></TabsContent>
          <TabsContent value="messaging"><MessagingTab /></TabsContent>
          <TabsContent value="backup"><BackupTab /></TabsContent>
        </Tabs>
      ) : <p className="text-muted-foreground">Loading…</p>}
    </div>
  );
}

const Card = ({ children }: { children: React.ReactNode }) => <div className="max-w-3xl rounded-lg border bg-card p-4 sm:p-6">{children}</div>;

function resizeImage(file: File, max = 500): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const sc = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = img.width * sc; c.height = img.height * sc;
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.9));
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

function BusinessTab() {
  const db = useDB();
  const [b, setB] = useState<Business>(db.settings.business);
  const f = (k: keyof Business, label: string, area = false) => (
    <div className={area ? "sm:col-span-2" : ""}>
      <Label>{label}</Label>
      {area ? <Textarea value={b[k]} rows={3} onChange={(e) => setB({ ...b, [k]: e.target.value })} /> : <Input value={b[k]} onChange={(e) => setB({ ...b, [k]: e.target.value })} />}
    </div>
  );
  return (
    <Card>
      <div className="mb-4 flex items-center gap-4">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-md border bg-background">{b.logo ? <img src={b.logo} alt="logo" className="h-full w-full object-contain" /> : "No logo"}</div>
        <div className="flex flex-col gap-2">
          <Label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
            <Upload className="h-4 w-4" /> Upload / replace logo
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) setB({ ...b, logo: await resizeImage(file) }); }} />
          </Label>
          {b.logo && <Button variant="ghost" size="sm" onClick={() => setB({ ...b, logo: "" })}><X className="h-4 w-4" /> Remove logo</Button>}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {f("name", "Business name")}{f("address", "Address")}{f("city", "City")}{f("country", "Country")}{f("phone", "Phone")}{f("whatsapp", "WhatsApp")}{f("email", "Email")}{f("website", "Website")}{f("taxId", "Tax / registration number")}{f("paymentTerms", "Default payment terms")}
        {f("defaultNotes", "Default notes", true)}{f("paymentInstructions", "Payment instructions", true)}{f("footer", "Footer text", true)}
      </div>
      <Button className="mt-4" onClick={() => { updateSettings({ business: b }, "Business information changed"); toast.success("Business information saved"); }}>Save</Button>
    </Card>
  );
}

function NumberingTab() {
  const db = useDB();
  const n = db.settings.numbering;
  const [prefix, setPrefix] = useState(n.prefix);
  const [next, setNext] = useState(String(n.next));
  const [pad, setPad] = useState(String(n.pad));
  const preview = formatInvoiceNumber(prefix, Number(next) || 1, Number(pad) || 1);
  const taken = db.invoices.some((i) => i.number === preview);
  return (
    <Card>
      <div className="grid gap-3 sm:grid-cols-3">
        <div><Label>Prefix</Label><Input value={prefix} onChange={(e) => setPrefix(e.target.value.replace(/\s/g, ""))} maxLength={15} /></div>
        <div><Label>Next number</Label><Input inputMode="numeric" value={next} onChange={(e) => setNext(e.target.value.replace(/\D/g, ""))} /></div>
        <div><Label>Digits</Label><Input inputMode="numeric" value={pad} onChange={(e) => setPad(e.target.value.replace(/\D/g, ""))} /></div>
      </div>
      <p className="mt-3 text-sm">Next invoice will be: <b>{preview}</b>{taken && <span className="text-destructive"> — already used; the system will skip to the next free number ({peekNextNumber()} with current settings).</span>}</p>
      <p className="text-xs text-muted-foreground">Existing invoices always keep their numbers. Duplicate numbers are never generated.</p>
      <Button className="mt-4" onClick={() => {
        if (!prefix || !Number(next) || !Number(pad) || Number(pad) > 10) return toast.error("Enter a prefix, a next number ≥ 1 and 1–10 digits");
        setNextNumber(prefix, Number(next), Number(pad)); toast.success("Numbering saved");
      }}>Save</Button>
    </Card>
  );
}

function CurrencyTab() {
  const db = useDB();
  const [c, setC] = useState(db.settings.currency);
  return (
    <Card>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Main currency</Label><Input value={c.main} onChange={(e) => setC({ ...c, main: e.target.value.toUpperCase() })} maxLength={5} /></div>
        <div><Label>Secondary currency</Label><Input value={c.secondary} onChange={(e) => setC({ ...c, secondary: e.target.value.toUpperCase() })} maxLength={5} /></div>
        <div><Label>Exchange rate (1 {c.main} = ? {c.secondary})</Label><Input inputMode="decimal" value={c.rate} onChange={(e) => setC({ ...c, rate: e.target.value })} /></div>
        <div><Label>Default shipping rate ({c.main}/lb)</Label><Input inputMode="decimal" value={c.defaultRate} onChange={(e) => setC({ ...c, defaultRate: e.target.value })} /></div>
        <div><Label>Default tax rate (%)</Label><Input inputMode="decimal" value={c.taxRate} onChange={(e) => setC({ ...c, taxRate: e.target.value })} /></div>
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 text-sm"><Switch checked={c.showSecondary} onCheckedChange={(v) => setC({ ...c, showSecondary: v })} /> Show {c.secondary} equivalent</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={c.taxEnabled} onCheckedChange={(v) => setC({ ...c, taxEnabled: v })} /> Enable tax by default</label>
        </div>
      </div>
      <Button className="mt-4" onClick={() => {
        if (![c.rate, c.defaultRate, c.taxRate].every((v) => isValidNumber(v, false))) return toast.error("Rates must be valid positive numbers");
        updateSettings({ currency: c }, `Currency settings changed (rate ${c.rate})`); toast.success("Currency saved");
      }}>Save</Button>
    </Card>
  );
}

function PaymentMethodsTab() {
  const db = useDB();
  const [list, setList] = useState(db.settings.paymentMethods);
  const [nm, setNm] = useState("");
  return (
    <Card>
      <div className="mb-3 flex flex-wrap gap-2">
        {list.map((m) => (
          <span key={m} className="inline-flex items-center gap-1 rounded-full border bg-muted px-3 py-1 text-sm">{m}<button onClick={() => setList(list.filter((x) => x !== m))} aria-label={`Remove ${m}`}><X className="h-3 w-3" /></button></span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={nm} onChange={(e) => setNm(e.target.value)} placeholder="Add custom method" maxLength={40} />
        <Button variant="outline" onClick={() => { const v = nm.trim(); if (v && !list.includes(v)) setList([...list, v]); setNm(""); }}><Plus className="h-4 w-4" /> Add</Button>
      </div>
      <Button className="mt-4" onClick={() => { if (!list.length) return toast.error("Keep at least one method"); updateSettings({ paymentMethods: list }, "Payment methods changed"); toast.success("Payment methods saved"); }}>Save</Button>
    </Card>
  );
}

const FONTS = ["Roboto", "Barlow", "Montserrat", "Open Sans", "Lato", "Merriweather", "Arial", "Georgia"];

function DesignTab() {
  const db = useDB();
  const [d, setD] = useState<Design>(designFor(db));
  const sample = {
    number: peekNextNumber(), date: new Date().toISOString().slice(0, 10), dueDate: "", notes: db.settings.business.defaultNotes, paymentInfo: "", exchangeRate: db.settings.currency.rate, taxEnabled: false, taxRate: "0", cancelled: false,
    customer: { name: "Jean Pierre", company: "", phone: "+509 0000 0000", whatsapp: "", email: "client@email.com", address: "Jacmel", shippingAddress: "", city: "", country: "", notes: "" },
    packages: [{ ...emptyPackage(db.settings.currency.defaultRate), trackingNumber: "1Z999AA10123456784", weight: "2.5" }, { ...emptyPackage(db.settings.currency.defaultRate), trackingNumber: "9400111899223", weight: "3", customs: "10" }],
    payments: [{ id: "x", date: new Date().toISOString().slice(0, 10), method: "Cash", amount: "10" }],
  };
  const color = (k: "primary" | "accent" | "highlight" | "text" | "headerBg", l: string) => (
    <div><Label>{l}</Label><div className="flex gap-2"><input type="color" value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} className="h-9 w-12 rounded border" /><Input value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} /></div></div>
  );
  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <div className="space-y-4 rounded-lg border bg-card p-4">
        <div>
          <Label>Template</Label>
          <div className="flex gap-2">
            <select value={d.id} onChange={(e) => setD(designFor(db, e.target.value))} className="h-9 flex-1 rounded-md border border-input bg-transparent px-2 text-sm">
              {db.designs.map((x) => <option key={x.id} value={x.id}>{x.name}{x.id === db.settings.activeDesignId ? " (default)" : ""}</option>)}
            </select>
            <Button variant="outline" size="icon" title="New template" onClick={() => setD({ ...d, id: uid(), name: `${d.name} copy` })}><Plus className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" title="Delete template" disabled={db.designs.length <= 1 || !db.designs.some((x) => x.id === d.id)} onClick={() => { deleteDesign(d.id); setD(designFor(getDB())); toast.success("Template deleted"); }}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
        <div><Label>Template name</Label><Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          {color("primary", "Title color")}{color("accent", "Accent color")}{color("highlight", "Balance box")}{color("headerBg", "Table header")}{color("text", "Text color")}
          <div><Label>Font</Label><select value={d.font} onChange={(e) => setD({ ...d, font: e.target.value })} className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm">{FONTS.map((f) => <option key={f}>{f}</option>)}</select></div>
          <div><Label>Font size: {d.fontSize}px</Label><input type="range" min={10} max={17} value={d.fontSize} onChange={(e) => setD({ ...d, fontSize: Number(e.target.value) })} className="w-full" /></div>
          <div><Label>Logo size: {d.logoSize}px</Label><input type="range" min={60} max={240} value={d.logoSize} onChange={(e) => setD({ ...d, logoSize: Number(e.target.value) })} className="w-full" /></div>
          <div><Label>Logo position</Label><select value={d.logoPosition} onChange={(e) => setD({ ...d, logoPosition: e.target.value as Design["logoPosition"] })} className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"><option value="left">Left</option><option value="center">Above name</option><option value="right">Right</option></select></div>
          <label className="flex items-end gap-2 pb-2 text-sm"><Switch checked={d.tableBorders} onCheckedChange={(v) => setD({ ...d, tableBorders: v })} /> Table borders</label>
        </div>
        <details>
          <summary className="cursor-pointer font-semibold">Visible fields</summary>
          <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {Object.entries(SHOW_FIELDS).map(([k, l]) => <label key={k} className="flex items-center gap-2 text-sm"><Switch checked={!!d.show[k]} onCheckedChange={(v) => setD({ ...d, show: { ...d.show, [k]: v } })} /> {l}</label>)}
          </div>
        </details>
        <details>
          <summary className="cursor-pointer font-semibold">Header, table & label texts</summary>
          <div className="mt-2 grid gap-2">
            {Object.keys(DEFAULT_LABELS).map((k) => <div key={k}><Label className="text-xs">{k}</Label><Input value={d.labels[k] ?? ""} onChange={(e) => setD({ ...d, labels: { ...d.labels, [k]: e.target.value } })} /></div>)}
          </div>
        </details>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { saveDesign(d); toast.success("Template saved"); }}>Save template</Button>
          <Button variant="outline" onClick={() => { saveDesign(d); updateSettings({ activeDesignId: d.id }, `Default template set: ${d.name}`); toast.success("Saved as default"); }}>Save & set default</Button>
          <Button variant="ghost" onClick={() => setD({ ...defaultDesign(d.id, d.name) })}>Reset</Button>
        </div>
      </div>
      <div className="rounded-lg bg-muted p-2 sm:p-4">
        <InvoicePreview invoice={sample} business={db.settings.business} currency={db.settings.currency} design={d} />
      </div>
    </div>
  );
}

function MessagingTab() {
  const db = useDB();
  const [m, setM] = useState(db.settings.messaging);
  return (
    <Card>
      <p className="mb-3 text-sm text-muted-foreground">Placeholders: {"{name}"} {"{fullname}"} {"{number}"} {"{total}"} {"{paid}"} {"{balance}"} {"{business}"}</p>
      <div className="grid gap-3">
        <div><Label>Email subject</Label><Input value={m.emailSubject} onChange={(e) => setM({ ...m, emailSubject: e.target.value })} /></div>
        <div><Label>Email message</Label><Textarea rows={6} value={m.emailBody} onChange={(e) => setM({ ...m, emailBody: e.target.value })} /></div>
        <div><Label>WhatsApp message</Label><Textarea rows={4} value={m.whatsappTemplate} onChange={(e) => setM({ ...m, whatsappTemplate: e.target.value })} /></div>
      </div>
      <Button className="mt-4" onClick={() => { updateSettings({ messaging: m }, "Email/WhatsApp settings changed"); toast.success("Messages saved"); }}>Save</Button>
    </Card>
  );
}

function BackupTab() {
  return (
    <Card>
      <p className="mb-3 text-sm text-muted-foreground">Your invoices are saved on this device's browser. Download a backup regularly, and restore it to move data to another phone or computer.</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => downloadBlob(new Blob([exportBackup()], { type: "application/json" }), `prime-shipping-backup-${new Date().toISOString().slice(0, 10)}.json`)}>Download backup</Button>
        <Label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
          <Upload className="h-4 w-4" /> Restore backup
          <input type="file" accept="application/json" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            if (!confirm("Replace all current data with this backup?")) return;
            try { importBackup(await f.text()); toast.success("Backup restored"); } catch { toast.error("Invalid backup file"); }
          }} />
        </Label>
      </div>
    </Card>
  );
}
