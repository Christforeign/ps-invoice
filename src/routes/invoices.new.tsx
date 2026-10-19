import { createFileRoute } from "@tanstack/react-router";
import { PageTitle } from "@/components/AppShell";
import { InvoiceEditor } from "@/components/InvoiceEditor";
import { useHydrated } from "@/components/InvoicePreview";

export const Route = createFileRoute("/invoices/new")({
  head: () => ({
    meta: [
      { title: "New Invoice · Prime Shipping" },
      { name: "description", content: "Create a new Prime Shipping invoice with automatic package calculations." },
      { property: "og:title", content: "New Prime Shipping Invoice" },
      { property: "og:description", content: "Fast invoice creation for Prime Shipping." },
    ],
  }),
  component: NewInvoice,
});

function NewInvoice() {
  const hydrated = useHydrated();
  return (
    <div>
      <PageTitle title="New Invoice" />
      {hydrated ? <InvoiceEditor /> : <p className="text-muted-foreground">Loading…</p>}
    </div>
  );
}
