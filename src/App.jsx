import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { Drawer } from "vaul";
import {
  BookOpen,
  Brain,
  Calendar,
  Compass,
  Download,
  FolderPlus,
  Headphones,
  Layers,
  Lock,
  Menu,
  Moon,
  Pause,
  Play,
  Scale,
  Search,
  Smartphone,
  Sun,
  Timer,
  Users,
  WifiOff,
} from "lucide-react";
import { usePrefs } from "./design/StudioPrefsProvider";
import { Kbd, StatusBadge } from "./design/ui";
import { getActiveCoursePack, listAllCoursePacks } from "./lib/coursePackRegistry";
import { validateCoursePack, buildCommandSearchIndex } from "./lib/courseSchema";
import { createInitialFsrsRecord, reviewCard, Rating } from "./lib/fsrsEngine";
import { createEmptyCustomCourse, parseRawNotesIntoUnitAndCards } from "./lib/customCourseBuilder";
import { computeNonPunitiveStreak, computeTotalLearnerXp, computeLevelInfo } from "./lib/gamificationEngine";
import {
  db,
  MAIN_PROFILE_ID,
  DEFAULT_MAIN_PROFILE,
  DEFAULT_SETTINGS,
  ensureProfilesInitialized,
  createProfile,
  deleteSecondaryProfile,
  loadSettings,
  saveSetting,
  loadProfileDataSlice,
  upsertUnitProgress,
  saveUnitNote,
  saveFsrsCardRecord,
  logStudyActivity,
  incrementConfusionStat,
  saveCustomCourse,
  loadCustomCourses,
  exportFullBackupJson,
  importFullBackupJson,
  todayDateKey,
} from "./lib/db";
import {
  performSupabaseSync,
  signInWithGoogleOAuth,
  getCurrentGoogleUser,
  signOutGoogleAccount,
} from "./lib/syncEngine";
import { createDemoSofaTrackBlob } from "./lib/audioSynthesizer";
import { CommandPalette } from "./components/CommandPalette";
import { AudioMiniDock } from "./components/AudioMiniDock";
import { FocusTimerModal } from "./components/FocusTimerModal";
import { StudyCalendarModal } from "./components/StudyCalendarModal";
import { ProfileAndCourseModal } from "./components/ProfileAndCourseModal";
import { InstallAndStarterModal } from "./components/InstallAndStarterModal";
import { TodayDashboardView } from "./views/TodayDashboardView";
import { AnchorScriptsView } from "./views/AnchorScriptsView";
import { KnowledgeGraphView } from "./views/KnowledgeGraphView";
import { FlashcardsTrainerView } from "./views/FlashcardsTrainerView";
import { ExamSimulatorView } from "./views/ExamSimulatorView";
import { PodcastHubView } from "./views/PodcastHubView";
import { DownloadsAndSettingsView, downloadExportFileWithFallback } from "./views/DownloadsAndSettingsView";

const DESKTOP_NAV = [
  { id: "today", label: "Heute & Fahrplan", icon: Compass },
  { id: "scripts", label: "Skripte (Blätter-Modus)", icon: BookOpen },
  { id: "graph", label: "Theorie-Brücken", icon: Brain },
  { id: "cards", label: "Karten-Sprint", icon: Layers },
  { id: "exam", label: "Examens-Trainer", icon: Scale },
  { id: "podcast", label: "Sofa-Podcast-Hub", icon: Headphones },
  { id: "downloads", label: "PDFs, App-Starter & Sync", icon: Download },
];

