import React, { useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Drawer } from "vaul";
import { ArrowRight, Link2, Sparkles } from "lucide-react";
import { computeWidescreenLayout } from "../design/widescreen_graph_layout";
import { StatusDot } from "../design/ui";

function EwsConceptCardNode({ data, selected }) {
  const dom = data.domain || "A";
  const borderCol =
    dom === "B" ? "var(--domain-b)" : dom === "C" ? "var(--domain-c)" : "var(--domain-a)";

  return (
    <div
      className="lx-rf-card"
      style={{
        borderLeft: `4px solid ${borderCol}`,
        borderColor: selected ? borderCol : "var(--border-strong)",
        boxShadow: selected ? "var(--shadow-lg)" : "var(--shadow-sm)",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0.4 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
        <span className={`lx-badge domain-badge-${dom}`} style={{ height: 20, fontSize: 10.5, padding: "0 6px" }}>
          Gebiet {dom} · {data.chapter_ref || ""}
        </span>
        <StatusDot tone={data.mastered ? "success" : "neutral"} />
      </div>
      <div style={{ fontWeight: 700, fontSize: 12.5, lineHeight: 1.25, color: "var(--fg)" }} className="truncate">
        {data.label}
      </div>
      <div style={{ fontSize: 11, color: "var(--fg-muted)" }} className="truncate">
        {data.page_label || data.subtitle || ""}
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0.4 }} />
    </div>
  );
}

const nodeTypes = { ewsCard: EwsConceptCardNode };

