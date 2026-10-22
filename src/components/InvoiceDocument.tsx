import { forwardRef } from "react";
import { calcLine, calcTotals, fmtMoney, fmtWeight, toHtgCents } from "@/lib/calc";
import type { Business, CurrencySettings, Design, Invoice } from "@/lib/store";

interface Props {
  invoice: Pick<Invoice, "number" | "date" | "dueDate" | "customer" | "packages" | "payments" | "notes" | "paymentInfo" | "exchangeRate" | "taxEnabled" | "taxRate" | "cancelled">;
  business: Business;
  currency: CurrencySettings;
  design: Design;
  printable?: boolean;
}

/* Colors here come from the admin-configured invoice design, so they are applied inline. */
export const InvoiceDocument = forwardRef<HTMLDivElement, Props>(function InvoiceDocument({ invoice, business, currency, design, printable }, ref) {
  const L = design.labels;
  const S = design.show;
  const t = calcTotals(invoice.packages, invoice.payments, Number(invoice.taxRate) || 0, invoice.taxEnabled, invoice.cancelled);
  const main = currency.main || "USD";
  const sec = currency.secondary || "HTG";
  const showSec = S.secondaryCurrency && currency.showSecondary;
  const rate = invoice.exchangeRate || currency.rate;
  const rates = Array.from(new Set(invoice.packages.map((p) => p.rate).filter(Boolean)));
  const border = design.tableBorders ? `1px solid #e5e7eb` : "none";
  const fs = design.fontSize;
  const dateStr = invoice.date ? new Date(invoice.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";
  const statusColor = t.status === "PAID" ? "#15803d" : t.status === "PARTIALLY_PAID" ? "#b45309" : t.status === "CANCELLED" ? "#6b7280" : "#b91c1c";

  const cols: { key: string; label: string; align?: "right" | "center"; render: (i: number) => string }[] = [
    { key: "pkg", label: L.colPkg, render: (i) => String(i + 1) },
    { key: "tracking", label: L.colTracking, render: (i) => invoice.packages[i]!.kind === "item" ? (invoice.packages[i]!.unitPrice ? `${invoice.packages[i]!.quantity || 1} × ${invoice.packages[i]!.unitPrice}` : "—") : invoice.packages[i]!.trackingNumber || "—" },
  ];
  if (S.colDesc) cols.push({ key: "desc", label: L.colDesc, render: (i) => [invoice.packages[i]!.itemName, invoice.packages[i]!.description].filter(Boolean).join(" — ") || "—" });
  if (S.colQty) cols.push({ key: "qty", label: L.colQty, align: "center", render: (i) => invoice.packages[i]!.quantity || "1" });
  if (S.colCustoms) cols.push({ key: "customs", label: L.colCustoms, align: "right", render: (i) => { const c = calcLine(invoice.packages[i]!).customs; return c ? fmtMoney(c, "") : "—"; } });
  if (S.colService) cols.push({ key: "service", label: L.colService, align: "right", render: (i) => { const c = calcLine(invoice.packages[i]!).service; return c ? fmtMoney(c, "") : "—"; } });
  cols.push({ key: "weight", label: L.colWeight, align: "right", render: (i) => invoice.packages[i]!.kind === "item" ? "—" : fmtWeight(calcLine(invoice.packages[i]!).milliLb) });
  cols.push({ key: "ship", label: `${L.colShipping}${rates.length === 1 ? ` · ${rates[0]} ${main}/LB` : ""}`, align: "right", render: (i) => fmtMoney(calcLine(invoice.packages[i]!).shipping, main) });
  if (S.colTotal) cols.push({ key: "total", label: L.colTotal, align: "right", render: (i) => fmtMoney(calcLine(invoice.packages[i]!).total, main) });

  const totalsRow: Record<string, string> = {
    pkg: L.totals,
    customs: t.customs ? fmtMoney(t.customs, "") : "—",
    service: t.service ? fmtMoney(t.service, "") : "—",
    weight: fmtWeight(t.milliLb),
    ship: fmtMoney(t.shipping, main),
    total: fmtMoney(t.subtotal, main),
  };

  const logo = S.logo && business.logo ? <img src={business.logo} alt="logo" crossOrigin="anonymous" style={{ width: design.logoSize, maxHeight: design.logoSize, objectFit: "contain" }} /> : null;

  return (
    <div ref={ref} className={printable ? "print-area" : undefined} style={{ width: 794, minHeight: 1120, background: "#ffffff", color: design.text, fontFamily: `${design.font}, Arial, sans-serif`, fontSize: fs, padding: "28px 32px", boxSizing: "border-box", position: "relative", display: "flex", flexDirection: "column" }}>
      {invoice.cancelled && (
        <div style={{ position: "absolute", top: 420, left: 0, right: 0, textAlign: "center", fontSize: 110, fontWeight: 800, color: "rgba(185,28,28,0.12)", transform: "rotate(-20deg)", pointerEvents: "none" }}>{L.CANCELLED.toUpperCase()}</div>
      )}
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, paddingBottom: 18, borderBottom: "2px solid #eef0f2", flexDirection: design.logoPosition === "right" ? "row-reverse" : "row" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexDirection: design.logoPosition === "center" ? "column" : design.logoPosition === "right" ? "row-reverse" : "row", textAlign: design.logoPosition === "right" ? "right" : "left" }}>
          {logo}
          <div style={{ lineHeight: 1.5 }}>
            <div style={{ color: design.primary, fontWeight: 800, fontSize: fs * 2.1, letterSpacing: 0.5, lineHeight: 1.2, marginBottom: 6 }}>{business.name}</div>
            {S.businessAddress && <>{business.address && <div style={{ fontWeight: 500 }}>{business.address}</div>}{business.city && <div style={{ fontWeight: 500 }}>{business.city}</div>}{business.country && <div style={{ fontWeight: 500 }}>{business.country}</div>}</>}
            {S.businessContact && business.phone && <div style={{ fontWeight: 600 }}>Contact: {business.phone}</div>}
            {S.businessContact && business.whatsapp && business.whatsapp !== business.phone && <div style={{ fontWeight: 600 }}>WhatsApp: {business.whatsapp}</div>}
            {S.businessEmail && (business.email || business.website) && <div>{[business.email, business.website].filter(Boolean).join(" · ")}</div>}
            {S.taxId && business.taxId && <div>NIF: {business.taxId}</div>}
          </div>
        </div>
        <div style={{ textAlign: design.logoPosition === "right" ? "left" : "right", lineHeight: 1.7, flexShrink: 0 }}>
          <div style={{ color: design.primary, fontWeight: 800, fontSize: fs * 1.55 }}>{L.title}</div>
          <div style={{ color: "#555", fontWeight: 700, fontSize: fs * 1.2 }}>N° {invoice.number}</div>
          <div style={{ color: "#888" }}>{dateStr}</div>
          {S.dueDate && invoice.dueDate && <div style={{ color: "#888" }}>{L.due}: {new Date(invoice.dueDate + "T12:00:00").toLocaleDateString("fr-FR")}</div>}
          <div style={{ color: statusColor, fontWeight: 600 }}>{L[t.status]}</div>
        </div>
      </div>

      {/* Bill to / shipment */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "22px 0 18px" }}>
        <div style={{ lineHeight: 1.6 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{L.billTo}</div>
          <div style={{ fontSize: fs * 1.4, fontWeight: 700, color: "#444" }}>{L.name}: {invoice.customer.name || "—"}</div>
          {S.customerCompany && invoice.customer.company && <div style={{ fontWeight: 600 }}>{invoice.customer.company}</div>}
          {S.customerPhone && <div><b>{L.phone}:</b> {invoice.customer.phone || invoice.customer.whatsapp || "—"}</div>}
          {S.customerEmail && <div><b>{L.email}:</b> {invoice.customer.email || "—"}</div>}
          {S.customerAddress && invoice.customer.address && <div>{invoice.customer.address}{invoice.customer.city ? `, ${invoice.customer.city}` : ""}</div>}
        </div>
        <div style={{ textAlign: "right", lineHeight: 1.7 }}>
          <div style={{ color: "#888", fontWeight: 600 }}>{L.shipDetails}</div>
          <div style={{ fontWeight: 700, fontSize: fs * 1.2, color: "#444" }}>{invoice.packages.length} colis • {fmtWeight(t.milliLb)}</div>
          <div style={{ color: "#888" }}>{rates.length ? `${rates.join(" / ")} ${main}/lb` : ""} · Facturation {main}</div>
        </div>
      </div>

      {/* Packages: only actual rows */}
      {invoice.packages.filter((p) => p.shipment).map((p) => <div key={`shipment-${p.id}`} className="mb-3 border-b pb-2 text-sm"><b>{p.trackingNumber}</b> · {p.shipment?.status}<br />De : {p.shipment?.sender} ({p.shipment?.origin}) → Pour : {p.shipment?.recipient} ({p.shipment?.destination}){p.shipment?.carrier && <span> · {p.shipment.carrier}</span>}</div>)}
      <div style={{ fontWeight: 700, fontSize: fs * 1.35, marginBottom: 8 }}>{L.packagesTitle}</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: design.headerBg }}>
            {cols.map((c) => <th key={c.key} style={{ textAlign: c.align ?? "left", padding: "11px 8px", fontWeight: 700, fontSize: fs * 0.95 }}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {invoice.packages.map((p, i) => (
            <tr key={p.id} style={{ borderBottom: border }}>
              {cols.map((c) => (
                <td key={c.key} style={{ textAlign: c.align ?? "left", padding: "10px 8px", fontWeight: c.key === "pkg" || c.key === "tracking" || c.key === "ship" || c.key === "weight" ? 600 : 400, verticalAlign: "top" }}>
                  {c.render(i)}
                  {c.key === "tracking" && S.packageNotes && p.notes && <div style={{ fontSize: fs * 0.8, color: "#888", fontWeight: 400 }}>{p.notes}</div>}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            {cols.map((c) => <td key={c.key} style={{ textAlign: c.align ?? "left", padding: "12px 8px", fontWeight: 700 }}>{totalsRow[c.key] ?? ""}</td>)}
          </tr>
        </tbody>
      </table>

      {/* Bottom */}
      <div style={{ display: "flex", gap: 20, marginTop: 22, alignItems: "flex-start" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          {S.notes && invoice.notes && (
            <div style={{ background: "#fffbea", borderLeft: `6px solid ${design.highlight === "#F28C1B" ? "#facc15" : design.highlight}`, padding: "16px 20px", fontWeight: 500, whiteSpace: "pre-wrap" }}>{invoice.notes}</div>
          )}
          {S.paymentInstructions && (invoice.paymentInfo || business.paymentInstructions) && (
            <div style={{ background: "#f6f7f9", borderLeft: `6px solid ${design.accent}`, padding: "12px 18px", whiteSpace: "pre-wrap", fontSize: fs * 0.92 }}>{invoice.paymentInfo || business.paymentInstructions}</div>
          )}
          {S.paymentHistory && (
            <div style={{ background: "#f3f5fb", borderLeft: "6px solid #facc15", padding: "16px 20px" }}>
              <div style={{ fontWeight: 600, fontSize: fs * 1.3, color: "#555", marginBottom: 8 }}>{L.paymentHistory}</div>
              {invoice.payments.length === 0 ? (
                <div style={{ color: "#999", fontSize: fs * 0.88 }}>{L.noPayments}</div>
              ) : (
                invoice.payments.map((p) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: fs * 0.92, padding: "3px 0" }}>
                    <span>{p.date} · {p.method}</span>
                    <b>{fmtMoney(Math.round(Number(p.amount) * 100), main)}</b>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <div style={{ width: 340, lineHeight: 1.6 }}>
          <Row label={`${L.subtotal}:`} value={fmtMoney(t.shipping + t.customs, main)} muted />
          <Row label={`${L.serviceFees}:`} value={fmtMoney(t.service, main)} muted />
          {t.discount > 0 && <Row label={`${L.discount}:`} value={`-${fmtMoney(t.discount, main)}`} muted />}
          {invoice.taxEnabled && <Row label={`${L.tax} (${invoice.taxRate}%):`} value={fmtMoney(t.tax, main)} muted />}
          <div style={{ height: 3, background: design.accent, margin: "8px 0 14px" }} />
          <Row label={L.totalMain} value={fmtMoney(t.total, main)} big color="#444" />
          {showSec && <Row label={L.totalSecondary} value={fmtMoney(toHtgCents(t.total, rate), sec)} big color={design.accent} />}
          <Row label={L.paid} value={fmtMoney(t.paid, main)} muted />
          <div style={{ background: design.highlight, borderLeft: "6px solid #c9a227", color: "#fff", padding: "16px 26px", marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 700 }}>
              <span>{L.balance}</span><span style={{ fontSize: fs * 1.5 }}>{fmtMoney(t.balance, main)}</span>
            </div>
            {showSec && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 700, marginTop: 12 }}>
                <span>{L.balanceSecondary}</span><span style={{ fontSize: fs * 1.2 }}>{fmtMoney(toHtgCents(t.balance, rate), sec)}</span>
              </div>
            )}
          </div>
          {showSec && <div style={{ fontSize: fs * 0.75, color: "#999", textAlign: "right", marginTop: 4 }}>1 {main} = {rate} {sec}</div>}
        </div>
      </div>

      <div style={{ flex: 1 }} />
      {S.footer && business.footer && <div style={{ textAlign: "center", fontWeight: 700, fontSize: fs * 0.85, paddingTop: 30 }}>{business.footer}</div>}
    </div>
  );
});

function Row({ label, value, muted, big, color }: { label: string; value: string; muted?: boolean; big?: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: big ? "8px 0" : "3px 0", color: muted ? "#9aa0a6" : color, fontWeight: big ? 600 : 500, fontSize: big ? "1.3em" : "0.95em" }}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
