import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Drawer } from "vaul";
import { ArrowDown, ArrowRight, Link2, Sparkles, Maximize2, Network, GitBranch } from "lucide-react";
import {
  computeFocusStarLayout,
  computeWidescreenLayout,
} from "../design/widescreen_graph_layout";
import { Select, StatusDot } from "../design/ui";

function EwsConceptCardNode({ data, selected }) {
  const dom = data.domain || "A";
  const borderCol =
    dom === "B" ? "var(--domain-b)" : dom === "C" ? "var(--domain-c)" : "var(--domain-a)";
  const isFocal = Boolean(data.isFocal) || selected;
  const isDimmed = Boolean(data.isDimmed);
  const isPortrait = Boolean(data.isPortrait);

  return (
    <div
      className="lx-rf-card"
      style={{
        borderLeft: `4px solid ${borderCol}`,
        borderColor: isFocal ? borderCol : "var(--border-strong)",
        boxShadow: isFocal ? "var(--shadow-lg)" : "var(--shadow-xs)",
        opacity: isDimmed ? 0.28 : 1,
        outline: isFocal ? `2px solid ${borderCol}` : "none",
        outlineOffset: 1,
      }}
    >
      <Handle
        type="target"
        position={isPortrait ? Position.Top : Position.Left}
        id="left"
        style={{ width: 7, height: 7, background: borderCol, border: "none" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
        <span
          className={`lx-badge domain-badge-${dom}`}
          style={{ minHeight: 20, padding: "1px 7px", fontSize: 10.5, fontWeight: 600 }}
        >
          Gebiet {dom} · {data.chapter_ref || ""}
        </span>
        <StatusDot tone={data.mastered ? "success" : isFocal ? "active" : "neutral"} />
      </div>
      <div
        style={{
          fontWeight: 700,
          fontSize: 13,
          lineHeight: 1.3,
          color: "var(--fg)",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {data.label}
      </div>
      <div style={{ fontSize: 11, color: "var(--fg-muted)" }} className="truncate">
        {data.page_label || data.subtitle || ""}
      </div>
      <Handle
        type="source"
        position={isPortrait ? Position.Bottom : Position.Right}
        id="right"
        style={{ width: 7, height: 7, background: borderCol, border: "none" }}
      />
    </div>
  );
}

const nodeTypes = { ewsCard: EwsConceptCardNode };

function shortEdgeLabel(str, max = 21) {
  if (!str) return "";
  const s = String(str).trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function computePortraitMobileStarLayout(centerNode, sameDom, crossDom) {
  const result = [];
  const cardW = 268;
  const rowGap = 152;
  let y = 0;

  if (sameDom.length > 0) {
    sameDom.slice(0, 2).forEach((n, idx, arr) => {
      const x = (idx - (arr.length - 1) / 2) * (cardW + 24);
      result.push({ ...n, position: { x, y } });
    });
    y += rowGap;
  }

  result.push({ ...centerNode, position: { x: 0, y } });
  y += rowGap;

  crossDom.slice(0, 3).forEach((n, idx, arr) => {
    const x = (idx - (arr.length - 1) / 2) * (cardW + 24);
    result.push({ ...n, position: { x, y } });
  });

  return result;
}

export function KnowledgeGraphView({
  graphData = { nodes: [], edges: [] },
  unitProgressMap = {},
  onJumpToDomainHint,
}) {
  const allNodes = graphData?.nodes || [];
  const allEdges = graphData?.edges || [];

  const [filterMode, setFilterMode] = useState("FOCUS");
  const [selectedNodeId, setSelectedNodeId] = useState(() => allNodes[0]?.id || null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 960 : false
  );
  // Auf dem iPhone standardmäßig der 100 % lesbare vertikale „Vernetzungs-Pfad“ (mit 1-Tap Umschalter zum Canvas!)
  const [mobileMode, setMobileMode] = useState("PATH");
  const rfInstanceRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobileViewport(window.innerWidth < 960);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const activeNode = useMemo(
    () => allNodes.find((n) => n.id === selectedNodeId) || allNodes[0] || null,
    [allNodes, selectedNodeId]
  );

  const { layoutNodes, layoutEdges } = useMemo(() => {
    if (!allNodes.length || !activeNode) return { layoutNodes: [], layoutEdges: [] };
    const focalId = activeNode.id;

    const toRfNode = (n, isFocal = false, isDimmed = false, isPortrait = false) => {
      const isMastered = Object.entries(unitProgressMap).some(
        ([uid, p]) => uid.startsWith(`${n.domain}-`) && p?.status === "mastered"
      );
      return {
        id: n.id,
        type: "ewsCard",
        data: {
          ...n,
          mastered: isMastered,
          isFocal,
          isDimmed,
          isPortrait,
        },
      };
    };

    if (filterMode === "FOCUS") {
      const incidentEdges = allEdges.filter(
        (e) => e.source === focalId || e.target === focalId
      );
      const neighborIds = new Set();
      for (const e of incidentEdges) {
        neighborIds.add(e.source === focalId ? e.target : e.source);
      }
      const neighborNodes = allNodes.filter((n) => neighborIds.has(n.id));
      const usePortrait = isMobileViewport;

      const sameDom = neighborNodes
        .filter((n) => n.domain === activeNode.domain)
        .map((n) => toRfNode(n, false, false, usePortrait));
      const crossDom = neighborNodes
        .filter((n) => n.domain !== activeNode.domain)
        .map((n) => toRfNode(n, false, false, usePortrait));
      const center = toRfNode(activeNode, true, false, usePortrait);

      const positioned = usePortrait
        ? computePortraitMobileStarLayout(center, sameDom, crossDom)
        : computeFocusStarLayout(center, sameDom, crossDom);

      const posIdSet = new Set(positioned.map((p) => p.id));
      const sameIdSet = new Set(sameDom.map((n) => n.id));

      const starEdges = incidentEdges
        .filter((e) => posIdSet.has(e.source) && posIdSet.has(e.target))
        .map((e) => {
          const otherId = e.source === focalId ? e.target : e.source;
          const isLeftNeighbor = sameIdSet.has(otherId);
          const src = isLeftNeighbor ? otherId : focalId;
          const tgt = isLeftNeighbor ? focalId : otherId;
          const isCross = e.bridge_type === "cross_domain";
          const strokeColor = isCross ? "var(--domain-b)" : "var(--domain-a)";

          return {
            id: e.id,
            source: src,
            target: tgt,
            type: "default",
            label: shortEdgeLabel(e.label, 22),
            animated: isCross,
            style: { stroke: strokeColor, strokeWidth: 2 },
            labelBgPadding: [7, 4],
            labelBgBorderRadius: 6,
            labelBgStyle: {
              fill: "var(--bg-surface)",
              stroke: "var(--border-strong)",
              fillOpacity: 0.98,
            },
            labelStyle: {
              fill: "var(--fg)",
              fontSize: 11,
              fontWeight: 600,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 15,
              height: 15,
              color: strokeColor,
            },
          };
        });

      return { layoutNodes: positioned, layoutEdges: starEdges };
    }

    const connectedIds = new Set([focalId]);
    for (const e of allEdges) {
      if (e.source === focalId) connectedIds.add(e.target);
      if (e.target === focalId) connectedIds.add(e.source);
    }

    const visibleRaw = allNodes.filter((n) =>
      filterMode === "ALL" ? true : n.domain === filterMode
    );
    const visibleSet = new Set(visibleRaw.map((n) => n.id));

    const mappedNodes = visibleRaw.map((n) =>
      toRfNode(n, n.id === focalId, filterMode === "ALL" && !connectedIds.has(n.id), false)
    );

    const mappedEdges = allEdges
      .filter((e) => visibleSet.has(e.source) && visibleSet.has(e.target))
      .map((e) => {
        const touchesFocal = e.source === focalId || e.target === focalId;
        const strokeColor = touchesFocal
          ? e.bridge_type === "cross_domain"
            ? "var(--domain-b)"
            : "var(--domain-a)"
          : "var(--border-strong)";

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: "default",
          label: undefined,
          animated: touchesFocal && e.bridge_type === "cross_domain",
          style: {
            stroke: strokeColor,
            strokeWidth: touchesFocal ? 2.4 : 1.3,
            opacity: filterMode === "ALL" && !touchesFocal ? 0.25 : 0.85,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color: strokeColor,
          },
        };
      });

    const positioned = computeWidescreenLayout(mappedNodes, mappedEdges);
    return { layoutNodes: positioned, layoutEdges: mappedEdges };
  }, [allNodes, allEdges, filterMode, activeNode, unitProgressMap, isMobileViewport]);

  useEffect(() => {
    const inst = rfInstanceRef.current;
    if (!inst || !layoutNodes.length) return;
    const timer = setTimeout(() => {
      try {
        if (filterMode === "ALL" && activeNode) {
          const focusSubset = layoutNodes.filter((n) => !n.data?.isDimmed);
          inst.fitView({
            nodes: focusSubset.length >= 2 ? focusSubset : undefined,
            padding: 0.24,
            maxZoom: 0.95,
            duration: 240,
          });
        } else {
          inst.fitView({ padding: 0.16, maxZoom: 1.1, duration: 220 });
        }
      } catch {}
    }, 45);
    return () => clearTimeout(timer);
  }, [filterMode, activeNode?.id, layoutNodes.length, mobileMode]);

  const relatedBridges = useMemo(() => {
    if (!activeNode) return [];
    const nodeMap = new Map(allNodes.map((n) => [n.id, n]));
    return allEdges
      .filter((e) => e.source === activeNode.id || e.target === activeNode.id)
      .map((e) => {
        const otherId = e.source === activeNode.id ? e.target : e.source;
        return {
          ...e,
          otherNode: nodeMap.get(otherId),
        };
      });
  }, [allNodes, allEdges, activeNode]);

  if (!allNodes.length) {
    return (
      <div className="lx-card" data-testid="knowledge-graph-view">
        <h3 style={{ margin: "0 0 6px" }}>Wissensnetz für dieses Fach</h3>
        <p style={{ margin: 0, color: "var(--fg-secondary)", fontSize: 13.5 }}>
          Für dieses benutzerdefinierte Fach sind deine Lerneinheiten direkt unter „Skripte“ und „Karten“ verfügbar.
        </p>
      </div>
    );
  }

  const sameDomainBridges = relatedBridges.filter(
    (b) => b.otherNode && b.otherNode.domain === activeNode?.domain
  );
  const crossDomainBridges = relatedBridges.filter(
    (b) => !b.otherNode || b.otherNode.domain !== activeNode?.domain
  );

  const renderInspectorContent = (node) => {
    if (!node) return <div style={{ color: "var(--fg-muted)" }}>Knoten auswählen...</div>;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <span className={`lx-badge domain-badge-${node.domain}`}>
            Gebiet {node.domain} · {node.chapter_ref}
          </span>
          <span className="lx-badge">{node.page_label}</span>
        </div>

        <div>
          <h3 style={{ margin: 0, fontSize: 16.5, lineHeight: 1.3 }}>{node.label}</h3>
          {node.subtitle && (
            <div style={{ fontSize: 12.5, color: "var(--fg-muted)", marginTop: 3 }}>{node.subtitle}</div>
          )}
        </div>

        {node.key_authors && (
          <div className="lx-card lx-card-subtle" style={{ padding: "9px 12px", fontSize: 12.5 }}>
            <strong>Zentrale Autoren:</strong>{" "}
            {Array.isArray(node.key_authors) ? node.key_authors.join(", ") : node.key_authors}
          </div>
        )}

        <div style={{ fontSize: 13, color: "var(--fg-secondary)", lineHeight: 1.55 }}>{node.summary}</div>

        {node.kunst_sport_hook && (
          <div className="lx-praxis-card" style={{ padding: "11px 13px", fontSize: 12.5 }}>
            <strong style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--domain-b)" }}>
              <Sparkles size={13} />
              <span>Kunst &amp; Sport Transfer (Kl. 1–4)</span>
            </strong>
            <span style={{ color: "var(--fg-secondary)" }}>{node.kunst_sport_hook}</span>
          </div>
        )}

        <button
          type="button"
          className="lx-btn lx-btn-primary"
          onClick={() => onJumpToDomainHint(node.domain, `${node.chapter_ref} ${node.label}`)}
        >
          <span>Zum 1-Seiten-Ankerblatt öffnen</span>
          <ArrowRight size={14} />
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 2 }}>
          <strong style={{ fontSize: 12, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 6 }}>
            <Link2 size={13} />
            <span>Verbundene Theorie-Brücken ({relatedBridges.length})</span>
          </strong>
          {relatedBridges.map((br) => (
            <button
              key={br.id}
              type="button"
              className="lx-card lx-card-subtle"
              style={{
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
              }}
              onClick={() => br.otherNode && setSelectedNodeId(br.otherNode.id)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, width: "100%" }}>
                <strong style={{ fontSize: 12.5, color: "var(--fg)" }}>
                  {br.otherNode?.label || br.target}
                </strong>
                {br.otherNode && (
                  <span className={`lx-badge domain-badge-${br.otherNode.domain}`} style={{ minHeight: 20, padding: "1px 6px", fontSize: 10.5, flexShrink: 0 }}>
                    Gebiet {br.otherNode.domain}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-secondary)", lineHeight: 1.45 }}>
                <strong>{br.label}:</strong> {br.explanation}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const showMobilePathView = isMobileViewport && mobileMode === "PATH";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }} data-testid="knowledge-graph-view">
      {/* Kompakter Kopf */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Wissensnetz &amp; Theorie-Brücken (A ↔ B ↔ C)</h2>
          <p className="lx-hide-mobile" style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--fg-muted)" }}>
            Links Nachbarn im selben Skript · Mitte dein Fokus-Konzept · Rechts skriptübergreifende Theorie-Brücken.
          </p>
        </div>

        {/* Auf Mobile: Umschalter zwischen Daumen-lesbarem Vernetzungs-Pfad und interaktivem Graph */}
        {isMobileViewport ? (
          <div className="lx-segmented" style={{ width: "100%", gridTemplateColumns: "1fr 1fr" }}>
            <button
              type="button"
              className={`lx-seg-btn ${mobileMode === "PATH" ? "is-active" : ""}`}
              onClick={() => setMobileMode("PATH")}
              data-testid="mobile-graph-mode-path"
            >
              <GitBranch size={13} style={{ marginRight: 5, verticalAlign: "-2px" }} />
              <span>Vernetzungs-Pfad</span>
            </button>
            <button
              type="button"
              className={`lx-seg-btn ${mobileMode === "CANVAS" ? "is-active" : ""}`}
              onClick={() => setMobileMode("CANVAS")}
              data-testid="mobile-graph-mode-canvas"
            >
              <Network size={13} style={{ marginRight: 5, verticalAlign: "-2px" }} />
              <span>Interaktiver Graph</span>
            </button>
          </div>
        ) : (
          <div className="lx-pill-scroll" style={{ width: "auto" }}>
            {[
              { id: "FOCUS", label: "Stern-Fokus" },
              { id: "A", label: "Gebiet A" },
              { id: "B", label: "Gebiet B" },
              { id: "C", label: "Gebiet C" },
              { id: "ALL", label: `Gesamtnetz (${allNodes.length})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                className={`lx-pill-chip ${filterMode === f.id ? "is-active" : ""}`}
                onClick={() => setFilterMode(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Konzept-Wahl */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0, maxWidth: "100%" }}>
          <Select
            value={activeNode?.id || ""}
            onValueChange={(val) => setSelectedNodeId(val)}
            options={allNodes.map((n) => ({
              value: n.id,
              label: `[${n.domain}] ${n.label} (${(n.page_label || "").replace("Original-Skript ", "")})`,
            }))}
            ariaLabel="Zentrales Konzept im Wissensgraphen auswählen"
          />
        </div>
        {!showMobilePathView && (
          <button
            type="button"
            className="lx-btn"
            style={{ flexShrink: 0 }}
            onClick={() => rfInstanceRef.current?.fitView({ padding: 0.18, maxZoom: 1.05, duration: 220 })}
          >
            <Maximize2 size={14} />
            <span className="lx-hide-mobile">Zentrieren</span>
          </button>
        )}
      </div>

      {/* MOBILE MODUS 1: 100 % lesbarer vertikaler Vernetzungs-Pfad (Standard auf iPhone!) */}
      {showMobilePathView && activeNode ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }} data-testid="mobile-vernetzungs-pfad">
          {/* 1. Verknüpfte Nachbarn im selben Skript */}
          {sameDomainBridges.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-muted)", letterSpacing: "0.05em" }}>
                IM SELBEN SKRIPT VERKNÜPFT (GEBIET {activeNode.domain})
              </span>
              {sameDomainBridges.map((br) => (
                <button
                  key={br.id}
                  type="button"
                  className={`lx-card lx-card-subtle domain-border-${activeNode.domain}`}
                  style={{ padding: "10px 13px", textAlign: "left", cursor: "pointer", width: "100%" }}
                  onClick={() => br.otherNode && setSelectedNodeId(br.otherNode.id)}
                >
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{br.otherNode?.label}</div>
                  <div style={{ fontSize: 11.5, color: "var(--fg-secondary)", marginTop: 2 }}>
                    {br.label}: {br.explanation}
                  </div>
                </button>
              ))}
              <div style={{ display: "flex", justifyContent: "center", color: "var(--fg-muted)" }}>
                <ArrowDown size={16} />
              </div>
            </div>
          )}

          {/* 2. ZENTRALES FOKUS-KONZEPT */}
          <div
            className={`lx-card domain-border-${activeNode.domain}`}
            style={{
              padding: "15px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              boxShadow: "var(--shadow-sm)",
              borderColor: "var(--border-strong)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span className={`lx-badge domain-badge-${activeNode.domain}`} style={{ fontWeight: 700 }}>
                Fokus · Gebiet {activeNode.domain} ({activeNode.chapter_ref})
              </span>
              <span className="lx-badge" style={{ fontSize: 11 }}>
                {activeNode.page_label}
              </span>
            </div>

            <h3 style={{ margin: 0, fontSize: 17, lineHeight: 1.28 }}>{activeNode.label}</h3>
            <div style={{ fontSize: 13, color: "var(--fg-secondary)", lineHeight: 1.5 }}>{activeNode.summary}</div>

            {activeNode.kunst_sport_hook && (
              <div className="lx-praxis-card" style={{ padding: "10px 12px", fontSize: 12 }}>
                <strong style={{ color: "var(--domain-b)" }}>Kunst &amp; Sport:</strong>{" "}
                <span style={{ color: "var(--fg-secondary)" }}>{activeNode.kunst_sport_hook}</span>
              </div>
            )}

            <button
              type="button"
              className="lx-btn lx-btn-primary"
              style={{ width: "100%" }}
              onClick={() => onJumpToDomainHint(activeNode.domain, `${activeNode.chapter_ref} ${activeNode.label}`)}
            >
              <span>1-Seiten-Ankerblatt aufschlagen</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* 3. Skriptübergreifende Theorie-Brücken */}
          {crossDomainBridges.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <div style={{ display: "flex", justifyContent: "center", color: "var(--domain-b)" }}>
                <ArrowDown size={16} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--domain-b)", letterSpacing: "0.05em" }}>
                THEORIE-BRÜCKEN IN DIE ANDEREN SKRIPTE ({crossDomainBridges.length})
              </span>
              {crossDomainBridges.map((br) => (
                <button
                  key={br.id}
                  type="button"
                  className={`lx-card domain-border-${br.otherNode?.domain || "B"}`}
                  style={{
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    textAlign: "left",
                    cursor: "pointer",
                    width: "100%",
                  }}
                  onClick={() => br.otherNode && setSelectedNodeId(br.otherNode.id)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, width: "100%" }}>
                    <strong style={{ fontSize: 13.5 }}>{br.otherNode?.label || br.target}</strong>
                    {br.otherNode && (
                      <span className={`lx-badge domain-badge-${br.otherNode.domain}`} style={{ fontSize: 10.5, minHeight: 20 }}>
                        Gebiet {br.otherNode.domain}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--fg-secondary)", lineHeight: 1.45 }}>
                    <strong>{br.label}:</strong> {br.explanation}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* DESKTOP WIDESCREEN GRAPH + OPTIONALER MOBILE PORTRAIT GRAPH */
        <div className="lx-graph-layout">
          <div className="lx-graph-canvas">
            <ReactFlow
              nodes={layoutNodes}
              edges={layoutEdges}
              nodeTypes={nodeTypes}
              onInit={(inst) => {
                rfInstanceRef.current = inst;
                setTimeout(() => inst.fitView({ padding: 0.18, maxZoom: 1.05 }), 30);
              }}
              fitView
              fitViewOptions={{ padding: 0.18, maxZoom: 1.1 }}
              minZoom={0.2}
              maxZoom={1.6}
              onNodeClick={(_, node) => {
                setSelectedNodeId(node.id);
                if (window.innerWidth < 960) {
                  setMobileSheetOpen(true);
                }
              }}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={24} size={1} color="var(--border-strong)" />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>

          <aside className="lx-card lx-graph-desktop-inspector" style={{ overflowY: "auto", height: "100%" }}>
            {renderInspectorContent(activeNode)}
          </aside>
        </div>
      )}

      <Drawer.Root open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="lx-vaul-overlay" />
          <Drawer.Content className="lx-vaul-content" aria-describedby={undefined}>
            <div className="lx-vaul-handle" />
            <Drawer.Title style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Konzept-Details &amp; Theorie-Brücken
            </Drawer.Title>
            <div style={{ overflowY: "auto", maxHeight: "72dvh" }}>
              {renderInspectorContent(activeNode)}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