export function KnowledgeGraphView({
  graphData = { nodes: [], edges: [] },
  unitProgressMap = {},
  onJumpToDomainHint,
}) {
  const [filterMode, setFilterMode] = useState("ALL");
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const { layoutNodes, layoutEdges } = useMemo(() => {
    const rawNodes = graphData?.nodes || [];
    const rawEdges = graphData?.edges || [];

    const filteredEdges = rawEdges.filter((e) => {
      if (filterMode === "BRIDGES") return e.bridge_type === "cross_domain";
      return true;
    });

    const connectedSet = new Set();
    if (filterMode === "BRIDGES") {
      for (const e of filteredEdges) {
        connectedSet.add(e.source);
        connectedSet.add(e.target);
      }
    }

    const filteredNodes = rawNodes
      .filter((n) => {
        if (filterMode === "BRIDGES") return connectedSet.has(n.id);
        if (filterMode === "A" || filterMode === "B" || filterMode === "C") return n.domain === filterMode;
        return true;
      })
      .map((n) => {
        const isMastered = Object.entries(unitProgressMap).some(
          ([uid, p]) => uid.startsWith(`${n.domain}-`) && p?.status === "mastered"
        );
        return {
          id: n.id,
          type: "ewsCard",
          data: {
            ...n,
            mastered: isMastered,
          },
        };
      });

    const validIds = new Set(filteredNodes.map((n) => n.id));
    const safeEdges = filteredEdges
      .filter((e) => validIds.has(e.source) && validIds.has(e.target))
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: e.bridge_type === "cross_domain",
        style: {
          stroke: e.bridge_type === "cross_domain" ? "var(--primary-bg)" : "var(--fg-muted)",
          strokeWidth: e.bridge_type === "cross_domain" ? 2.2 : 1.4,
        },
        labelStyle: { fontSize: 10.5, fill: "var(--fg-secondary)", fontWeight: 600 },
        data: e,
      }));

    const positioned = computeWidescreenLayout(filteredNodes, safeEdges);
    return { layoutNodes: positioned, layoutEdges: safeEdges };
  }, [graphData, filterMode, unitProgressMap]);

  const activeNode = useMemo(() => {
    const all = graphData?.nodes || [];
    return all.find((n) => n.id === selectedNodeId) || all[0] || null;
  }, [graphData, selectedNodeId]);

  const relatedBridges = useMemo(() => {
    if (!activeNode) return [];
    const nodeMap = new Map((graphData?.nodes || []).map((n) => [n.id, n]));
    return (graphData?.edges || [])
      .filter((e) => e.source === activeNode.id || e.target === activeNode.id)
      .map((e) => {
        const otherId = e.source === activeNode.id ? e.target : e.source;
        return {
          ...e,
          otherNode: nodeMap.get(otherId),
        };
      });
  }, [graphData, activeNode]);

  const renderInspectorContent = (node) => {
    if (!node) return <div style={{ color: "var(--fg-muted)" }}>Knoten auswählen...</div>;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span className={`lx-badge domain-badge-${node.domain}`}>
            Gebiet {node.domain} · {node.chapter_ref}
          </span>
          <span className="lx-badge">{node.page_label}</span>
        </div>

        <div>
          <h3 style={{ margin: 0, fontSize: 16 }}>{node.label}</h3>
          {node.subtitle && (
            <div style={{ fontSize: 12.5, color: "var(--fg-muted)", marginTop: 2 }}>{node.subtitle}</div>
          )}
        </div>

        {node.key_authors && (
          <div className="lx-card lx-card-subtle" style={{ padding: "8px 11px", fontSize: 12.5 }}>
            <strong>Zentrale Autoren:</strong>{" "}
            {Array.isArray(node.key_authors) ? node.key_authors.join(", ") : node.key_authors}
          </div>
        )}

        <div style={{ fontSize: 13, color: "var(--fg-secondary)" }}>{node.summary}</div>

        {node.kunst_sport_hook && (
          <div
            style={{
              padding: "9px 12px",
              borderRadius: 9,
              background: "var(--callout-success-bg)",
              border: "1px solid var(--callout-success-border)",
              fontSize: 12.5,
            }}
          >
            <strong style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <Sparkles size={13} />
              <span>Kunst &amp; Sport Transfer (Kl. 1–4):</span>
            </strong>
            <span>{node.kunst_sport_hook}</span>
          </div>
        )}

        <button
          type="button"
          className="lx-btn lx-btn-primary"
          onClick={() => onJumpToDomainHint(node.domain, `${node.chapter_ref} ${node.label}`)}
        >
          <span>Passendes 1-Seiten-Ankerblatt öffnen</span>
          <ArrowRight size={14} />
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 4 }}>
          <strong style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <Link2 size={14} />
            <span>Verbundene Theorie-Brücken ({relatedBridges.length})</span>
          </strong>
          {relatedBridges.map((br) => (
            <div
              key={br.id}
              className="lx-card lx-card-subtle"
              style={{ padding: "9px 11px", display: "flex", flexDirection: "column", gap: 4, cursor: "pointer" }}
              onClick={() => br.otherNode && setSelectedNodeId(br.otherNode.id)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                <strong style={{ fontSize: 12.5 }}>{br.otherNode?.label || br.target}</strong>
                {br.otherNode && (
                  <span className={`lx-badge domain-badge-${br.otherNode.domain}`} style={{ height: 20, fontSize: 10.5 }}>
                    {br.otherNode.domain}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-secondary)" }}>
                <strong>{br.label}:</strong> {br.explanation}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} data-testid="knowledge-graph-view">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Interaktiver Karten-Wissensgraph (A ↔ B ↔ C)</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--fg-muted)" }}>
            Erkenne auf einen Blick, wie Gedächtnis, Motivation, Entwicklung und Diagnostik im Staatsexamen zusammenhängen.
          </p>
        </div>

        <div className="lx-segmented">
          {[
            { id: "ALL", label: "Gesamtnetz" },
            { id: "BRIDGES", label: "Nur Theorie-Brücken (A↔B↔C)" },
            { id: "A", label: "Gebiet A" },
            { id: "B", label: "Gebiet B" },
            { id: "C", label: "Gebiet C" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              className={`lx-seg-btn ${filterMode === f.id ? "is-active" : ""}`}
              onClick={() => setFilterMode(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="lx-graph-layout">
        <div className="lx-graph-canvas">
          <ReactFlow
            nodes={layoutNodes}
            edges={layoutEdges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.16 }}
            minZoom={0.25}
            maxZoom={1.6}
            onNodeClick={(_, node) => {
              setSelectedNodeId(node.id);
              if (window.innerWidth < 960) {
                setMobileSheetOpen(true);
              }
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        {/* PC Widescreen Seiten-Inspektor */}
        <aside className="lx-card lx-graph-desktop-inspector" style={{ overflowY: "auto", height: "100%" }}>
          {renderInspectorContent(activeNode)}
        </aside>
      </div>

      {/* Kompakter Mobile-Hinweis + Vaul Bottom-Sheet auf dem iPhone */}
      {activeNode && (
        <div
          className="lx-card"
          style={{
            display: window.innerWidth < 960 ? "flex" : "none",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div className="min-w-0">
            <div style={{ fontWeight: 700, fontSize: 13 }} className="truncate">
              Ausgewählt: {activeNode.label}
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-muted)" }} className="truncate">
              Tippe auf „Details“, um Brücken &amp; Kunst/Sport-Beispiele zu öffnen.
            </div>
          </div>
          <button type="button" className="lx-btn lx-btn-primary" onClick={() => setMobileSheetOpen(true)}>
            Details
          </button>
        </div>
      )}

      <Drawer.Root open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="lx-vaul-overlay" />
          <Drawer.Content className="lx-vaul-content" aria-describedby={undefined}>
            <div className="lx-vaul-handle" />
            <Drawer.Title style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
              Knoten-Inspektor &amp; Theorie-Brücken
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
