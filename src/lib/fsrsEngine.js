/**
 * FSRS-Kartentrainer Engine (ts-fsrs) — Stressfreies Spaced Repetition
 * - Nutzt den originalen Open-Source FSRS-Algorithmus (`ts-fsrs`).
 * - Verhindert demotivierende Kartenberge nach Pausentagen durch sanfte Tages-Caps
 *   und priorisiert Verwechslungs-Paare (Confusion Tags) automatisch.
 */

import { createEmptyCard, fsrs, generatorParameters, Rating, State } from "ts-fsrs";

const params = generatorParameters({
  enable_fuzz: false,
  request_retention: 0.9,
  maximum_interval: 180,
});

const scheduler = fsrs(params);

export { Rating, State };

export function createInitialFsrsRecord(cardId, now = new Date()) {
  const empty = createEmptyCard(now);
  return {
    cardId,
    card: serializeFsrsCard(empty),
    reviewCount: 0,
    lapses: 0,
    lastRating: null,
    updatedAt: now.toISOString(),
  };
}

export function serializeFsrsCard(card) {
  return {
    ...card,
    due: card.due instanceof Date ? card.due.toISOString() : String(card.due),
    last_review: card.last_review
      ? card.last_review instanceof Date
        ? card.last_review.toISOString()
        : String(card.last_review)
      : null,
  };
}

export function hydrateFsrsCard(serialized, now = new Date()) {
  if (!serialized) return createEmptyCard(now);
  return {
    ...serialized,
    due: serialized.due ? new Date(serialized.due) : new Date(now),
    last_review: serialized.last_review ? new Date(serialized.last_review) : undefined,
  };
}

export function previewIntervals(record, now = new Date()) {
  const card = hydrateFsrsCard(record?.card, now);
  const scheduling = scheduler.repeat(card, now);
  const formatDiff = (due) => {
    const diffMin = Math.max(1, Math.round((new Date(due).getTime() - now.getTime()) / 60000));
    if (diffMin < 60) return `${diffMin} Min.`;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `${diffHours} Std.`;
    const diffDays = Math.max(1, Math.round(diffHours / 24));
    return `${diffDays} ${diffDays === 1 ? "Tag" : "Tage"}`;
  };

  return {
    [Rating.Again]: formatDiff(scheduling[Rating.Again].card.due),
    [Rating.Hard]: formatDiff(scheduling[Rating.Hard].card.due),
    [Rating.Good]: formatDiff(scheduling[Rating.Good].card.due),
    [Rating.Easy]: formatDiff(scheduling[Rating.Easy].card.due),
  };
}

export function reviewCard(record, rating, now = new Date()) {
  const base = record || createInitialFsrsRecord("temp", now);
  const card = hydrateFsrsCard(base.card, now);
  const result = scheduler.repeat(card, now)[rating];
  const nextCard = serializeFsrsCard(result.card);

  return {
    cardId: base.cardId,
    card: nextCard,
    reviewCount: (base.reviewCount || 0) + 1,
    lapses: (base.lapses || 0) + (rating === Rating.Again ? 1 : 0),
    lastRating: rating,
    updatedAt: now.toISOString(),
  };
}

/**
 * Stellt einen sanften, motivierenden Tages-Stapel zusammen (OHNE rote "Überfällig!"-Warnungen!).
 * Pausentage führen niemals zu einem Straf-Berg, sondern werden ruhig portioniert.
 */
export function selectGentleDailyDeck(
  allCards = [],
  stateMap = {},
  {
    domainFilter = "ALL",
    unitFilter = null,
    confusionBoostTags = {},
    dailyCap = 18,
    bonusMode = false,
    now = new Date(),
  } = {}
) {
  const cap = bonusMode ? 12 : dailyCap;
  const filtered = allCards.filter((c) => {
    if (domainFilter && domainFilter !== "ALL" && c.domain !== domainFilter) return false;
    if (unitFilter && c.unit_id !== unitFilter) return false;
    return true;
  });

  const dueCards = [];
  const newCards = [];
  const aheadCards = [];

  for (const c of filtered) {
    const rec = stateMap[c.id];
    const confusionScore = c.confusion_tag ? Number(confusionBoostTags[c.confusion_tag] || 0) : 0;
    if (!rec || rec.card?.state === State.New || !rec.reviewCount) {
      newCards.push({ card: c, rec, confusionScore });
    } else {
      const dueDate = new Date(rec.card.due);
      if (dueDate.getTime() <= now.getTime()) {
        dueCards.push({ card: c, rec, dueDate, confusionScore });
      } else {
        aheadCards.push({ card: c, rec, dueDate, confusionScore });
      }
    }
  }

  // Sortiere fällige Karten nach Verwechslungs-Relevanz und Stabilität (niedrigere Stabilität zuerst)
  dueCards.sort((a, b) => {
    if (b.confusionScore !== a.confusionScore) return b.confusionScore - a.confusionScore;
    return (a.rec?.card?.stability || 0) - (b.rec?.card?.stability || 0);
  });

  // Sortiere neue Karten ausgewogen über A, B, C und Verwechslungs-Relevanz
  newCards.sort((a, b) => b.confusionScore - a.confusionScore);

  const maxDue = Math.min(dueCards.length, Math.ceil(cap * 0.65));
  const selected = dueCards.slice(0, maxDue).map((x) => x.card);

  // Mische neue Karten aus verschiedenen Gebieten (Round-Robin A/B/C), damit es abwechslungsreich bleibt
  const remainingSlots = cap - selected.length;
  if (remainingSlots > 0 && newCards.length > 0) {
    const byDom = { A: [], B: [], C: [], OTHER: [] };
    for (const item of newCards) {
      (byDom[item.card.domain] || byDom.OTHER).push(item.card);
    }
    let idx = 0;
    const order = ["A", "B", "C", "OTHER"];
    while (selected.length < cap) {
      let addedInPass = false;
      for (const dom of order) {
        if (idx < byDom[dom].length && selected.length < cap) {
          selected.push(byDom[dom][idx]);
          addedInPass = true;
        }
      }
      if (!addedInPass) break;
      idx += 1;
    }
  }

  // Falls im Bonus-Modus fast alles schon gelernt wurde, biete gezielte Auffrischung an
  if (bonusMode && selected.length < cap && aheadCards.length > 0) {
    aheadCards.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    for (const item of aheadCards) {
      if (selected.length >= cap) break;
      selected.push(item.card);
    }
  }

  return {
    queue: selected,
    stats: {
      totalAvailable: filtered.length,
      masteredCount: Object.values(stateMap).filter(
        (r) => r?.reviewCount > 0 && (r?.card?.stability || 0) >= 5
      ).length,
      reviewedEverCount: Object.values(stateMap).filter((r) => (r?.reviewCount || 0) > 0).length,
      sessionSize: selected.length,
    },
  };
}