function formatClock(totalSecs) {
  const m = String(Math.floor(totalSecs / 60)).padStart(2, "0");
  const s = String(totalSecs % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function App() {
  const { theme, toggleTheme } = usePrefs();

  const [profiles, setProfiles] = useState([DEFAULT_MAIN_PROFILE]);
  const [customCourses, setCustomCourses] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [googleUser, setGoogleUser] = useState(null);

  const activeProfileId = settings.activeProfileId || MAIN_PROFILE_ID;
  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) || profiles[0] || DEFAULT_MAIN_PROFILE,
    [profiles, activeProfileId]
  );

  const courseList = useMemo(() => listAllCoursePacks(customCourses), [customCourses]);
  const coursePack = useMemo(
    () => getActiveCoursePack(settings.activeCourseId, customCourses),
    [settings.activeCourseId, customCourses]
  );
  const validation = useMemo(() => validateCoursePack(coursePack), [coursePack]);
  const searchIndex = useMemo(() => buildCommandSearchIndex(coursePack), [coursePack]);

  const allUnits = useMemo(() => (coursePack.domains || []).flatMap((d) => d.units || []), [coursePack]);

  const [activeView, setActiveView] = useState("today");
  const [activeDomainId, setActiveDomainId] = useState("A");
  const [activeUnitId, setActiveUnitId] = useState(() => allUnits[0]?.id || "A-01-01");
  const [selectedExamSetId, setSelectedExamSetId] = useState(null);
  const [podcastFocusUnitId, setPodcastFocusUnitId] = useState(null);
  const [podcastInitialMode, setPodcastInitialMode] = useState("sofa_intro");

  const [cmdOpen, setCmdOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [focusTimerOpen, setFocusTimerOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState("profiles");
  const [starterModalOpen, setStarterModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // Live-Lernuhr (startet automatisch beim Lernen oder per 1-Klick in Sidebar/Topbar!)
  const [studyClockRunning, setStudyClockRunning] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const clockHintShownRef = useRef(false);

  const [isOffline, setIsOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false);
  const [activeAudioTrack, setActiveAudioTrack] = useState(null);

  const [unitProgressMap, setUnitProgressMap] = useState({});
  const [notesMap, setNotesMap] = useState({});
  const [fsrsStatesMap, setFsrsStatesMap] = useState({});
  const [confusionCounts, setConfusionCounts] = useState({});
  const [podcasts, setPodcasts] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [examAttempts, setExamAttempts] = useState([]);

  const refreshFromDb = useCallback(async (overrideProfileId = null) => {
    try {
      const [profRows, customCourseRows] = await Promise.all([
        ensureProfilesInitialized(),
        loadCustomCourses(),
      ]);
      setProfiles(profRows);
      setCustomCourses(customCourseRows);

      const cfg = await loadSettings(overrideProfileId);
      setSettings(cfg);

      const slice = await loadProfileDataSlice(cfg.activeProfileId || MAIN_PROFILE_ID);
      setUnitProgressMap(slice.unitProgressMap);
      setNotesMap(slice.notesMap);
      setFsrsStatesMap(slice.fsrsStatesMap);
      setConfusionCounts(slice.confusionCounts);
      setPodcasts(slice.podcasts);
      setActivityLogs(slice.activityLogs);
      setExamAttempts(slice.examAttempts);

      if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
        setGoogleUser(await getCurrentGoogleUser(cfg));
      } else {
        setGoogleUser(null);
      }
    } catch {}
  }, []);

  useEffect(() => {
    refreshFromDb();
  }, [refreshFromDb]);

  // PWA Installations-Prompt abfangen
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Sekündlicher Tick der Live-Lernuhr (schreibt jede volle Minute +1 Min. in Dexie!)
  useEffect(() => {
    if (!studyClockRunning) return undefined;
    const id = setInterval(() => {
      setSessionSeconds((prev) => {
        const next = prev + 1;
        if (next % 60 === 0) {
          logStudyActivity({ minutesStudied: 1 }, new Date(), activeProfileId)
            .then(() => loadProfileDataSlice(activeProfileId))
            .then((slice) => setActivityLogs(slice.activityLogs))
            .catch(() => {});
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [studyClockRunning, activeProfileId]);

  const startClockAutomatically = () => {
    setStudyClockRunning((was) => {
      if (!was && !clockHintShownRef.current) {
        clockHintShownRef.current = true;
        toast.success("⏱️ Deine Lernuhr zählt jetzt automatisch mit!");
      }
      return true;
    });
  };

  useEffect(() => {
    if (allUnits.length > 0 && !allUnits.some((u) => u.id === activeUnitId)) {
      setActiveDomainId(allUnits[0].domain || "A");
      setActiveUnitId(allUnits[0].id);
    }
  }, [allUnits, activeUnitId]);

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

  const streakInfo = useMemo(() => computeNonPunitiveStreak(activityLogs), [activityLogs]);
  const levelInfo = useMemo(
    () =>
      computeLevelInfo(
        computeTotalLearnerXp({ activityLogs, unitProgressMap, fsrsStatesMap, examAttempts })
      ),
    [activityLogs, unitProgressMap, fsrsStatesMap, examAttempts]
  );

  const shakyCardIds = useMemo(
    () =>
      Object.values(fsrsStatesMap)
        .filter((r) => (r?.lapses || 0) > 0 || r?.lastRating === 1 || r?.lastRating === 2)
        .map((r) => r.cardId),
    [fsrsStatesMap]
  );

  const openProfileOrCourses = (tabName = "profiles") => {
    setProfileModalTab(tabName);
    setProfileModalOpen(true);
  };

  const handleSelectDomain = (domId) => {
    setActiveDomainId(domId);
    const dom = (coursePack.domains || []).find((d) => d.id === domId);
    if (dom?.units?.length) setActiveUnitId(dom.units[0].id);
  };

  const handleUpdateSetting = async (key, value) => {
    await saveSetting(key, value, activeProfileId);
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelectProfile = async (nextProfileId) => {
    await saveSetting("activeProfileId", nextProfileId, nextProfileId);
    await refreshFromDb(nextProfileId);
    const chosen = profiles.find((p) => p.id === nextProfileId);
    toast.success(`Profil gewechselt: ${chosen?.name || "Aktiv"}`);
  };

  const handleCreateProfile = async ({ name, avatarEmoji, subtitle }) => {
    const created = await createProfile({ name, avatarEmoji, subtitle });
    await saveSetting("activeProfileId", created.id, created.id);
    await refreshFromDb(created.id);
    toast.success(`Profil „${created.name}“ mit eigenem Lernstand angelegt!`);
  };

  const handleDeleteProfile = async (profId) => {
    try {
      await deleteSecondaryProfile(profId);
      const nextId = activeProfileId === profId ? MAIN_PROFILE_ID : activeProfileId;
      await saveSetting("activeProfileId", nextId, nextId);
      await refreshFromDb(nextId);
      toast.success("Zusatzprofil entfernt (Hauptprofil bleibt sicher geschützt).");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCreateCustomCourse = async ({ title, domainNames }) => {
    const newPack = createEmptyCustomCourse({
      title,
      primarySubject: settings.primarySubject || "Kunst",
      didacticSubject: settings.didacticSubject || "Sport",
      domainNames,
    });
    const { unit, cards } = parseRawNotesIntoUnitAndCards({
      courseId: newPack.id,
      domain: "A",
      unitTitle: `Überblick: ${title}`,
      pageLabel: "Start-Ankerblatt S. 1",
      rawText: `${title}: Eigenes Lernfach im universellen Lernstudio.\nKernziel: Strukturierte 1-Seiten-Ankerblätter und FSRS-Karten an einem Ort bündeln.`,
      existingUnitCount: 0,
    });
    newPack.domains[0].units.push(unit);
    newPack.flashcards.push(...cards);
    await saveCustomCourse(newPack, activeProfileId);
    await saveSetting("activeCourseId", newPack.id, activeProfileId);
    await refreshFromDb(activeProfileId);
    toast.success(`Neues Lernfach „${title}“ erstellt & aktiviert!`);
    return newPack;
  };

  const handleAddNotesToCustomCourse = async ({ courseId, domain, unitTitle, pageLabel, rawText }) => {
    const allCustom = await loadCustomCourses();
    const target = allCustom.find((c) => c.id === courseId);
    if (!target) return;
    const domObj = target.domains.find((d) => d.id === domain) || target.domains[0];
    const { unit, cards } = parseRawNotesIntoUnitAndCards({
      courseId: target.id,
      domain: domObj.id,
      unitTitle,
      pageLabel,
      rawText,
      existingUnitCount: domObj.units.length,
    });
    domObj.units.push(unit);
    target.flashcards = [...(target.flashcards || []), ...cards];
    target.updatedAt = new Date().toISOString();
    await saveCustomCourse(target, activeProfileId);
    await saveSetting("activeCourseId", target.id, activeProfileId);
    await refreshFromDb(activeProfileId);
    setActiveDomainId(domObj.id);
    setActiveUnitId(unit.id);
    setProfileModalOpen(false);
    setActiveView("scripts");
    toast.success(`Ankerblatt „${unitTitle}“ + ${cards.length} FSRS-Karten erzeugt!`);
  };

  const handleUpdateUnitProgress = async (unitId, domain, patch) => {
    const wasMastered = unitProgressMap[unitId]?.status === "mastered";
    const updated = await upsertUnitProgress(unitId, domain, patch, activeProfileId);
    setUnitProgressMap((prev) => ({ ...prev, [unitId]: updated }));
    if (!wasMastered && updated.status === "mastered") {
      await logStudyActivity({ minutesStudied: 12, unitsCompleted: 1 }, new Date(), activeProfileId);
      const slice = await loadProfileDataSlice(activeProfileId);
      setActivityLogs(slice.activityLogs);
      toast.success("Ankerblatt gemeistert (+55 XP im Atelier-Garten)!");
    }
  };

  const handleSaveNote = async (unitId, noteData) => {
    const saved = await saveUnitNote(unitId, noteData, activeProfileId);
    setNotesMap((prev) => ({ ...prev, [unitId]: saved }));
  };

  const handleReviewCard = async (card, rating) => {
    startClockAutomatically();
    const prevRec = fsrsStatesMap[card.id] || createInitialFsrsRecord(card.id);
    const nextRec = reviewCard(prevRec, rating);
    await saveFsrsCardRecord(nextRec, activeProfileId);
    setFsrsStatesMap((prev) => ({ ...prev, [card.id]: nextRec }));

    if (card.confusion_tag && (rating === Rating.Again || rating === Rating.Hard)) {
      const conf = await incrementConfusionStat(card.confusion_tag, 1, activeProfileId);
      if (conf) setConfusionCounts((prev) => ({ ...prev, [conf.pairId]: conf.count }));
    }

    await logStudyActivity({ minutesStudied: 1, cardsReviewed: 1 }, new Date(), activeProfileId);
    const slice = await loadProfileDataSlice(activeProfileId);
    setActivityLogs(slice.activityLogs);
  };

  const handleRecordExamAttempt = async (attempt) => {
    startClockAutomatically();
    const rec = {
      id: `exam-${Date.now()}`,
      profileId: activeProfileId,
      ...attempt,
      createdAt: new Date().toISOString(),
    };
    await db.examAttempts.put(rec);
    await logStudyActivity({ minutesStudied: 10, examDrills: 1 }, new Date(), activeProfileId);
    const slice = await loadProfileDataSlice(activeProfileId);
    setActivityLogs(slice.activityLogs);
    setExamAttempts(slice.examAttempts);
    toast.success(`Auswertung gespeichert (${attempt.totalScore} / ${attempt.maxScore} Pkt. · +65 XP)`);
  };

  const handlePlayDemoAudio = async (unit) => {
    startClockAutomatically();
    const blob = createDemoSofaTrackBlob(12);
    setActiveAudioTrack({
      id: "demo-sofa-track",
      title: unit ? `Sofa-Fokus: ${unit.section_num} ${unit.title}` : "Sofa-Fokus Einstieg",
      subtitle: unit ? `${unit.page_label} · Entspannter Audio-Start` : "EWS Lernstudio",
      domain: unit?.domain || "A",
      blob,
      autoPlay: true,
    });
    await logStudyActivity({ minutesStudied: 5, podcastListened: true }, new Date(), activeProfileId);
    const slice = await loadProfileDataSlice(activeProfileId);
    setActivityLogs(slice.activityLogs);
  };

  const handleSavePodcastFile = async ({ unitId, domain, title, blob, mimeType }) => {
    const item = {
      id: `pod-${Date.now()}`,
      profileId: activeProfileId,
      unitId,
      domain,
      title,
      blob,
      mimeType,
      createdAt: new Date().toISOString(),
    };
    await db.podcasts.put(item);
    const slice = await loadProfileDataSlice(activeProfileId);
    setPodcasts(slice.podcasts);
    toast.success(`Podcast „${title}“ für den Offline-Zugmodus gespeichert!`);
  };

  const handleDeletePodcast = async (id) => {
    await db.podcasts.delete(id);
    const slice = await loadProfileDataSlice(activeProfileId);
    setPodcasts(slice.podcasts);
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
    a.download = `lernstudio-backup-${todayDateKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Vollständiges Backup aller Profile & Fächer heruntergeladen.");
  };

  const handleImportBackup = async (file) => {
    try {
      const parsed = JSON.parse(await file.text());
      await importFullBackupJson(parsed);
      await refreshFromDb();
      toast.success("Lernstand erfolgreich wiederhergestellt!");
    } catch (err) {
      toast.error(err.message || "Backup konnte nicht gelesen werden.");
    }
  };

  const activeCourseTitle = coursePack.manifest?.title || "EWS Psychologie";

  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="lx-app-shell">
        {/* PC WIDESCREEN SEITENLEISTE (>= 960px) */}
        <aside className="lx-sidebar" data-testid="desktop-sidebar">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 4px" }}>
            <div className="min-w-0">
              <div style={{ fontWeight: 800, fontSize: 15.5, letterSpacing: "-0.02em", color: "var(--lilac)" }}>
                EWS Lernstudio
              </div>
              <div style={{ fontSize: 11.5, color: "var(--fg-muted)" }} className="truncate">
                {activeCourseTitle}
              </div>
            </div>
            <button
              type="button"
              className="lx-icon-btn"
              onClick={toggleTheme}
              aria-label="Hell-/Dunkelmodus umschalten"
              data-testid="sidebar-theme-toggle"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

          {/* Live-Lernuhr in der Sidebar */}
          <button
            type="button"
            className={`lx-clock-pill ${studyClockRunning ? "is-running" : ""}`}
            style={{ width: "100%", justifyContent: "space-between" }}
            onClick={() => setStudyClockRunning((v) => !v)}
            data-testid="live-study-clock-btn"
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {studyClockRunning ? <Pause size={13} /> : <Play size={13} />}
              <span>{studyClockRunning ? "Lernuhr läuft" : "Lernuhr starten"}</span>
            </span>
            <span className="tabular">{formatClock(sessionSeconds)}</span>
          </button>

          {/* Profil-Umschalter */}
          <button
            type="button"
            className="lx-card"
            onClick={() => openProfileOrCourses("profiles")}
            style={{
              padding: "9px 11px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              cursor: "pointer",
              textAlign: "left",
              background: "var(--bg-surface)",
            }}
            data-testid="sidebar-profile-btn"
          >
            <div className="min-w-0" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 17, flexShrink: 0 }}>{activeProfile.avatarEmoji || "🎨"}</span>
              <div className="min-w-0">
                <div style={{ fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                  <span className="truncate">{activeProfile.name}</span>
                  {activeProfile.isProtected && <Lock size={10} style={{ color: "var(--domain-b)", flexShrink: 0 }} />}
                </div>
                <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
                  {levelInfo.icon} St. {levelInfo.level} · {levelInfo.totalXp} XP
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            className="lx-btn"
            style={{ width: "100%", justifyContent: "space-between", minHeight: 36, background: "var(--bg-surface)" }}
            onClick={() => setCmdOpen(true)}
            data-testid="open-cmdk-btn"
          >
            <span style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--fg-muted)" }}>
              <Search size={14} />
              <span>Begriff / Seite...</span>
            </span>
            <Kbd>Ctrl+K</Kbd>
          </button>

          <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }} aria-label="Hauptnavigation">
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
                    <Icon size={16} strokeWidth={2} />
                    <span>{item.label}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          {/* App-Starter & Skript-Direktwahl */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              type="button"
              className="lx-btn lx-btn-primary"
              style={{ width: "100%", minHeight: 36, fontSize: 12.5 }}
              onClick={() => setStarterModalOpen(true)}
              data-testid="sidebar-starter-btn"
            >
              <Smartphone size={14} />
              <span>App-Icon (PC &amp; iPhone)</span>
            </button>

            <div className="lx-card" style={{ padding: "10px 11px", display: "flex", flexDirection: "column", gap: 5, background: "var(--bg-surface)" }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", color: "var(--fg-muted)" }}>
                {coursePack.manifest?.isCustom ? "THEMENFELDER" : "DEINE 3 SKRIPTE"}
              </span>
              {(coursePack.domains || []).map((d) => (
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
                    padding: "3px 2px",
                    cursor: "pointer",
                    color: "var(--fg-secondary)",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: `var(--domain-${d.id.toLowerCase()})`, flexShrink: 0 }} />
                    <span className="truncate">{d.title.replace(/^Skript [ABC]: /, `${d.id} · `).replace(/\s*\(\d+\s*S\.\)/, "")}</span>
                  </span>
                  <span className="tabular" style={{ fontSize: 11, color: "var(--fg-muted)", flexShrink: 0 }}>
                    {(d.units || []).length}
                  </span>
                </button>
              ))}
            </div>

            <StatusBadge
              label={isOffline ? "Offline-Zugmodus" : googleUser ? `Cloud: ${googleUser.email}` : "Lokal & Offline-bereit"}
              tone={isOffline ? "warning" : "success"}
            />
          </div>
        </aside>

        {/* SCHLANKE NATIVE IOS TOPBAR NUR AUF MOBILE (< 960px) */}
        <header className="lx-mobile-topbar no-print">
          <button
            type="button"
            onClick={() => openProfileOrCourses("profiles")}
            style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, border: "none", background: "transparent", padding: 0, color: "var(--fg)", cursor: "pointer", textAlign: "left" }}
            aria-label="Profil und Lernfach wechseln"
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                background: "var(--lilac-soft)",
                border: "1px solid var(--lilac-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {activeProfile.avatarEmoji || "🎨"}
            </span>
            <div className="min-w-0">
              <strong style={{ fontSize: 14, color: "var(--lilac)", display: "block", lineHeight: 1.15 }} className="truncate">
                EWS Lernstudio
              </strong>
              <span style={{ fontSize: 10.5, color: "var(--fg-muted)", display: "block", lineHeight: 1.15 }} className="truncate">
                {activeProfile.name}
              </span>
            </div>
            {isOffline && <WifiOff size={13} style={{ color: "var(--dot-warning)", flexShrink: 0 }} />}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <button
              type="button"
              className={`lx-clock-pill ${studyClockRunning ? "is-running" : ""}`}
              style={{ padding: "3px 9px", minHeight: 32, fontSize: 11.5 }}
              onClick={() => setStudyClockRunning((v) => !v)}
              aria-label="Lernuhr starten oder pausieren"
            >
              {studyClockRunning ? <Pause size={11} /> : <Timer size={12} />}
              <span className="tabular">{formatClock(sessionSeconds)}</span>
            </button>
            <button type="button" className="lx-icon-btn" style={{ width: 34, height: 34, background: "var(--bg-subtle)" }} onClick={() => setCmdOpen(true)} aria-label="Schnellsuche öffnen">
              <Search size={15} />
            </button>
            <button type="button" className="lx-icon-btn" style={{ width: 34, height: 34, background: "var(--bg-subtle)" }} onClick={toggleTheme} aria-label="Darstellung Hell oder Dunkel wählen" data-testid="topbar-theme-toggle">
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </header>

        {/* HAUPT-ARBEITSFLÄCHE */}
        <main className={`lx-main-workspace ${activeAudioTrack ? "has-audio-dock" : ""}`}>
          <AudioMiniDock
            activeTrack={activeAudioTrack}
            onClose={() => setActiveAudioTrack(null)}
            onCompleteTrack={async () => {
              await logStudyActivity({ minutesStudied: 6, podcastListened: true }, new Date(), activeProfileId);
              const slice = await loadProfileDataSlice(activeProfileId);
              setActivityLogs(slice.activityLogs);
            }}
          />
          {activeView === "today" && (
            <TodayDashboardView
              allUnits={allUnits}
              unitProgressMap={unitProgressMap}
              fsrsStatesMap={fsrsStatesMap}
              examAttempts={examAttempts}
              activityLogs={activityLogs}
              confusionCounts={confusionCounts}
              confusionPairs={coursePack.confusionPairs || []}
              examSets={coursePack.examBank?.testformat_sets || []}
              todayLog={todayLog}
              examDate={settings.examDate}
              dailyTargetMinutes={settings.dailyTargetMinutes || 32}
              energyMode={settings.energyMode || "normal"}
              activeProfile={activeProfile}
              activeCourseTitle={activeCourseTitle}
              studyClockRunning={studyClockRunning}
              onToggleStudyClock={() => setStudyClockRunning((v) => !v)}
              onChangeEnergyMode={(mode) => handleUpdateSetting("energyMode", mode)}
              onOpenProfileModal={openProfileOrCourses}
              onOpenCalendarModal={() => setCalendarOpen(true)}
              onOpenFocusTimer={() => setFocusTimerOpen(true)}
              onOpenInstallStarter={() => setStarterModalOpen(true)}
              onOpenWeaknessPodcast={() => {
                setPodcastInitialMode("personal_weakness");
                setActiveView("podcast");
              }}
              onStartStep={(step) => {
                startClockAutomatically();
                if (step.domain) setActiveDomainId(step.domain);
                if (step.unitId) {
                  setActiveUnitId(step.unitId);
                  setPodcastFocusUnitId(step.unitId);
                }
                if (step.examSetId) setSelectedExamSetId(step.examSetId);
                if (step.targetView === "podcast") setPodcastInitialMode("sofa_intro");
                setActiveView(step.targetView || "scripts");
              }}
              onStartSofaDemoAudio={handlePlayDemoAudio}
              onTriggerBonusRound={async (bonus) => {
                startClockAutomatically();
                await logStudyActivity({ minutesStudied: 12, bonusRounds: 1 }, new Date(), activeProfileId);
                const slice = await loadProfileDataSlice(activeProfileId);
                setActivityLogs(slice.activityLogs);
                if (bonus.domain) setActiveDomainId(bonus.domain);
                if (bonus.unitId) setActiveUnitId(bonus.unitId);
                setActiveView("scripts");
                toast.success("+12-Min.-Bonus-Etappe gestartet (+40 XP im Flow)!");
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
                setPodcastInitialMode("sofa_intro");
                setActiveView("podcast");
              }}
              onJumpToDomainHint={handleJumpToDomainHint}
              onDownloadExport={downloadExportFileWithFallback}
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
              flashcards={coursePack.flashcards || []}
              shakyCardIds={shakyCardIds}
              confusionPairs={coursePack.confusionPairs || []}
              confusionCounts={confusionCounts}
              podcasts={podcasts}
              selectedUnitId={podcastFocusUnitId || activeUnitId}
              initialMode={podcastInitialMode}
              primarySubject={settings.primarySubject || "Kunst"}
              didacticSubject={settings.didacticSubject || "Sport"}
              onSavePodcastFile={handleSavePodcastFile}
              onDeletePodcast={handleDeletePodcast}
              onPlayTrack={(track) => {
                startClockAutomatically();
                setActiveAudioTrack(track);
              }}
              onPlayDemoTrack={handlePlayDemoAudio}
            />
          )}

          {activeView === "downloads" && (
            <DownloadsAndSettingsView
              settings={settings}
              courseStats={validation.stats}
              activeProfile={activeProfile}
              googleUser={googleUser}
              onUpdateSetting={handleUpdateSetting}
              onOpenProfileModal={openProfileOrCourses}
              onOpenCalendarModal={() => setCalendarOpen(true)}
              onOpenInstallStarter={() => setStarterModalOpen(true)}
              onGoogleSignIn={() => signInWithGoogleOAuth(settings)}
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

        {/* IPHONE BOTTOM NAVIGATION (< 960px) */}
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
            className={`lx-mobile-nav-btn ${["graph", "podcast", "downloads"].includes(activeView) ? "is-active" : ""}`}
            onClick={() => setMobileMoreOpen(true)}
            data-testid="mobile-nav-more"
          >
            <Menu size={18} strokeWidth={2} />
            <span>Mehr</span>
          </button>
        </nav>

        <Drawer.Root open={mobileMoreOpen} onOpenChange={setMobileMoreOpen}>
          <Drawer.Portal>
            <Drawer.Overlay className="lx-vaul-overlay" />
            <Drawer.Content className="lx-vaul-content" aria-describedby={undefined}>
              <div className="lx-vaul-handle" />
              <Drawer.Title style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                Weitere Werkzeuge &amp; PDFs
              </Drawer.Title>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, overflowY: "auto" }}>
                {[
                  { id: "graph", label: "Theorie-Brücken (A ↔ B ↔ C)", icon: Brain, action: () => setActiveView("graph") },
                  { id: "podcast", label: "NotebookLM Sofa- & Zug-Podcast-Hub", icon: Headphones, action: () => setActiveView("podcast") },
                  { id: "downloads", label: "Hochformat-PDFs, Word, Anki & Cloud-Sync", icon: Download, action: () => setActiveView("downloads") },
                  { id: "starter", label: "App-Icon & QR-Code (Homescreen)", icon: Smartphone, action: () => setStarterModalOpen(true) },
                  { id: "profiles", label: "Profile (Sie / Christian) & Google-Login", icon: Users, action: () => openProfileOrCourses("profiles") },
                  { id: "courses", label: "+ Eigenes Studienfach / Skript anlegen", icon: FolderPlus, action: () => openProfileOrCourses("courses") },
                  { id: "calendar", label: "Lernkalender & iPhone-Export (.ics)", icon: Calendar, action: () => setCalendarOpen(true) },
                ].map((it) => {
                  const Icon = it.icon;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      className="lx-btn"
                      style={{ justifyContent: "flex-start", minHeight: 46, gap: 10 }}
                      onClick={() => {
                        setMobileMoreOpen(false);
                        it.action();
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

        <FocusTimerModal
          open={focusTimerOpen}
          onOpenChange={setFocusTimerOpen}
          onCompleteSession={async (mins) => {
            await logStudyActivity({ minutesStudied: mins }, new Date(), activeProfileId);
            const slice = await loadProfileDataSlice(activeProfileId);
            setActivityLogs(slice.activityLogs);
            toast.success(`${mins} Minuten Fokus geschafft (+35 XP)!`);
          }}
        />

        <StudyCalendarModal
          open={calendarOpen}
          onOpenChange={setCalendarOpen}
          examDate={settings.examDate}
          preferredHour={settings.preferredStudyHour || 16}
          dailyMinutes={settings.dailyTargetMinutes || 32}
          profileName={activeProfile.name}
          courseTitle={activeCourseTitle}
          allUnits={allUnits}
          activityLogs={activityLogs}
          protectedPauseDays={streakInfo.protectedPauseDays}
          onUpdateExamDate={(val) => handleUpdateSetting("examDate", val)}
          onUpdatePreferredHour={(h) => handleUpdateSetting("preferredStudyHour", h)}
        />

        <InstallAndStarterModal
          open={starterModalOpen}
          onOpenChange={setStarterModalOpen}
          deferredPrompt={deferredPrompt}
          onTriggerBrowserInstall={async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            setDeferredPrompt(null);
          }}
          onOpenDownloadsSync={() => setActiveView("downloads")}
        />

        <ProfileAndCourseModal
          open={profileModalOpen}
          onOpenChange={setProfileModalOpen}
          initialTab={profileModalTab}
          profiles={profiles}
          activeProfileId={activeProfileId}
          onSelectProfile={handleSelectProfile}
          onCreateProfile={handleCreateProfile}
          onDeleteProfile={handleDeleteProfile}
          googleUser={googleUser}
          onGoogleSignIn={() => signInWithGoogleOAuth(settings)}
          onGoogleSignOut={async () => {
            await signOutGoogleAccount(settings);
            setGoogleUser(null);
            toast.success("Von Google-Account abgemeldet (lokale Daten bleiben erhalten).");
          }}
          onRunSync={async () => {
            try {
              const res = await performSupabaseSync(settings);
              await refreshFromDb();
              toast.success(res.message);
            } catch (err) {
              toast.error(err.message);
            }
          }}
          courseList={courseList}
          activeCourseId={settings.activeCourseId}
          onSelectCourse={async (cid) => {
            await handleUpdateSetting("activeCourseId", cid);
            setProfileModalOpen(false);
            toast.success("Lernfach gewechselt!");
          }}
          onCreateCustomCourse={handleCreateCustomCourse}
          onAddNotesToCustomCourse={handleAddNotesToCustomCourse}
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
