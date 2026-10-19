import type { InvoiceStatus } from "@/lib/calc";
import { cn } from "@/lib/utils";

const MAP: Record<InvoiceStatus, [string, string]> = {
  PAID: ["Paid", "bg-success/15 text-success"],
  PARTIALLY_PAID: ["Partially paid", "bg-warning/25 text-warning-foreground"],
  UNPAID: ["Unpaid", "bg-destructive/12 text-destructive"],
  CANCELLED: ["Cancelled", "bg-muted text-muted-foreground line-through"],
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const [label, cls] = MAP[status];
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold", cls)}>{label}</span>;
}
