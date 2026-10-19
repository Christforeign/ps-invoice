import { fmtMoney } from "./calc";
import { fillTemplate, invoiceTotals, type Invoice, type Settings } from "./store";

export function pdfFilename(inv: Invoice) {
  return `${inv.number} - ${(inv.customer.name || "Client").replace(/[\\/:*?"<>|]/g, "")}.pdf`;
}

export async function renderPdf(el: HTMLElement): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff", windowWidth: 794 });
  const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const pageHpx = Math.floor((canvas.width * ph) / pw);
  for (let y = 0, page = 0; y < canvas.height - 8; y += pageHpx, page++) {
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = Math.min(pageHpx, canvas.height - y);
    slice.getContext("2d")!.drawImage(canvas, 0, y, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
    if (page > 0) pdf.addPage();
    pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pw, (slice.height * pw) / canvas.width);
  }
  return pdf.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function messageVars(inv: Invoice, s: Settings) {
  const t = invoiceTotals(inv);
  const cur = s.currency.main;
  return {
    name: inv.customer.name.split(" ")[0] || inv.customer.name,
    fullname: inv.customer.name,
    number: inv.number,
    total: `$${fmtMoney(t.total, "").trim()}`,
    paid: `$${fmtMoney(t.paid, "").trim()}`,
    balance: `$${fmtMoney(t.balance, "").trim()}`,
    currency: cur,
    business: s.business.name,
  };
}

export function whatsappUrl(inv: Invoice, s: Settings) {
  const phone = (inv.customer.whatsapp || inv.customer.phone || "").replace(/\D/g, "");
  const text = fillTemplate(s.messaging.whatsappTemplate, messageVars(inv, s));
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
