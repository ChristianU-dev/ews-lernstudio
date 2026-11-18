import React, { useState } from "react";
import {
  BookPlus,
  Check,
  Cloud,
  FolderPlus,
  Lock,
  LogOut,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { Modal } from "../design/ui";
import { MAIN_PROFILE_ID } from "../lib/db";

const AVATAR_EMOJIS = ["🎨", "🚀", "🌿", "🧠", "⚡", "📚", "🏆", "🎧"];

export function ProfileAndCourseModal({
  open,
  onOpenChange,
  initialTab = "profiles",
  profiles = [],
  activeProfileId = MAIN_PROFILE_ID,
  onSelectProfile,
  onCreateProfile,
  onDeleteProfile,
  googleUser = null,
  onGoogleSignIn,
  onGoogleSignOut,
  onRunSync,
  courseList = [],
  activeCourseId = "ews-psychologie",
  onSelectCourse,
  onCreateCustomCourse,
  onAddNotesToCustomCourse,
}) {
  const [tab, setTab] = useState(initialTab);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileEmoji, setNewProfileEmoji] = useState("🚀");
  const [authStatus, setAuthStatus] = useState("");

  // Custom Course Creator State
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [domA, setDomA] = useState("Themenfeld A");
  const [domB, setDomB] = useState("Themenfeld B");
  const [domC, setDomC] = useState("Themenfeld C");

  // Smart Notes-to-Anchor-Sheet Converter State
  const customCoursesOnly = courseList.filter((c) => c.isCustom);
  const [targetCourseId, setTargetCourseId] = useState("");
  const [noteDomain, setNoteDomain] = useState("A");
  const [noteTitle, setNoteTitle] = useState("");
  const [notePageRef, setNotePageRef] = useState("Vorlesung S. 1–4");
  const [rawNotes, setRawNotes] = useState("");

  const effectiveTargetCourseId = targetCourseId || customCoursesOnly[0]?.id || "";

  const handleAddProfile = async (presetName = null, presetEmoji = null) => {
    const name = (presetName || newProfileName).trim();
    if (!name) return;
    await onCreateProfile({
      name,
      avatarEmoji: presetEmoji || newProfileEmoji,
      subtitle: presetName === "Christian" ? "Eigenes Lern- & Projektprofil" : "Eigenes Studienprofil",
    });
    setNewProfileName("");
  };

  const handleGoogleLoginClick = async () => {
    setAuthStatus("Verbinde mit Google...");
    try {
      await onGoogleSignIn();
      setAuthStatus("Weiterleitung zu Google...");
    } catch (err) {
      setAuthStatus(err.message || "Google-Login benötigt Supabase-URL in den Einstellungen.");
    }
  };

  const handleCreateSubject = async () => {
    if (!newCourseTitle.trim()) return;
    const created = await onCreateCustomCourse({
      title: newCourseTitle.trim(),
      domainNames: [domA || "Gebiet A", domB || "Gebiet B", domC || "Gebiet C"],
    });
    setNewCourseTitle("");
    if (created?.id) setTargetCourseId(created.id);
  };

  const handleConvertNotes = async () => {
    if (!effectiveTargetCourseId || !noteTitle.trim() || !rawNotes.trim()) return;
    await onAddNotesToCustomCourse({
      courseId: effectiveTargetCourseId,
      domain: noteDomain,
      unitTitle: noteTitle.trim(),
      pageLabel: notePageRef.trim() || "Eigene Notiz",
      rawText: rawNotes,
    });
    setNoteTitle("");
    setRawNotes("");
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Universeller Lern-Buddy · Profile, Google-Cloud & Eigene Fächer"
      subtitle="Getrennte Lernstände (ihr Staatsexamens-Profil ist fest geschützt!) + Baukasten für jedes weitere Studienfach."
      width={620}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 10 }}>
        {/* 2-Tab Umschalter */}
        <div className="lx-segmented" style={{ gridTemplateColumns: "1fr 1fr", display: "grid", width: "100%" }}>
          <button
            type="button"
            className={`lx-seg-btn ${tab === "profiles" ? "is-active" : ""}`}
            onClick={() => setTab("profiles")}
            data-testid="modal-tab-profiles"
          >
            <Users size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
            <span>Profile &amp; Google-Account</span>
          </button>
          <button
            type="button"
            className={`lx-seg-btn ${tab === "courses" ? "is-active" : ""}`}
            onClick={() => setTab("courses")}
            data-testid="modal-tab-courses"
          >
            <FolderPlus size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
            <span>Lernfächer &amp; Eigene Skripte</span>
          </button>
        </div>

        {tab === "profiles" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {/* Aktive Profile */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <strong style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
                BENUTZERPROFILE AUF DIESEM GERÄT (100 % GETRENNTE LERNSTÄNDE)
              </strong>
              {profiles.map((p) => {
                const isActive = p.id === activeProfileId;
                return (
                  <div
                    key={p.id}
                    className="lx-card lx-card-subtle"
                    style={{
                      padding: "11px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      borderColor: isActive ? "var(--domain-b)" : "var(--border)",
                      background: isActive ? "var(--bg-surface)" : "var(--bg-subtle)",
                    }}
                  >
                    <div className="min-w-0" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 999,
                          background: "var(--bg-subtle)",
                          border: "1px solid var(--border-strong)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                          flexShrink: 0,
                        }}
                      >
                        {p.avatarEmoji || "🎨"}
                      </span>
                      <div className="min-w-0">
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <strong style={{ fontSize: 13.5 }}>{p.name}</strong>
                          {p.isProtected && (
                            <span
                              className="lx-badge"
                              style={{ minHeight: 20, padding: "1px 7px", fontSize: 10.5 }}
                              title="Dieses Hauptprofil ist vor versehentlichem Löschen geschützt."
                            >
                              <Lock size={10} />
                              <span>Geschützt</span>
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>{p.subtitle}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <button
                        type="button"
                        className={`lx-btn ${isActive ? "lx-btn-primary" : ""}`}
                        style={{ minHeight: 36, padding: "5px 12px", fontSize: 12.5 }}
                        onClick={() => onSelectProfile(p.id)}
                        data-testid={`switch-profile-${p.id}`}
                      >
                        {isActive ? <Check size={14} /> : <UserCheck size={14} />}
                        <span>{isActive ? "Aktiv" : "Wechseln"}</span>
                      </button>
                      {!p.isProtected && (
                        <button
                          type="button"
                          className="lx-icon-btn"
                          onClick={() => onDeleteProfile(p.id)}
                          aria-label={`Profil ${p.name} entfernen`}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Neues Profil anlegen (inkl. 1-Klick Christian-Button!) */}
            <div className="lx-card lx-card-subtle" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <strong style={{ fontSize: 13 }}>Weiteres Profil anlegen (komplett eigener Lernstand)</strong>
                {!profiles.some((p) => p.name.toLowerCase() === "christian") && (
                  <button
                    type="button"
                    className="lx-badge"
                    style={{ cursor: "pointer", background: "var(--bg-surface)", color: "var(--fg)", fontWeight: 600 }}
                    onClick={() => handleAddProfile("Christian", "🚀")}
                    data-testid="quick-create-christian-profile"
                  >
                    + Schnell-Profil „Christian“ anlegen
                  </button>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(8, minmax(0, 1fr))", gap: 5 }}>
                {AVATAR_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setNewProfileEmoji(em)}
                    style={{
                      height: 34,
                      borderRadius: 8,
                      border: newProfileEmoji === em ? "2px solid var(--fg)" : "1px solid var(--border)",
                      background: "var(--bg-surface)",
                      cursor: "pointer",
                      fontSize: 15,
                      padding: 0,
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  className="lx-input"
                  placeholder="Profilname (z. B. Christian oder Zweitfach Kunst)..."
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  data-testid="new-profile-name-input"
                />
                <button
                  type="button"
                  className="lx-btn lx-btn-primary"
                  style={{ flexShrink: 0 }}
                  onClick={() => handleAddProfile()}
                  data-testid="create-profile-btn"
                >
                  <UserPlus size={14} />
                  <span>Anlegen</span>
                </button>
              </div>
            </div>

            {/* Google-Account OAuth Cloud-Sicherung */}
            <div className="lx-card lx-card-subtle" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              <strong style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 7 }}>
                <Cloud size={15} style={{ color: "var(--domain-a)" }} />
                <span>Google-Account Cloud-Anmeldung (PC ↔ iPhone Sicherung)</span>
              </strong>
              <p style={{ margin: 0, fontSize: 12, color: "var(--fg-secondary)", lineHeight: 1.45 }}>
                Melde dich optional mit deinem Google-Konto an, damit dein geschütztes Profil und alle eigenen Lernfächer automatisch zwischen Laptop und iPhone synchronisiert werden.
              </p>

              {googleUser ? (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className="lx-badge" style={{ color: "var(--domain-b)", fontWeight: 600 }}>
                    ✓ Verbunden als {googleUser.email}
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" className="lx-btn lx-btn-primary" onClick={onRunSync}>
                      Jetzt synchronisieren
                    </button>
                    <button type="button" className="lx-btn" onClick={onGoogleSignOut}>
                      <LogOut size={14} />
                      <span>Abmelden</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="lx-btn"
                  style={{
                    minHeight: 42,
                    background: "var(--bg-surface)",
                    borderColor: "var(--border-strong)",
                    fontWeight: 600,
                  }}
                  onClick={handleGoogleLoginClick}
                  data-testid="google-oauth-login-btn"
                >
                  <span style={{ fontWeight: 800, color: "#4285F4" }}>G</span>
                  <span>Mit Google-Account anmelden &amp; synchronisieren</span>
                </button>
              )}

              {authStatus && (
                <div style={{ fontSize: 12, color: "var(--fg-secondary)", marginTop: 2 }}>{authStatus}</div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* 1. Vorhandene Fächer auswählen */}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <strong style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
                AKTIVES LERNFACH FÜR DIESES PROFIL WÄHLEN
              </strong>
              {courseList.map((c) => {
                const active = c.id === activeCourseId;
                return (
                  <div
                    key={c.id}
                    className="lx-card lx-card-subtle"
                    style={{
                      padding: "10px 13px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      borderColor: active ? "var(--domain-a)" : "var(--border)",
                    }}
                  >
                    <div className="min-w-0">
                      <div style={{ fontWeight: 700, fontSize: 13.5 }} className="truncate">
                        {c.title}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>
                        {c.unitCount} Ankerblätter · {c.cardCount} FSRS-Karten {c.isCustom ? "· Eigenes Fach" : "· Vollpaket"}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`lx-btn ${active ? "lx-btn-primary" : ""}`}
                      style={{ minHeight: 34, padding: "4px 12px", fontSize: 12.5, flexShrink: 0 }}
                      onClick={() => onSelectCourse(c.id)}
                    >
                      {active ? "Aktiv ✓" : "Öffnen"}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* 2. Neues Studienfach anlegen */}
            <div className="lx-card lx-card-subtle" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              <strong style={{ fontSize: 13 }}>
                + Neues Studienfach oder eigenes Projekt anlegen
              </strong>
              <input
                type="text"
                className="lx-input"
                placeholder="Fachname (z. B. Schulpädagogik, Allgemeine Pädagogik, Kunstgeschichte, Cloud-Architektur)..."
                value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
                data-testid="new-course-title-input"
              />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
                <input className="lx-input" value={domA} onChange={(e) => setDomA(e.target.value)} placeholder="Bereich A" />
                <input className="lx-input" value={domB} onChange={(e) => setDomB(e.target.value)} placeholder="Bereich B" />
                <input className="lx-input" value={domC} onChange={(e) => setDomC(e.target.value)} placeholder="Bereich C" />
              </div>
              <button
                type="button"
                className="lx-btn lx-btn-primary"
                onClick={handleCreateSubject}
                data-testid="create-custom-course-btn"
              >
                <FolderPlus size={14} />
                <span>Neues Lernfach erstellen &amp; aktivieren</span>
              </button>
            </div>

            {/* 3. Intelligenter 1-Klick Notiz-zu-Ankerblatt-&-Karten Konverter */}
            {customCoursesOnly.length > 0 && (
              <div className="lx-card lx-card-subtle" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                <strong style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <Sparkles size={14} style={{ color: "var(--domain-b)" }} />
                  <span>1-Klick Skript-/Notiz-Import (erzeugt Ankerblatt + FSRS-Karten!)</span>
                </strong>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
                  <select
                    className="lx-input"
                    value={effectiveTargetCourseId}
                    onChange={(e) => setTargetCourseId(e.target.value)}
                  >
                    {customCoursesOnly.map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.title}
                      </option>
                    ))}
                  </select>
                  <select
                    className="lx-input"
                    value={noteDomain}
                    onChange={(e) => setNoteDomain(e.target.value)}
                  >
                    <option value="A">Gebiet A</option>
                    <option value="B">Gebiet B</option>
                    <option value="C">Gebiet C</option>
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
                  <input
                    type="text"
                    className="lx-input"
                    placeholder="Kapiteltitel (z. B. Unterrichtsqualität nach Helmke)"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    data-testid="custom-unit-title-input"
                  />
                  <input
                    type="text"
                    className="lx-input"
                    placeholder="Seitenangabe"
                    value={notePageRef}
                    onChange={(e) => setNotePageRef(e.target.value)}
                  />
                </div>

                <textarea
                  className="lx-textarea"
                  rows={4}
                  placeholder={
                    "Einfach Stichpunkte oder 'Begriff: Definition'-Zeilen einfügen:\nKlassenführung: Präventive Störungsvermeidung und Allgegenwärtigkeit (Kounin, 1970)\nKlarheit: Strukturierte Aufgabenstellung und roter Faden"
                  }
                  value={rawNotes}
                  onChange={(e) => setRawNotes(e.target.value)}
                  data-testid="custom-unit-notes-textarea"
                />

                <button
                  type="button"
                  className="lx-btn lx-btn-primary"
                  onClick={handleConvertNotes}
                  data-testid="convert-notes-to-cards-btn"
                >
                  <BookPlus size={14} />
                  <span>In visuelles Ankerblatt &amp; FSRS-Karten umwandeln</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
