import dagre from "@dagrejs/dagre";
import { Position } from "@xyflow/react";

const CARD_W = 268;
const CARD_H = 106;

/**
 * Kollisionsfreies 3-Spalten-Sternlayout für den Fokus-Modus:
 * Links (x=0): Nachbarn im selben Skript
 * Mitte (x=430): Ausgewähltes Fokus-Konzept
 * Rechts (x=860): Skriptübergreifende Theorie-Brücken (A <-> B <-> C)
 */
export function computeFocusStarLayout(focalNode, sameDomNodes, crossDomNodes) {
  const ROW_STEP = 132;
  const maxSideCount = Math.max(1, sameDomNodes.length, crossDomNodes.length);
  const totalHeight = maxSideCount * ROW_STEP;

  const placeColumn = (items, xPos, srcPos, tgtPos) => {
    const startY = (totalHeight - items.length * ROW_STEP) / 2;
    return items.map((n, idx) => ({
      ...n,
      position: { x: xPos, y: Math.round(startY + idx * ROW_STEP) },
      sourcePosition: srcPos,
      targetPosition: tgtPos,
    }));
  };

  const centerNode = {
    ...focalNode,
    position: { x: 430, y: Math.round((totalHeight - ROW_STEP) / 2) },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  };

  if (sameDomNodes.length === 0) {
    centerNode.position.x = 0;
    return [
      centerNode,
      ...placeColumn(crossDomNodes, 440, Position.Right, Position.Left),
    ];
  }
  if (crossDomNodes.length === 0) {
    return [
      ...placeColumn(sameDomNodes, 0, Position.Right, Position.Left),
      centerNode,
    ];
  }

  return [
    ...placeColumn(sameDomNodes, 0, Position.Right, Position.Left),
    centerNode,
    ...placeColumn(crossDomNodes, 860, Position.Right, Position.Left),
  ];
}

/**
 * Geordnetes 3-Spalten-Skript-Layout (Gebiet A links | Gebiet B Mitte | Gebiet C rechts)
 * in exakter Kapitelreihenfolge für maximale Orientierung im Gesamtnetz!
 */
export function computeThreeScriptColumnsLayout(rawNodes) {
  const byDom = { A: [], B: [], C: [] };
  for (const n of rawNodes) {
    const dom = n.data?.domain || "A";
    (byDom[dom] || byDom.A).push(n);
  }
  const xMap = { A: 0, B: 450, C: 900 };
  const ROW_STEP = 128;
  const out = [];

  for (const dom of ["A", "B", "C"]) {
    const col = byDom[dom];
    col.forEach((n, idx) => {
      out.push({
        ...n,
        position: { x: xMap[dom], y: idx * ROW_STEP },
        sourcePosition: dom === "C" ? Position.Left : Position.Right,
        targetPosition: dom === "A" ? Position.Right : Position.Left,
      });
    });
  }
  return out;
}

export function computeWidescreenLayout(rawNodes, rawEdges) {
  if (!rawNodes.length) return [];
  // Für ein einzelnes Gebiet (15 Knoten) sauberes 3-spaltiges Kapitel-Raster statt endloser Kette!
  const domainsPresent = new Set(rawNodes.map((n) => n.data?.domain));
  if (domainsPresent.size === 3 && rawNodes.length >= 30) {
    return computeThreeScriptColumnsLayout(rawNodes);
  }
  if (domainsPresent.size === 1 && rawNodes.length <= 20) {
    return rawNodes.map((n, idx) => ({
      ...n,
      position: {
        x: (idx % 3) * (CARD_W + 96),
        y: Math.floor(idx / 3) * (CARD_H + 46),
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }));
  }

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", ranksep: 170, nodesep: 42, marginx: 16, marginy: 16 });
  for (const n of rawNodes) g.setNode(n.id, { width: CARD_W, height: CARD_H });
  for (const e of rawEdges) g.setEdge(e.source, e.target);
  dagre.layout(g);

  return rawNodes.map((n) => {
    const p = g.node(n.id) || { x: 0, y: 0 };
    return {
      ...n,
      position: { x: Math.round(p.x - CARD_W / 2), y: Math.round(p.y - CARD_H / 2) },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });
}
