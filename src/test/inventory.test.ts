import { describe, it, expect, beforeEach } from "vitest";
import { adjustStock, getDB, replaceDB, defaultDB, upsertProduct, uid } from "@/lib/store";
import { mergeDB } from "@/lib/cloud";

describe("inventory stock", () => {
  beforeEach(() => replaceDB(defaultDB()));
  it("selling 1 lowers stock by 1 and never goes below 0", () => {
    const p = upsertProduct({ id: uid(), name: "Phone", sku: "", price: "10.00", stock: 1, lowStock: 0, notes: "", createdAt: "" });
    adjustStock(p.id, -1);
    expect(getDB().products[0]!.stock).toBe(0);
    adjustStock(p.id, -1);
    expect(getDB().products[0]!.stock).toBe(0);
    adjustStock(p.id, 1);
    expect(getDB().products[0]!.stock).toBe(1);
  });
});

describe("cloud merge keeps old invoices", () => {
  it("keeps invoices only on this device", () => {
    const cloud = defaultDB();
    const local = defaultDB();
    local.invoices = [{ id: "old1", number: "INV-PS0001" } as never];
    expect(mergeDB(cloud, local).invoices.map((i) => i.id)).toEqual(["old1"]);
  });
});

describe("POS sale", () => {
  beforeEach(() => replaceDB(defaultDB()));
  it("removes sold stock and keeps out-of-inventory items", async () => {
    const { recordSale, saleTotalCents } = await import("@/lib/store");
    const p = upsertProduct({ id: uid(), name: "Cable", sku: "", price: "5.00", stock: 3, lowStock: 0, notes: "", createdAt: "" });
    const s = recordSale({ lines: [{ productId: p.id, name: "Cable", price: "5.00", qty: 2 }, { name: "Box", price: "1.50", qty: 1 }], discount: "0.50", method: "Cash", received: "", customerName: "" });
    expect(getDB().products[0]!.stock).toBe(1);
    expect(saleTotalCents(s)).toBe(1100);
  });
});
