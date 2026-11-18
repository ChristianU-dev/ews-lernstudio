import React from "react";
import { RichText } from "./RichText";

/**
 * Gestochen scharfes Vektor-Strukturschaubild & Phasen-/Alters-Zeitstrahl.
 * Kombiniert skalierbare SVG-Vektorpfeile/-Knoten mit echtem CSS-Grid-Textfluss,
 * sodass KEIN deutsches Fachwort jemals abgeschnitten, gequetscht oder winzig skaliert wird!
 */
export function VisualDiagramSvg({ visual, domain = "A" }) {
  if (!visual || !Array.isArray(visual.steps_or_rows) || visual.steps_or_rows.length === 0) {
    return null;
  }

  const accentVar =
    domain === "B" ? "var(--domain-b)" : domain === "C" ? "var(--domain-c)" : "var(--domain-a)";
  const softVar =
    domain === "B"
      ? "var(--domain-b-soft)"
      : domain === "C"
      ? "var(--domain-c-soft)"
      : "var(--domain-a-soft)";
  const borderVar =
    domain === "B"
      ? "var(--domain-b-border)"
      : domain === "C"
      ? "var(--domain-c-border)"
      : "var(--domain-a-border)";

  const items = visual.steps_or_rows.slice(0, 6);
  const isTimeline = visual.type === "timeline";

  return (
    <div
      className="lx-card lx-card-subtle"
      style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}
      data-testid="visual-diagram-svg"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" style={{ flexShrink: 0 }}>
            <circle cx="5" cy="10" r="3.2" fill={accentVar} />
            <line x1="8.2" y1="10" x2="13.5" y2="10" stroke={accentVar} strokeWidth="1.8" />
            <polygon points="13,6.8 17.5,10 13,13.2" fill={accentVar} />
          </svg>
          <strong style={{ fontSize: 14, color: "var(--fg)", lineHeight: 1.35 }}>
            {visual.title || "Visuelles Struktur-Schaubild"}
          </strong>
        </div>
        <span className={`lx-badge domain-badge-${domain}`} style={{ fontSize: 11.5 }}>
          {isTimeline ? "Alters- & Entwicklungs-Zeitstrahl" : "Struktur-Schaubild"}
        </span>
      </div>

      {/* Übersichtliches mehrspaltiges Phasen-/Struktur-Raster mit SVG-Nummernmedaillons */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(235px, 1fr))",
          gap: 12,
          alignItems: "stretch",
        }}
      >
        {items.map((step, idx) => (
          <div
            key={idx}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderTop: `3px solid ${accentVar}`,
              borderRadius: 11,
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              position: "relative",
              minWidth: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <circle
                    cx="12"
                    cy="12"
                    r="10.5"
                    fill={softVar}
                    stroke={borderVar}
                    strokeWidth="1.5"
                  />
                  <text
                    x="12"
                    y="16"
                    textAnchor="middle"
                    fill={accentVar}
                    fontSize="11.5"
                    fontWeight="700"
                    fontFamily="var(--font-sans)"
                  >
                    {idx + 1}
                  </text>
                </svg>
                <strong style={{ fontSize: 13, color: "var(--fg)", lineHeight: 1.3 }}>
                  <RichText text={step.label || `Schritt ${idx + 1}`} />
                </strong>
              </div>

              {idx < items.length - 1 && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                  style={{ flexShrink: 0, opacity: 0.55 }}
                >
                  <path
                    d="M3 8h9M9 4.5L12.5 8 9 11.5"
                    fill="none"
                    stroke={accentVar}
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>

            <div style={{ fontSize: 12.5, color: "var(--fg-secondary)", lineHeight: 1.5 }}>
              <RichText text={step.detail || step.description || ""} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
