/**
 * Kalender-Streifen, 28-Tage-Lernverlauf & nativer Apple-/Google-Kalender Export (.ics).
 * Erlaubt 1-Klick-Übernahme des Februar-Prüfungstermins + sanfter Lernblöcke
 * direkt in den iPhone-Kalender (iCloud), Google Calendar oder Outlook.
 */

const WEEKDAY_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export function toLocalDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function buildSevenDayWeekStrip(activityLogs = [], protectedPauseDays = [], now = new Date()) {
  const logMap = new Map(activityLogs.map((l) => [l.dateKey, l]));
  const shieldSet = new Set(protectedPauseDays || []);
  const todayKey = toLocalDateKey(now);

  // Zeige die letzten 5 Tage + Heute + Morgen (kompakter 7-Tage-Streifen wie in nativen iOS-Planern)
  return Array.from({ length: 7 }, (_, idx) => {
    const offset = idx - 5;
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const key = toLocalDateKey(dt);
    const log = logMap.get(key);
    const minutes = log?.minutesStudied || 0;
    const isActive =
      minutes >= 3 ||
      (log?.cardsReviewed || 0) >= 1 ||
      (log?.unitsCompleted || 0) >= 1 ||
      Boolean(log?.podcastListened);

    return {
      dateKey: key,
      dayShort: WEEKDAY_SHORT[dt.getDay()],
      dayNum: dt.getDate(),
      isToday: key === todayKey,
      isFuture: offset > 0,
      isActive,
      isShielded: !isActive && shieldSet.has(key),
      minutes,
    };
  });
}

function toIcsUtcStamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function toIcsLocalDate(dateStr) {
  return String(dateStr || "2027-02-17").replace(/-/g, "");
}

/**
 * Erzeugt eine standardkonforme `.ics`-Kalenderdatei (RFC 5545) mit:
 * 1. Dem ganztägigen Staatsexamens-Termin im Februar (+ 7-Tage-Erinnerung)
 * 2. Den nächsten 14 geplanten Sofa-/Kern-Lernblöcken (Mo–Fr zur Wunsch-Uhrzeit)
 */
export function buildStudyScheduleIcs({
  profileName = "EWS Lernstudio",
  courseTitle = "EWS Psychologie",
  examDate = "2027-02-17",
  preferredHour = 16,
  dailyMinutes = 32,
  now = new Date(),
}) {
  const stamp = toIcsUtcStamp(now);
  const examCompact = toIcsLocalDate(examDate);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EWS Lernstudio//Universal Study Buddy//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    // 1. Prüfungstermin
    "BEGIN:VEVENT",
    `UID:exam-${examCompact}@ews-lernstudio.local`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${examCompact}`,
    `SUMMARY:🎯 Prüfung: ${courseTitle} (${profileName})`,
    "DESCRIPTION:Du bist bestens vorbereitet! Denke an Ausweis, Stifte, Uhr und deine 80-Minuten-Zeiteinteilung je Gebiet.",
    "END:VEVENT",
  ];

  // 2. Nächste 10 entspannte Werktags-Blöcke (Mo–Fr, Wochenenden bewusst frei als Puffer!)
  let scheduled = 0;
  for (let d = 1; d <= 21 && scheduled < 10; d++) {
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, preferredHour, 0, 0);
    const dow = dt.getDay();
    if (dow === 0 || dow === 6) continue; // Wochenende frei
    if (toLocalDateKey(dt) >= examDate) break;

    const endDt = new Date(dt.getTime() + dailyMinutes * 60000);
    const fmtLocal = (x) => {
      const y = x.getFullYear();
      const mo = String(x.getMonth() + 1).padStart(2, "0");
      const da = String(x.getDate()).padStart(2, "0");
      const hh = String(x.getHours()).padStart(2, "0");
      const mm = String(x.getMinutes()).padStart(2, "0");
      return `${y}${mo}${da}T${hh}${mm}00`;
    };

    lines.push(
      "BEGIN:VEVENT",
      `UID:study-${fmtLocal(dt)}-${scheduled}@ews-lernstudio.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${fmtLocal(dt)}`,
      `DTEND:${fmtLocal(endDt)}`,
      `SUMMARY:🌿 ${courseTitle}: ${dailyMinutes}-Min. Kern-Etappe (Sofa-Start + 1 Ankerblatt)`,
      "DESCRIPTION:Starte entspannt mit 5 Min. Audio, präge dir 1 Ankerblatt visuell ein und wische kurz deine FSRS-Karten durch.",
      "END:VEVENT"
    );
    scheduled += 1;
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
