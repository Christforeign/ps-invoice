import { useEffect, useRef, useState } from "react";
import type { Activity } from "./store";

const FLAG = "ps-notify";

export type NotifyState = "unsupported" | "iframe" | "off" | "on" | "denied";

export function notifyState(): NotifyState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "granted" && localStorage.getItem(FLAG) === "1") return "on";
  if (window.top !== window.self) return "iframe";
  return "off";
}

/** Must be called from a click: browsers only ask permission after a user action. */
export async function enableNotifications(): Promise<NotifyState> {
  if (!("Notification" in window)) return "unsupported";
  if (window.top !== window.self) return "iframe";
  const p = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (p !== "granted") return "denied";
  localStorage.setItem(FLAG, "1");
  show("Notifications activées", "Vous serez alerté des ventes, factures, paiements et colis.");
  return "on";
}

export function disableNotifications() { localStorage.removeItem(FLAG); }

function show(title: string, body: string) {
  try {
    const n = new Notification(title, { body, icon: "/favicon.png", tag: `${title}${body}` });
    n.onclick = () => { window.focus(); n.close(); };
  } catch { /* some mobiles only allow notifications from an installed app */ }
}

/** Shows a system notification for every new activity (this device or synced from another). */
export function useActivityNotifications(activity: Activity[], ready: boolean) {
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!ready) return;
    if (!seen.current) { seen.current = new Set(activity.map((a) => a.id)); return; }
    const fresh = activity.filter((a) => !seen.current!.has(a.id));
    fresh.forEach((a) => seen.current!.add(a.id));
    if (notifyState() !== "on" || fresh.length === 0) return;
    if (fresh.length > 3) show("Prime Shipping", `${fresh.length} nouvelles activités`);
    else fresh.reverse().forEach((a) => show(`Prime Shipping · ${a.action}`, a.ref));
  }, [activity, ready]);
}

export function useNotifyState() {
  const [s, setS] = useState<NotifyState>("off");
  useEffect(() => setS(notifyState()), []);
  return [s, setS] as const;
}
