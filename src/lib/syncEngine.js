/**
 * Konfliktfreier Echtzeit- & Offline-Sync zwischen Windows-PC und iPhone
 * über Supabase Free Tier:
 * - Unterstützt echten Google-Account-Login (OAuth 2.0 via Supabase Auth) mit Mehr-Profil-Trennung
 * - Unterstützt alternativ auch den schnellen Sync-Code ohne E-Mail-Anmeldung
 * - Lokal 100 % sofort ohne Account nutzbar!
 */

import { createClient } from "@supabase/supabase-js";
import { db } from "./db";

const clientCache = new Map();

export function getSupabaseClient(supabaseUrl, supabaseAnonKey) {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  const cacheKey = `${supabaseUrl.trim()}::${supabaseAnonKey.trim()}`;
  if (clientCache.has(cacheKey)) return clientCache.get(cacheKey);

  const isBrowser = typeof window !== "undefined";
  const client = createClient(supabaseUrl.trim(), supabaseAnonKey.trim(), {
    auth: {
      persistSession: isBrowser,
      autoRefreshToken: isBrowser,
      detectSessionInUrl: isBrowser,
    },
  });
  clientCache.set(cacheKey, client);
  return client;
}

export async function signInWithGoogleOAuth({ supabaseUrl, supabaseAnonKey }) {
  const client = getSupabaseClient(supabaseUrl, supabaseAnonKey);
  if (!client) {
    throw new Error(
      "Bitte trage zuerst einmalig deine kostenlose Supabase Project URL & Anon Key unter „Downloads & Sync“ ein (3-Minuten-Anleitung in SETUP_UND_LOGINS.md)."
    );
  }
  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : undefined;

  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) {
    throw new Error(`Google-Anmeldung fehlgeschlagen: ${error.message}`);
  }
  return data;
}

export async function getCurrentGoogleUser({ supabaseUrl, supabaseAnonKey }) {
  const client = getSupabaseClient(supabaseUrl, supabaseAnonKey);
  if (!client) return null;
  try {
    const { data } = await client.auth.getSession();
    const user = data?.session?.user;
    if (!user) return null;
    return {
      id: user.id,
      email: user.email || "",
      fullName: user.user_metadata?.full_name || user.email || "Google-Konto",
      avatarUrl: user.user_metadata?.avatar_url || "",
    };
  } catch {
    return null;
  }
}

export async function signOutGoogleAccount({ supabaseUrl, supabaseAnonKey }) {
  const client = getSupabaseClient(supabaseUrl, supabaseAnonKey);
  if (!client) return;
  await client.auth.signOut();
}

/**
 * Reine Merge-Funktion (Last-Write-Wins anhand von `updatedAt` bzw. `createdAt`),
 * deterministisch per Unit-Test prüfbar.
 */
export function mergeCollectionByTimestamp(localItems = [], remoteItems = [], idField = "id") {
  const mergedMap = new Map();

  const getTs = (item) => {
    const raw = item?.updatedAt || item?.createdAt || "1970-01-01T00:00:00.000Z";
    const t = new Date(raw).getTime();
    return Number.isNaN(t) ? 0 : t;
  };

  for (const loc of localItems) {
    const key = String(loc[idField]);
    mergedMap.set(key, { item: loc, source: "local", ts: getTs(loc) });
  }

  const toUpdateLocally = [];
  for (const rem of remoteItems) {
    const key = String(rem[idField]);
    const existing = mergedMap.get(key);
    const remTs = getTs(rem);
    if (!existing || remTs > existing.ts) {
      mergedMap.set(key, { item: rem, source: "remote", ts: remTs });
      toUpdateLocally.push(rem);
    }
  }

  const toPushRemotely = [];
  const remoteMap = new Map(remoteItems.map((r) => [String(r[idField]), getTs(r)]));
  for (const loc of localItems) {
    const key = String(loc[idField]);
    const locTs = getTs(loc);
    const remTs = remoteMap.get(key);
    if (remTs === undefined || locTs > remTs) {
      toPushRemotely.push(loc);
    }
  }

  return {
    merged: Array.from(mergedMap.values()).map((x) => x.item),
    toUpdateLocally,
    toPushRemotely,
  };
}

