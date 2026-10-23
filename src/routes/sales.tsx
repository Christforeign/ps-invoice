import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTitle } from "@/components/AppShell";
import { saleTotalCents, useDB } from "@/lib/store";
import { fmtMoney } from "@/lib/calc";
import { printReceipt, type PrinterStyle } from "@/lib/receipt";

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      { title: "Historique des ventes POS · Prime Shipping" },
      { name: "description", content: "Toutes les ventes de la caisse Prime Shipping, avec recherche et réimpression des reçus." },
      { property: "og:title", content: "Historique des ventes POS" },
      { property: "og:description", content: "Recherchez et réimprimez les reçus de la caisse." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Sales,
});

function Sales() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [method, setMethod] = useState("");
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return db.sales.filter((x) => {
      const d = x.at.slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (method && x.method !== method) return false;
      return !s || [x.number, x.customerName, ...x.lines.map((l) => l.name)].join(" ").toLowerCase().includes(s);
    });
  }, [db.sales, q, from, to, method]);
  const totals: Record<string, number> = {};
  rows.forEach((x) => { const c = x.currency ?? "USD"; totals[c] = (totals[c] ?? 0) + saleTotalCents(x); });
  const style = (typeof window !== "undefined" ? (localStorage.getItem("ps-printer") as PrinterStyle) : null) || "80mm";

  return (
    <div>
      <PageTitle title="Historique des ventes POS" />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Ticket, client, article…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Du" />
        <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Au" />
        <select value={method} onChange={(e) => setMethod(e.target.value)} className="h-9 rounded-md border border-input bg-card px-2 text-sm" aria-label="Paiement">
          <option value="">Tous paiements</option>
          {db.settings.paymentMethods.map((m) => <option key={m}>{m}</option>)}
        </select>
      </div>
      <div className="mb-4 rounded-lg border bg-card p-3 text-sm">
        <b>{rows.length}</b> vente(s) · Total : {Object.entries(totals).map(([c, v]) => fmtMoney(v, c)).join(" + ") || fmtMoney(0)}
      </div>
      {rows.length === 0 ? <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">Aucune vente trouvée.</p> : (
        <div className="divide-y rounded-lg border bg-card">
          {rows.map((x) => (
            <div key={x.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{x.number} <span className="text-xs font-normal text-muted-foreground">{new Date(x.at).toLocaleString("fr-FR")}</span></div>
                <div className="truncate text-xs text-muted-foreground">{x.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}{x.customerName ? ` · ${x.customerName}` : ""}</div>
              </div>
              <span className="text-xs text-muted-foreground">{x.method}</span>
              <b className="text-primary">{fmtMoney(saleTotalCents(x), x.currency ?? "USD")}</b>
              <Button size="sm" variant="outline" onClick={() => printReceipt(x, db.settings.business, style)}><Printer className="mr-1 h-3.5 w-3.5" /> Reçu</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
