import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Ban, Copy, Download, Mail, MessageCircle, Pencil, Printer, Wallet, RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { InvoicePreview, useHydrated } from "@/components/InvoicePreview";
import { StatusBadge } from "@/components/StatusBadge";
import { cancelInvoice, designFor, duplicateInvoice, fillTemplate, invoiceTotals, logActivity, recordPayment, restoreInvoice, uid, useDB } from "@/lib/store";
import { fmtMoney, isValidNumber, toCents } from "@/lib/calc";
import { downloadBlob, messageVars, pdfFilename, renderPdf, whatsappUrl } from "@/lib/share";

export const Route = createFileRoute("/invoices/$id")({
  validateSearch: (s: Record<string, unknown>): { pdf?: number } => (s["pdf"] ? { pdf: Number(s["pdf"]) } : {}),
  head: () => ({
    meta: [
      { title: "Invoice · Prime Shipping" },
      { name: "description", content: "View, print, download and share a Prime Shipping invoice." },
      { property: "og:title", content: "Prime Shipping Invoice" },
      { property: "og:description", content: "View a Prime Shipping invoice." },
    ],
  }),
  component: InvoiceView,
});

function InvoiceView() {
  const { id } = Route.useParams();
  const { pdf: justCreated } = Route.useSearch();
  const db = useDB();
  const nav = useNavigate();
  const hydrated = useHydrated();
  const docRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const inv = db.invoices.find((i) => i.id === id);

  if (!hydrated) return <p className="text-muted-foreground">Loading…</p>;
  if (!inv) return <p>Invoice not found. <Link to="/invoices" className="text-primary">Back to history</Link></p>;

  const s = db.settings;
  const design = designFor(db, inv.designId);
  const t = invoiceTotals(inv);

  async function makePdf() {
    if (!docRef.current) throw new Error("Invoice not ready");
    return renderPdf(docRef.current);
  }
  async function download() {
    setBusy(true);
    try {
      downloadBlob(await makePdf(), pdfFilename(inv!));
      logActivity("PDF downloaded", inv!.number);
    } catch (e) { toast.error("Could not create PDF"); console.error(e); }
    setBusy(false);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{inv.number}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">{inv.customer.name} · {inv.date} <StatusBadge status={t.status} /></div>
        </div>
      </div>
      {justCreated === 1 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
          <CheckCircle2 className="h-5 w-5 text-success" /> Invoice saved. Download, print, email or send it by WhatsApp below.
        </div>
      )}
      {inv.cancelled && <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">Cancelled{inv.cancelReason ? `: ${inv.cancelReason}` : ""}. The original record is kept.</div>}

      <div className="mb-4 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
        <Button onClick={download} disabled={busy}><Download className="h-4 w-4" /> {busy ? "Working…" : "PDF"}</Button>
        <Button variant="outline" onClick={() => { logActivity("Invoice printed", inv.number); window.print(); }}><Printer className="h-4 w-4" /> Print</Button>
        <Button variant="outline" onClick={() => setMailOpen(true)}><Mail className="h-4 w-4" /> Email</Button>
        <Button variant="outline" onClick={() => { logActivity("WhatsApp sent", inv.number); window.open(whatsappUrl(inv, s), "_blank"); }}><MessageCircle className="h-4 w-4" /> WhatsApp</Button>
        {!inv.cancelled && <Button variant="outline" onClick={() => setPayOpen(true)} disabled={t.balance === 0}><Wallet className="h-4 w-4" /> Payment</Button>}
        {!inv.cancelled && <Button variant="outline" asChild><Link to="/edit/$id" params={{ id: inv.id }}><Pencil className="h-4 w-4" /> Edit</Link></Button>}
        <Button variant="outline" onClick={() => { const d = duplicateInvoice(inv.id); if (d) { toast.success(`Duplicated as ${d.number}`); nav({ to: "/invoices/$id", params: { id: d.id } }); } }}><Copy className="h-4 w-4" /> Duplicate</Button>
        {inv.cancelled ? (
          <Button variant="outline" onClick={() => { restoreInvoice(inv.id); toast.success("Invoice restored"); }}><RotateCcw className="h-4 w-4" /> Restore</Button>
        ) : (
          <Button variant="outline" className="text-destructive" onClick={() => setCancelOpen(true)}><Ban className="h-4 w-4" /> Cancel</Button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="rounded-lg bg-muted p-2 sm:p-4">
          <InvoicePreview invoice={inv} business={s.business} currency={s.currency} design={design} />
        </div>
        <aside className="space-y-3">
          <div className="rounded-lg border bg-card p-4 text-sm">
            <h3 className="mb-2 font-display text-lg font-bold">Summary</h3>
            <div className="flex justify-between"><span>Total</span><b>{fmtMoney(t.total, s.currency.main)}</b></div>
            <div className="flex justify-between"><span>Paid</span><b className="text-success">{fmtMoney(t.paid, s.currency.main)}</b></div>
            <div className="flex justify-between"><span>Balance</span><b className="text-primary">{fmtMoney(t.balance, s.currency.main)}</b></div>
          </div>
          <div className="rounded-lg border bg-card p-4 text-sm">
            <h3 className="mb-2 font-display text-lg font-bold">Payments</h3>
            {inv.payments.length === 0 ? <p className="text-muted-foreground">No payments yet.</p> : inv.payments.map((p) => (
              <div key={p.id} className="flex justify-between border-b py-1 last:border-0"><span>{p.date} · {p.method}</span><b>{fmtMoney(toCents(p.amount))}</b></div>
            ))}
          </div>
          <div className="rounded-lg border bg-card p-4 text-sm">
            <h3 className="mb-2 font-display text-lg font-bold">Tracking</h3>
            {inv.packages.map((p, i) => <div key={p.id} className="py-0.5">{i + 1}. {p.trackingNumber || "—"} <span className="text-muted-foreground">{p.description}</span></div>)}
          </div>
        </aside>
      </div>

      {/* Off-screen full-size copy used for PDF + printing */}
      <div style={{ position: "fixed", left: -10000, top: 0 }} aria-hidden>
        <InvoiceDocument ref={docRef} invoice={inv} business={s.business} currency={s.currency} design={design} printable />
      </div>

      <PaymentDialog open={payOpen} onOpenChange={setPayOpen} methods={s.paymentMethods} balance={t.balance} onSave={(p) => { recordPayment(inv.id, p); toast.success("Payment recorded"); }} />
      <EmailDialog open={mailOpen} onOpenChange={setMailOpen} defaultTo={inv.customer.email} subject={fillTemplate(s.messaging.emailSubject, messageVars(inv, s))} body={fillTemplate(s.messaging.emailBody, messageVars(inv, s))}
        onSend={async (to, subject, body) => {
          const blob = await makePdf();
          const file = new File([blob], pdfFilename(inv), { type: "application/pdf" });
          logActivity(`Email prepared for ${to}`, inv.number);
          if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
            try { await navigator.share({ files: [file], title: subject, text: body }); return; } catch (e) { if ((e as DOMException).name === "AbortError") return; }
          }
          downloadBlob(blob, file.name);
          window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          toast.info("PDF downloaded — attach it to the email that just opened.");
        }} />
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel / void {inv.number}?</DialogTitle></DialogHeader>
          <CancelForm onConfirm={(r) => { cancelInvoice(inv.id, r); setCancelOpen(false); toast.success("Invoice cancelled"); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CancelForm({ onConfirm }: { onConfirm: (r: string) => void }) {
  const [r, setR] = useState("");
  return (
    <>
      <p className="text-sm text-muted-foreground">The invoice is kept in history and marked as cancelled. Its number is never reused.</p>
      <Label>Reason</Label>
      <Input value={r} onChange={(e) => setR(e.target.value)} maxLength={200} />
      <DialogFooter><Button variant="destructive" onClick={() => onConfirm(r)}>Cancel invoice</Button></DialogFooter>
    </>
  );
}

function PaymentDialog({ open, onOpenChange, methods, balance, onSave }: { open: boolean; onOpenChange: (o: boolean) => void; methods: string[]; balance: number; onSave: (p: { id: string; date: string; method: string; amount: string }) => void }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(methods[0] ?? "Cash");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [err, setErr] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
        <p className="text-sm">Remaining balance: <b>{fmtMoney(balance)}</b></p>
        <div className="grid gap-3">
          <div><Label>Amount</Label><div className="flex gap-2"><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(",", "."))} /><Button variant="outline" onClick={() => setAmount((balance / 100).toFixed(2))}>Full</Button></div></div>
          <div><Label>Method</Label><select value={method} onChange={(e) => setMethod(e.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm">{methods.map((m) => <option key={m}>{m}</option>)}</select></div>
          <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
        <DialogFooter>
          <Button onClick={() => {
            const c = toCents(amount);
            if (!isValidNumber(amount, false) || !c || c <= 0) return setErr("Enter an amount above 0");
            if (c > balance) return setErr(`Amount cannot exceed the balance of ${fmtMoney(balance)}`);
            onSave({ id: uid(), date, method, amount }); setAmount(""); setErr(""); onOpenChange(false);
          }}>Save payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmailDialog({ open, onOpenChange, defaultTo, subject, body, onSend }: { open: boolean; onOpenChange: (o: boolean) => void; defaultTo: string; subject: string; body: string; onSend: (to: string, s: string, b: string) => Promise<void> }) {
  const [to, setTo] = useState(defaultTo);
  const [sub, setSub] = useState(subject);
  const [msg, setMsg] = useState(body);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Email invoice</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>To</Label><Input type="email" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div><Label>Subject</Label><Input value={sub} onChange={(e) => setSub(e.target.value)} /></div>
          <div><Label>Message</Label><Textarea rows={6} value={msg} onChange={(e) => setMsg(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">The PDF is created automatically. On phones it is attached via the share menu; on computers it downloads so you can attach it to the email that opens.</p>
        </div>
        <DialogFooter>
          <Button disabled={busy} onClick={async () => {
            if (!/^\S+@\S+\.\S+$/.test(to)) return toast.error("Enter a valid email address");
            setBusy(true); try { await onSend(to, sub, msg); onOpenChange(false); } catch (e) { console.error(e); toast.error("Could not prepare email"); } setBusy(false);
          }}>{busy ? "Preparing…" : "Send"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
