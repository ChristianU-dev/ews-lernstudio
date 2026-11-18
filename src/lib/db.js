/**
 * 100 % Offline-First Datenbank mit Dexie (IndexedDB) — Version 2 (Multi-Profil & Multi-Fach!).
 * - Schützt ihr Hauptprofil ("profile-main", isProtected: true) zuverlässig vor versehentlichem Löschen/Überschreiben.
 * - Erlaubt zusätzliche isolierte Profile (z. B. für Christian oder separate Lernprojekte).
 * - Speichert eigene Lernfächer/Skripte (`customCourses`), FSRS-Kartenstatus, Notizen,
 *   abgelegte NotebookLM-Podcast-MP3s (für das Funkloch im Zug!) und Prüfungsversuche lokal.
 */

import Dexie from "dexie";

export const db = new Dexie("EWSLernstudioDB_v1");

db.version(1).stores({
  settings: "key, updatedAt",
  unitProgress: "unitId, domain, status, updatedAt",
  notes: "unitId, updatedAt",
  fsrsStates: "cardId, updatedAt",
  examAttempts: "id, setId, domain, createdAt",
  podcasts: "id, unitId, domain, createdAt",
  activityLogs: "dateKey, updatedAt",
  confusionStats: "pairId, updatedAt",
});

db.version(2).stores({
  settings: "key, updatedAt",
  unitProgress: "unitId, domain, status, updatedAt",
  notes: "unitId, updatedAt",
  fsrsStates: "cardId, updatedAt",
  examAttempts: "id, setId, domain, profileId, createdAt",
  podcasts: "id, unitId, domain, profileId, createdAt",
  activityLogs: "dateKey, updatedAt",
  confusionStats: "pairId, updatedAt",
  profiles: "id, updatedAt",
  customCourses: "id, profileId, updatedAt",
});

export const MAIN_PROFILE_ID = "profile-main";

export const DEFAULT_MAIN_PROFILE = {
  id: MAIN_PROFILE_ID,
  name: "Staatsexamen (Kunst & Sport)",
  subtitle: "Geschütztes Hauptprofil · Lehramt Grundschule",
  avatarEmoji: "🎨",
  accentColor: "#2d7459",
  isProtected: true,
  googleEmail: "",
  updatedAt: "2026-11-18T08:00:00.000Z",
};

export function scopeKey(profileId = MAIN_PROFILE_ID, rawKey = "") {
  if (!profileId || profileId === MAIN_PROFILE_ID) return String(rawKey);
  return `${profileId}::${rawKey}`;
}

export function unscopeKey(profileId = MAIN_PROFILE_ID, storedKey = "") {
  const s = String(storedKey);
  if (!profileId || profileId === MAIN_PROFILE_ID) {
    return s.includes("::") ? null : s;
  }
  const prefix = `${profileId}::`;
  return s.startsWith(prefix) ? s.slice(prefix.length) : null;
}

export function todayDateKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const DEFAULT_SETTINGS = {
  activeProfileId: MAIN_PROFILE_ID,
  examDate: "2027-02-17",
  dailyTargetMinutes: 32,
  dailyCardCap: 18,
  energyMode: "normal",
  preferredStudyHour: 16,
  activeCourseId: "ews-psychologie",
  primarySubject: "Kunst",
  didacticSubject: "Sport",
  supabaseUrl: import.meta.env?.VITE_SUPABASE_URL || "",
  supabaseAnonKey: import.meta.env?.VITE_SUPABASE_ANON_KEY || "",
  syncKey: "",
};

const GLOBAL_SETTING_KEYS = new Set(["activeProfileId", "supabaseUrl", "supabaseAnonKey", "syncKey"]);

export async function ensureProfilesInitialized() {
  const existingMain = await db.profiles.get(MAIN_PROFILE_ID);
  if (!existingMain) {
    await db.profiles.put({ ...DEFAULT_MAIN_PROFILE, updatedAt: new Date().toISOString() });
  } else if (!existingMain.isProtected) {
    await db.profiles.put({ ...existingMain, isProtected: true });
  }
  return db.profiles.toArray();
}

