import React from "react";
import { ShieldCheck, Sparkles, Timer, Flame } from "lucide-react";

export function ConcentricRingsSvg({ rings, averagePct, size = 100 }) {
  const specs = [
    { key: "time", r: 42, color: "var(--lilac)", pct: rings.time.pct },
    { key: "anchor", r: 31, color: "var(--domain-b)", pct: rings.anchor.pct },
    { key: "recall", r: 20, color: "var(--domain-c)", pct: rings.recall.pct },
  ];

  return (
    <svg
      width={size}
      height={size}
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
              opacity="0.6"
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
        y="56"
        textAnchor="middle"
        fill="var(--fg)"
        style={{ fontSize: 13.5, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
      >
        {averagePct}%
      </text>
    </svg>
  );
}

export function MasteryRingsSummary({
  masteryRings,
  levelInfo,
  streakInfo,
  onOpenFocusTimer,
}) {
  const { rings, averagePct } = masteryRings;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }} data-testid="mastery-rings-hero">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minWidth: 0 }}>
          <span className="lx-badge lx-badge-lilac" style={{ padding: "2px 8px", fontSize: 11.5 }}>
            <span>{levelInfo.icon}</span>
            <span>St. {levelInfo.level} · {levelInfo.title}</span>
          </span>
          <span className="lx-badge" style={{ padding: "2px 8px", fontSize: 11 }}>
            {streakInfo.streakDays > 0 ? (
              <>
                <Flame size={11} style={{ color: "var(--domain-c)" }} />
                <span>{streakInfo.streakDays} Tage</span>
              </>
            ) : (
              <>
                <ShieldCheck size={11} style={{ color: "var(--domain-b)" }} />
                <span>{streakInfo.shieldsAvailable} Pausen-Schilde</span>
              </>
            )}
          </span>
        </div>

        <button
          type="button"
          className="lx-badge"
          style={{ cursor: "pointer", background: "var(--bg-subtle)", fontWeight: 700, padding: "2px 9px", fontSize: 11.5 }}
          onClick={onOpenFocusTimer}
          data-testid="open-focus-timer-btn"
        >
          <Timer size={12} style={{ color: "var(--lilac)" }} />
          <span>Uhr</span>
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <ConcentricRingsSvg rings={rings} averagePct={averagePct} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { ...rings.time, color: "var(--lilac)" },
            { ...rings.anchor, color: "var(--domain-b)" },
            { ...rings.recall, color: "var(--domain-c)" },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 12.5 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--fg-secondary)", minWidth: 0 }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: r.color, flexShrink: 0 }} />
                <span className="truncate">{r.label}</span>
              </span>
              <strong className="tabular" style={{ color: "var(--fg)", whiteSpace: "nowrap" }}>
                {r.current}/{r.target} {r.unit}
              </strong>
            </div>
          ))}
          <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
            {levelInfo.totalXp} XP · noch {levelInfo.xpToNext} XP bis Stufe {Math.min(6, levelInfo.level + 1)}
          </div>
        </div>
      </div>
    </div>
  );
}

function BotanicalPlantSvg({ level = 1 }) {
  return (
    <svg width="76" height="76" viewBox="0 0 96 96" style={{ flexShrink: 0, display: "block" }} aria-label={`Atelier-Pflanze Stufe ${level}`}>
      <path d="M32 68 L64 68 L59 86 L37 86 Z" fill="#c57b57" />
      <rect x="29" y="63" width="38" height="6" rx="3" fill="#d48c6a" />
      <path d={level >= 3 ? "M48 63 Q48 42 48 24" : "M48 63 Q48 50 48 40"} stroke="#059669" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M48 53 C36 51 34 41 45 44 C47 45 48 49 48 53 Z" fill="#10b981" />
      <path d="M48 50 C60 48 62 38 51 41 C49 42 48 46 48 50 Z" fill="#059669" />
      {level >= 2 && (
        <>
          <path d="M48 41 C33 38 32 27 44 31 C47 32 48 37 48 41 Z" fill="#34d399" />
          <path d="M48 38 C63 35 64 24 52 28 C49 29 48 34 48 38 Z" fill="#059669" />
        </>
      )}
      {level >= 3 && <circle cx="48" cy="23" r={level >= 5 ? 15 : 10} fill="#7c3aed" opacity="0.20" />}
      {level >= 4 && (
        <>
          <circle cx="40" cy="25" r="4.5" fill="#c084fc" />
          <circle cx="56" cy="27" r="4.5" fill="#f472b6" />
          <circle cx="48" cy="18" r="5" fill="#a78bfa" />
        </>
      )}
      {level >= 6 && (
        <>
          <circle cx="34" cy="36" r="3" fill="#fbbf24" />
          <circle cx="62" cy="35" r="3" fill="#fbbf24" />
        </>
      )}
    </svg>
  );
}

export function AtelierGardenCard({ levelInfo, streakInfo, achievements = [], compact = false }) {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }} data-testid="atelier-garden-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <strong style={{ fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
          <Sparkles size={14} style={{ color: "var(--lilac)" }} />
          <span>Dein Atelier-Garten ({levelInfo.plantStage})</span>
        </strong>
        <span className="lx-badge lx-badge-lilac" style={{ fontSize: 11 }}>
          {unlockedCount}/{achievements.length} Abzeichen
        </span>
      </div>

      <div className="lx-card lx-card-subtle" style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 12 }}>
        <BotanicalPlantSvg level={levelInfo.level} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>
            Stufe {levelInfo.level}: {levelInfo.title}
          </div>
          <div style={{ height: 6, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
            <div style={{ width: `${levelInfo.progressPct}%`, height: "100%", background: "var(--lilac)", borderRadius: 999 }} />
          </div>
          <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
            🛡️ {streakInfo.shieldsAvailable} Pausen-Schilde aktiv (freie Tage werden nie bestraft)
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 7 }}>
        {achievements.slice(0, compact ? 4 : 6).map((ach) => (
          <div
            key={ach.id}
            className="lx-card lx-card-subtle"
            title={ach.desc}
            style={{
              padding: "7px 9px",
              display: "flex",
              alignItems: "center",
              gap: 7,
              opacity: ach.unlocked ? 1 : 0.52,
              borderColor: ach.unlocked ? "var(--lilac-border)" : "var(--border-subtle)",
            }}
          >
            <span style={{ fontSize: 15, flexShrink: 0 }}>{ach.icon}</span>
            <div className="min-w-0">
              <div style={{ fontSize: 11.5, fontWeight: 700 }} className="truncate">
                {ach.title}
              </div>
              <div style={{ fontSize: 10, color: "var(--fg-muted)" }} className="truncate">
                {ach.unlocked ? "Freigeschaltet ✓" : ach.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
