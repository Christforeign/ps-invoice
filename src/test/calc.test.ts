import { describe, expect, it } from "vitest";
import { calcTotals, shippingCents, toHtgCents, formatInvoiceNumber, type PackageLine } from "@/lib/calc";

const line = (o: Partial<PackageLine>): PackageLine => ({
  id: "1", trackingNumber: "", description: "", itemName: "", quantity: "1", weight: "0",
  weightUnit: "lb", rate: "0", customs: "", serviceFee: "", discount: "", notes: "", ...o,
});

describe("invoice math", () => {
  it("2.5 lb at $5.80/lb = $14.50", () => expect(shippingCents("2.5", "lb", "5.80")).toBe(1450));
  it("3 lb at $5.80/lb = $17.40", () => expect(shippingCents("3", "lb", "5.80")).toBe(1740));
  it("total 150, paid 50 leaves 100 and is partially paid", () => {
    const t = calcTotals([line({ customs: "150" })], [{ id: "a", date: "", method: "Cash", amount: "50" }], 0, false);
    expect(t.balance).toBe(10000);
    expect(t.status).toBe("PARTIALLY_PAID");
  });
  it("split payments 50+50+50 on 150 is paid", () => {
    const pays = ["50", "50", "50"].map((amount, i) => ({ id: String(i), date: "", method: "Cash", amount }));
    expect(calcTotals([line({ customs: "150" })], pays, 0, false).status).toBe("PAID");
  });
  it("zero paid is unpaid", () => expect(calcTotals([line({ customs: "10" })], [], 0, false).status).toBe("UNPAID"));
  it("HTG at 132.50", () => expect(toHtgCents(10000, "132.50")).toBe(1325000));
  it("formats INV-PS0001", () => expect(formatInvoiceNumber("INV-PS", 1, 4)).toBe("INV-PS0001"));
});