export async function createProfile({
  name,
  subtitle = "Eigenes Lernprofil",
  avatarEmoji = "🚀",
  accentColor = "#356382",
  defaultCourseId = "ews-psychologie",
}) {
  const cleanName = String(name || "Neues Profil").trim();
  const id =
    "profile-" +
    cleanName
      .toLowerCase()
      .replace(/[^a-z0-9äöüß]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Date.now().toString(36);

  const profile = {
    id,
    name: cleanName,
    subtitle,
    avatarEmoji,
    accentColor,
    isProtected: false,
    googleEmail: "",
    updatedAt: new Date().toISOString(),
  };
  await db.profiles.put(profile);
  await saveSetting("activeCourseId", defaultCourseId, id);
  return profile;
}

export async function updateProfileMeta(profileId, patch = {}) {
  const existing = (await db.profiles.get(profileId)) || { ...DEFAULT_MAIN_PROFILE, id: profileId };
  const next = {
    ...existing,
    ...patch,
    id: profileId,
    // Hauptprofil bleibt IMMER geschützt!
    isProtected: profileId === MAIN_PROFILE_ID ? true : Boolean(existing.isProtected),
    updatedAt: new Date().toISOString(),
  };
  await db.profiles.put(next);
  return next;
}

export async function deleteSecondaryProfile(profileId) {
  if (!profileId || profileId === MAIN_PROFILE_ID) {
    throw new Error("Das geschützte Hauptprofil kann nicht gelöscht werden.");
  }
  const prof = await db.profiles.get(profileId);
  if (prof?.isProtected) {
    throw new Error("Dieses geschützte Profil kann nicht gelöscht werden.");
  }
  await db.profiles.delete(profileId);
  return true;
}

export async function loadSettings(profileId = null) {
  const rows = await db.settings.toArray();
  const rawMap = new Map(rows.map((r) => [r.key, r.value]));

  const effectiveProfileId = profileId || rawMap.get("activeProfileId") || MAIN_PROFILE_ID;
  const merged = { ...DEFAULT_SETTINGS, activeProfileId: effectiveProfileId };

  for (const gKey of GLOBAL_SETTING_KEYS) {
    if (rawMap.has(gKey)) merged[gKey] = rawMap.get(gKey);
  }
  if (profileId) merged.activeProfileId = profileId;

  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (GLOBAL_SETTING_KEYS.has(key)) continue;
    const sk = scopeKey(effectiveProfileId, key);
    if (rawMap.has(sk)) {
      merged[key] = rawMap.get(sk);
    }
  }
  return merged;
}

export async function saveSetting(key, value, profileId = MAIN_PROFILE_ID) {
  const updatedAt = new Date().toISOString();
  const storageKey = GLOBAL_SETTING_KEYS.has(key) ? key : scopeKey(profileId, key);
  await db.settings.put({ key: storageKey, value, updatedAt });
  return { key: storageKey, value, updatedAt };
}

export async function loadProfileDataSlice(profileId = MAIN_PROFILE_ID) {
  const [progRows, noteRows, cardRows, confRows, podRows, logRows, examRows] = await Promise.all([
    db.unitProgress.toArray(),
    db.notes.toArray(),
    db.fsrsStates.toArray(),
    db.confusionStats.toArray(),
    db.podcasts.orderBy("createdAt").reverse().toArray(),
    db.activityLogs.toArray(),
    db.examAttempts.toArray(),
  ]);

  const unitProgressMap = {};
  for (const r of progRows) {
    const rawId = unscopeKey(profileId, r.unitId);
    if (rawId) unitProgressMap[rawId] = { ...r, unitId: rawId };
  }

  const notesMap = {};
  for (const r of noteRows) {
    const rawId = unscopeKey(profileId, r.unitId);
    if (rawId) notesMap[rawId] = { ...r, unitId: rawId };
  }

  const fsrsStatesMap = {};
  for (const r of cardRows) {
    const rawId = unscopeKey(profileId, r.cardId);
    if (rawId) fsrsStatesMap[rawId] = { ...r, cardId: rawId };
  }

  const confusionCounts = {};
  for (const r of confRows) {
    const rawId = unscopeKey(profileId, r.pairId);
    if (rawId) confusionCounts[rawId] = r.count;
  }

  const activityLogs = [];
  for (const r of logRows) {
    const rawDate = unscopeKey(profileId, r.dateKey);
    if (rawDate) activityLogs.push({ ...r, dateKey: rawDate });
  }

  const podcasts = podRows.filter((p) => (p.profileId || MAIN_PROFILE_ID) === profileId);
  const examAttempts = examRows.filter((e) => (e.profileId || MAIN_PROFILE_ID) === profileId);

  return {
    unitProgressMap,
    notesMap,
    fsrsStatesMap,
    confusionCounts,
    podcasts,
    activityLogs,
    examAttempts,
  };
}

export async function upsertUnitProgress(unitId, domain, patch = {}, profileId = MAIN_PROFILE_ID) {
  const sk = scopeKey(profileId, unitId);
  const existing = (await db.unitProgress.get(sk)) || {
    unitId: sk,
    domain,
    status: "unread",
    lautCheckDone: [],
    lautCheckCount: 0,
  };
  const updated = {
    ...existing,
    ...patch,
    unitId: sk,
    domain: domain || existing.domain,
    updatedAt: new Date().toISOString(),
  };
  await db.unitProgress.put(updated);
  return { ...updated, unitId };
}

export async function saveUnitNote(
  unitId,
  { highlightColor = "yellow", text = "", binderMarker = "" },
  profileId = MAIN_PROFILE_ID
) {
  const sk = scopeKey(profileId, unitId);
  const updated = {
    unitId: sk,
    highlightColor,
    text,
    binderMarker,
    updatedAt: new Date().toISOString(),
  };
  await db.notes.put(updated);
  return { ...updated, unitId };
}

