import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  HelpCircle,
  Play,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Select } from "../design/ui";
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
  return `${unit.page_label}: ${unit.title}\nMerksatz: ${unit.visual_anchor_tagline || ""}\n\nDefinitionen:\n${
    defs || "- Siehe Skript"
  }\n\nStudien:\n${studies || "- Siehe Skript"}`;
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
  const [showGuide, setShowGuide] = useState(true);
  const [customFocus, setCustomFocus] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedSource, setCopiedSource] = useState(false);
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
    const ranked = [...confusionPairs].sort((a, b) => (confusionCounts[b.id] || 0) - (confusionCounts[a.id] || 0));
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
    return generateNotebookLMPrompt({
      unit: activeUnit,
      weakConfusions,
      mode,
      customFocus,
    });
  }, [mode, activeUnit, weakConfusions, customFocus, flashcards, shakyCardIds, primarySubject, didacticSubject]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {}
  };

  const copyUnitTextAsSource = async () => {
    try {
      await navigator.clipboard.writeText(buildUnitCheatSheet(activeUnit));
      setCopiedSource(true);
      setTimeout(() => setCopiedSource(false), 2200);
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
      {/* 1. KLARE ANLEITUNG: WELCHE DATEIEN MUSS ICH IN NOTEBOOKLM HOCHLADEN? */}
      <div className="lx-cat-merksatz" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <strong style={{ fontSize: 14.5, color: "var(--cat-merksatz-fg)", display: "flex", alignItems: "center", gap: 7 }}>
            <HelpCircle size={16} />
            <span>So funktioniert NotebookLM in 3 Schritten (Welche Dateien wohin?)</span>
          </strong>
          <button
            type="button"
            className="lx-btn"
            style={{ minHeight: 30, padding: "3px 10px", fontSize: 12 }}
            onClick={() => setShowGuide((v) => !v)}
          >
            {showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span>{showGuide ? "Ausblenden" : "Anleitung zeigen"}</span>
          </button>
        </div>

        {showGuide && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, fontSize: 12.5, color: "var(--fg-secondary)", lineHeight: 1.5 }}>
            <div className="lx-card" style={{ padding: "10px 12px" }}>
              <strong style={{ color: "var(--lilac)" }}>Schritt 1 · Einmalig Quellen anlegen:</strong>
              <div>
                Öffne <strong>notebooklm.google.com</strong> → <em>„Neues Notizbuch“</em> → lade deine 3 Skript-PDFs aus <code>01_skripte/</code> hoch (<em>Lernen &amp; Lehren</em>, <em>Entwicklungspsychologie</em>, <em>Diagnostik</em>) – oder nutze unsere <strong>Hochformat-PDFs</strong> aus „Downloads &amp; Cloud“.
              </div>
            </div>
            <div className="lx-card" style={{ padding: "10px 12px" }}>
              <strong style={{ color: "var(--domain-a)" }}>Schritt 2 · Prompt einfügen &amp; generieren:</strong>
              <div>
                Hake links in NotebookLM nur das gewünschte Skript an, klicke bei <strong>Audio-Zusammenfassung → Anpassen</strong> und füge deinen kopierten Prompt unten ein. <em>(Alternativ: Unten rechts „Kapitel-Text separat kopieren“ als eigene Quelle einfügen!)</em>
              </div>
            </div>
            <div className="lx-card" style={{ padding: "10px 12px" }}>
              <strong style={{ color: "var(--domain-b)" }}>Schritt 3 · Fertige MP3 hier ablegen:</strong>
              <div>
                Lade die fertige Audiodatei in NotebookLM herunter und ziehe sie rechts in deine Offline-Ablage. Danach hörst du sie auch im Funkloch &amp; auf dem iPhone-Sperrbildschirm!
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="lx-dashboard-grid">
        {/* Links: Dynamischer 1-Klick NotebookLM Prompt-Generator */}
        <div className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <h3 style={{ margin: 0, fontSize: 15.5 }}>1. Podcast-Prompt wählen &amp; kopieren</h3>

          {/* 3 klar verschiedene Modi */}
          <div className="lx-segmented cols-3">
            <button
              type="button"
              className={`lx-seg-btn ${mode === "sofa_intro" ? "is-active" : ""}`}
              onClick={() => setMode("sofa_intro")}
              data-testid="podcast-mode-sofa"
            >
              🎧 Sofa-Einstieg (Locker)
            </button>
            <button
              type="button"
              className={`lx-seg-btn ${mode === "exam_crunch" ? "is-active" : ""}`}
              onClick={() => setMode("exam_crunch")}
              data-testid="podcast-mode-exam"
            >
              🎯 Prüfungs-Fokus (Fall)
            </button>
            <button
              type="button"
              className={`lx-seg-btn ${mode === "personal_weakness" ? "is-active" : ""}`}
              onClick={() => setMode("personal_weakness")}
              data-testid="podcast-mode-weakness"
            >
              ⚡ Aha-Training
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
              <input
                type="text"
                className="lx-input"
                placeholder="Optionaler Zusatzwunsch (z. B. „mehr Sport-Beispiele“)..."
                value={customFocus}
                onChange={(e) => setCustomFocus(e.target.value)}
              />
            </>
          ) : (
            <div className="lx-cat-praxis" style={{ padding: "10px 12px", fontSize: 12.5, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <BrainCircuit size={16} style={{ color: "var(--domain-b)", flexShrink: 0 }} />
              <span>Bündelt automatisch deine kniffligsten FSRS-Wackelkarten &amp; Verwechslungspaare!</span>
            </div>
          )}

          <textarea
            className="lx-textarea"
            rows={10}
            readOnly
            value={promptText}
            style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}
            data-testid="notebooklm-prompt-box"
          />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="lx-btn lx-btn-primary" style={{ flex: "1 1 200px" }} onClick={copyPrompt} data-testid="copy-prompt-btn">
              {copied ? <Check size={15} /> : <Copy size={15} />}
              <span>{copied ? "Prompt kopiert!" : "Prompt für NotebookLM kopieren"}</span>
            </button>
            {mode !== "personal_weakness" && (
              <button type="button" className="lx-btn" onClick={copyUnitTextAsSource}>
                {copiedSource ? <Check size={14} /> : <FileText size={14} />}
                <span>{copiedSource ? "Text kopiert!" : "Kapitel-Text kopieren"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Rechts: Drag-and-Drop Offline-MP3-Mediathek */}
        <div className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: 15.5 }}>2. Offline-Podcast-Ablage (Sofa &amp; Zug)</h3>
            <button type="button" className="lx-btn" onClick={() => onPlayDemoTrack(activeUnit)} data-testid="play-demo-podcast-btn">
              <Sparkles size={14} style={{ color: "var(--lilac)" }} />
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
              border: "1.5px dashed var(--lilac-border)",
              borderRadius: 13,
              padding: "22px 16px",
              textAlign: "center",
              background: "var(--lilac-soft)",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <UploadCloud size={24} style={{ color: "var(--lilac)" }} />
            <strong style={{ fontSize: 13.5 }}>NotebookLM-Folge (.mp3, .m4a, .wav) hier ablegen oder antippen</strong>
            <span style={{ fontSize: 12, color: "var(--fg-secondary)" }}>
              Wird lokal gespeichert – spielt im Zug ohne Internet &amp; auf dem iPhone-Sperrbildschirm!
            </span>
            <input ref={fileInputRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <strong style={{ fontSize: 13 }}>Gespeicherte Offline-Folgen ({podcasts.length})</strong>
            {podcasts.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
                Noch keine eigene MP3 abgelegt. Folge oben den 3 NotebookLM-Schritten und ziehe die fertige MP3 einfach hierher!
              </div>
            ) : (
              podcasts.map((p) => (
                <div
                  key={p.id}
                  className="lx-card lx-card-subtle"
                  style={{ padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}
                >
                  <div className="min-w-0">
                    <div style={{ fontWeight: 700, fontSize: 13 }} className="truncate">{p.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>Gebiet {p.domain || "A"} · Offline bereit</div>
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
                    <button type="button" className="lx-icon-btn" onClick={() => onDeletePodcast(p.id)} aria-label="Podcast löschen">
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
