import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, FileText, Layers, RotateCw, Sparkles } from "lucide-react";
import {
  selectGentleDailyDeck,
  previewIntervals,
  Rating,
} from "../lib/fsrsEngine";
import { RichText } from "../components/RichText";

export function FlashcardsTrainerView({
  flashcards = [],
  fsrsStatesMap = {},
  confusionCounts = {},
  dailyCardCap = 18,
  onReviewCard,
  onJumpToUnit,
}) {
  const [domainFilter, setDomainFilter] = useState("ALL");
  const [bonusMode, setBonusMode] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [sessionReviewed, setSessionReviewed] = useState([]);
  const touchStartX = useRef(null);

  const deck = useMemo(
    () =>
      selectGentleDailyDeck(flashcards, fsrsStatesMap, {
        domainFilter,
        confusionBoostTags: confusionCounts,
        dailyCap: dailyCardCap,
        bonusMode,
      }),
    [flashcards, fsrsStatesMap, domainFilter, confusionCounts, dailyCardCap, bonusMode]
  );

  const remainingQueue = useMemo(
    () => deck.queue.filter((c) => !sessionReviewed.includes(c.id)),
    [deck.queue, sessionReviewed]
  );

  const currentCard = remainingQueue[0] || null;
  const currentRecord = currentCard ? fsrsStatesMap[currentCard.id] : null;
  const intervals = useMemo(
    () => (currentCard ? previewIntervals(currentRecord) : {}),
    [currentCard, currentRecord]
  );

  useEffect(() => {
    setFlipped(false);
  }, [currentCard?.id]);

  useEffect(() => {
    const handleKey = (e) => {
      if (!currentCard) return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((v) => !v);
      } else if (flipped) {
        if (e.key === "1") handleRate(Rating.Again);
        if (e.key === "2") handleRate(Rating.Hard);
        if (e.key === "3") handleRate(Rating.Good);
        if (e.key === "4") handleRate(Rating.Easy);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentCard, flipped]);

  const handleRate = (rating) => {
    if (!currentCard) return;
    onReviewCard(currentCard, rating);
    setSessionReviewed((prev) => [...prev, currentCard.id]);
    setFlipped(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} data-testid="flashcards-trainer-view">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Integrierter FSRS-Kartentrainer (Offline &amp; Wischbar)</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--fg-muted)" }}>
            Original Anki-FSRS-Algorithmus ohne Überfälligkeits-Stress · jede Karte mit exaktem Original-Seitenverweis.
          </p>
        </div>

        <div className="lx-segmented">
          {[
            { id: "ALL", label: "Sanfter Tages-Mix" },
            { id: "A", label: "Gebiet A" },
            { id: "B", label: "Gebiet B" },
            { id: "C", label: "Gebiet C" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              className={`lx-seg-btn ${domainFilter === f.id ? "is-active" : ""}`}
              onClick={() => {
                setDomainFilter(f.id);
                setSessionReviewed([]);
                setBonusMode(false);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ruhige Statistik-Zeile ohne rote Warnzahlen */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <span className="lx-badge">
          <Layers size={13} />
          <span>In dieser Runde übrig: {remainingQueue.length} Karten</span>
        </span>
        <span className="lx-badge">
          <CheckCircle2 size={13} style={{ color: "var(--dot-success)" }} />
          <span>Bereits dauerhaft gefestigt: {deck.stats.masteredCount} / {flashcards.length}</span>
        </span>
      </div>

      {currentCard ? (
        <div
          className={`lx-card domain-border-${currentCard.domain}`}
          style={{
            maxWidth: 780,
            width: "100%",
            margin: "0 auto",
            padding: "22px 22px",
            minHeight: 320,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 18,
          }}
          onTouchStart={(e) => {
            touchStartX.current = e.touches?.[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const dx = (e.changedTouches?.[0]?.clientX ?? touchStartX.current) - touchStartX.current;
            touchStartX.current = null;
            if (!flipped && Math.abs(dx) > 45) {
              setFlipped(true);
            } else if (flipped && dx > 65) {
              handleRate(Rating.Good);
            } else if (flipped && dx < -65) {
              handleRate(Rating.Again);
            }
          }}
          data-testid="active-flashcard"
        >
          {/* Karten-Header mit Original-Skript-Seitenzahl */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className={`lx-badge domain-badge-${currentCard.domain}`}>
                Gebiet {currentCard.domain} · {currentCard.subdeck || "Kernwissen"}
              </span>
              <span className="lx-badge" style={{ fontWeight: 700 }}>
                <FileText size={12} />
                <span>{currentCard.page_label}</span>
              </span>
            </div>
            {currentCard.unit_id && (
              <button
                type="button"
                className="lx-badge"
                style={{ cursor: "pointer" }}
                onClick={() => onJumpToUnit(currentCard.domain, currentCard.unit_id)}
              >
                Ankerblatt öffnen →
              </button>
            )}
          </div>

          {/* Vorderseite & Rückseite */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "10px 0" }}>
            <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.45, color: "var(--fg)" }}>
              <RichText text={currentCard.front} />
            </div>

            {flipped && (
              <div
                style={{
                  paddingTop: 16,
                  borderTop: "1px solid var(--border)",
                  fontSize: 14.5,
                  lineHeight: 1.6,
                  color: "var(--fg-secondary)",
                  whiteSpace: "pre-line",
                }}
                data-testid="flashcard-back"
              >
                <RichText text={currentCard.back} />
              </div>
            )}
          </div>

          {/* Aktions-Buttons: Aufdecken -> 4 FSRS-Stufen (alle >= 44px auf iPhone) */}
          {!flipped ? (
            <button
              type="button"
              className="lx-btn lx-btn-primary"
              style={{ width: "100%", height: 46, fontSize: 14 }}
              onClick={() => setFlipped(true)}
              data-testid="flip-card-btn"
            >
              <RotateCw size={16} />
              <span>Antwort aufdecken (Leertaste / Antippen)</span>
            </button>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {[
                { rating: Rating.Again, label: "Nochmal", tone: "var(--dot-danger)" },
                { rating: Rating.Hard, label: "Schwer", tone: "var(--dot-warning)" },
                { rating: Rating.Good, label: "Gut", tone: "var(--dot-success)" },
                { rating: Rating.Easy, label: "Leicht", tone: "var(--primary-bg)" },
              ].map((btn) => (
                <button
                  key={btn.rating}
                  type="button"
                  className="lx-btn"
                  style={{
                    height: 52,
                    flexDirection: "column",
                    gap: 2,
                    borderColor: btn.tone,
                  }}
                  onClick={() => handleRate(btn.rating)}
                  data-testid={`rate-btn-${btn.rating}`}
                >
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{btn.label}</span>
                  <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>{intervals[btn.rating]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div
          className="lx-card"
          style={{
            maxWidth: 620,
            margin: "0 auto",
            textAlign: "center",
            padding: "28px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Sparkles size={28} style={{ color: "var(--dot-success)" }} />
          <h3 style={{ margin: 0, fontSize: 18 }}>Stark! Deine Karten-Etappe ist geschafft.</h3>
          <p style={{ margin: 0, color: "var(--fg-secondary)", fontSize: 13.5 }}>
            Du hast heute einen echten Gedächtnis-Baustein gelegt. Wenn du gerade Lust auf mehr hast, kannst du entspannt eine kleine +12-Karten-Bonusrunde dranhängen.
          </p>
          <button
            type="button"
            className="lx-btn lx-btn-primary"
            onClick={() => {
              setBonusMode(true);
              setSessionReviewed([]);
            }}
          >
            +12-Karten-Bonusrunde starten
          </button>
        </div>
      )}
    </div>
  );
}