export async function saveFsrsCardRecord(record, profileId = MAIN_PROFILE_ID) {
  const sk = scopeKey(profileId, record.cardId);
  const stored = { ...record, cardId: sk, updatedAt: new Date().toISOString() };
  await db.fsrsStates.put(stored);
  return record;
}

export async function logStudyActivity(delta = {}, now = new Date(), profileId = MAIN_PROFILE_ID) {
  const rawDate = todayDateKey(now);
  const sk = scopeKey(profileId, rawDate);
  const existing = (await db.activityLogs.get(sk)) || {
    dateKey: sk,
    minutesStudied: 0,
    unitsCompleted: 0,
    cardsReviewed: 0,
    examDrills: 0,
    bonusRounds: 0,
    podcastListened: false,
  };
  const next = {
    ...existing,
    minutesStudied: (existing.minutesStudied || 0) + (delta.minutesStudied || 0),
    unitsCompleted: (existing.unitsCompleted || 0) + (delta.unitsCompleted || 0),
    cardsReviewed: (existing.cardsReviewed || 0) + (delta.cardsReviewed || 0),
    examDrills: (existing.examDrills || 0) + (delta.examDrills || 0),
    bonusRounds: (existing.bonusRounds || 0) + (delta.bonusRounds || 0),
    podcastListened: Boolean(existing.podcastListened || delta.podcastListened),
    updatedAt: now.toISOString(),
  };
  await db.activityLogs.put(next);
  return { ...next, dateKey: rawDate };
}

export async function incrementConfusionStat(pairId, amount = 1, profileId = MAIN_PROFILE_ID) {
  if (!pairId) return null;
  const sk = scopeKey(profileId, pairId);
  const existing = (await db.confusionStats.get(sk)) || { pairId: sk, count: 0 };
  const next = {
    pairId: sk,
    count: Math.max(0, (existing.count || 0) + amount),
    updatedAt: new Date().toISOString(),
  };
  await db.confusionStats.put(next);
  return { ...next, pairId };
}

export async function saveCustomCourse(courseObj, profileId = MAIN_PROFILE_ID) {
  const record = {
    id: courseObj.id,
    profileId,
    title: courseObj.manifest?.title || "Eigenes Fach",
    packData: courseObj,
    updatedAt: new Date().toISOString(),
  };
  await db.customCourses.put(record);
  return record;
}

export async function loadCustomCourses() {
  const rows = await db.customCourses.toArray();
  return rows.map((r) => r.packData).filter(Boolean);
}

export async function exportFullBackupJson() {
  const [
    settings,
    unitProgress,
    notes,
    fsrsStates,
    examAttempts,
    activityLogs,
    confusionStats,
    profiles,
    customCourses,
  ] = await Promise.all([
    db.settings.toArray(),
    db.unitProgress.toArray(),
    db.notes.toArray(),
    db.fsrsStates.toArray(),
    db.examAttempts.toArray(),
    db.activityLogs.toArray(),
    db.confusionStats.toArray(),
    db.profiles.toArray(),
    db.customCourses.toArray(),
  ]);

  return {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    collections: {
      settings,
      unitProgress,
      notes,
      fsrsStates,
      examAttempts,
      activityLogs,
      confusionStats,
      profiles,
      customCourses,
    },
  };
}

export async function importFullBackupJson(backupObj) {
  if (!backupObj?.collections) {
    throw new Error("Ungültiges Backup-Format.");
  }
  const c = backupObj.collections;
  await db.transaction(
    "rw",
    [
      db.settings,
      db.unitProgress,
      db.notes,
      db.fsrsStates,
      db.examAttempts,
      db.activityLogs,
      db.confusionStats,
      db.profiles,
      db.customCourses,
    ],
    async () => {
      if (Array.isArray(c.settings)) await db.settings.bulkPut(c.settings);
      if (Array.isArray(c.unitProgress)) await db.unitProgress.bulkPut(c.unitProgress);
      if (Array.isArray(c.notes)) await db.notes.bulkPut(c.notes);
      if (Array.isArray(c.fsrsStates)) await db.fsrsStates.bulkPut(c.fsrsStates);
      if (Array.isArray(c.examAttempts)) await db.examAttempts.bulkPut(c.examAttempts);
      if (Array.isArray(c.activityLogs)) await db.activityLogs.bulkPut(c.activityLogs);
      if (Array.isArray(c.confusionStats)) await db.confusionStats.bulkPut(c.confusionStats);
      if (Array.isArray(c.profiles)) await db.profiles.bulkPut(c.profiles);
      if (Array.isArray(c.customCourses)) await db.customCourses.bulkPut(c.customCourses);
    }
  );
  await ensureProfilesInitialized();
  return true;
}
