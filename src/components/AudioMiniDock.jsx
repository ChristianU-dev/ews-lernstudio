import React, { useEffect, useRef, useState } from "react";
import { Headphones, Pause, Play, RotateCcw, FastForward, X } from "lucide-react";
import { registerMediaSessionMetadata } from "../lib/audioSynthesizer";

export function AudioMiniDock({ activeTrack, onClose, onCompleteTrack }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1.0);
  const [audioUrl, setAudioUrl] = useState(null);

  useEffect(() => {
    if (!activeTrack) {
      setAudioUrl(null);
      setPlaying(false);
      return;
    }
    let revoked = null;
    if (activeTrack.blob instanceof Blob) {
      revoked = URL.createObjectURL(activeTrack.blob);
      setAudioUrl(revoked);
    } else if (activeTrack.url) {
      setAudioUrl(activeTrack.url);
    }
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [activeTrack]);

  useEffect(() => {
    if (!audioUrl || !audioRef.current) return;
    const el = audioRef.current;
    el.playbackRate = rate;

    registerMediaSessionMetadata({
      title: activeTrack?.title || "Sofa-Podcast",
      subtitle: activeTrack?.subtitle || `Gebiet ${activeTrack?.domain || "A"}`,
      domain: activeTrack?.domain || "A",
      onPlay: () => el.play().catch(() => {}),
      onPause: () => el.pause(),
      onSeekBackward: () => {
        el.currentTime = Math.max(0, el.currentTime - 10);
      },
      onSeekForward: () => {
        el.currentTime = Math.min(el.duration || 0, el.currentTime + 15);
      },
    });

    if (activeTrack?.autoPlay) {
      el.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
  }, [audioUrl, activeTrack]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, [rate]);

  if (!activeTrack) return null;

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const seekBy = (sec) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(el.duration || 9999, el.currentTime + sec));
  };

  const cycleRate = () => {
    const rates = [1.0, 1.25, 1.5, 0.9];
    const next = rates[(rates.indexOf(rate) + 1) % rates.length];
    setRate(next);
  };

  const fmt = (sec) => {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60);
    const r = String(s % 60).padStart(2, "0");
    return `${m}:${r}`;
  };

  return (
    <div className="lx-audio-dock" data-testid="audio-mini-dock">
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          onCompleteTrack?.(activeTrack);
        }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div className="min-w-0" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            className={`lx-badge domain-badge-${activeTrack.domain || "A"}`}
            style={{ padding: "0 7px", flexShrink: 0 }}
          >
            <Headphones size={13} />
            <span>{activeTrack.domain || "Audio"}</span>
          </span>
          <div className="min-w-0">
            <div style={{ fontWeight: 600, fontSize: 12.5 }} className="truncate">
              {activeTrack.title}
            </div>
            <div style={{ fontSize: 11, color: "var(--fg-muted)" }} className="truncate">
              {activeTrack.subtitle || "Sperrbildschirm-Steuerung aktiv · Offline im Zug verfügbar"}
            </div>
          </div>
        </div>
        <button type="button" className="lx-icon-btn" onClick={onClose} aria-label="Audioplayer schließen">
          <X size={15} />
        </button>
      </div>

      <input
        type="range"
        min={0}
        max={Math.max(1, duration)}
        step={0.5}
        value={Math.min(currentTime, Math.max(1, duration))}
        onChange={(e) => {
          const val = Number(e.target.value);
          setCurrentTime(val);
          if (audioRef.current) audioRef.current.currentTime = val;
        }}
        aria-label="Wiedergabeposition"
        style={{ width: "100%", accentColor: "var(--lilac)", cursor: "pointer" }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <span className="tabular" style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>
          {fmt(currentTime)} / {fmt(duration)}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            className="lx-btn"
            style={{ height: 32, padding: "0 9px" }}
            onClick={() => seekBy(-10)}
            title="10 Sekunden zurück"
          >
            <RotateCcw size={13} />
            <span>-10s</span>
          </button>
          <button
            type="button"
            className="lx-btn lx-btn-primary"
            style={{ height: 34, padding: "0 14px" }}
            onClick={togglePlay}
            data-testid="audio-play-pause-btn"
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
            <span>{playing ? "Pause" : "Abspielen"}</span>
          </button>
          <button
            type="button"
            className="lx-btn"
            style={{ height: 32, padding: "0 9px" }}
            onClick={() => seekBy(15)}
            title="15 Sekunden vor"
          >
            <FastForward size={13} />
            <span>+15s</span>
          </button>
        </div>

        <button
          type="button"
          className="lx-badge"
          style={{ cursor: "pointer" }}
          onClick={cycleRate}
          title="Wiedergabegeschwindigkeit ändern"
        >
          {rate}x
        </button>
      </div>
    </div>
  );
}
