import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageTitle } from "@/components/AppShell";
import { CustomerForm } from "@/components/CustomerForm";
import { invoiceTotals, useDB } from "@/lib/store";
import { fmtMoney } from "@/lib/calc";

export const Route = createFileRoute("/customers/")({
  head: () => ({
    meta: [
      { title: "Customers · Prime Shipping" },
      { name: "description", content: "Prime Shipping customer list with balances." },
      { property: "og:title", content: "Prime Shipping Customers" },
      { property: "og:description", content: "Saved customers, totals and balances." },
    ],
  }),
  component: Customers,
});

function Customers() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const rows = useMemo(() => {
    const s = q.toLowerCase();
    return db.customers
      .filter((c) => [c.name, c.company, c.phone, c.whatsapp, c.email].join(" ").toLowerCase().includes(s))
      .map((c) => {
        const invs = db.invoices.filter((i) => i.customerId === c.id && !i.cancelled).map(invoiceTotals);
        return { c, count: invs.length, total: invs.reduce((a, t) => a + t.total, 0), balance: invs.reduce((a, t) => a + t.balance, 0) };
      });
  }, [db, q]);
  return (
    <div>
      <PageTitle title="Customers"><Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add customer</Button></PageTitle>
      <Input className="mb-4" placeholder="Search name, company, phone, email…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ c, count, total, balance }) => (
          <Link key={c.id} to="/customers/$id" params={{ id: c.id }} className="rounded-lg border bg-card p-4 hover:border-primary">
            <div className="font-semibold">{c.name}</div>
            <div className="text-sm text-muted-foreground">{[c.company, c.phone, c.email].filter(Boolean).join(" · ")}</div>
            <div className="mt-2 flex justify-between text-sm"><span>{count} invoice(s) · {fmtMoney(total)}</span><span className={balance ? "font-semibold text-primary" : "text-success"}>Due {fmtMoney(balance)}</span></div>
          </Link>
        ))}
        {rows.length === 0 && <p className="text-muted-foreground">No customers yet. They are saved automatically when you create invoices.</p>}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>New customer</DialogTitle></DialogHeader><CustomerForm onDone={() => setOpen(false)} /></DialogContent>
      </Dialog>
    </div>
  );
}
