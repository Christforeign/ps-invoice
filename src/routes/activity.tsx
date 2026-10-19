import { createFileRoute } from "@tanstack/react-router";
import { PageTitle } from "@/components/AppShell";
import { useDB } from "@/lib/store";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity · Prime Shipping" },
      { name: "description", content: "History of invoice, payment and settings actions." },
      { property: "og:title", content: "Prime Shipping Activity" },
      { property: "og:description", content: "History of important actions." },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const db = useDB();
  return (
    <div>
      <PageTitle title="Activity History" />
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Date</th><th className="p-3">Time</th><th className="p-3">Action</th><th className="p-3">Reference</th></tr></thead>
          <tbody>
            {db.activity.map((a) => { const d = new Date(a.at); return (
              <tr key={a.id} className="border-t"><td className="whitespace-nowrap p-3">{d.toLocaleDateString()}</td><td className="whitespace-nowrap p-3">{d.toLocaleTimeString()}</td><td className="p-3">{a.action}</td><td className="p-3 font-medium">{a.ref}</td></tr>
            ); })}
            {db.activity.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No activity yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
