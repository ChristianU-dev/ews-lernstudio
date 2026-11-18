import React, { useRef, useState } from "react";
import {
  Calendar,
  Cloud,
  FileDown,
  FolderPlus,
  HardDriveDownload,
  Layers,
  Moon,
  RefreshCw,
  Sun,
  Upload,
  Users,
} from "lucide-react";
import { Switch } from "../design/ui";
import { usePrefs } from "../design/StudioPrefsProvider";

const EXPORT_FILES = [
  {
    filename: "Lernskript_A_Lernen_und_Lehren.docx",
    domain: "A",
    title: "Visuelles Lernskript A: Lernen und Lehren (.docx)",
    subtitle:
      "Blau codiert · Alle 108 Original-Seiten verlustfrei mit Originalgrafiken, 300-DPI-Schaubildern, Kunst/Sport & Laut-Erzähl-Checks",
  },
  {
    filename: "Lernskript_B_Entwicklungspsychologie.docx",
    domain: "B",
    title: "Visuelles Lernskript B: Entwicklungspsychologie (.docx)",
    subtitle:
      "Smaragdgrün codiert · Alle 82 Original-Seiten inkl. Alters-Zeitstrahlen, Studien, Kunst/Sport & Theorie-Brücken",
  },
  {
    filename: "Lernskript_C_Diagnostik.docx",
    domain: "C",
    title: "Visuelles Lernskript C: Diagnostik & Evaluation (.docx)",
    subtitle:
      "Bernstein codiert · Alle 73 Original-Seiten inkl. PISA 2022 & PISA 2025, BaySchO LRS/Dyskalkulie & Vergleichstabellen",
  },
  {
    filename: "Kapiteluebersichten_1_Seiten_Anker_A_B_C.docx",
    domain: "A",
    title: "Kompakte 1-Seiten-Kapitelübersichten (A, B & C gesammelt, .docx)",
    subtitle:
      "Perfekt zum schnellen Wiederholen vor der Prüfung oder zum gezielten Ausdrucken einzelner Übersichtsblätter",
  },
  {
    filename: "Anki_A_Lernen_und_Lehren.apkg",
    domain: "A",
    title: "Anki-Kartendeck Gebiet A: Lernen und Lehren (.apkg)",
    subtitle: "Direkt in Anki (PC & iPhone) importierbar · mit Unterstapeln & exaktem Original-Seitenverweis",
  },
  {
    filename: "Anki_B_Entwicklungspsychologie.apkg",
    domain: "B",
    title: "Anki-Kartendeck Gebiet B: Entwicklungspsychologie (.apkg)",
    subtitle: "Direkt in Anki importierbar · alle Definitionen, Stufenmodelle & Studien",
  },
  {
    filename: "Anki_C_Diagnostik.apkg",
    domain: "C",
    title: "Anki-Kartendeck Gebiet C: Diagnostik (.apkg)",
    subtitle: "Direkt in Anki importierbar · inkl. Gütekriterien, Normwerte, LRS/Dyskalkulie & PISA 2025",
  },
  {
    filename: "HANDBUCH_UND_LERNSTRATEGIE.docx",
    domain: "B",
    title: "Dein persönliches Handbuch & Super-Lern-Buddy Guide (.docx)",
    subtitle:
      "Herzlich & komplett technikfrei erklärt: Tagesringe, Atelier-Garten, Google-Sync, eigene Fächer & Prüfungsstrategie",
  },
];

