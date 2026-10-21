import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Minus, Pencil, Plus, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageTitle } from "@/components/AppShell";
import { fileToSmallImage } from "@/lib/receipt";
import { adjustStock, deleteProduct, uid, upsertProduct, useDB, type Product } from "@/lib/store";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventaire · Prime Shipping" },
      { name: "description", content: "Liste des produits disponibles, prix et stock de Prime Shipping." },
      { property: "og:title", content: "Inventaire Prime Shipping" },
      { property: "og:description", content: "Gérez vos produits, prix et quantités en stock." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Inventory,
});

const money = (v: string) => `$${(Number(v) || 0).toFixed(2)}`;

function emptyProduct(): Product {
  return { id: uid(), name: "", sku: "", price: "", stock: 0, lowStock: 2, notes: "", createdAt: new Date().toISOString() };
}

function ProductForm({ initial, onDone }: { initial: Product; onDone: () => void }) {
  const [p, setP] = useState(initial);
  const [stock, setStock] = useState(String(initial.stock));
  const save = () => {
    if (!p.name.trim()) return toast.error("Nom du produit requis");
    if (!/^\d+(\.\d{1,2})?$/.test(p.price.trim())) return toast.error("Prix invalide (ex: 12.50)");
    if (!/^\d+$/.test(stock.trim())) return toast.error("Quantité invalide (nombre entier)");
    upsertProduct({ ...p, name: p.name.trim(), price: p.price.trim(), stock: Number(stock) });
    toast.success("Produit enregistré");
    onDone();
  };
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3">
        {p.image ? <img src={p.image} alt={p.name} className="h-20 w-20 rounded-md border object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-md border text-xs text-muted-foreground">Pas d'image</div>}
        <div className="grid gap-1">
          <Label className="cursor-pointer rounded-md border px-3 py-2 text-sm hover:bg-muted">
            Choisir une image
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { setP({ ...p, image: await fileToSmallImage(f) }); } catch { toast.error("Image invalide"); } } }} />
          </Label>
          {p.image && <Button type="button" size="sm" variant="ghost" onClick={() => setP({ ...p, image: "" })}>Retirer l'image</Button>}
        </div>
      </div>
      <div><Label>Nom du produit *</Label><Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Référence</Label><Input value={p.sku} onChange={(e) => setP({ ...p, sku: e.target.value })} /></div>
        <div><Label>Prix (USD) *</Label><Input inputMode="decimal" value={p.price} onChange={(e) => setP({ ...p, price: e.target.value })} /></div>
        <div><Label>Quantité en stock</Label><Input inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} /></div>
        <div><Label>Alerte stock faible</Label><Input inputMode="numeric" value={String(p.lowStock)} onChange={(e) => setP({ ...p, lowStock: Math.max(0, parseInt(e.target.value) || 0) })} /></div>
      </div>
      <div><Label>Notes</Label><Textarea rows={2} value={p.notes} onChange={(e) => setP({ ...p, notes: e.target.value })} /></div>
      <Button onClick={save}>Enregistrer</Button>
    </div>
  );
}

function Inventory() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return db.products.filter((p) => !s || [p.name, p.sku, p.notes].join(" ").toLowerCase().includes(s));
  }, [db.products, q]);
  const totalUnits = db.products.reduce((a, p) => a + p.stock, 0);
  const totalValue = db.products.reduce((a, p) => a + Math.round((Number(p.price) || 0) * 100) * p.stock, 0) / 100;

  return (
    <div>
      <PageTitle title="Inventaire">
        <Button onClick={() => setEditing(emptyProduct())}><Plus className="mr-1 h-4 w-4" /> Nouveau produit</Button>
      </PageTitle>
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-3"><div className="text-xs text-muted-foreground">Produits</div><div className="text-xl font-bold">{db.products.length}</div></div>
        <div className="rounded-lg border bg-card p-3"><div className="text-xs text-muted-foreground">Unités en stock</div><div className="text-xl font-bold">{totalUnits}</div></div>
        <div className="rounded-lg border bg-card p-3"><div className="text-xs text-muted-foreground">Valeur du stock</div><div className="text-xl font-bold">${totalValue.toFixed(2)}</div></div>
      </div>
      <Input className="mb-4 max-w-sm" placeholder="Rechercher un produit…" value={q} onChange={(e) => setQ(e.target.value)} />
      {rows.length === 0 ? (
        <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">Aucun produit. Cliquez sur « Nouveau produit » pour commencer.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => {
            const low = p.stock <= p.lowStock;
            return (
              <div key={p.id} className="rounded-lg border bg-card p-4">
                {p.image && <img src={p.image} alt={p.name} className="mb-3 aspect-square w-full rounded-md object-cover" />}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{p.name}</div>
                    {p.sku && <div className="text-xs text-muted-foreground">Réf. {p.sku}</div>}
                  </div>
                  <div className="text-lg font-bold text-primary">{money(p.price)}</div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className={`flex items-center gap-1 text-sm ${p.stock === 0 ? "text-destructive" : low ? "text-primary" : "text-muted-foreground"}`}>
                    {low && <AlertTriangle className="h-4 w-4" />}
                    {p.stock === 0 ? "Rupture de stock" : `${p.stock} disponible${p.stock > 1 ? "s" : ""}`}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" aria-label="Retirer 1" disabled={p.stock === 0} onClick={() => adjustStock(p.id, -1, "vendu/retiré")}><Minus className="h-4 w-4" /></Button>
                    <span className="w-10 text-center text-lg font-bold">{p.stock}</span>
                    <Button size="icon" variant="outline" aria-label="Ajouter 1" onClick={() => adjustStock(p.id, 1, "ajouté")}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-1 border-t pt-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(p)}><Pencil className="mr-1 h-3.5 w-3.5" /> Modifier</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm(`Supprimer ${p.name} ?`)) deleteProduct(p.id); }}><Trash2 className="mr-1 h-3.5 w-3.5" /> Supprimer</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing && db.products.some((x) => x.id === editing.id) ? "Modifier le produit" : "Nouveau produit"}</DialogTitle></DialogHeader>
          {editing && <ProductForm key={editing.id} initial={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
