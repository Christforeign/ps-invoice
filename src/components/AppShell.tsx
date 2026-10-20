import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { FileText, History, LayoutDashboard, Plus, Search, Settings, Users, Activity as ActivityIcon, LogOut, User, Package } from "lucide-react";
import { useDB, searchInvoices, invoiceTotals } from "@/lib/store";
import { fmtMoney } from "@/lib/calc";
import { StatusBadge } from "./StatusBadge";
import { useCloudSession, signOut } from "@/lib/cloud";
import { LoginForm } from "./LoginForm";
import { useHydrated } from "./InvoicePreview";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/invoices/new", label: "New Invoice", icon: Plus },
  { to: "/invoices", label: "History", icon: History },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/inventory", label: "Inventaire", icon: Package },
  { to: "/activity", label: "Activity", icon: ActivityIcon },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function GlobalSearch() {
  const db = useDB();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return { inv: [], cust: [] };
    return {
      inv: searchInvoices(db, s).slice(0, 6),
      cust: db.customers.filter((c) => [c.name, c.company, c.phone, c.whatsapp, c.email].join(" ").toLowerCase().includes(s)).slice(0, 4),
    };
  }, [q, db]);
  return (
    <div className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Search invoice #, customer, phone, tracking…"
        className="h-10 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      {open && q && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-lg">
          {results.inv.length === 0 && results.cust.length === 0 && <p className="p-3 text-sm text-muted-foreground">No results</p>}
          {results.inv.map((i) => {
            const s = q.trim().toLowerCase();
            const pkg = i.packages.find((p) => p.trackingNumber.toLowerCase().includes(s));
            return (
              <button key={i.id} onMouseDown={() => { nav({ to: "/invoices/$id", params: { id: i.id } }); setQ(""); }} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted">
                <span>
                  <span className="font-semibold">{i.number}</span> · {i.customer.name}
                  {pkg && <span className="block text-xs text-primary">Tracking {pkg.trackingNumber}</span>}
                </span>
                <span className="flex items-center gap-2"><span className="text-xs">{fmtMoney(invoiceTotals(i).total)}</span><StatusBadge status={invoiceTotals(i).status} /></span>
              </button>
            );
          })}
          {results.cust.map((c) => (
            <button key={c.id} onMouseDown={() => { nav({ to: "/customers/$id", params: { id: c.id } }); setQ(""); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted">
              <Users className="h-4 w-4 text-muted-foreground" /> {c.name} <span className="text-xs text-muted-foreground">{c.phone}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const db = useDB();
  const { session, status } = useCloudSession();
  const hydrated = useHydrated();
  const auth = { email: session?.user.email ?? "" };
  const logoutUser = () => void signOut();

  if (!hydrated || status === "loading" || status === "syncing") {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Chargement de vos données…</div>;
  }
  if (status === "signed_out") return <LoginForm />;
  if (status === "error") {
    return <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-sm text-muted-foreground"><p>Impossible de charger vos données en ligne.</p><button className="text-primary underline" onClick={() => location.reload()}>Réessayer</button></div>;
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pl-60">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-3 border-b border-sidebar-border p-4">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-card">
            <img src={db.settings.business.logo} alt="" className="h-full w-full object-contain" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-bold tracking-wide">{db.settings.business.name}</div>
            <div className="text-xs text-sidebar-foreground/60">Invoice System</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: n.to !== "/customers" }} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent" activeProps={{ className: "bg-sidebar-accent !text-sidebar-primary font-semibold" }}>
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-sidebar-foreground/90">{auth.email || "Utilisateur"}</div>
              <div className="text-[10px] text-sidebar-foreground/50">Sauvegardé en ligne</div>
            </div>
            <button
              type="button"
              onClick={() => logoutUser()}
              title="Déconnexion"
              className="rounded p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <Link to="/" className="flex shrink-0 items-center gap-2 md:hidden">
          <FileText className="h-5 w-5 text-primary" />
          <span className="font-display font-bold">PRIME</span>
        </Link>
        <GlobalSearch />
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {auth.email && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground border rounded-full px-2.5 py-1 bg-card">
              <User className="h-3.5 w-3.5 text-primary" />
              <span className="max-w-[140px] truncate">{auth.email}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => logoutUser()}
            title="Déconnexion"
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 md:p-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card md:hidden">
        {NAV.filter((n) => n.to !== "/activity" && n.to !== "/customers").map((n) => (
          <Link key={n.to} to={n.to} activeOptions={{ exact: true }} className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground" activeProps={{ className: "!text-primary font-semibold" }}>
            <n.icon className="h-5 w-5" /> {n.label.replace("New Invoice", "New")}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
