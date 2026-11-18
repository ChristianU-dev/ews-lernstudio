import React from "react";
import { ArrowRight, BookOpen, Headphones, ShieldCheck, Sparkles, Timer, Flame } from "lucide-react";

function ConcentricRingsSvg({ rings, averagePct }) {
  const specs = [
    { key: "time", r: 43, color: "var(--domain-a)", pct: rings.time.pct },
    { key: "anchor", r: 32, color: "var(--domain-b)", pct: rings.anchor.pct },
    { key: "recall", r: 21, color: "var(--domain-c)", pct: rings.recall.pct },
  ];

  return (
    <svg
      width="104"
      height="104"
      viewBox="0 0 104 104"
      style={{ flexShrink: 0, display: "block" }}
      aria-label={`Tagesringe ${averagePct} Prozent`}
    >
      {specs.map((s) => {
        const c = 2 * Math.PI * s.r;
        const dash = (Math.max(4, s.pct) / 100) * c;
        return (
          <g key={s.key} transform="rotate(-90 52 52)">
            <circle
              cx="52"
              cy="52"
              r={s.r}
              fill="none"
              stroke="var(--border)"
              strokeWidth="7.5"
              opacity="0.55"
            />
            <circle
              cx="52"
              cy="52"
              r={s.r}
              fill="none"
              stroke={s.color}
              strokeWidth="7.5"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
              style={{ transition: "stroke-dasharray 380ms ease" }}
            />
          </g>
        );
      })}
      <text
        x="52"
        y="55"
        textAnchor="middle"
        fill="var(--fg)"
        style={{ fontSize: 13.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
      >
        {averagePct}%
      </text>
    </svg>
  );
}

export function MasteryRingsHero({
  masteryRings,
  energyMode = "normal",
  onChangeEnergyMode,
  levelInfo,
  streakInfo,
  nextUnit,
  onStartSofaAudio,
  onOpenNextSheet,
  onOpenFocusTimer,
}) {
  const { rings, averagePct } = masteryRings;

  return (
    <div
      className="lx-card"
      style={{
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 13,
      }}
      data-testid="mastery-rings-hero"
    >
      {/* Kompakte Ein-Zeilen-Kopfzeile: Level + Schutzschild + Timer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 6,
          minWidth: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, flex: 1 }}>
          <span
            className="lx-badge"
            style={{
              background: "var(--callout-success-bg)",
              borderColor: "var(--callout-success-border)",
              color: "var(--domain-b)",
              fontWeight: 700,
              padding: "2px 8px",
              fontSize: 11.5,
              minWidth: 0,
            }}
          >
            <span style={{ flexShrink: 0 }}>{levelInfo.icon}</span>
            <span className="truncate">St. {levelInfo.level} · {levelInfo.title}</span>
          </span>

          <span
            className="lx-badge"
            style={{ padding: "2px 7px", fontSize: 11, flexShrink: 0 }}
            title="Pausentage sind geschützt – freie Tage löschen niemals deine Serie!"
          >
            {streakInfo.streakDays > 0 ? (
              <>
                <Flame size={11} style={{ color: "var(--domain-c)" }} />
                <span>{streakInfo.streakDays} T.</span>
              </>
            ) : (
              <>
                <ShieldCheck size={11} style={{ color: "var(--domain-b)" }} />
                <span>{streakInfo.shieldsAvailable} Schilde</span>
              </>
            )}
          </span>
        </div>

        <button
          type="button"
          className="lx-badge"
          style={{
            cursor: "pointer",
            background: "var(--bg-subtle)",
            borderColor: "var(--border-strong)",
            color: "var(--fg)",
            fontWeight: 600,
            padding: "2px 8px",
            fontSize: 11.5,
            flexShrink: 0,
          }}
          onClick={onOpenFocusTimer}
          data-testid="open-focus-timer-btn"
        >
          <Timer size={12} style={{ color: "var(--domain-a)" }} />
          <span>Timer</span>
        </button>
      </div>

      {/* Kern-Zeile: Links konzentrische 3-Ringe, Rechts glasklare Tageswerte */}
      <div style={{ display: "flex", alignItems: "center", gap: 15, minWidth: 0 }}>
        <ConcentricRingsSvg rings={rings} averagePct={averagePct} />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { ...rings.time, color: "var(--domain-a)" },
            { ...rings.anchor, color: "var(--domain-b)" },
            { ...rings.recall, color: "var(--domain-c)" },
          ].map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                fontSize: 12.5,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--fg-secondary)", minWidth: 0 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: r.color,
                    flexShrink: 0,
                  }}
                />
                <span className="truncate">{r.label}</span>
              </span>
              <strong className="tabular" style={{ color: "var(--fg)", whiteSpace: "nowrap" }}>
                {r.current}/{r.target} {r.unit}
              </strong>
            </div>
          ))}
          <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 1 }}>
            {levelInfo.totalXp} XP · noch {levelInfo.xpToNext} XP bis Stufe {Math.min(6, levelInfo.level + 1)}
          </div>
        </div>
      </div>

      {/* 1-Tap Tagesform-Schalter: Passt Ringe & Anspruch sofort an ihre Energie an! */}
      <div
        className="lx-tagesform-strip"
        role="group"
        aria-label="Tagesform wählen"
        data-testid="energy-mode-selector"
      >
        {[
          { id: "gentle", label: "Sanft · 15m", emoji: "🛋️" },
          { id: "normal", label: "Normal · 32m", emoji: "✨" },
          { id: "flow", label: "Flow · 50m", emoji: "🚀" },
        ].map((m) => {
          const active = energyMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              className={`lx-tagesform-btn ${active ? "is-active" : ""}`}
              onClick={() => onChangeEnergyMode(m.id)}
              data-testid={`energy-btn-${m.id}`}
            >
              <span>{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2 kompakte Daumen-Buttons nebeneinander (statt riesiger gestapelter Balken!) */}
      <div style={{ display: "grid", gridTemplateColumns: nextUnit ? "1fr 1fr" : "1fr", gap: 8 }}>
        <button
          type="button"
          className="lx-btn lx-btn-primary"
          style={{ minHeight: 42, padding: "8px 12px", fontSize: 13, width: "100%" }}
          onClick={() => onStartSofaAudio(nextUnit)}
          data-testid="sofa-start-audio-btn"
        >
          <Headphones size={15} style={{ flexShrink: 0 }} />
          <span className="truncate">Sofa-Audio {nextUnit ? `(${nextUnit.section_num})` : ""}</span>
        </button>

        {nextUnit && (
          <button
            type="button"
            className="lx-btn"
            style={{ minHeight: 42, padding: "8px 12px", fontSize: 13, width: "100%" }}
            onClick={onOpenNextSheet}
          >
            <BookOpen size={15} style={{ flexShrink: 0 }} />
            <span className="truncate">Blatt {nextUnit.section_num}</span>
            <ArrowRight size={13} style={{ flexShrink: 0 }} />
          </button>
        )}
      </div>
    </div>
  );
}

function BotanicalPlantSvg({ level = 1 }) {
  return (
    <svg
      width="86"
      height="86"
      viewBox="0 0 96 96"
      style={{ flexShrink: 0, display: "block" }}
      aria-label={`Atelier-Pflanze Entwicklungsstufe ${level}`}
    >
      {/* Warmer Terracotta-Topf */}
      <path d="M32 68 L64 68 L59 86 L37 86 Z" fill="#c57b57" />
      <rect x="29" y="63" width="38" height="6" rx="3" fill="#d48c6a" />
      {/* Stamm & Wachstum je nach Level */}
      <path
        d={level >= 3 ? "M48 63 Q48 42 48 24" : "M48 63 Q48 50 48 40"}
        stroke="#2d7459"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Erste Keimblätter (ab Level 1) */}
      <path d="M48 53 C36 51 34 41 45 44 C47 45 48 49 48 53 Z" fill="#3c8d6d" />
      <path d="M48 50 C60 48 62 38 51 41 C49 42 48 46 48 50 Z" fill="#2d7459" />

      {/* Mittlere Blätter (ab Level 2) */}
      {level >= 2 && (
        <>
          <path d="M48 41 C33 38 32 27 44 31 C47 32 48 37 48 41 Z" fill="#4ca380" />
          <path d="M48 38 C63 35 64 24 52 28 C49 29 48 34 48 38 Z" fill="#358264" />
        </>
      )}

      {/* Obere Krone (ab Level 3) */}
      {level >= 3 && (
        <circle cx="48" cy="23" r={level >= 5 ? 15 : 10} fill="#3c8d6d" opacity="0.25" />
      )}

      {/* Blüten (ab Level 4) */}
      {level >= 4 && (
        <>
          <circle cx="40" cy="25" r="4.5" fill="#e8998d" />
          <circle cx="56" cy="27" r="4.5" fill="#e8998d" />
          <circle cx="48" cy="18" r="5" fill="#f2b880" />
        </>
      )}

      {/* Goldene Examens-Früchte / Funkeln (ab Level 6) */}
      {level >= 6 && (
        <>
          <circle cx="34" cy="36" r="3" fill="#eab308" />
          <circle cx="62" cy="35" r="3" fill="#eab308" />
        </>
      )}
    </svg>
  );
}

