import React, { useMemo, useRef, useState } from "react";
import { Copy, Check, Headphones, Play, Trash2, UploadCloud, Sparkles } from "lucide-react";
import { Select } from "../design/ui";
import { generateNotebookLMPrompt } from "../lib/adaptivePlanner";

export function PodcastHubView({
  allUnits = [],
  confusionPairs = [],
  confusionCounts = {},
  podcasts = [],
  selectedUnitId = null,
  onSavePodcastFile,
  onDeletePodcast,
  onPlayTrack,
  onPlayDemoTrack,
}) {
  const [unitId, setUnitId] = useState(() => selectedUnitId || allUnits[0]?.id || "");
  const [mode, setMode] = useState("sofa_intro");
  const [customFocus, setCustomFocus] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

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

  const promptText = useMemo(
    () =>
      generateNotebookLMPrompt({
        unit: activeUnit,
        weakConfusions,
        mode,
        customFocus,
      }),
    [activeUnit, weakConfusions, mode, customFocus]
  );

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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} data-testid="podcast-hub-view">
      <div>
        <h2 style={{ margin: 0, fontSize: 18 }}>NotebookLM Sofa- &amp; Zug-Podcast-Hub</h2>
        <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--fg-muted)" }}>
          1-Klick-Prompt-Generator (inkl. Kunst, Sport &amp; deinen Verwechslungsfallen) + Offline-MP3-Ablage für das iPhone im Zug.
        </p>
      </div>

      <div className="lx-dashboard-grid">
        {/* Links: Dynamischer 1-Klick NotebookLM Prompt-Generator */}
        <div className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>
            1. Maßgeschneiderten NotebookLM-Prompt erzeugen
          </h3>

          <Select
            value={activeUnit?.id || ""}
            onValueChange={setUnitId}
            options={allUnits.map((u) => ({
              value: u.id,
              label: `[${u.domain}] ${u.section_num} ${u.title} (${u.page_label})`,
            }))}
            ariaLabel="Kapitel für Podcast-Prompt wählen"
          />

          <div className="lx-segmented">
            <button
              type="button"
              className={`lx-seg-btn ${mode === "sofa_intro" ? "is-active" : ""}`}
              onClick={() => setMode("sofa_intro")}
            >
              Entspannter Sofa-Einstieg
            </button>
            <button
              type="button"
              className={`lx-seg-btn ${mode === "exam_crunch" ? "is-active" : ""}`}
              onClick={() => setMode("exam_crunch")}
            >
              Prüfungs-Fokus (Definitionen &amp; Fall)
            </button>
          </div>

          <input
            type="text"
            className="lx-input"
            placeholder="Optionaler Zusatzwunsch (z. B. „bitte mit Eselsbrücke für die 4 Prozesse“)..."
            value={customFocus}
            onChange={(e) => setCustomFocus(e.target.value)}
          />

          <textarea
            className="lx-textarea"
            rows={9}
            readOnly
            value={promptText}
            style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}
            data-testid="notebooklm-prompt-box"
          />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="lx-btn lx-btn-primary"
              onClick={copyPrompt}
              data-testid="copy-prompt-btn"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              <span>{copied ? "Prompt in Zwischenablage kopiert!" : "1-Klick Prompt für NotebookLM kopieren"}</span>
            </button>
          </div>
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
              <Sparkles size={14} style={{ color: "var(--primary-bg)" }} />
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
              border: "2px dashed var(--border-strong)",
              borderRadius: 12,
              padding: "22px 16px",
              textAlign: "center",
              background: "var(--bg-subtle)",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <UploadCloud size={26} style={{ color: "var(--primary-bg)" }} />
            <strong style={{ fontSize: 13.5 }}>
              NotebookLM-Folge (.mp3, .m4a, .wav) hier ablegen oder antippen
            </strong>
            <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>
              Wird direkt lokal in deinem Browser gespeichert – spielt im Zug auch komplett ohne Empfang &amp; auf dem iPhone-Sperrbildschirm!
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
                Noch keine eigene MP3 abgelegt. Kopiere links deinen Prompt in Google NotebookLM (Audio Overview) und ziehe die fertige Audiodatei einfach hierher!
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
                          subtitle: `EWS Podcast · Gebiet ${p.domain || "A"}`,
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
