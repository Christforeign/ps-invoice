import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { getDB, normalize, replaceDB, setSyncHandler, hasLocalData, type DB } from "./store";

type Status = "loading" | "signed_out" | "syncing" | "ready" | "error";

function unionById<T extends { id: string }>(cloud: T[], local: T[]): T[] {
  const ids = new Set(cloud.map((x) => x.id));
  return [...cloud, ...local.filter((x) => !ids.has(x.id))];
}

/** Cloud copy wins; anything only on this device (e.g. old invoices) is kept too. */
export function mergeDB(cloud: DB, local: DB): DB {
  const merged: DB = {
    ...cloud,
    invoices: unionById(cloud.invoices, local.invoices),
    customers: unionById(cloud.customers, local.customers),
    products: unionById(cloud.products, local.products),
    sales: unionById(cloud.sales ?? [], local.sales ?? []).sort((a, b) => b.at.localeCompare(a.at)),
    parcels: unionById(cloud.parcels ?? [], local.parcels ?? []),
    closures: unionById(cloud.closures ?? [], local.closures ?? []),
    designs: unionById(cloud.designs, local.designs),
    activity: unionById(cloud.activity, local.activity)
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 2000),
  };
  const maxNext = Math.max(cloud.settings.numbering.next, local.settings.numbering.next);
  merged.settings = { ...cloud.settings, numbering: { ...cloud.settings.numbering, next: maxNext } };
  return merged;
}

let timer: ReturnType<typeof setTimeout> | null = null;
let pending: DB | null = null;
let lastSeen = "";
let poller: ReturnType<typeof setInterval> | null = null;

async function upload(userId: string, db: DB) {
  const at = new Date().toISOString();
  const { error } = await supabase
    .from("app_data")
    .upsert({ user_id: userId, data: db as unknown as Json, updated_at: at });
  if (error) console.error("Cloud save failed", error);
  else lastSeen = at;
}

/** Pulls changes made on other devices so they appear (and notify) here without reloading. */
async function pull(userId: string) {
  if (pending || document.visibilityState === "hidden" && !("Notification" in window)) return;
  const { data } = await supabase.from("app_data").select("data, updated_at").eq("user_id", userId).maybeSingle();
  if (!data || pending || !data.updated_at || data.updated_at <= lastSeen) return;
  lastSeen = data.updated_at;
  const cloudData = data.data as unknown as Partial<DB>;
  if (cloudData && Array.isArray(cloudData.invoices)) replaceDB(mergeDB(normalize(cloudData), getDB()));
}

async function startSync(userId: string) {
  const { data, error } = await supabase.from("app_data").select("data").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  const local = getDB();
  const cloudData = data?.data as unknown as Partial<DB> | undefined;
  let next: DB;
  if (cloudData && Array.isArray(cloudData.invoices)) {
    next = hasLocalData(local) ? mergeDB(normalize(cloudData), local) : normalize(cloudData);
  } else {
    next = local;
  }
  replaceDB(next);
  await upload(userId, getDB());
  if (poller) clearInterval(poller);
  poller = setInterval(() => void pull(userId).catch(() => {}), 20000);
  setSyncHandler((db) => {
    pending = db;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (pending) void upload(userId, pending);
      pending = null;
    }, 600);
  });
}

export function useCloudSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let syncedFor: string | null = null;
    const handle = (s: Session | null) => {
      setSession(s);
      if (!s) {
        syncedFor = null;
        setSyncHandler(null);
        if (poller) clearInterval(poller);
        poller = null;
        setStatus("signed_out");
        return;
      }
      if (syncedFor === s.user.id) return;
      syncedFor = s.user.id;
      setStatus("syncing");
      startSync(s.user.id)
        .then(() => setStatus("ready"))
        .catch((e) => {
          console.error(e);
          setStatus("error");
        });
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => handle(s));
    supabase.auth.getSession().then(({ data }) => handle(data.session));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, status };
}

export async function signOut() {
  if (pending && timer) {
    clearTimeout(timer);
    const { data } = await supabase.auth.getUser();
    if (data.user) await upload(data.user.id, pending);
    pending = null;
  }
  setSyncHandler(null);
  if (poller) clearInterval(poller);
  poller = null;
  await supabase.auth.signOut();
}
