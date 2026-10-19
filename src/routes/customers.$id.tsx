import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageTitle } from "@/components/AppShell";
import { CustomerForm } from "@/components/CustomerForm";
import { StatusBadge } from "@/components/StatusBadge";
import { useHydrated } from "@/components/InvoicePreview";
import { invoiceTotals, useDB } from "@/lib/store";
import { fmtMoney } from "@/lib/calc";

export const Route = createFileRoute("/customers/$id")({
  head: () => ({
    meta: [
      { title: "Customer · Prime Shipping" },
      { name: "description", content: "Customer details and invoice history." },
      { property: "og:title", content: "Prime Shipping Customer" },
      { property: "og:description", content: "Customer details and invoice history." },
    ],
  }),
  component: CustomerPage,
});

function CustomerPage() {
  const { id } = Route.useParams();
  const db = useDB();
  const hydrated = useHydrated();
  const [edit, setEdit] = useState(false);
  const c = db.customers.find((x) => x.id === id);
  if (!hydrated) return <p className="text-muted-foreground">Loading…</p>;
  if (!c) return <p>Customer not found. <Link to="/customers" className="text-primary">Back</Link></p>;
  const invs = db.invoices.filter((i) => i.customerId === id);
  const active = invs.filter((i) => !i.cancelled).map(invoiceTotals);
  const sum = (k: "total" | "paid" | "balance") => active.reduce((a, t) => a + t[k], 0);
  return (
    <div>
      <PageTitle title={c.name}><Button variant="outline" onClick={() => setEdit(true)}>Edit</Button></PageTitle>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4"><div className="text-xs uppercase text-muted-foreground">Total invoiced</div><div className="font-display text-2xl font-bold">{fmtMoney(sum("total"))}</div></div>
        <div className="rounded-lg border bg-card p-4"><div className="text-xs uppercase text-muted-foreground">Total paid</div><div className="font-display text-2xl font-bold text-success">{fmtMoney(sum("paid"))}</div></div>
        <div className="rounded-lg border bg-card p-4"><div className="text-xs uppercase text-muted-foreground">Outstanding</div><div className="font-display text-2xl font-bold text-primary">{fmtMoney(sum("balance"))}</div></div>
      </div>
      <div className="mb-4 rounded-lg border bg-card p-4 text-sm leading-relaxed">
        {c.company && <div><b>Company:</b> {c.company}</div>}
        <div><b>Phone:</b> {c.phone || "—"} · <b>WhatsApp:</b> {c.whatsapp || "—"}</div>
        <div><b>Email:</b> {c.email || "—"}</div>
        <div><b>Address:</b> {[c.address, c.city, c.country].filter(Boolean).join(", ") || "—"}</div>
        {c.notes && <div><b>Notes:</b> {c.notes}</div>}
      </div>
      <h2 className="mb-2 font-display text-xl font-bold">Invoice history</h2>
      <div className="divide-y rounded-lg border bg-card">
        {invs.map((i) => { const t = invoiceTotals(i); return (
          <Link key={i.id} to="/invoices/$id" params={{ id: i.id }} className="flex justify-between p-3 hover:bg-muted">
            <span><b>{i.number}</b> · {i.date}</span><span className="flex items-center gap-2">{fmtMoney(t.total)} <StatusBadge status={t.status} /></span>
          </Link>
        ); })}
        {invs.length === 0 && <p className="p-4 text-muted-foreground">No invoices yet.</p>}
      </div>
      <Dialog open={edit} onOpenChange={setEdit}>
        <DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Edit customer</DialogTitle></DialogHeader><CustomerForm initial={c} onDone={() => setEdit(false)} /></DialogContent>
      </Dialog>
    </div>
  );
}
