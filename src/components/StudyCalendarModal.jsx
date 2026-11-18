import React from "react";
import { Calendar, Download, ShieldCheck, Check } from "lucide-react";
import { Modal } from "../design/ui";
import { buildStudyScheduleIcs, toLocalDateKey } from "../lib/calendarExport";

export function StudyCalendarModal({
  open,
  onOpenChange,
  examDate = "2027-02-17",
  preferredHour = 16,
  dailyMinutes = 32,
  profileName = "Staatsexamen",
  courseTitle = "EWS Psychologie",
  activityLogs = [],
  protectedPauseDays = [],
  onUpdateExamDate,
  onUpdatePreferredHour,
}) {
  const logMap = new Map(activityLogs.map((l) => [l.dateKey, l]));
  const shieldSet = new Set(protectedPauseDays || []);
  const now = new Date();
  const todayKey = toLocalDateKey(now);

  // 28-Tage-Rückblick & Vorschau (letzte 20 Tage + heute + 7 Tage)
  const cells = Array.from({ length: 28 }, (_, i) => {
    const offset = i - 20;
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const key = toLocalDateKey(d);
    const log = logMap.get(key);
    const active =
      (log?.minutesStudied || 0) >= 3 ||
      (log?.cardsReviewed || 0) >= 1 ||
      (log?.unitsCompleted || 0) >= 1 ||
      Boolean(log?.podcastListened);
    return {
      key,
      day: d.getDate(),
      monthShort: d.toLocaleDateString("de-DE", { month: "short" }),
      isToday: key === todayKey,
      isFuture: offset > 0,
      active,
      shielded: !active && shieldSet.has(key),
      mins: log?.minutesStudied || 0,
    };
  });

  const handleDownloadIcs = () => {
    const ics = buildStudyScheduleIcs({
      profileName,
      courseTitle,
      examDate,
      preferredHour,
      dailyMinutes,
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lernplan-${courseTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Dein Lernkalender & iPhone-/Google-Kalender-Export"
      subtitle="Plane deinen Prüfungstermin + entspannte Werktags-Etappen (Wochenenden bleiben bewusst als Puffer frei!)."
      width={520}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 10 }}>
        {/* Prüfungsdatum & Wunsch-Uhrzeit */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
              Prüfungstermin:
            </label>
            <input
              type="date"
              className="lx-input"
              value={examDate || "2027-02-17"}
              onChange={(e) => onUpdateExamDate(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
              Lieblings-Lernzeit (Mo–Fr):
            </label>
            <select
              className="lx-input"
              value={preferredHour || 16}
              onChange={(e) => onUpdatePreferredHour(Number(e.target.value))}
            >
              {[9, 10, 11, 14, 15, 16, 17, 18, 19, 20].map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00 Uhr
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 28-Tage Aktivitäts- & Pausenschild-Übersicht */}
        <div className="lx-card lx-card-subtle" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <strong style={{ fontSize: 13 }}>28-Tage-Rhythmus (ohne rote Mahnungen)</strong>
            <span style={{ fontSize: 11, color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: 5 }}>
              <ShieldCheck size={12} style={{ color: "var(--domain-b)" }} />
              <span>Grün = Aktiv · Schild = Geschützter Ruhetag</span>
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
            {cells.map((c) => (
              <div
                key={c.key}
                title={`${c.key}: ${c.mins} Min.`}
                style={{
                  minHeight: 38,
                  borderRadius: 9,
                  border: c.isToday ? "2px solid var(--fg)" : "1px solid var(--border)",
                  background: c.active
                    ? "var(--callout-success-bg)"
                    : c.shielded
                    ? "var(--callout-warn-bg)"
                    : "var(--bg-surface)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11.5,
                  opacity: c.isFuture ? 0.58 : 1,
                }}
              >
                <span className="tabular" style={{ fontWeight: c.isToday ? 700 : 500 }}>
                  {c.day}
                </span>
                {c.active && <Check size={10} style={{ color: "var(--domain-b)" }} />}
                {c.shielded && <span style={{ fontSize: 9 }}>🛡️</span>}
              </div>
            ))}
          </div>
        </div>

        {/* 1-Klick Apple / Google Kalender Download */}
        <button
          type="button"
          className="lx-btn lx-btn-primary"
          style={{ width: "100%", minHeight: 44 }}
          onClick={handleDownloadIcs}
          data-testid="download-calendar-ics-btn"
        >
          <Calendar size={15} />
          <span>In iPhone- / Google-Kalender übernehmen (.ics)</span>
          <Download size={14} />
        </button>
      </div>
    </Modal>
  );
}
