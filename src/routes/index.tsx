import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { FileText, Plus, Settings, Users, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { invoiceTotals, useDB } from "@/lib/store";
import { fmtMoney } from "@/lib/calc";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Prime Shipping Invoices" },
      { name: "description", content: "Prime Shipping invoice dashboard: totals, balances and recent invoices." },
      { property: "og:title", content: "Prime Shipping Invoice Dashboard" },
      { property: "og:description", content: "Create and manage Prime Shipping invoices." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const db = useDB();
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const active = db.invoices.filter((i) => !i.cancelled);
    const s = { count: db.invoices.length, today: 0, total: 0, paid: 0, balance: 0, PAID: 0, PARTIALLY_PAID: 0, UNPAID: 0 };
    for (const i of active) {
      const t = invoiceTotals(i);
      if (i.date === today) s.today++;
      s.total += t.total; s.paid += t.paid; s.balance += t.balance;
      s[t.status as "PAID"]++;
    }
    return s;
  }, [db.invoices]);
  const cur = db.settings.currency.main;

  return (
    <div>
      <PageTitle title="Dashboard">
        <Button asChild size="lg"><Link to="/invoices/new"><Plus className="h-4 w-4" /> New Invoice</Link></Button>
      </PageTitle>
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { to: "/invoices/new", label: "+ New Invoice", icon: Plus },
          { to: "/customers", label: "Customers", icon: Users },
          { to: "/invoices", label: "Invoice History", icon: History },
          { to: "/settings", label: "Settings", icon: Settings },
        ].map((q) => (
          <Link key={q.to} to={q.to} className="flex items-center gap-2 rounded-lg border bg-card p-3 font-semibold hover:border-primary hover:text-primary">
            <q.icon className="h-5 w-5 text-primary" /> {q.label}
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total invoices" value={String(stats.count)} />
        <Stat label="Today's invoices" value={String(stats.today)} />
        <Stat label="Total invoiced" value={fmtMoney(stats.total, cur)} />
        <Stat label="Total paid" value={fmtMoney(stats.paid, cur)} tone="success" />
        <Stat label="Outstanding balance" value={fmtMoney(stats.balance, cur)} tone="primary" />
        <Stat label="Paid invoices" value={String(stats.PAID)} />
        <Stat label="Partially paid" value={String(stats.PARTIALLY_PAID)} />
        <Stat label="Unpaid invoices" value={String(stats.UNPAID)} />
      </div>
      <div className="mt-6 rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-display text-xl font-bold">Recent invoices</h2>
          <Link to="/invoices" className="text-sm font-semibold text-primary">View all</Link>
        </div>
        {db.invoices.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <FileText className="mx-auto mb-2 h-10 w-10" />
            No invoices yet. <Link to="/invoices/new" className="font-semibold text-primary">Create your first invoice</Link>
          </div>
        ) : (
          <ul className="divide-y">
            {db.invoices.slice(0, 8).map((i) => {
              const t = invoiceTotals(i);
              return (
                <li key={i.id}>
                  <Link to="/invoices/$id" params={{ id: i.id }} className="flex items-center justify-between gap-3 p-4 hover:bg-muted">
                    <div>
                      <div className="font-semibold">{i.number} <span className="font-normal text-muted-foreground">· {i.customer.name}</span></div>
                      <div className="text-xs text-muted-foreground">{i.date} · {i.packages.length} package(s)</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{fmtMoney(t.total, cur)}</div>
                      <StatusBadge status={t.status} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "primary" }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-2xl font-bold ${tone === "success" ? "text-success" : tone === "primary" ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}
