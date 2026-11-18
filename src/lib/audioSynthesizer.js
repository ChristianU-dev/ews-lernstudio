/**
 * Sperrbildschirm-Audio-Steuerung (`navigator.mediaSession`) für iPhone (Sofa & Zug)
 * sowie lokaler Offline-Demo-Audio-Generator (sanfter akustischer Fokus-Jingle / Intro-Track),
 * damit der Player auch sofort ohne hochgeladene MP3 getestet werden kann.
 */

export function createDemoSofaTrackBlob(durationSeconds = 12) {
  const sampleRate = 22050;
  const numSamples = sampleRate * durationSeconds;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, numSamples * 2, true);

  // Sanfter warmer C-Dur Ambient-Klangteppich (angenehm leise zum Testen & Fokus-Einstieg)
  const notes = [261.63, 329.63, 392.0, 523.25];
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const noteIdx = Math.min(notes.length - 1, Math.floor(t / (durationSeconds / notes.length)));
    const freq = notes[noteIdx];
    const env = Math.min(1, t * 2) * Math.min(1, (durationSeconds - t) * 1.5);
    const wave =
      0.55 * Math.sin(2 * Math.PI * freq * t) +
      0.28 * Math.sin(2 * Math.PI * (freq * 1.5) * t) +
      0.17 * Math.sin(2 * Math.PI * (freq * 0.5) * t);
    const sample = Math.max(-1, Math.min(1, wave * env * 0.18));
    view.setInt16(44 + i * 2, Math.round(sample * 32767), true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export function registerMediaSessionMetadata({
  title,
  subtitle,
  domain = "A",
  onPlay,
  onPause,
  onSeekBackward,
  onSeekForward,
}) {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  try {
    if (typeof window.MediaMetadata !== "undefined") {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: title || "Sofa-Podcast Überblick",
        artist: subtitle || `EWS Psychologie · Gebiet ${domain}`,
        album: "EWS Lernstudio (Grundschule Bayern)",
        artwork: [
          { src: "./pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "./pwa-512x512.png", sizes: "512x512", type: "image/png" },
        ],
      });
    }
    const safeHandler = (action, fn) => {
      try {
        navigator.mediaSession.setActionHandler(action, fn || null);
      } catch {}
    };
    safeHandler("play", onPlay);
    safeHandler("pause", onPause);
    safeHandler("seekbackward", onSeekBackward);
    safeHandler("seekforward", onSeekForward);
  } catch {}
}
