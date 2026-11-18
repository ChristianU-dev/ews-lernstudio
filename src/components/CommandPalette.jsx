import React, { useEffect } from "react";
import { Command } from "cmdk";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { BookOpen, Brain, Compass, Scale, Search } from "lucide-react";

export function CommandPalette({ open, onOpenChange, searchItems = [], onSelectItem, onNavigate }) {
  useEffect(() => {
    const down = (e) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="lx-modal-overlay" />
        <DialogPrimitive.Content
          className="lx-modal-content lx-cmdk-dialog"
          style={{ maxWidth: 620, padding: 0, overflow: "hidden" }}
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
            Schnellsuche über alle 3 Skripte, Autoren, Seitenzahlen und Operatoren
          </DialogPrimitive.Title>
          <Command label="Schnellsuche">
            <div style={{ display: "flex", alignItems: "center", paddingLeft: 14, borderBottom: "1px solid var(--border)" }}>
              <Search size={16} style={{ color: "var(--fg-muted)", flexShrink: 0 }} />
              <Command.Input
                placeholder="Suche Autor, Begriff, Studie, Seitenzahl (z. B. PISA 2025, Baddeley, S. 72, Skizzieren)..."
                style={{ borderBottom: "none" }}
              />
            </div>
            <Command.List className="lx-cmdk-list">
              <Command.Empty style={{ padding: "18px 14px", color: "var(--fg-muted)", textAlign: "center" }}>
                Kein Treffer gefunden. Probiere z. B. „Piaget“, „Bezugsnorm“ oder „S. 60“.
              </Command.Empty>

              <Command.Group heading="Ansichten" style={{ fontSize: 11, color: "var(--fg-muted)", padding: "4px 6px" }}>
                {[
                  { id: "today", label: "Heute & Sofa-Start (Tagesplan)", icon: Compass },
                  { id: "scripts", label: "Visuelle 1-Seiten-Ankerblätter (Skripte A, B, C)", icon: BookOpen },
                  { id: "graph", label: "Interaktiver Karten-Wissensgraph (Theorie-Brücken)", icon: Brain },
                  { id: "exam", label: "Staatsexamens-Simulator (Testformat & Essay)", icon: Scale },
                ].map((nav) => {
                  const Icon = nav.icon;
                  return (
                    <Command.Item
                      key={nav.id}
                      value={`Navigation ${nav.label}`}
                      className="lx-cmdk-item"
                      onSelect={() => {
                        onNavigate(nav.id);
                        onOpenChange(false);
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Icon size={15} />
                        <span>{nav.label}</span>
                      </span>
                      <span className="lx-kbd">Öffnen</span>
                    </Command.Item>
                  );
                })}
              </Command.Group>

              <Command.Group heading="Kapitel, Studien, Operatoren & Verwechslungen" style={{ fontSize: 11, color: "var(--fg-muted)", padding: "6px 6px 2px" }}>
                {searchItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.title} ${item.subtitle} ${item.keywords}`}
                    className="lx-cmdk-item"
                    onSelect={() => {
                      onSelectItem(item);
                      onOpenChange(false);
                    }}
                  >
                    <div className="min-w-0" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontWeight: 600 }} className="truncate">
                        {item.title}
                      </span>
                      <span style={{ fontSize: 11.5, color: "var(--fg-muted)" }} className="truncate">
                        {item.subtitle}
                      </span>
                    </div>
                    {item.domain && (
                      <span className={`lx-badge domain-badge-${item.domain}`} style={{ flexShrink: 0 }}>
                        {item.domain}
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
