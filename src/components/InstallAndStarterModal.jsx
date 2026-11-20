import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Cloud, Copy, Download, Laptop, Share2, Smartphone, Sparkles } from "lucide-react";
import { Modal } from "../design/ui";

const LIVE_URL = "https://christianu-dev.github.io/ews-lernstudio/";

export function InstallAndStarterModal({
  open,
  onOpenChange,
  deferredPrompt,
  onTriggerBrowserInstall,
  onOpenDownloadsSync,
}) {
  const [qrSvg, setQrSvg] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(LIVE_URL, {
      type: "svg",
      margin: 1,
      width: 156,
      color: { dark: "#1b1b24", light: "#ffffff" },
    })
      .then((svg) => {
        if (!cancelled) setQrSvg(svg);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownloadDesktopStarter = () => {
    const content = `[InternetShortcut]\r\nURL=${LIVE_URL}\r\n`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "EWS Lernstudio starten.url";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(LIVE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="App direkt auf PC-Desktop & iPhone-Homescreen legen"
      subtitle="Einmal eingerichtet startest du deine Lern-App mit einem einzigen Klick – ohne Browser-Eingabe und ohne laufenden Zweit-PC!"
      width={620}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 4 }}>
        {/* Live-Link Box */}
        <div
          className="lx-cat-merksatz"
          style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}
        >
          <div className="min-w-0">
            <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--lilac)", textTransform: "uppercase" }}>
              DEINE DAUERHAFTE LIVE-APP-ADRESSE (ÜBERALL ERREICHBAR)
            </div>
            <div style={{ fontWeight: 700, fontSize: 13.5, wordBreak: "break-all" }}>{LIVE_URL}</div>
          </div>
          <button type="button" className="lx-btn" onClick={handleCopyUrl}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? "Kopiert!" : "Link kopieren"}</span>
          </button>
        </div>

        {/* 2 Spalten: Links Windows-Laptop Desktop, Rechts iPhone + Sync */}
        <div className="lx-anchor-two-col">
          {/* 1. WINDOWS-LAPTOP STARTER */}
          <div className="lx-card lx-card-subtle" style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px" }}>
            <strong style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 7, color: "var(--domain-a)" }}>
              <Laptop size={16} />
              <span>1. Auf dem Laptop (Desktop-Icon)</span>
            </strong>
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--fg-secondary)", lineHeight: 1.5 }}>
              Öffne die Live-URL oben in Edge oder Chrome und klicke rechts in der Adressleiste auf <strong>„App installieren“</strong> — oder lade dir hier direkt das Doppelklick-Symbol für deinen Desktop herunter:
            </p>

            {deferredPrompt && (
              <button
                type="button"
                className="lx-btn lx-btn-primary"
                onClick={onTriggerBrowserInstall}
              >
                <Sparkles size={14} />
                <span>App jetzt als Desktop-Programm installieren</span>
              </button>
            )}

            <button
              type="button"
              className="lx-btn lx-btn-primary"
              onClick={handleDownloadDesktopStarter}
              data-testid="download-desktop-starter-btn"
            >
              <Download size={14} />
              <span>Desktop-Starter (.url) herunterladen</span>
            </button>
            <div style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>
              Danach die heruntergeladene Datei <strong>„EWS Lernstudio starten.url“</strong> einfach auf deinen Windows-Desktop ziehen!
            </div>
          </div>

          {/* 2. IPHONE HOMESCREEN PER QR-CODE */}
          <div className="lx-card lx-card-subtle" style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px" }}>
            <strong style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 7, color: "var(--domain-b)" }}>
              <Smartphone size={16} />
              <span>2. Auf dem iPhone (Homescreen-App)</span>
            </strong>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {qrSvg && (
                <div
                  style={{
                    background: "#ffffff",
                    padding: 5,
                    borderRadius: 9,
                    border: "1px solid var(--border)",
                    flexShrink: 0,
                    transform: "scale(0.9)",
                    transformOrigin: "left center",
                  }}
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                  aria-label="QR-Code für iPhone Safari"
                />
              )}
              <ol style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "var(--fg-secondary)", lineHeight: 1.5 }}>
                <li>Mit der <strong>iPhone-Kamera</strong> diesen QR-Code scannen (öffnet Safari).</li>
                <li>Unten auf <Share2 size={11} style={{ display: "inline", verticalAlign: "-1px" }} /> <strong>Teilen → „Zum Home-Bildschirm“</strong> tippen.</li>
                <li>Fertig! Läuft im Vollbild &amp; offline im Zug.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Wie bleiben PC & iPhone auf demselben Stand? */}
        <div
          className="lx-cat-praxis"
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}
        >
          <div className="min-w-0" style={{ flex: "1 1 280px" }}>
            <strong style={{ fontSize: 13, color: "var(--cat-praxis-fg)", display: "flex", alignItems: "center", gap: 6 }}>
              <Cloud size={15} />
              <span>Wie bleiben iPhone &amp; Laptop automatisch aktuell?</span>
            </strong>
            <div style={{ fontSize: 12, color: "var(--fg-secondary)", marginTop: 2 }}>
              <strong>App-Updates:</strong> Kommen vollautomatisch bei jedem Öffnen über GitHub Pages.<br />
              <strong>Dein Lernstand:</strong> Verbinde einmalig dein Google-Konto (oder einen Sync-Code) unter „Downloads &amp; Cloud“ – schon sind Notizen, Kapitel &amp; Karten auf PC und iPhone identisch!
            </div>
          </div>
          <button
            type="button"
            className="lx-btn"
            onClick={() => {
              onOpenChange(false);
              onOpenDownloadsSync?.();
            }}
          >
            Zu Sync &amp; Downloads →
          </button>
        </div>
      </div>
    </Modal>
  );
}
