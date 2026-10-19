import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { emptyCustomer, uid, upsertCustomer, type Customer } from "@/lib/store";

export function CustomerForm({ initial, onDone }: { initial?: Customer; onDone: (c: Customer) => void }) {
  const [c, setC] = useState(initial ?? { ...emptyCustomer(), id: uid(), createdAt: new Date().toISOString() });
  const f = (k: keyof Customer, label: string, type = "text") => (
    <div><Label>{label}</Label><Input type={type} value={c[k]} maxLength={200} onChange={(e) => setC({ ...c, [k]: e.target.value })} /></div>
  );
  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => {
      e.preventDefault();
      if (!c.name.trim()) return toast.error("Name is required");
      if (c.email && !/^\S+@\S+\.\S+$/.test(c.email)) return toast.error("Invalid email");
      onDone(upsertCustomer(c)); toast.success("Customer saved");
    }}>
      {f("name", "Name *")}{f("company", "Company")}{f("phone", "Phone", "tel")}{f("whatsapp", "WhatsApp", "tel")}{f("email", "Email", "email")}{f("address", "Address")}{f("shippingAddress", "Shipping address")}{f("city", "City")}{f("country", "Country")}
      <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={c.notes} maxLength={1000} onChange={(e) => setC({ ...c, notes: e.target.value })} /></div>
      <Button type="submit" className="sm:col-span-2">Save customer</Button>
    </form>
  );
}
