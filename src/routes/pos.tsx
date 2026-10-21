import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, Printer, Trash2, ShoppingCart, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTitle } from "@/components/AppShell";
import { recordSale, saleTotalCents, useDB, type SaleLine } from "@/lib/store";
import { printReceipt, type PrinterStyle } from "@/lib/receipt";

export const Route = createFileRoute("/pos")({
  head: () => ({
    meta: [
      { title: "Caisse POS · Prime Shipping" },
      { name: "description", content: "Point de vente Prime Shipping : vendez des produits et imprimez des reçus." },
      { property: "og:title", content: "Caisse POS Prime Shipping" },
      { property: "og:description", content: "Vente rapide avec impression de reçus 58mm, 80mm ou A4." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pos,
});

const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const priceOk = (v: string) => /^\d+(\.\d{1,2})?$/.test(v.trim());

function Pos() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<SaleLine[]>([]);
  const [discount, setDiscount] = useState("");
  const [received, setReceived] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [method, setMethod] = useState(db.settings.paymentMethods[0] ?? "Cash");
  const [printer, setPrinter] = useState<PrinterStyle>("80mm");
  const [custom, setCustom] = useState({ name: "", price: "", qty: "1" });

  useEffect(() => { const v = localStorage.getItem("ps-printer"); if (v === "58mm" || v === "80mm" || v === "A4") setPrinter(v); }, []);
  const choosePrinter = (v: PrinterStyle) => { setPrinter(v); localStorage.setItem("ps-printer", v); };

  const products = useMemo(() => {
    const s = q.trim().toLowerCase();
    return db.products.filter((p) => !s || [p.name, p.sku].join(" ").toLowerCase().includes(s));
  }, [db.products, q]);

  const inCart = (id: string) => cart.filter((l) => l.productId === id).reduce((a, l) => a + l.qty, 0);
  const add = (id: string) => {
    const p = db.products.find((x) => x.id === id)!;
    if (inCart(id) >= p.stock) return toast.error(`Stock insuffisant pour ${p.name}`);
    setCart((c) => c.some((l) => l.productId === id) ? c.map((l) => l.productId === id ? { ...l, qty: l.qty + 1 } : l) : [...c, { productId: id, name: p.name, price: p.price, qty: 1 }]);
  };
  const changeQty = (i: number, d: number) => {
    const l = cart[i]!;
    if (d > 0 && l.productId) { const p = db.products.find((x) => x.id === l.productId); if (p && inCart(p.id) >= p.stock) return toast.error("Stock insuffisant"); }
    setCart((c) => c.map((x, j) => j === i ? { ...x, qty: x.qty + d } : x).filter((x) => x.qty > 0));
  };
  const addCustom = () => {
    if (!custom.name.trim()) return toast.error("Nom de l'article requis");
    if (!priceOk(custom.price)) return toast.error("Prix invalide (ex: 12.50)");
    const qty = parseInt(custom.qty) || 0;
    if (qty < 1) return toast.error("Quantité invalide");
    setCart((c) => [...c, { name: custom.name.trim(), price: custom.price.trim(), qty }]);
    setCustom({ name: "", price: "", qty: "1" });
  };

  const total = saleTotalCents({ lines: cart, discount });
  const rec = Math.round(Number(received || 0) * 100);

  const checkout = () => {
    if (cart.length === 0) return toast.error("Le panier est vide");
    if (discount && !priceOk(discount)) return toast.error("Remise invalide");
    if (received && !priceOk(received)) return toast.error("Montant reçu invalide");
    if (received && rec < total) return toast.error("Montant reçu inférieur au total");
    const sale = recordSale({ lines: cart, discount, method, received, customerName: customerName.trim() });
    printReceipt(sale, db.settings.business, printer);
    toast.success(`Vente ${sale.number} enregistrée`);
    setCart([]); setDiscount(""); setReceived(""); setCustomerName("");
  };

  return (
    <div>
      <PageTitle title="Caisse (POS)">
        <div className="flex items-center gap-2">
          <Printer className="h-4 w-4 text-muted-foreground" />
          <select aria-label="Imprimante" value={printer} onChange={(e) => choosePrinter(e.target.value as PrinterStyle)} className="h-9 rounded-md border border-input bg-card px-2 text-sm">
            <option value="58mm">Thermique 58 mm</option>
            <option value="80mm">Thermique 80 mm</option>
            <option value="A4">Imprimante A4 / Lettre</option>
          </select>
        </div>
      </PageTitle>
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div>
          <Input className="mb-3" placeholder="Rechercher un produit…" value={q} onChange={(e) => setQ(e.target.value)} />
          {products.length === 0 ? (
            <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">Aucun produit dans l'inventaire. Utilisez « Article hors inventaire ».</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <button key={p.id} onClick={() => add(p.id)} disabled={p.stock === 0} className="rounded-lg border bg-card p-2 text-left transition hover:border-primary disabled:opacity-50">
                  {p.image ? <img src={p.image} alt={p.name} className="mb-2 aspect-square w-full rounded object-cover" /> : <div className="mb-2 flex aspect-square w-full items-center justify-center rounded bg-muted text-2xl font-bold text-muted-foreground">{p.name.slice(0, 1).toUpperCase()}</div>}
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="flex justify-between text-xs"><span className="font-bold text-primary">${Number(p.price).toFixed(2)}</span><span className="text-muted-foreground">{p.stock === 0 ? "Rupture" : `${p.stock - inCart(p.id)} dispo`}</span></div>
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 rounded-lg border bg-card p-3">
            <div className="mb-2 flex items-center gap-2 font-semibold"><PackagePlus className="h-4 w-4" /> Article hors inventaire</div>
            <div className="grid grid-cols-[1fr_90px_60px] gap-2">
              <Input placeholder="Nom" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} maxLength={100} />
              <Input placeholder="Prix" inputMode="decimal" value={custom.price} onChange={(e) => setCustom({ ...custom, price: e.target.value })} />
              <Input placeholder="Qté" inputMode="numeric" value={custom.qty} onChange={(e) => setCustom({ ...custom, qty: e.target.value.replace(/\D/g, "") })} />
            </div>
            <Button variant="outline" className="mt-2 w-full" onClick={addCustom}><Plus className="mr-1 h-4 w-4" /> Ajouter au panier</Button>
          </div>
        </div>

        <div className="h-fit rounded-lg border bg-card p-4 lg:sticky lg:top-4">
          <div className="mb-3 flex items-center gap-2 text-lg font-bold"><ShoppingCart className="h-5 w-5" /> Panier</div>
          {cart.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Touchez un produit pour l'ajouter.</p> : (
            <div className="divide-y">
              {cart.map((l, i) => (
                <div key={i} className="flex items-center gap-2 py-2">
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{l.name}{!l.productId && <span className="ml-1 text-xs text-muted-foreground">(hors stock)</span>}</div><div className="text-xs text-muted-foreground">${Number(l.price).toFixed(2)}</div></div>
                  <Button size="icon" variant="outline" className="h-7 w-7" aria-label="Moins" onClick={() => changeQty(i, -1)}><Minus className="h-3 w-3" /></Button>
                  <span className="w-6 text-center text-sm font-bold">{l.qty}</span>
                  <Button size="icon" variant="outline" className="h-7 w-7" aria-label="Plus" onClick={() => changeQty(i, 1)}><Plus className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Retirer" onClick={() => setCart((c) => c.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 grid gap-2">
            <div><Label className="text-xs">Client (optionnel)</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} maxLength={100} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Remise ($)</Label><Input inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
              <div><Label className="text-xs">Paiement</Label>
                <select value={method} onChange={(e) => setMethod(e.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm">
                  {db.settings.paymentMethods.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div><Label className="text-xs">Montant reçu ($)</Label><Input inputMode="decimal" value={received} onChange={(e) => setReceived(e.target.value)} placeholder={(total / 100).toFixed(2)} /></div>
          </div>
          <div className="mt-3 flex justify-between text-xl font-bold"><span>Total</span><span className="text-primary">{money(total)}</span></div>
          {rec > total && <div className="flex justify-between text-sm"><span>Monnaie à rendre</span><b>{money(rec - total)}</b></div>}
          <Button className="mt-3 w-full" size="lg" onClick={checkout}><Printer className="mr-2 h-4 w-4" /> Encaisser et imprimer</Button>
          {db.sales.length > 0 && (
            <div className="mt-4 border-t pt-3">
              <div className="mb-1 text-xs font-semibold text-muted-foreground">Dernières ventes</div>
              {db.sales.slice(0, 5).map((s) => (
                <button key={s.id} onClick={() => printReceipt(s, db.settings.business, printer)} className="flex w-full justify-between py-1 text-sm hover:text-primary" title="Réimprimer">
                  <span>{s.number} · {new Date(s.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span><b>{money(saleTotalCents(s))}</b>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
