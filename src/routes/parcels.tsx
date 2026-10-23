import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageTitle } from "@/components/AppShell";
import { useDB, saveParcel, invoiceParcel, uid, PARCEL_STATUSES, type Parcel } from "@/lib/store";

export const Route = createFileRoute("/parcels")({
  head: () => ({
    meta: [
      { title: "Colis · Prime Shipping" },
      { name: "description", content: "Inventaire des colis reçus, suivi du transit et facturation Prime Shipping." },
      { property: "og:title", content: "Inventaire des colis · Prime Shipping" },
      { property: "og:description", content: "Suivi des colis de l'expéditeur au destinataire avec facture liée." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Parcels,
});

function blank(rate: string): Parcel {
  const now = new Date().toISOString();
  return { id: uid(), tracking: "", sender: "", recipient: "", phone: "", origin: "Miami, USA", destination: "Jacmel, Haïti", carrier: "", description: "", weight: "", rate, status: "Reçu à Miami", receivedAt: now.slice(0, 10), updatedAt: now, history: [] };
}

const FIELDS: [keyof Parcel, string][] = [
  ["tracking", "Tracking *"], ["sender", "Expéditeur (de) *"], ["recipient", "Destinataire (pour) *"], ["phone", "Téléphone destinataire"],
  ["origin", "Origine *"], ["destination", "Destination *"], ["carrier", "Transporteur"], ["description", "Description"],
  ["weight", "Poids (lb)"], ["rate", "Tarif ($/lb)"], ["receivedAt", "Date de réception"],
];

function Parcels() {
  const db = useDB();
  const nav = useNavigate();
  const [edit, setEdit] = useState<Parcel | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const list = db.parcels.filter((p) => (!filter || p.status === filter) && [p.tracking, p.sender, p.recipient, p.phone].join(" ").toLowerCase().includes(q.toLowerCase()));

  const save = () => {
    try { saveParcel(edit!); toast.success("Colis enregistré"); setEdit(null); } catch (e) { toast.error((e as Error).message); }
  };
  const bill = (p: Parcel) => {
    try { const inv = invoiceParcel(p.id); nav({ to: "/invoices/$id", params: { id: inv.id } }); } catch (e) { toast.error((e as Error).message); }
  };
  const input = "w-full rounded-md border bg-background px-3 py-2 text-sm";

  return (
    <div className="space-y-4">
      <PageTitle title="Inventaire des colis" />
      <div className="flex flex-wrap gap-2">
        <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" onClick={() => setEdit(blank(db.settings.currency.defaultRate))}>+ Recevoir un colis</button>
        <input className={`${input} max-w-xs`} placeholder="Rechercher tracking, nom, téléphone" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${input} max-w-[200px]`} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Tous les statuts</option>
          {PARCEL_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {PARCEL_STATUSES.map((s) => <div key={s} className="rounded-lg border bg-card p-3 text-sm"><div className="text-muted-foreground">{s}</div><div className="text-xl font-bold">{db.parcels.filter((p) => p.status === s).length}</div></div>)}
      </div>

      {edit && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map(([k, l]) => (
              <label key={k} className="text-sm">{l}
                <input className={input} type={k === "receivedAt" ? "date" : "text"} inputMode={k === "weight" || k === "rate" ? "decimal" : undefined} value={String(edit[k] ?? "")} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />
              </label>
            ))}
            <label className="text-sm">Statut
              <select className={input} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as Parcel["status"] })}>
                {PARCEL_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
          </div>
          {edit.history.length > 0 && <ul className="text-xs text-muted-foreground">{edit.history.map((h, i) => <li key={i}>{new Date(h.at).toLocaleString()} — {h.status}</li>)}</ul>}
          <div className="flex gap-2">
            <button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" onClick={save}>Enregistrer</button>
            <button className="rounded-md border px-4 py-2 text-sm" onClick={() => setEdit(null)}>Annuler</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {list.length === 0 && <p className="text-sm text-muted-foreground">Aucun colis.</p>}
        {list.map((p) => {
          const inv = db.invoices.find((i) => i.id === p.invoiceId);
          return (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3 text-sm">
              <div>
                <div className="font-semibold">{p.tracking} <span className="ml-2 rounded bg-secondary px-2 py-0.5 text-xs">{p.status}</span></div>
                <div className="text-muted-foreground">De {p.sender} ({p.origin}) → Pour {p.recipient} ({p.destination}) · {p.weight || "?"} lb</div>
              </div>
              <div className="flex gap-2">
                <button className="rounded-md border px-3 py-1.5" onClick={() => setEdit(p)}>Modifier</button>
                <button className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground" onClick={() => bill(p)}>{inv ? `Voir ${inv.number}` : "Créer facture"}</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