export function DownloadsAndSettingsView({
  settings,
  courseStats,
  activeProfile,
  googleUser,
  onUpdateSetting,
  onOpenProfileModal,
  onOpenCalendarModal,
  onGoogleSignIn,
  onRunSupabaseSync,
  onExportBackup,
  onImportBackup,
}) {
  const { theme, toggleTheme } = usePrefs();
  const [syncStatus, setSyncStatus] = useState("");
  const [syncing, setSyncing] = useState(false);
  const backupInputRef = useRef(null);

  const triggerSync = async () => {
    setSyncing(true);
    setSyncStatus("Synchronisiere...");
    try {
      const res = await onRunSupabaseSync();
      setSyncStatus(res.message);
    } catch (err) {
      setSyncStatus(err.message || "Sync fehlgeschlagen.");
    } finally {
      setSyncing(false);
    }
  };

  const triggerGoogleLogin = async () => {
    try {
      await onGoogleSignIn();
    } catch (err) {
      setSyncStatus(err.message || "Bitte erst Supabase URL & Anon Key eintragen.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} data-testid="downloads-settings-view">
      {/* 0. UNIVERSELLER LERN-BUDDY HUB (PROFILE, GOOGLE-ACCOUNT & EIGENE FÄCHER) */}
      <section className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17.5 }}>
              Universeller Lern-Buddy · Profile, Kalender &amp; Eigene Studienfächer
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--fg-muted)" }}>
              Aktives Profil: <strong>{activeProfile?.name || "Staatsexamen"}</strong> (geschützt) · Beliebig erweiterbar für weitere Fächer oder Christians Lernprojekte!
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="lx-btn lx-btn-primary"
              onClick={() => onOpenProfileModal?.("profiles")}
            >
              <Users size={14} />
              <span>Profile &amp; Google-Account</span>
            </button>
            <button
              type="button"
              className="lx-btn"
              onClick={() => onOpenProfileModal?.("courses")}
            >
              <FolderPlus size={14} />
              <span>Eigenes Lernfach anlegen</span>
            </button>
            <button
              type="button"
              className="lx-btn"
              onClick={onOpenCalendarModal}
            >
              <Calendar size={14} />
              <span>Kalender (.ics)</span>
            </button>
          </div>
        </div>
      </section>

      {/* 1. DOWNLOAD-CENTER FÜR ALLE .DOCX-SKRIPTE & .APKG-ANKI-DECKS */}
      <section className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17.5 }}>
            Download-Center: Deine visuellen Word-Skripte (.docx) &amp; Anki-Decks (.apkg)
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--fg-muted)" }}>
            Alle Dateien liegen lokal und offline griffbereit – mit exakten Original-Seitenzahlen passend zu deinem gedruckten 300-Seiten-Ordner.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
          {EXPORT_FILES.map((item) => (
            <div
              key={item.filename}
              className={`lx-card lx-card-subtle domain-border-${item.domain}`}
              style={{
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: "var(--fg-secondary)", marginTop: 3 }}>{item.subtitle}</div>
              </div>
              <a
                href={`./exports/${item.filename}`}
                download={item.filename}
                className="lx-btn"
                style={{ textDecoration: "none", alignSelf: "flex-start", background: "var(--bg-surface)" }}
                data-testid={`download-${item.filename}`}
              >
                <FileDown size={14} />
                <span>Herunterladen</span>
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* 2. EINSTELLUNGEN (PRÜFUNGSDATUM, DARK MODE, GOOGLE / SUPABASE SYNC & BACKUP) */}
      <div className="lx-dashboard-grid">
        <section className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Persönliche Einstellungen &amp; Darstellung</h3>

          <div
            className="lx-card lx-card-subtle"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}
          >
            <div>
              <strong style={{ fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
                {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
                <span>Blendfreier Dark-Mode (16:10 HDR &amp; Abend-Modus)</span>
              </strong>
              <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                Aktuell: {theme === "dark" ? "Dunkel (Augenschonend)" : "Hell (Papier-Optik)"}
              </div>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} id="theme-switch" />
          </div>

          <div>
            <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>
              Dein Prüfungstermin im Februar (jederzeit taggenau anpassbar):
            </label>
            <input
              type="date"
              className="lx-input"
              value={settings.examDate || "2027-02-17"}
              onChange={(e) => onUpdateSetting("examDate", e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Kern-Tagesziel (Minuten):
              </label>
              <input
                type="number"
                min={15}
                max={120}
                className="lx-input"
                value={settings.dailyTargetMinutes || 32}
                onChange={(e) => onUpdateSetting("dailyTargetMinutes", Number(e.target.value) || 32)}
              />
            </div>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Sanftes Karten-Limit / Runde:
              </label>
              <input
                type="number"
                min={8}
                max={50}
                className="lx-input"
                value={settings.dailyCardCap || 18}
                onChange={(e) => onUpdateSetting("dailyCardCap", Number(e.target.value) || 18)}
              />
            </div>
          </div>

          <div className="lx-card lx-card-subtle" style={{ fontSize: 12.5, display: "flex", flexDirection: "column", gap: 4 }}>
            <strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Layers size={14} style={{ color: "var(--domain-a)" }} />
              <span>Aktives Course-Pack ({courseStats?.unitCount || 0} Blätter · {courseStats?.flashcardCount || 0} Karten)</span>
            </strong>
            <span style={{ color: "var(--fg-secondary)" }}>
              Modular wiederverwendbar für Schulpädagogik, Allgemeine Pädagogik, Kunst, Sport und Christians Lernprojekte!
            </span>
          </div>
        </section>

        {/* PC <-> iPhone Echtzeit-Sync (Google OAuth + Sync-Code) & Lokales Backup */}
        <section className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <h3 style={{ margin: 0, fontSize: 16, display: "flex", alignItems: "center", gap: 7 }}>
            <Cloud size={17} style={{ color: "var(--domain-a)" }} />
            <span>Google-Cloud &amp; PC ↔ iPhone Synchronisation</span>
          </h3>
          <p style={{ margin: 0, fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.45 }}>
            Lokal sofort offline bereit. Für Echtzeit-Sync zwischen Laptop &amp; iPhone einfach einmalig Supabase eintragen und per <strong>Google-Konto</strong> oder <strong>Sync-Code</strong> verbinden.
          </p>

          <input
            type="url"
            className="lx-input"
            placeholder="Supabase Project URL (z. B. https://xyz.supabase.co)"
            value={settings.supabaseUrl || ""}
            onChange={(e) => onUpdateSetting("supabaseUrl", e.target.value)}
          />
          <input
            type="password"
            className="lx-input"
            placeholder="Supabase Publishable / Anon Key"
            value={settings.supabaseAnonKey || ""}
            onChange={(e) => onUpdateSetting("supabaseAnonKey", e.target.value)}
          />

          <button
            type="button"
            className="lx-btn"
            style={{ fontWeight: 600 }}
            onClick={triggerGoogleLogin}
          >
            <span style={{ fontWeight: 800, color: "#4285F4" }}>G</span>
            <span>
              {googleUser
                ? `Angemeldet als ${googleUser.email}`
                : "Mit Google-Account verbinden (OAuth)"}
            </span>
          </button>

          <input
            type="text"
            className="lx-input"
            placeholder="Oder alternativer Sync-Code (mind. 8 Zeichen, ohne E-Mail)"
            value={settings.syncKey || ""}
            onChange={(e) => onUpdateSetting("syncKey", e.target.value)}
          />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="lx-btn lx-btn-primary" onClick={triggerSync} disabled={syncing}>
              <RefreshCw size={14} />
              <span>{syncing ? "Synchronisiere..." : "Jetzt synchronisieren"}</span>
            </button>
            <button type="button" className="lx-btn" onClick={onExportBackup}>
              <HardDriveDownload size={14} />
              <span>Datei-Backup</span>
            </button>
            <button type="button" className="lx-btn" onClick={() => backupInputRef.current?.click()}>
              <Upload size={14} />
              <span>Einspielen</span>
            </button>
            <input
              ref={backupInputRef}
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImportBackup(f);
              }}
            />
          </div>

          {syncStatus && (
            <div className="lx-card lx-card-subtle" style={{ padding: "8px 11px", fontSize: 12.5 }}>
              {syncStatus}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
