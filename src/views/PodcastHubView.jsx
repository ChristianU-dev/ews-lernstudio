import React, { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Check, Play, Trash2, UploadCloud, Sparkles, BrainCircuit } from "lucide-react";
import { Select, Switch } from "../design/ui";
import { generateNotebookLMPrompt } from "../lib/adaptivePlanner";
import { generatePersonalWeaknessPodcastPrompt } from "../lib/learnerIntelligence";

function buildUnitCheatSheet(unit) {
  if (!unit) return "";
  const defs = (unit.definitions || [])
    .map((d) => `- ${d.term} (${d.author_year}): ${d.definition}`)
    .join("\n");
  const studies = (unit.empirical_studies || [])
    .map((s) => `- ${s.title} (${s.authors_year}): ${s.finding}`)
    .join("\n");
  return `\n\n--- KOMPAKT-QUELLENTEXT (${unit.page_label}: ${unit.title}) ---\nMerksatz: ${
    unit.visual_anchor_tagline || ""
  }\nDefinitionen:\n${defs || "- Siehe Skript"}\nStudien:\n${studies || "- Siehe Skript"}`;
}

export function PodcastHubView({
  allUnits = [],
  flashcards = [],
  shakyCardIds = [],
  confusionPairs = [],
  confusionCounts = {},
  podcasts = [],
  selectedUnitId = null,
  initialMode = "sofa_intro",
  primarySubject = "Kunst",
  didacticSubject = "Sport",
  onSavePodcastFile,
  onDeletePodcast,
  onPlayTrack,
  onPlayDemoTrack,
}) {
  const [unitId, setUnitId] = useState(() => selectedUnitId || allUnits[0]?.id || "");
  const [mode, setMode] = useState(initialMode);
  const [includeCheatSheet, setIncludeCheatSheet] = useState(true);
  const [customFocus, setCustomFocus] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (selectedUnitId) setUnitId(selectedUnitId);
  }, [selectedUnitId]);

  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  const activeUnit = useMemo(
    () => allUnits.find((u) => u.id === unitId) || allUnits[0] || null,
    [allUnits, unitId]
  );

  const weakConfusions = useMemo(() => {
    const ranked = [...confusionPairs].sort(
      (a, b) => (confusionCounts[b.id] || 0) - (confusionCounts[a.id] || 0)
    );
    const matching = ranked.filter((c) => !activeUnit || c.domain === activeUnit.domain);
    return matching.length > 0 ? matching.slice(0, 2) : ranked.slice(0, 2);
  }, [confusionPairs, confusionCounts, activeUnit]);

  const promptText = useMemo(() => {
    if (mode === "personal_weakness") {
      return generatePersonalWeaknessPodcastPrompt({
        flashcards,
        shakyCardIds,
        topConfusions: weakConfusions,
        primarySubject,
        didacticSubject,
      });
    }
    const base = generateNotebookLMPrompt({
      unit: activeUnit,
      weakConfusions,
      mode,
      customFocus,
    });
    return includeCheatSheet ? `${base}${buildUnitCheatSheet(activeUnit)}` : base;
  }, [
    mode,
    activeUnit,
    weakConfusions,
    customFocus,
    includeCheatSheet,
    flashcards,
    shakyCardIds,
    primarySubject,
    didacticSubject,
  ]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {}
  };

  const handleFiles = async (fileList) => {
    const file = fileList?.[0];
    if (!file) return;
    await onSavePodcastFile({
      unitId: activeUnit?.id || null,
      domain: activeUnit?.domain || "A",
      title: file.name.replace(/\.[^.]+$/, ""),
      blob: file,
      mimeType: file.type || "audio/mpeg",
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} data-testid="podcast-hub-view">
      <div>
        <h2 style={{ margin: 0, fontSize: 18 }}>NotebookLM Sofa- &amp; Zug-Podcast-Hub</h2>
        <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--fg-muted)" }}>
          Automatischer 1-Klick-Prompt-Generator (inkl. Schwachstellen-Training &amp; Kapitel-Spickzettel) + Offline-MP3-Ablage für den Zug.
        </p>
      </div>

      <div className="lx-dashboard-grid">
        {/* Links: Dynamischer 1-Klick NotebookLM Prompt-Generator */}
        <div className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>
            1. Maßgeschneiderten NotebookLM-Prompt erzeugen
          </h3>

          {/* 3 Modi inkl. automatischem Schwachstellen-Podcast! */}
          <div className="lx-segmented cols-3">
            <button
              type="button"
              className={`lx-seg-btn ${mode === "sofa_intro" ? "is-active" : ""}`}
              onClick={() => setMode("sofa_intro")}
            >
              Sofa-Einstieg
            </button>
            <button
              type="button"
              className={`lx-seg-btn ${mode === "exam_crunch" ? "is-active" : ""}`}
              onClick={() => setMode("exam_crunch")}
            >
              Prüfungs-Fokus
            </button>
            <button
              type="button"
              className={`lx-seg-btn ${mode === "personal_weakness" ? "is-active" : ""}`}
              onClick={() => setMode("personal_weakness")}
              data-testid="podcast-mode-weakness"
            >
              Aha-Training
            </button>
          </div>

          {mode !== "personal_weakness" ? (
            <>
              <Select
                value={activeUnit?.id || ""}
                onValueChange={setUnitId}
                options={allUnits.map((u) => ({
                  value: u.id,
                  label: `[${u.domain}] ${u.section_num} ${u.title} (${u.page_label})`,
                }))}
                ariaLabel="Kapitel für Podcast-Prompt wählen"
              />

              <div
                className="lx-card lx-card-subtle"
                style={{
                  padding: "8px 12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 12, color: "var(--fg-secondary)" }}>
                  Kapitel-Spickzettel gleich mitkopieren (direkt in NotebookLM einfügbar!)
                </span>
                <Switch
                  checked={includeCheatSheet}
                  onCheckedChange={setIncludeCheatSheet}
                  id="include-cheatsheet-switch"
                />
              </div>

              <input
                type="text"
                className="lx-input"
                placeholder="Optionaler Zusatzwunsch (z. B. „bitte mit Eselsbrücke“)..."
                value={customFocus}
                onChange={(e) => setCustomFocus(e.target.value)}
              />
            </>
          ) : (
            <div
              className="lx-praxis-card"
              style={{ padding: "10px 12px", fontSize: 12.5, display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <BrainCircuit size={16} style={{ color: "var(--domain-b)", flexShrink: 0 }} />
              <span>
                Bündelt automatisch deine kniffligsten FSRS-Wackelkandidaten &amp; Verwechslungspaare in eine 10-Minuten-Wiederholungsfolge!
              </span>
            </div>
          )}

          <textarea
            className="lx-textarea"
            rows={8}
            readOnly
            value={promptText}
            style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}
            data-testid="notebooklm-prompt-box"
          />

          <button
            type="button"
            className="lx-btn lx-btn-primary"
            onClick={copyPrompt}
            data-testid="copy-prompt-btn"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span>{copied ? "In Zwischenablage kopiert!" : "1-Klick für NotebookLM kopieren"}</span>
          </button>
        </div>

        {/* Rechts: Drag-and-Drop Offline-MP3-Mediathek */}
        <div className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>
              2. Offline-Podcast-Ablage (Sofa &amp; Funkloch im Zug)
            </h3>
            <button
              type="button"
              className="lx-btn"
              onClick={() => onPlayDemoTrack(activeUnit)}
              data-testid="play-demo-podcast-btn"
            >
              <Sparkles size={14} style={{ color: "var(--domain-b)" }} />
              <span>Fokus-Intro testen</span>
            </button>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "1.5px dashed var(--border-strong)",
              borderRadius: 13,
              padding: "20px 16px",
              textAlign: "center",
              background: "var(--bg-subtle)",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <UploadCloud size={24} style={{ color: "var(--domain-a)" }} />
            <strong style={{ fontSize: 13.5 }}>
              NotebookLM-Folge (.mp3, .m4a, .wav) hier ablegen oder antippen
            </strong>
            <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>
              Wird lokal im Browser gespeichert – spielt im Zug komplett ohne Empfang &amp; auf dem iPhone-Sperrbildschirm!
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              style={{ display: "none" }}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <strong style={{ fontSize: 13 }}>Gespeicherte Offline-Folgen ({podcasts.length})</strong>
            {podcasts.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
                Noch keine eigene MP3 abgelegt. Kopiere deinen Prompt in Google NotebookLM (Audio Overview) und ziehe die fertige Audiodatei einfach hierher!
              </div>
            ) : (
              podcasts.map((p) => (
                <div
                  key={p.id}
                  className="lx-card lx-card-subtle"
                  style={{
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div className="min-w-0">
                    <div style={{ fontWeight: 600, fontSize: 13 }} className="truncate">
                      {p.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>
                      Gebiet {p.domain || "A"} · Offline bereit
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      className="lx-btn lx-btn-primary"
                      onClick={() =>
                        onPlayTrack({
                          id: p.id,
                          title: p.title,
                          subtitle: `Podcast · Gebiet ${p.domain || "A"}`,
                          domain: p.domain || "A",
                          blob: p.blob,
                          autoPlay: true,
                        })
                      }
                    >
                      <Play size={13} />
                      <span>Hören</span>
                    </button>
                    <button
                      type="button"
                      className="lx-icon-btn"
                      onClick={() => onDeletePodcast(p.id)}
                      aria-label="Podcast löschen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
