import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import { Drawer } from "vaul";
import {
  BookOpen,
  Brain,
  Compass,
  Download,
  Headphones,
  Layers,
  Menu,
  Moon,
  Scale,
  Search,
  Sun,
  WifiOff,
} from "lucide-react";
import { usePrefs } from "./design/StudioPrefsProvider";
import { Kbd, StatusBadge } from "./design/ui";
import { getActiveCoursePack } from "./lib/coursePackRegistry";
import { validateCoursePack, buildCommandSearchIndex } from "./lib/courseSchema";
import { computeWeeklyGrowth } from "./lib/adaptivePlanner";
import { createInitialFsrsRecord, reviewCard, Rating } from "./lib/fsrsEngine";
import {
  db,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSetting,
  upsertUnitProgress,
  saveUnitNote,
  logStudyActivity,
  incrementConfusionStat,
  exportFullBackupJson,
  importFullBackupJson,
  todayDateKey,
} from "./lib/db";
import { performSupabaseSync } from "./lib/syncEngine";
import { createDemoSofaTrackBlob } from "./lib/audioSynthesizer";
import { CommandPalette } from "./components/CommandPalette";
import { AudioMiniDock } from "./components/AudioMiniDock";
import { TodayDashboardView } from "./views/TodayDashboardView";
import { AnchorScriptsView } from "./views/AnchorScriptsView";
import { KnowledgeGraphView } from "./views/KnowledgeGraphView";
import { FlashcardsTrainerView } from "./views/FlashcardsTrainerView";
import { ExamSimulatorView } from "./views/ExamSimulatorView";
import { PodcastHubView } from "./views/PodcastHubView";
import { DownloadsAndSettingsView } from "./views/DownloadsAndSettingsView";

const DESKTOP_NAV = [
  { id: "today", label: "Heute & Sofa-Start", icon: Compass },
  { id: "scripts", label: "1-Seiten-Skripte (A/B/C)", icon: BookOpen },
  { id: "graph", label: "Wissensnetz & Brücken", icon: Brain },
  { id: "cards", label: "FSRS-Kartentrainer", icon: Layers },
  { id: "exam", label: "Examens-Simulator", icon: Scale },
  { id: "podcast", label: "Sofa-Podcast-Hub", icon: Headphones },
  { id: "downloads", label: "Downloads & Sync", icon: Download },
];

