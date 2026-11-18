import dagre from "@dagrejs/dagre";
import { Position } from "@xyflow/react";

const CARD_W = 276;
const CARD_H = 104;

export function computeWidescreenLayout(rawNodes, rawEdges) {
  if (!rawNodes.length) return [];
  const nodeById = new Map(rawNodes.map((n) => [n.id, n]));
  const adj = new Map(rawNodes.map((n) => [n.id, new Set()]));
  for (const e of rawEdges) {
    if (adj.has(e.source) && adj.has(e.target)) {
      adj.get(e.source).add(e.target);
      adj.get(e.target).add(e.source);
    }
  }
  const visited = new Set();
  const multiComponents = [];
  const singletons = [];
  for (const n of rawNodes) {
    if (visited.has(n.id)) continue;
    const queue = [n.id];
    visited.add(n.id);
    const compIds = [];
    while (queue.length) {
      const cur = queue.shift();
      compIds.push(cur);
      for (const nb of adj.get(cur) || []) {
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push(nb);
        }
      }
    }
    if (compIds.length === 1) singletons.push(nodeById.get(compIds[0]));
    else multiComponents.push(compIds);
  }
  multiComponents.sort((a, b) => b.length - a.length);
  const positioned = new Map();
  const MAX_SHELF_WIDTH = 1760, GAP_X = 88, GAP_Y = 64;
  let cursorX = 0, cursorY = 0, rowHeight = 0;

  for (const compIds of multiComponents) {
    const idSet = new Set(compIds);
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: "LR", ranksep: 88, nodesep: 20, marginx: 0, marginy: 0 });
    for (const id of compIds) g.setNode(id, { width: CARD_W, height: CARD_H });
    for (const e of rawEdges) {
      if (idSet.has(e.source) && idSet.has(e.target)) g.setEdge(e.source, e.target);
    }
    dagre.layout(g);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const id of compIds) {
      const p = g.node(id);
      minX = Math.min(minX, p.x - CARD_W / 2);
      minY = Math.min(minY, p.y - CARD_H / 2);
      maxX = Math.max(maxX, p.x + CARD_W / 2);
      maxY = Math.max(maxY, p.y + CARD_H / 2);
    }
    const compW = Math.max(CARD_W, maxX - minX), compH = Math.max(CARD_H, maxY - minY);
    if (cursorX > 0 && cursorX + compW > MAX_SHELF_WIDTH) {
      cursorX = 0; cursorY += rowHeight + GAP_Y; rowHeight = 0;
    }
    for (const id of compIds) {
      const p = g.node(id);
      positioned.set(id, { x: cursorX + (p.x - CARD_W / 2 - minX), y: cursorY + (p.y - CARD_H / 2 - minY) });
    }
    cursorX += compW + GAP_X;
    rowHeight = Math.max(rowHeight, compH);
  }
  if (multiComponents.length > 0 && singletons.length > 0) cursorY += rowHeight + GAP_Y;
  singletons.forEach((n, idx) => {
    positioned.set(n.id, { x: (idx % 4) * (CARD_W + 28), y: cursorY + Math.floor(idx / 4) * (CARD_H + 22) });
  });
  return rawNodes.map((n) => ({
    ...n,
    position: positioned.get(n.id) || { x: 0, y: 0 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  }));
}
