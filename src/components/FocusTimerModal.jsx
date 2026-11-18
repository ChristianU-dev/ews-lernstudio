import React, { useEffect, useState } from "react";
import { Pause, Play, RotateCcw, Sparkles, Timer } from "lucide-react";
import { Modal } from "../design/ui";

const PRESETS = [
  { minutes: 15, label: "15 Min. · Sofa-Sprint", desc: "Ideal gegen die Anfangshürde" },
  { minutes: 25, label: "25 Min. · Klassisches Pomodoro", desc: "1 Ankerblatt + Laut-Erzählen" },
  { minutes: 32, label: "32 Min. · Volle Kern-Etappe", desc: "Dein komplettes Tagesziel" },
  { minutes: 45, label: "45 Min. · Deep-Flow", desc: "Inkl. Fallvignette im Simulator" },
];

function playSoftCompletionChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.11, ctx.currentTime + i * 0.16 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.16 + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.16);
      osc.stop(ctx.currentTime + i * 0.16 + 0.75);
    });
  } catch {}
}

export function FocusTimerModal({ open, onOpenChange, onCompleteSession }) {
  const [targetMinutes, setTargetMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          playSoftCompletionChime();
          onCompleteSession?.(targetMinutes);
          return targetMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, targetMinutes, onCompleteSession]);

  const selectPreset = (mins) => {
    setRunning(false);
    setTargetMinutes(mins);
    setSecondsLeft(mins * 60);
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const totalSec = Math.max(1, targetMinutes * 60);
  const pct = Math.round(((totalSec - secondsLeft) / totalSec) * 100);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Ruhiger Fokus-Timer (Pomodoro & Flow)"
      subtitle="Du kannst dieses Fenster schließen – der Timer zählt im Hintergrund entspannt weiter."
      width={460}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
          {PRESETS.map((p) => {
            const active = targetMinutes === p.minutes;
            return (
              <button
                key={p.minutes}
                type="button"
                className="lx-card lx-card-subtle"
                style={{
                  padding: "9px 11px",
                  textAlign: "left",
                  cursor: "pointer",
                  borderColor: active ? "var(--domain-a)" : "var(--border)",
                  background: active ? "var(--domain-a-soft)" : "var(--bg-subtle)",
                }}
                onClick={() => selectPreset(p.minutes)}
              >
                <div style={{ fontWeight: 700, fontSize: 12.5 }}>{p.label}</div>
                <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>{p.desc}</div>
              </button>
            );
          })}
        </div>

        <div
          className="lx-card lx-card-subtle"
          style={{
            padding: "20px 16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            className="tabular"
            style={{ fontSize: 42, fontWeight: 750, letterSpacing: "-0.03em", color: "var(--fg)" }}
            data-testid="focus-timer-display"
          >
            {mm}:{ss}
          </div>
          <div style={{ fontSize: 12, color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={13} style={{ color: "var(--domain-b)" }} />
            <span>{running ? `Fokus läuft (${pct} %) · +35 XP bei Abschluss` : "Bereit für deine ruhige Fokus-Runde"}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="lx-btn lx-btn-primary"
            style={{ flex: 1, minHeight: 44 }}
            onClick={() => setRunning((v) => !v)}
            data-testid="focus-timer-start-btn"
          >
            {running ? <Pause size={16} /> : <Play size={16} />}
            <span>{running ? "Kurz pausieren" : "Fokus-Timer starten"}</span>
          </button>
          <button
            type="button"
            className="lx-btn"
            style={{ minHeight: 44 }}
            onClick={() => {
              setRunning(false);
              setSecondsLeft(targetMinutes * 60);
            }}
            aria-label="Timer zurücksetzen"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function LiveTimerBadge({ running, secondsLeft, onClick }) {
  if (!running) return null;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  return (
    <button
      type="button"
      className="lx-badge"
      onClick={onClick}
      style={{
        cursor: "pointer",
        background: "var(--domain-a-soft)",
        borderColor: "var(--domain-a-border)",
        color: "var(--domain-a)",
        fontWeight: 700,
      }}
    >
      <Timer size={12} />
      <span className="tabular">{mm}:{ss}</span>
    </button>
  );
}