export function AtelierGardenCard({ levelInfo, streakInfo, achievements = [] }) {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 12 }} data-testid="atelier-garden-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <strong style={{ fontSize: 15, display: "flex", alignItems: "center", gap: 7 }}>
          <Sparkles size={15} style={{ color: "var(--domain-b)" }} />
          <span>Dein Atelier-Garten &amp; Erfolge</span>
        </strong>
        <span className="lx-badge">
          {unlockedCount}/{achievements.length} Abzeichen
        </span>
      </div>

      <div
        className="lx-card lx-card-subtle"
        style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 14 }}
      >
        <BotanicalPlantSvg level={levelInfo.level} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{levelInfo.plantStage}</div>
          <div style={{ fontSize: 12, color: "var(--fg-secondary)", lineHeight: 1.4 }}>
            Stufe {levelInfo.level}: <strong>{levelInfo.title}</strong> ({levelInfo.totalXp} XP)
          </div>
          <div style={{ height: 6, borderRadius: 999, background: "var(--border)", overflow: "hidden", marginTop: 2 }}>
            <div
              style={{
                width: `${levelInfo.progressPct}%`,
                height: "100%",
                background: "var(--domain-b)",
                borderRadius: 999,
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
            🛡️ {streakInfo.shieldsAvailable} Pausen-Schutzschilde aktiv (kein Druck an Ruhetagen!)
          </div>
        </div>
      </div>

      {/* Kompaktes Abzeichen-Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        {achievements.slice(0, 6).map((ach) => (
          <div
            key={ach.id}
            className="lx-card lx-card-subtle"
            title={ach.desc}
            style={{
              padding: "8px 10px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              opacity: ach.unlocked ? 1 : 0.48,
              borderColor: ach.unlocked ? "var(--callout-success-border)" : "var(--border-subtle)",
            }}
          >
            <span style={{ fontSize: 17, flexShrink: 0 }}>{ach.icon}</span>
            <div className="min-w-0">
              <div style={{ fontSize: 12, fontWeight: 600 }} className="truncate">
                {ach.title}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--fg-muted)" }} className="truncate">
                {ach.unlocked ? "Freigeschaltet ✓" : ach.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
