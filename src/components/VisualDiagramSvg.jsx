import React from "react";

function wrapSvgLines(text, maxChars = 34) {
  if (!text) return [""];
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if ((cur + " " + w).length <= maxChars) {
      cur += " " + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

/**
 * Rendert gestochen scharfe Vektorgrafiken (SVG) für das 2880×1800 HiDPI-Display
 * und passt Kontraste automatisch an Light- und Dark-Mode an.
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

  const items = visual.steps_or_rows.slice(0, 6);
  const isTimeline = visual.type === "timeline";
  const rowH = 68;
  const headerH = 44;
  const totalH = headerH + items.length * rowH + 14;
  const width = 680;

  return (
    <div
      className="lx-card lx-card-subtle"
      style={{ padding: "12px 14px", overflow: "hidden" }}
      data-testid="visual-diagram-svg"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--fg)" }}>
          {visual.title || "Visuelles Struktur-Schaubild"}
        </span>
        <span className={`lx-badge domain-badge-${domain}`} style={{ height: 22, fontSize: 11 }}>
          {isTimeline ? "Alters- & Phasen-Zeitstrahl" : "Vektor-Schaubild (SVG)"}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${totalH}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label={visual.title || "Struktur-Schaubild"}
      >
        <rect
          x="2"
          y="2"
          width={width - 4}
          height={totalH - 4}
          rx="12"
          fill="var(--bg-surface)"
          stroke="var(--border)"
          strokeWidth="1.5"
        />
        <rect x="2" y="2" width={width - 4} height="34" rx="11" fill={softVar} />
        <text
          x="18"
          y="24"
          fill={accentVar}
          fontSize="13"
          fontWeight="700"
          fontFamily="var(--font-sans)"
        >
          {(visual.title || "Überblick").slice(0, 74)}
        </text>

        {items.map((step, idx) => {
          const y = headerH + idx * rowH;
          const labelLines = wrapSvgLines(step.label || `Schritt ${idx + 1}`, 24);
          const detailLines = wrapSvgLines(step.detail || step.description || "", 52);

          return (
            <g key={idx}>
              {/* Verbindungslinie nach unten */}
              {idx < items.length - 1 && (
                <line
                  x1="34"
                  y1={y + 38}
                  x2="34"
                  y2={y + rowH + 12}
                  stroke={accentVar}
                  strokeWidth="2.2"
                  strokeDasharray={isTimeline ? "none" : "4 3"}
                />
              )}

              {/* Nummern-Knoten */}
              <circle cx="34" cy={y + 24} r="14" fill={softVar} stroke={accentVar} strokeWidth="2" />
              <text
                x="34"
                y={y + 28}
                textAnchor="middle"
                fill={accentVar}
                fontSize="12"
                fontWeight="700"
                fontFamily="var(--font-sans)"
              >
                {idx + 1}
              </text>

              {/* Karten-Box */}
              <rect
                x="60"
                y={y + 4}
                width={width - 78}
                height={rowH - 12}
                rx="9"
                fill="var(--bg-subtle)"
                stroke="var(--border)"
                strokeWidth="1"
              />

              {/* Linke Spalte: Label */}
              {labelLines.slice(0, 2).map((ln, li) => (
                <text
                  key={li}
                  x="74"
                  y={y + 24 + li * 15}
                  fill="var(--fg)"
                  fontSize="12.5"
                  fontWeight="700"
                  fontFamily="var(--font-sans)"
                >
                  {ln}
                </text>
              ))}

              {/* Trenner */}
              <line
                x1="252"
                y1={y + 12}
                x2="252"
                y2={y + rowH - 16}
                stroke="var(--border-strong)"
                strokeWidth="1"
              />

              {/* Rechte Spalte: Detail */}
              {detailLines.slice(0, 2).map((ln, di) => (
                <text
                  key={di}
                  x="266"
                  y={y + 24 + di * 16}
                  fill="var(--fg-secondary)"
                  fontSize="12"
                  fontFamily="var(--font-sans)"
                >
                  {ln}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
