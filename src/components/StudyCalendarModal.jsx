import React, { useMemo } from "react";
import { Calendar, Download, ShieldCheck, Check, Info } from "lucide-react";
import { Modal } from "../design/ui";
import { buildStudyScheduleIcs, buildStudySchedulePreview, toLocalDateKey } from "../lib/calendarExport";

export function StudyCalendarModal({
  open,
  onOpenChange,
  examDate = "2027-02-17",
  preferredHour = 16,
  dailyMinutes = 32,
  profileName = "Staatsexamen",
  courseTitle = "EWS Psychologie",
  allUnits = [],
  activityLogs = [],
  protectedPauseDays = [],
  onUpdateExamDate,
  onUpdatePreferredHour,
}) {
  const logMap = new Map(activityLogs.map((l) => [l.dateKey, l]));
  const shieldSet = new Set(protectedPauseDays || []);
  const now = new Date();
  const todayKey = toLocalDateKey(now);

  const previewEvents = useMemo(
    () =>
      buildStudySchedulePreview({
        allUnits,
        courseTitle,
        examDate,
        preferredHour,
        dailyMinutes,
      }),
    [allUnits, courseTitle, examDate, preferredHour, dailyMinutes]
  );

  // 28-Tage-Rückblick & Vorschau
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
      allUnits,
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lernplan-${courseTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Dein Lernkalender & iPhone-/Google-Kalender-Export"
      subtitle="Trägt deinen Prüfungstermin und entspannte Werktags-Etappen mit konkreten Kapiteln automatisch in deinen iPhone- oder Google-Kalender ein."
      width={560}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 13, marginTop: 8 }}>
        {/* Prüfungsdatum & Wunsch-Uhrzeit */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>
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
            <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>
              Wunsch-Uhrzeit (Mo–Fr):
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

        {/* Klare Vorschau: WAS bringt mir der .ics Export? */}
        <div className="lx-cat-merksatz" style={{ display: "flex", flexDirection: "column", gap: 7, padding: "12px 14px" }}>
          <strong style={{ fontSize: 13, color: "var(--cat-merksatz-fg)", display: "flex", alignItems: "center", gap: 6 }}>
            <Info size={14} />
            <span>Das erscheint nach dem Antippen in deinem iPhone-/Google-Kalender:</span>
          </strong>
          <ul style={{ margin: 0, paddingLeft: 17, fontSize: 12, color: "var(--fg-secondary)", lineHeight: 1.5 }}>
            <li>
              <strong>🎯 Prüfungstag ({examDate}):</strong> Ganztägiger Examens-Termin als fester Anker.
            </li>
            {previewEvents.slice(0, 3).map((ev, idx) => (
              <li key={idx}>
                <strong>{ev.dateLabel} · {ev.timeLabel}:</strong> {ev.summary}
              </li>
            ))}
            <li>
              <strong>🌿 Wochenenden frei:</strong> Sa &amp; So bleiben automatisch als Erholungs-Puffer frei!
            </li>
          </ul>
          <div style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>
            <strong>Tipp fürs iPhone:</strong> Nach dem Herunterladen einfach auf die <code>.ics</code>-Datei tippen → <em>„Alle hinzufügen“</em> → fertig!
          </div>
        </div>

        {/* 28-Tage Aktivitäts- & Pausenschild-Übersicht */}
        <div className="lx-card lx-card-subtle" style={{ padding: "11px 13px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <strong style={{ fontSize: 12.5 }}>Dein 28-Tage-Rhythmus</strong>
            <span style={{ fontSize: 11, color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: 5 }}>
              <ShieldCheck size={12} style={{ color: "var(--domain-b)" }} />
              <span>Grün = Aktiv · 🛡️ = Geschützter Ruhetag</span>
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 5 }}>
            {cells.map((c) => (
              <div
                key={c.key}
                title={`${c.key}: ${c.mins} Min.`}
                style={{
                  minHeight: 34,
                  borderRadius: 8,
                  border: c.isToday ? "2px solid var(--lilac)" : "1px solid var(--border)",
                  background: c.active
                    ? "var(--callout-success-bg)"
                    : c.shielded
                    ? "var(--callout-warn-bg)"
                    : "var(--bg-surface)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  opacity: c.isFuture ? 0.58 : 1,
                }}
              >
                <span className="tabular" style={{ fontWeight: c.isToday ? 700 : 500 }}>
                  {c.day}
                </span>
                {c.active && <Check size={9} style={{ color: "var(--domain-b)" }} />}
                {c.shielded && <span style={{ fontSize: 9 }}>🛡️</span>}
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="lx-btn lx-btn-primary"
          style={{ width: "100%", minHeight: 44 }}
          onClick={handleDownloadIcs}
          data-testid="download-calendar-ics-btn"
        >
          <Calendar size={15} />
          <span>Meinen Lernplan jetzt in Kalender übernehmen (.ics)</span>
          <Download size={14} />
        </button>
      </div>
    </Modal>
  );
}