const SYNC_COLLECTIONS = [
  { name: "profiles", table: "profiles", idField: "id" },
  { name: "customCourses", table: "customCourses", idField: "id" },
  { name: "unitProgress", table: "unitProgress", idField: "unitId" },
  { name: "notes", table: "notes", idField: "unitId" },
  { name: "fsrsStates", table: "fsrsStates", idField: "cardId" },
  { name: "examAttempts", table: "examAttempts", idField: "id" },
  { name: "activityLogs", table: "activityLogs", idField: "dateKey" },
  { name: "confusionStats", table: "confusionStats", idField: "pairId" },
];

export async function performSupabaseSync({ supabaseUrl, supabaseAnonKey, syncKey }) {
  const client = getSupabaseClient(supabaseUrl, supabaseAnonKey);
  if (!client) {
    return {
      ok: false,
      skipped: true,
      message: "Lokaler Offline-Modus aktiv (kein Supabase-Projekt eingetragen).",
    };
  }

  // Prüfe zuerst, ob ein Google-Account angemeldet ist!
  let effectiveSyncKey = (syncKey || "").trim();
  const googleUser = await getCurrentGoogleUser({ supabaseUrl, supabaseAnonKey });
  if (googleUser?.id) {
    effectiveSyncKey = `google:${googleUser.id}`;
  }

  if (!effectiveSyncKey || effectiveSyncKey.length < 8) {
    return {
      ok: false,
      skipped: true,
      message: "Bitte mit Google-Account anmelden oder einen Sync-Code (mind. 8 Zeichen) vergeben.",
    };
  }

  const { data: remoteRows, error: fetchErr } = await client
    .from("ews_sync_records")
    .select("collection, record_id, payload, updated_at")
    .eq("sync_key", effectiveSyncKey);

  if (fetchErr) {
    throw new Error(`Supabase-Abruf fehlgeschlagen: ${fetchErr.message}`);
  }

  const remoteByCol = new Map();
  for (const r of remoteRows || []) {
    if (!remoteByCol.has(r.collection)) remoteByCol.set(r.collection, []);
    remoteByCol.get(r.collection).push({
      ...r.payload,
      updatedAt: r.payload?.updatedAt || r.updated_at,
    });
  }

  let pulled = 0;
  let pushed = 0;
  const upsertBatch = [];

  for (const col of SYNC_COLLECTIONS) {
    const localItems = await db[col.table].toArray();
    const remoteItems = remoteByCol.get(col.name) || [];
    const { toUpdateLocally, toPushRemotely } = mergeCollectionByTimestamp(
      localItems,
      remoteItems,
      col.idField
    );

    if (toUpdateLocally.length > 0) {
      await db[col.table].bulkPut(toUpdateLocally);
      pulled += toUpdateLocally.length;
    }
    for (const item of toPushRemotely) {
      upsertBatch.push({
        sync_key: effectiveSyncKey,
        collection: col.name,
        record_id: String(item[col.idField]),
        payload: item,
        updated_at: item.updatedAt || item.createdAt || new Date().toISOString(),
      });
    }
  }

  if (upsertBatch.length > 0) {
    const { error: pushErr } = await client
      .from("ews_sync_records")
      .upsert(upsertBatch, { onConflict: "sync_key,collection,record_id" });
    if (pushErr) {
      throw new Error(`Supabase-Upload fehlgeschlagen: ${pushErr.message}`);
    }
    pushed = upsertBatch.length;
  }

  return {
    ok: true,
    pulled,
    pushed,
    googleEmail: googleUser?.email || null,
    syncedAt: new Date().toISOString(),
    message: googleUser?.email
      ? `Cloud-Sync über Google (${googleUser.email}) erfolgreich (${pulled} empfangen, ${pushed} gesichert).`
      : `Sync erfolgreich (${pulled} empfangen, ${pushed} gesendet).`,
  };
}
