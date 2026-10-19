import { createFileRoute, Link } from "@tanstack/react-router";
import { PageTitle } from "@/components/AppShell";
import { InvoiceEditor } from "@/components/InvoiceEditor";
import { useHydrated } from "@/components/InvoicePreview";
import { useDB } from "@/lib/store";

export const Route = createFileRoute("/edit/$id")({
  head: () => ({
    meta: [
      { title: "Edit Invoice · Prime Shipping" },
      { name: "description", content: "Edit a saved Prime Shipping invoice." },
      { property: "og:title", content: "Edit Prime Shipping Invoice" },
      { property: "og:description", content: "Edit a saved Prime Shipping invoice." },
    ],
  }),
  component: EditInvoice,
});

function EditInvoice() {
  const { id } = Route.useParams();
  const db = useDB();
  const hydrated = useHydrated();
  const inv = db.invoices.find((i) => i.id === id);
  if (!hydrated) return <p className="text-muted-foreground">Loading…</p>;
  if (!inv) return <p>Invoice not found. <Link to="/invoices" className="text-primary">Back to history</Link></p>;
  if (inv.cancelled) return <p>This invoice is cancelled and cannot be edited. <Link to="/invoices/$id" params={{ id }} className="text-primary">View invoice</Link></p>;
  return (
    <div>
      <PageTitle title={`Edit ${inv.number}`} />
      <InvoiceEditor key={inv.id} existing={inv} />
    </div>
  );
}
