import React, { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Cloud,
  FileDown,
  FolderPlus,
  HardDriveDownload,
  Layers,
  Moon,
  RefreshCw,
  Smartphone,
  Sun,
  Tablet,
  Upload,
  Users,
} from "lucide-react";
import { Switch } from "../design/ui";
import { usePrefs } from "../design/StudioPrefsProvider";

const GITHUB_PAGES_EXPORTS = "https://christianu-dev.github.io/ews-lernstudio/exports/";

export async function downloadExportFileWithFallback(filename) {
  const candidates = [`./exports/${filename}`, `${GITHUB_PAGES_EXPORTS}${filename}`];
  let lastErr = null;
  for (const url of candidates) {
    try {
      const resp = await fetch(url, { cache: "no-store" });
      if (!resp.ok) continue;
      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("text/html")) continue; // Nie versehentlich index.html speichern!
      const blob = await resp.blob();
      if (!blob || blob.size < 512) continue;
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objUrl), 5000);
      toast.success(`Heruntergeladen: ${filename}`);
      return true;
    } catch (err) {
      lastErr = err;
    }
  }
  toast.error(lastErr?.message || `Download von ${filename} fehlgeschlagen.`);
  return false;
}

const PORTRAIT_PDFS = [
  {
    filename: "Lernskript_A_Lernen_und_Lehren_Hochformat.pdf",
    domain: "A",
    title: "Hochformat-PDF · Skript A: Lernen & Lehren",
    subtitle: "A4 Hochformat für Tablet, Stift & iPhone · alle 31 Kapitel farbig mit Schaubildern & Abhak-Kästchen",
  },
  {
    filename: "Lernskript_B_Entwicklungspsychologie_Hochformat.pdf",
    domain: "B",
    title: "Hochformat-PDF · Skript B: Entwicklungspsychologie",
    subtitle: "A4 Hochformat · alle 29 Kapitel inkl. Zeitstrahlen, Studien, Kunst/Sport & Check-Boxen",
  },
  {
    filename: "Lernskript_C_Diagnostik_Hochformat.pdf",
    domain: "C",
    title: "Hochformat-PDF · Skript C: Diagnostik & Evaluation",
    subtitle: "A4 Hochformat · alle 27 Kapitel inkl. PISA 2022/2025, BaySchO LRS/Dyskalkulie & Vergleichstabellen",
  },
  {
    filename: "Kapiteluebersichten_Kurzanker_A_B_C_Hochformat.pdf",
    domain: "A",
    title: "Hochformat-PDF · Kurzanker-Übersichten (A, B & C)",
    subtitle: "Alle 87 Kapitel superkompakt zum schnellen Durchwischen kurz vor dem Examen",
  },
];

