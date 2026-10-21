import type { Business } from "./store";
import { saleTotalCents, type Sale } from "./store";

export type PrinterStyle = "58mm" | "80mm" | "A4";

/** Resize an uploaded photo to a small JPEG data URL so it syncs quickly. */
export function fileToSmallImage(file: File, max = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const sc = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * sc);
      c.height = Math.round(img.height * sc);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const m = (c: number) => `$${(c / 100).toFixed(2)}`;

export function receiptHtml(sale: Sale, business: Business, style: PrinterStyle): string {
  const width = style === "58mm" ? "58mm" : style === "80mm" ? "80mm" : "190mm";
  const fs = style === "58mm" ? 10 : style === "80mm" ? 12 : 14;
  const sub = sale.lines.reduce((a, l) => a + Math.round(Number(l.price) * 100) * l.qty, 0);
  const total = saleTotalCents(sale);
  const rec = Math.round(Number(sale.received || 0) * 100);
  const rows = sale.lines.map((l) => `<tr><td>${esc(l.name)}<br><small>${l.qty} × ${m(Math.round(Number(l.price) * 100))}</small></td><td class="r">${m(Math.round(Number(l.price) * 100) * l.qty)}</td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${sale.number}</title><style>
@page { size: ${style === "A4" ? "A4" : `${width} auto`}; margin: ${style === "A4" ? "12mm" : "2mm"}; }
body { margin: 0; font-family: ${style === "A4" ? "Arial, sans-serif" : "'Courier New', monospace"}; font-size: ${fs}px; color: #000; }
.w { width: ${width}; margin: 0 auto; } .c { text-align: center; } .r { text-align: right; white-space: nowrap; }
table { width: 100%; border-collapse: collapse; } td { padding: 3px 0; vertical-align: top; border-bottom: 1px dashed #999; }
.t td { border: 0; font-weight: bold; } h1 { font-size: ${fs * 1.4}px; margin: 0 0 4px; } img { max-width: 50%; }
</style></head><body><div class="w">
<div class="c">${business.logo ? `<img src="${business.logo}">` : ""}<h1>${esc(business.name)}</h1>
${[business.address, business.city, business.phone].filter(Boolean).map((x) => `<div>${esc(x)}</div>`).join("")}
<p>Reçu ${sale.number}<br>${new Date(sale.at).toLocaleString("fr-FR")}${sale.customerName ? `<br>Client: ${esc(sale.customerName)}` : ""}</p></div>
<table>${rows}</table>
<table class="t"><tr><td>Sous-total</td><td class="r">${m(sub)}</td></tr>
${sub !== total ? `<tr><td>Remise</td><td class="r">-${m(sub - total)}</td></tr>` : ""}
<tr><td>TOTAL</td><td class="r">${m(total)}</td></tr>
<tr><td>Payé (${esc(sale.method)})</td><td class="r">${m(rec || total)}</td></tr>
${rec > total ? `<tr><td>Monnaie</td><td class="r">${m(rec - total)}</td></tr>` : ""}</table>
<p class="c">${esc(business.footer || "Merci !")}</p></div>
<script>window.onload=()=>{setTimeout(()=>{window.print();},300)}</script></body></html>`;
}

/** Prints in a hidden frame so the page size matches the chosen printer (thermal or A4). */
export function printReceipt(sale: Sale, business: Business, style: PrinterStyle) {
  const f = document.createElement("iframe");
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(f);
  f.srcdoc = receiptHtml(sale, business, style);
  setTimeout(() => f.remove(), 60000);
}
