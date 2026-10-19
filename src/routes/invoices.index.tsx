import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTitle } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { invoiceTotals, searchInvoices, useDB } from "@/lib/store";
import { fmtMoney } from "@/lib/calc";

export const Route = createFileRoute("/invoices/")({
  head: () => ({
    meta: [
      { title: "Invoice History · Prime Shipping" },
      { name: "description", content: "Search and filter all Prime Shipping invoices." },
      { property: "og:title", content: "Prime Shipping Invoice History" },
      { property: "og:description", content: "Search invoices by number, customer, phone or tracking." },
    ],
  }),
  component: History,
});

const FILTERS = [["ALL", "All"], ["PAID", "Paid"], ["PARTIALLY_PAID", "Partially paid"], ["UNPAID", "Unpaid"], ["CANCELLED", "Cancelled"]] as const;

function History() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const rows = useMemo(
    () => searchInvoices(db, q).map((i) => ({ i, t: invoiceTotals(i) })).filter(({ i, t }) => (status === "ALL" || t.status === status) && (!from || i.date >= from) && (!to || i.date <= to)),
    [db, q, status, from, to],
  );
  const cur = db.settings.currency.main;
  return (
    <div>
      <PageTitle title="Invoice History"><Button asChild><Link to="/invoices/new"><Plus className="h-4 w-4" /> New Invoice</Link></Button></PageTitle>
      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Input placeholder="Invoice #, customer, phone, email, tracking, date…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(([k, l]) => (
          <button key={k} onClick={() => setStatus(k)} className={`rounded-full border px-3 py-1 text-sm ${status === k ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>{l}</button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Invoice</th><th className="p-3">Customer</th><th className="p-3">Date</th><th className="p-3 text-right">Total</th><th className="hidden p-3 text-right sm:table-cell">Paid</th><th className="p-3 text-right">Balance</th><th className="hidden p-3 md:table-cell">Method</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody>
            {rows.map(({ i, t }) => (
              <tr key={i.id} className="border-t hover:bg-muted/50">
                <td className="p-3 font-semibold"><Link to="/invoices/$id" params={{ id: i.id }} className="text-primary">{i.number}</Link></td>
                <td className="p-3">{i.customer.name}<div className="text-xs text-muted-foreground">{i.customer.phone}</div></td>
                <td className="whitespace-nowrap p-3">{i.date}</td>
                <td className="whitespace-nowrap p-3 text-right">{fmtMoney(t.total, cur)}</td>
                <td className="hidden whitespace-nowrap p-3 text-right sm:table-cell">{fmtMoney(t.paid, cur)}</td>
                <td className="whitespace-nowrap p-3 text-right font-semibold">{fmtMoney(t.balance, cur)}</td>
                <td className="hidden p-3 md:table-cell">{Array.from(new Set(i.payments.map((p) => p.method))).join(", ") || "—"}</td>
                <td className="p-3"><StatusBadge status={t.status} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No invoices found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
