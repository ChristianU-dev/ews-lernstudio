/**
 * 100 % Offline-First Datenbank mit Dexie (IndexedDB).
 * Speichert Lernfortschritt, FSRS-Kartenstatus, persönliche Markierungen/Notizen,
 * abgelegte NotebookLM-Podcast-MP3s (für das Funkloch im Zug!) und Prüfungsversuche lokal.
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

export function todayDateKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const DEFAULT_SETTINGS = {
  examDate: "2027-02-17",
  dailyTargetMinutes: 32,
  dailyCardCap: 18,
  activeCourseId: "ews-psychologie",
  primarySubject: "Kunst",
  didacticSubject: "Sport",
  supabaseUrl: import.meta.env?.VITE_SUPABASE_URL || "",
  supabaseAnonKey: import.meta.env?.VITE_SUPABASE_ANON_KEY || "",
  syncKey: "",
};

export async function loadSettings() {
  const rows = await db.settings.toArray();
  const merged = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    merged[r.key] = r.value;
  }
  return merged;
}

export async function saveSetting(key, value) {
  const updatedAt = new Date().toISOString();
  await db.settings.put({ key, value, updatedAt });
  return { key, value, updatedAt };
}

export async function upsertUnitProgress(unitId, domain, patch = {}) {
  const existing = (await db.unitProgress.get(unitId)) || {
    unitId,
    domain,
    status: "unread",
    lautCheckDone: [],
    lautCheckCount: 0,
  };
  const updated = {
    ...existing,
    ...patch,
    unitId,
    domain: domain || existing.domain,
    updatedAt: new Date().toISOString(),
  };
  await db.unitProgress.put(updated);
  return updated;
}

export async function saveUnitNote(unitId, { highlightColor = "yellow", text = "", binderMarker = "" }) {
  const updated = {
    unitId,
    highlightColor,
    text,
    binderMarker,
    updatedAt: new Date().toISOString(),
  };
  await db.notes.put(updated);
  return updated;
}

export async function logStudyActivity(delta = {}, now = new Date()) {
  const dateKey = todayDateKey(now);
  const existing = (await db.activityLogs.get(dateKey)) || {
    dateKey,
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
  return next;
}

export async function incrementConfusionStat(pairId, amount = 1) {
  if (!pairId) return null;
  const existing = (await db.confusionStats.get(pairId)) || { pairId, count: 0 };
  const next = {
    pairId,
    count: Math.max(0, (existing.count || 0) + amount),
    updatedAt: new Date().toISOString(),
  };
  await db.confusionStats.put(next);
  return next;
}

export async function exportFullBackupJson() {
  const [settings, unitProgress, notes, fsrsStates, examAttempts, activityLogs, confusionStats] =
    await Promise.all([
      db.settings.toArray(),
      db.unitProgress.toArray(),
      db.notes.toArray(),
      db.fsrsStates.toArray(),
      db.examAttempts.toArray(),
      db.activityLogs.toArray(),
      db.confusionStats.toArray(),
    ]);

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    collections: {
      settings,
      unitProgress,
      notes,
      fsrsStates,
      examAttempts,
      activityLogs,
      confusionStats,
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
    [db.settings, db.unitProgress, db.notes, db.fsrsStates, db.examAttempts, db.activityLogs, db.confusionStats],
    async () => {
      if (Array.isArray(c.settings)) await db.settings.bulkPut(c.settings);
      if (Array.isArray(c.unitProgress)) await db.unitProgress.bulkPut(c.unitProgress);
      if (Array.isArray(c.notes)) await db.notes.bulkPut(c.notes);
      if (Array.isArray(c.fsrsStates)) await db.fsrsStates.bulkPut(c.fsrsStates);
      if (Array.isArray(c.examAttempts)) await db.examAttempts.bulkPut(c.examAttempts);
      if (Array.isArray(c.activityLogs)) await db.activityLogs.bulkPut(c.activityLogs);
      if (Array.isArray(c.confusionStats)) await db.confusionStats.bulkPut(c.confusionStats);
    }
  );
  return true;
}
