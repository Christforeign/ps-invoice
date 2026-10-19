import { useEffect, useRef, useState } from "react";
import { InvoiceDocument } from "./InvoiceDocument";
import type { ComponentProps } from "react";

/** Scales the fixed-width A4 invoice to fit its container (phones included). */
export function InvoicePreview(props: ComponentProps<typeof InvoiceDocument>) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [h, setH] = useState(1123);
  const inner = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const sc = Math.min(1, el.clientWidth / 794);
      setScale(sc);
      setH((inner.current?.offsetHeight ?? 1123) * sc);
    });
    ro.observe(el);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="w-full overflow-hidden" style={{ height: h }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 794 }} className="shadow-lg">
        <InvoiceDocument ref={inner} {...props} printable={false} />
      </div>
    </div>
  );
}

export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}