export default function App() {
  const { theme, toggleTheme } = usePrefs();
  const coursePack = useMemo(() => getActiveCoursePack(), []);
  const validation = useMemo(() => validateCoursePack(coursePack), [coursePack]);
  const searchIndex = useMemo(() => buildCommandSearchIndex(coursePack), [coursePack]);

  const allUnits = useMemo(
    () => (coursePack.domains || []).flatMap((d) => d.units || []),
    [coursePack]
  );

  const [activeView, setActiveView] = useState("today");
  const [activeDomainId, setActiveDomainId] = useState("A");
  const [activeUnitId, setActiveUnitId] = useState(() => allUnits[0]?.id || "A-01-01");
  const [selectedExamSetId, setSelectedExamSetId] = useState(null);
  const [podcastFocusUnitId, setPodcastFocusUnitId] = useState(null);

  const [cmdOpen, setCmdOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const [activeAudioTrack, setActiveAudioTrack] = useState(null);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [unitProgressMap, setUnitProgressMap] = useState({});
  const [notesMap, setNotesMap] = useState({});
  const [fsrsStatesMap, setFsrsStatesMap] = useState({});
  const [confusionCounts, setConfusionCounts] = useState({});
  const [podcasts, setPodcasts] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  const refreshFromDb = useCallback(async () => {
    try {
      const [cfg, progRows, noteRows, cardRows, confRows, podRows, logRows] = await Promise.all([
        loadSettings(),
        db.unitProgress.toArray(),
        db.notes.toArray(),
        db.fsrsStates.toArray(),
        db.confusionStats.toArray(),
        db.podcasts.orderBy("createdAt").reverse().toArray(),
        db.activityLogs.toArray(),
      ]);
      setSettings(cfg);
      setUnitProgressMap(Object.fromEntries(progRows.map((r) => [r.unitId, r])));
      setNotesMap(Object.fromEntries(noteRows.map((r) => [r.unitId, r])));
      setFsrsStatesMap(Object.fromEntries(cardRows.map((r) => [r.cardId, r])));
      setConfusionCounts(Object.fromEntries(confRows.map((r) => [r.pairId, r.count])));
      setPodcasts(podRows);
      setActivityLogs(logRows);
    } catch {}
  }, []);

  useEffect(() => {
    refreshFromDb();
  }, [refreshFromDb]);

  useEffect(() => {
    const onOff = () => setIsOffline(!navigator.onLine);
    window.addEventListener("online", onOff);
    window.addEventListener("offline", onOff);
    return () => {
      window.removeEventListener("online", onOff);
      window.removeEventListener("offline", onOff);
    };
  }, []);

  const todayLog = useMemo(() => {
    const key = todayDateKey();
    return activityLogs.find((l) => l.dateKey === key) || null;
  }, [activityLogs]);

  const weeklyGrowth = useMemo(() => computeWeeklyGrowth(activityLogs), [activityLogs]);

  const handleSelectDomain = (domId) => {
    setActiveDomainId(domId);
    const dom = (coursePack.domains || []).find((d) => d.id === domId);
    if (dom?.units?.length) {
      setActiveUnitId(dom.units[0].id);
    }
  };

  const handleUpdateSetting = async (key, value) => {
    await saveSetting(key, value);
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpdateUnitProgress = async (unitId, domain, patch) => {
    const wasMastered = unitProgressMap[unitId]?.status === "mastered";
    const updated = await upsertUnitProgress(unitId, domain, patch);
    setUnitProgressMap((prev) => ({ ...prev, [unitId]: updated }));

    if (!wasMastered && updated.status === "mastered") {
      await logStudyActivity({ minutesStudied: 12, unitsCompleted: 1 });
      const logs = await db.activityLogs.toArray();
      setActivityLogs(logs);
      toast.success("1-Seiten-Ankerblatt sicher gemeistert!");
    }
  };

  const handleSaveNote = async (unitId, noteData) => {
    const saved = await saveUnitNote(unitId, noteData);
    setNotesMap((prev) => ({ ...prev, [unitId]: saved }));
  };

  const handleReviewCard = async (card, rating) => {
    const prevRec = fsrsStatesMap[card.id] || createInitialFsrsRecord(card.id);
    const nextRec = reviewCard(prevRec, rating);
    await db.fsrsStates.put(nextRec);
    setFsrsStatesMap((prev) => ({ ...prev, [card.id]: nextRec }));

    if (card.confusion_tag && (rating === Rating.Again || rating === Rating.Hard)) {
      const conf = await incrementConfusionStat(card.confusion_tag, 1);
      if (conf) {
        setConfusionCounts((prev) => ({ ...prev, [conf.pairId]: conf.count }));
      }
    }

    await logStudyActivity({ minutesStudied: 1, cardsReviewed: 1 });
    setActivityLogs(await db.activityLogs.toArray());
  };

  const handleRecordExamAttempt = async (attempt) => {
    const rec = {
      id: `exam-${Date.now()}`,
      ...attempt,
      createdAt: new Date().toISOString(),
    };
    await db.examAttempts.put(rec);
    await logStudyActivity({ minutesStudied: 10, examDrills: 1 });
    setActivityLogs(await db.activityLogs.toArray());
    toast.success(`Auswertung gespeichert (${attempt.totalScore} / ${attempt.maxScore} Pkt.)`);
  };

  const handlePlayDemoAudio = async (unit) => {
    const blob = createDemoSofaTrackBlob(12);
    setActiveAudioTrack({
      id: "demo-sofa-track",
      title: unit ? `Sofa-Fokus: ${unit.section_num} ${unit.title}` : "Sofa-Fokus Einstieg",
      subtitle: unit ? `${unit.page_label} · Entspannter Audio-Start` : "EWS Lernstudio",
      domain: unit?.domain || "A",
      blob,
      autoPlay: true,
    });
    await logStudyActivity({ minutesStudied: 5, podcastListened: true });
    setActivityLogs(await db.activityLogs.toArray());
  };

  const handleSavePodcastFile = async ({ unitId, domain, title, blob, mimeType }) => {
    const item = {
      id: `pod-${Date.now()}`,
      unitId,
      domain,
      title,
      blob,
      mimeType,
      createdAt: new Date().toISOString(),
    };
    await db.podcasts.put(item);
    const rows = await db.podcasts.orderBy("createdAt").reverse().toArray();
    setPodcasts(rows);
    toast.success(`Podcast „${title}“ für den Offline-Zugmodus gespeichert!`);
  };

  const handleDeletePodcast = async (id) => {
    await db.podcasts.delete(id);
    setPodcasts(await db.podcasts.orderBy("createdAt").reverse().toArray());
  };

  const handleJumpToDomainHint = (targetDomain, hintText = "") => {
    const domId = ["A", "B", "C"].includes(targetDomain) ? targetDomain : "A";
    setActiveDomainId(domId);
    const dom = (coursePack.domains || []).find((d) => d.id === domId);
    if (dom?.units?.length) {
      const m = hintText.match(/(\d+\.\d+)/);
      const found =
        (m && dom.units.find((u) => u.section_num.includes(m[1]))) ||
        dom.units.find((u) => hintText.toLowerCase().includes(u.title.toLowerCase().slice(0, 12))) ||
        dom.units[0];
      setActiveUnitId(found.id);
    }
    setActiveView("scripts");
  };

  const handleCommandSelect = (item) => {
    if (item.kind === "unit") {
      setActiveDomainId(item.domain);
      setActiveUnitId(item.unitId);
      setActiveView("scripts");
    } else if (item.kind === "operator") {
      setActiveView("exam");
    } else if (item.kind === "confusion") {
      setActiveView("cards");
    }
  };

  const handleExportBackup = async () => {
    const data = await exportFullBackupJson();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ews-lernstudio-backup-${todayDateKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Lokales Backup heruntergeladen.");
  };

  const handleImportBackup = async (file) => {
    try {
      const txt = await file.text();
      const parsed = JSON.parse(txt);
      await importFullBackupJson(parsed);
      await refreshFromDb();
      toast.success("Lernstand erfolgreich wiederhergestellt!");
    } catch (err) {
      toast.error(err.message || "Backup konnte nicht gelesen werden.");
    }
  };

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="lx-app-shell">
        {/* PC Widescreen Seitenleiste (>= 960px) */}
        <aside className="lx-sidebar" data-testid="desktop-sidebar">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 4px" }}>
            <div className="min-w-0">
              <div style={{ fontWeight: 700, fontSize: 15.5, letterSpacing: "-0.02em", color: "var(--fg)" }}>
                EWS Lernstudio
              </div>
              <div style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>
                Psychologie · Grundschule
              </div>
            </div>
            <button
              type="button"
              className="lx-icon-btn"
              onClick={toggleTheme}
              aria-label="Hell-/Dunkelmodus umschalten"
              title={theme === "dark" ? "Zu Warm-Papier (Hell) wechseln" : "Zu Abend-Graphit (Dunkel) wechseln"}
              data-testid="sidebar-theme-toggle"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

          {/* Ctrl+K Befehlspalette */}
          <button
            type="button"
            className="lx-btn"
            style={{ width: "100%", justifyContent: "space-between", minHeight: 38, background: "var(--bg-surface)" }}
            onClick={() => setCmdOpen(true)}
            data-testid="open-cmdk-btn"
          >
            <span style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--fg-muted)" }}>
              <Search size={14} />
              <span>Begriff / Seite...</span>
            </span>
            <Kbd>Ctrl+K</Kbd>
          </button>

          <nav style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }} aria-label="Hauptnavigation">
            {DESKTOP_NAV.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`lx-nav-item ${active ? "is-active" : ""}`}
                  onClick={() => setActiveView(item.id)}
                  data-testid={`nav-${item.id}`}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon size={16} strokeWidth={1.9} />
                    <span>{item.label}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Ruhige Skript-Direktwahl + Offline-Status */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              className="lx-card"
              style={{ padding: "11px 12px", display: "flex", flexDirection: "column", gap: 6, background: "var(--bg-surface)" }}
            >
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", color: "var(--fg-muted)" }}>
                DEIN 300-SEITEN-ORDNER
              </span>
              {[
                { id: "A", label: "A · Lernen & Lehren", p: "108 S." },
                { id: "B", label: "B · Entwicklung", p: "82 S." },
                { id: "C", label: "C · Diagnostik", p: "73 S." },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    handleSelectDomain(d.id);
                    setActiveView("scripts");
                  }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    border: "none",
                    background: "transparent",
                    padding: "4px 2px",
                    cursor: "pointer",
                    color: "var(--fg-secondary)",
                    fontSize: 12.5,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: `var(--domain-${d.id.toLowerCase()})`,
                      }}
                    />
                    <span>{d.label}</span>
                  </span>
                  <span className="tabular" style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>
                    {d.p}
                  </span>
                </button>
              ))}
            </div>

            <StatusBadge
              label={isOffline ? "Zug-Offline-Modus" : "Lokal & Offline-bereit"}
              tone={isOffline ? "warning" : "success"}
            />
          </div>
        </aside>

        {/* Schlanke native iOS Topbar NUR auf Mobile (< 960px) */}
        <header className="lx-mobile-topbar no-print">
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span
              className={`lx-dot ${isOffline ? "lx-dot-warning" : "lx-dot-success"}`}
              title={isOffline ? "Offline" : "Bereit"}
            />
            <strong style={{ fontSize: 15, letterSpacing: "-0.015em" }} className="truncate">
              EWS Lernstudio
            </strong>
            {isOffline && <WifiOff size={13} style={{ color: "var(--dot-warning)" }} />}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              className="lx-icon-btn"
              style={{ width: 38, height: 38, background: "var(--bg-subtle)" }}
              onClick={() => setCmdOpen(true)}
              aria-label="Schnellsuche öffnen"
            >
              <Search size={16} />
            </button>
            <button
              type="button"
              className="lx-icon-btn"
              style={{ width: 38, height: 38, background: "var(--bg-subtle)" }}
              onClick={toggleTheme}
              aria-label="Darstellung Hell oder Dunkel wählen"
              data-testid="topbar-theme-toggle"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* Haupt-Arbeitsfläche */}
        <main className="lx-main-workspace">
          {activeView === "today" && (
            <TodayDashboardView
              allUnits={allUnits}
              unitProgressMap={unitProgressMap}
              confusionCounts={confusionCounts}
              confusionPairs={coursePack.confusionPairs || []}
              examSets={coursePack.examBank?.testformat_sets || []}
              todayLog={todayLog}
              weeklyGrowth={weeklyGrowth}
              examDate={settings.examDate}
              onUpdateExamDate={(val) => handleUpdateSetting("examDate", val)}
              onStartStep={(step) => {
                if (step.domain) setActiveDomainId(step.domain);
                if (step.unitId) {
                  setActiveUnitId(step.unitId);
                  setPodcastFocusUnitId(step.unitId);
                }
                if (step.examSetId) setSelectedExamSetId(step.examSetId);
                setActiveView(step.targetView || "scripts");
              }}
              onStartSofaDemoAudio={handlePlayDemoAudio}
              onTriggerBonusRound={async (bonus) => {
                await logStudyActivity({ minutesStudied: 12, bonusRounds: 1 });
                setActivityLogs(await db.activityLogs.toArray());
                if (bonus.domain) setActiveDomainId(bonus.domain);
                if (bonus.unitId) setActiveUnitId(bonus.unitId);
                setActiveView("scripts");
                toast.success("+12-Min.-Bonus-Etappe gestartet – viel Freude im Flow!");
              }}
            />
          )}

          {activeView === "scripts" && (
            <AnchorScriptsView
              domains={coursePack.domains || []}
              activeDomainId={activeDomainId}
              activeUnitId={activeUnitId}
              onSelectDomain={handleSelectDomain}
              onSelectUnit={(id) => setActiveUnitId(id)}
              unitProgressMap={unitProgressMap}
              notesMap={notesMap}
              onUpdateProgress={handleUpdateUnitProgress}
              onSaveNote={handleSaveNote}
              onOpenPodcastForUnit={(u) => {
                setPodcastFocusUnitId(u.id);
                setActiveView("podcast");
              }}
              onJumpToDomainHint={handleJumpToDomainHint}
            />
          )}

          {activeView === "graph" && (
            <KnowledgeGraphView
              graphData={coursePack.knowledgeGraph}
              unitProgressMap={unitProgressMap}
              onJumpToDomainHint={handleJumpToDomainHint}
            />
          )}

          {activeView === "cards" && (
            <FlashcardsTrainerView
              flashcards={coursePack.flashcards || []}
              fsrsStatesMap={fsrsStatesMap}
              confusionCounts={confusionCounts}
              dailyCardCap={settings.dailyCardCap || 18}
              onReviewCard={handleReviewCard}
              onJumpToUnit={(dom, uid) => {
                setActiveDomainId(dom);
                setActiveUnitId(uid);
                setActiveView("scripts");
              }}
            />
          )}

          {activeView === "exam" && (
            <ExamSimulatorView
              examBank={coursePack.examBank}
              operatorsData={coursePack.operatorsData}
              initialSetId={selectedExamSetId}
              onRecordExamAttempt={handleRecordExamAttempt}
            />
          )}

          {activeView === "podcast" && (
            <PodcastHubView
              allUnits={allUnits}
              confusionPairs={coursePack.confusionPairs || []}
              confusionCounts={confusionCounts}
              podcasts={podcasts}
              selectedUnitId={podcastFocusUnitId || activeUnitId}
              onSavePodcastFile={handleSavePodcastFile}
              onDeletePodcast={handleDeletePodcast}
              onPlayTrack={(track) => setActiveAudioTrack(track)}
              onPlayDemoTrack={handlePlayDemoAudio}
            />
          )}

          {activeView === "downloads" && (
            <DownloadsAndSettingsView
              settings={settings}
              courseStats={validation.stats}
              onUpdateSetting={handleUpdateSetting}
              onRunSupabaseSync={() =>
                performSupabaseSync(settings).then(async (res) => {
                  await refreshFromDb();
                  return res;
                })
              }
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
            />
          )}
        </main>

        {/* Fixierte Frosted-Glass-Bottom-Navigation auf ihrem iPhone (< 960px) */}
        <nav className="lx-mobile-bottom-nav" aria-label="iPhone Schnellnavigation" data-testid="mobile-bottom-nav">
          {[
            { id: "today", label: "Heute", icon: Compass },
            { id: "scripts", label: "Skripte", icon: BookOpen },
            { id: "cards", label: "Karten", icon: Layers },
            { id: "exam", label: "Examen", icon: Scale },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                type="button"
                className={`lx-mobile-nav-btn ${activeView === m.id ? "is-active" : ""}`}
                onClick={() => setActiveView(m.id)}
                data-testid={`mobile-nav-${m.id}`}
              >
                <Icon size={18} strokeWidth={2} />
                <span>{m.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            className={`lx-mobile-nav-btn ${
              ["graph", "podcast", "downloads"].includes(activeView) ? "is-active" : ""
            }`}
            onClick={() => setMobileMoreOpen(true)}
            data-testid="mobile-nav-more"
          >
            <Menu size={18} strokeWidth={2} />
            <span>Mehr</span>
          </button>
        </nav>

        {/* Vaul Mehr-Menü auf dem iPhone */}
        <Drawer.Root open={mobileMoreOpen} onOpenChange={setMobileMoreOpen}>
          <Drawer.Portal>
            <Drawer.Overlay className="lx-vaul-overlay" />
            <Drawer.Content className="lx-vaul-content" aria-describedby={undefined}>
              <div className="lx-vaul-handle" />
              <Drawer.Title style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                Weitere Werkzeuge
              </Drawer.Title>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { id: "graph", label: "Wissensnetz & Theorie-Brücken", icon: Brain },
                  { id: "podcast", label: "NotebookLM Sofa- & Zug-Podcast-Hub", icon: Headphones },
                  { id: "downloads", label: "Word-Skripte (.docx), Anki (.apkg) & Sync", icon: Download },
                ].map((it) => {
                  const Icon = it.icon;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      className="lx-btn"
                      style={{ justifyContent: "flex-start", minHeight: 48, gap: 10 }}
                      onClick={() => {
                        setActiveView(it.id);
                        setMobileMoreOpen(false);
                      }}
                      data-testid={`mobile-more-${it.id}`}
                    >
                      <Icon size={17} />
                      <span>{it.label}</span>
                    </button>
                  );
                })}
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>

        <AudioMiniDock
          activeTrack={activeAudioTrack}
          onClose={() => setActiveAudioTrack(null)}
          onCompleteTrack={async () => {
            await logStudyActivity({ minutesStudied: 6, podcastListened: true });
            setActivityLogs(await db.activityLogs.toArray());
          }}
        />

        <CommandPalette
          open={cmdOpen}
          onOpenChange={setCmdOpen}
          searchItems={searchIndex}
          onSelectItem={handleCommandSelect}
          onNavigate={(viewId) => setActiveView(viewId)}
        />
      </div>
    </>
  );
}