const EXPORT_FILES = [
  {
    filename: "HANDBUCH_UND_LERNSTRATEGIE.docx",
    domain: "B",
    title: "Dein persönliches Handbuch & Lern-Fahrplan (.docx)",
    subtitle: "Herzlich & komplett technikfrei erklärt: Blätter-Modus, Tagesringe, NotebookLM & Examens-Strategie",
  },
  {
    filename: "Lernskript_A_Lernen_und_Lehren.docx",
    domain: "A",
    title: "Word-Lernskript A: Lernen und Lehren (.docx)",
    subtitle: "Bearbeitbare Word-Datei · alle 108 Original-Seiten verlustfrei",
  },
  {
    filename: "Lernskript_B_Entwicklungspsychologie.docx",
    domain: "B",
    title: "Word-Lernskript B: Entwicklungspsychologie (.docx)",
    subtitle: "Bearbeitbare Word-Datei · alle 82 Original-Seiten verlustfrei",
  },
  {
    filename: "Lernskript_C_Diagnostik.docx",
    domain: "C",
    title: "Word-Lernskript C: Diagnostik & Evaluation (.docx)",
    subtitle: "Bearbeitbare Word-Datei · alle 73 Original-Seiten verlustfrei",
  },
  {
    filename: "Kapiteluebersichten_1_Seiten_Anker_A_B_C.docx",
    domain: "A",
    title: "1-Seiten-Kapitelübersichten gesammelt (.docx)",
    subtitle: "Zum Auswählen & Ausdrucken einzelner Übersichtsblätter für deinen Ordner",
  },
  {
    filename: "Anki_A_Lernen_und_Lehren.apkg",
    domain: "A",
    title: "Anki-Deck Gebiet A: Lernen & Lehren (.apkg)",
    subtitle: "Direkt in Anki (PC & iPhone) importierbar mit Unterstapeln & Seitenzahlen",
  },
  {
    filename: "Anki_B_Entwicklungspsychologie.apkg",
    domain: "B",
    title: "Anki-Deck Gebiet B: Entwicklungspsychologie (.apkg)",
    subtitle: "Direkt in Anki importierbar · alle Stufenmodelle, Definitionen & Studien",
  },
  {
    filename: "Anki_C_Diagnostik.apkg",
    domain: "C",
    title: "Anki-Deck Gebiet C: Diagnostik (.apkg)",
    subtitle: "Direkt in Anki importierbar · Gütekriterien, Normwerte, LRS/Dyskalkulie & PISA 2025",
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
  onOpenInstallStarter,
  onGoogleSignIn,
  onRunSupabaseSync,
  onExportBackup,
  onImportBackup,
}) {
  const { theme, toggleTheme } = usePrefs();
  const [syncStatus, setSyncStatus] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [downloadingName, setDownloadingName] = useState(null);
  const backupInputRef = useRef(null);

  const handleDownload = async (e, filename) => {
    e.preventDefault();
    setDownloadingName(filename);
    try {
      await downloadExportFileWithFallback(filename);
    } finally {
      setDownloadingName(null);
    }
  };

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
      {/* 0. SCHNELLSTART: HOMESCREEN, PROFILE & KALENDER */}
      <section className="lx-card" style={{ borderLeft: "5px solid var(--lilac)", display: "flex", flexDirection: "column", gap: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17.5 }}>App-Starter, Profile &amp; Eigene Studienfächer</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--fg-muted)" }}>
              Aktives Profil: <strong>{activeProfile?.name || "Staatsexamen"}</strong> (geschützt) · App als Desktop-/iPhone-Icon installieren oder eigene Fächer anlegen.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="lx-btn lx-btn-primary" onClick={onOpenInstallStarter}>
              <Smartphone size={14} />
              <span>App auf PC &amp; iPhone starten</span>
            </button>
            <button type="button" className="lx-btn" onClick={() => onOpenProfileModal?.("profiles")}>
              <Users size={14} />
              <span>Profile &amp; Google</span>
            </button>
            <button type="button" className="lx-btn" onClick={() => onOpenProfileModal?.("courses")}>
              <FolderPlus size={14} />
              <span>Eigenes Fach</span>
            </button>
            <button type="button" className="lx-btn" onClick={onOpenCalendarModal}>
              <Calendar size={14} />
              <span>Kalender (.ics)</span>
            </button>
          </div>
        </div>
      </section>

      {/* 1. NEU: FARBCODIERTE HOCHFORMAT-PDFs FÜR TABLET, STIFT & IPHONE */}
      <section className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: "4px solid var(--lilac)" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17.5, display: "flex", alignItems: "center", gap: 8 }}>
            <Tablet size={18} style={{ color: "var(--lilac)" }} />
            <span>Hochformat-Lernskripte (.pdf) — Ideal für dein Klapp-Tablet &amp; iPhone</span>
          </h2>
          <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--fg-muted)" }}>
            Jedes Kapitel beginnt sauber oben auf einer neuen A4-Hochformat-Seite mit Farbcodierung, Schaubildern, Fettdruck &amp; Abhak-Kästchen. Funktioniert zuverlässig per Blob-Download ohne „Netzwerkfehler“.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
          {PORTRAIT_PDFS.map((item) => (
            <div
              key={item.filename}
              className={`lx-card lx-card-subtle domain-border-${item.domain}`}
              style={{ padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 10 }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: "var(--fg-secondary)", marginTop: 3 }}>{item.subtitle}</div>
              </div>
              <a
                href={`./exports/${item.filename}`}
                download={item.filename}
                onClick={(e) => handleDownload(e, item.filename)}
                className="lx-btn lx-btn-primary"
                style={{ textDecoration: "none", alignSelf: "flex-start" }}
                data-testid={`download-${item.filename}`}
              >
                <FileDown size={14} />
                <span>{downloadingName === item.filename ? "Lädt..." : "Als PDF herunterladen"}</span>
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* 2. WEITERE EXPORTE (.DOCX, HANDBUCH & ANKI-DECKS) */}
      <section className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17 }}>Word-Skripte (.docx), Handbuch &amp; Anki-Decks (.apkg)</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
          {EXPORT_FILES.map((item) => (
            <div
              key={item.filename}
              className={`lx-card lx-card-subtle domain-border-${item.domain}`}
              style={{ padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 10 }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: "var(--fg-secondary)", marginTop: 3 }}>{item.subtitle}</div>
              </div>
              <a
                href={`./exports/${item.filename}`}
                download={item.filename}
                onClick={(e) => handleDownload(e, item.filename)}
                className="lx-btn"
                style={{ textDecoration: "none", alignSelf: "flex-start", background: "var(--bg-surface)" }}
                data-testid={`download-${item.filename}`}
              >
                <FileDown size={14} />
                <span>{downloadingName === item.filename ? "Lädt..." : "Herunterladen"}</span>
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* 3. EINSTELLUNGEN (DARK MODE, TERMIN, CLOUD-SYNC & BACKUP) */}
      <div className="lx-dashboard-grid">
        <section className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Persönliche Einstellungen &amp; Darstellung</h3>

          <div className="lx-card lx-card-subtle" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div>
              <strong style={{ fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
                {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
                <span>Dark-Mode (Samtig-Lila) vs. Light-Mode (Hell)</span>
              </strong>
              <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                Aktuell: {theme === "dark" ? "Dunkel (Abend-Modus)" : "Hell (Atelier-Papier)"}
              </div>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} id="theme-switch" />
          </div>

          <div>
            <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>
              Prüfungstermin im Februar:
            </label>
            <input type="date" className="lx-input" value={settings.examDate || "2027-02-17"} onChange={(e) => onUpdateSetting("examDate", e.target.value)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>Kern-Tagesziel (Min.):</label>
              <input type="number" min={15} max={120} className="lx-input" value={settings.dailyTargetMinutes || 32} onChange={(e) => onUpdateSetting("dailyTargetMinutes", Number(e.target.value) || 32)} />
            </div>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>Sanftes Karten-Limit:</label>
              <input type="number" min={8} max={50} className="lx-input" value={settings.dailyCardCap || 18} onChange={(e) => onUpdateSetting("dailyCardCap", Number(e.target.value) || 18)} />
            </div>
          </div>

          <div className="lx-card lx-card-subtle" style={{ fontSize: 12.5, display: "flex", flexDirection: "column", gap: 4 }}>
            <strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Layers size={14} style={{ color: "var(--lilac)" }} />
              <span>Aktives Course-Pack ({courseStats?.unitCount || 0} Blätter · {courseStats?.flashcardCount || 0} Karten)</span>
            </strong>
            <span style={{ color: "var(--fg-secondary)" }}>
              Modular erweiterbar für Schulpädagogik, Allgemeine Pädagogik, Kunst, Sport &amp; eigene Lernprojekte!
            </span>
          </div>
        </section>

        <section className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <h3 style={{ margin: 0, fontSize: 16, display: "flex", alignItems: "center", gap: 7 }}>
            <Cloud size={17} style={{ color: "var(--domain-a)" }} />
            <span>PC ↔ iPhone Synchronisation &amp; Sicherung</span>
          </h3>
          <p style={{ margin: 0, fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.45 }}>
            Alle Lernstände werden sofort offline im Gerät gesichert. Über Google-Login (Supabase) oder Backup-Datei hältst du Laptop &amp; iPhone auf demselben Stand.
          </p>

          <input type="url" className="lx-input" placeholder="Supabase Project URL (optional)" value={settings.supabaseUrl || ""} onChange={(e) => onUpdateSetting("supabaseUrl", e.target.value)} />
          <input type="password" className="lx-input" placeholder="Supabase Publishable / Anon Key (optional)" value={settings.supabaseAnonKey || ""} onChange={(e) => onUpdateSetting("supabaseAnonKey", e.target.value)} />

          <button type="button" className="lx-btn" style={{ fontWeight: 600 }} onClick={triggerGoogleLogin}>
            <span style={{ fontWeight: 800, color: "#4285F4" }}>G</span>
            <span>{googleUser ? `Verbunden als ${googleUser.email}` : "Mit Google-Account verbinden (OAuth)"}</span>
          </button>

          <input type="text" className="lx-input" placeholder="Oder geheimer Sync-Code (mind. 8 Zeichen)" value={settings.syncKey || ""} onChange={(e) => onUpdateSetting("syncKey", e.target.value)} />

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

          {syncStatus && <div className="lx-card lx-card-subtle" style={{ padding: "8px 11px", fontSize: 12.5 }}>{syncStatus}</div>}
        </section>
      </div>
    </div>
  );
}
