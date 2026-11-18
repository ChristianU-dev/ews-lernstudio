import React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronDown, Info, X } from "lucide-react";

export function StatusDot({ tone = "neutral", pulse = false }) {
  return <span className={`lx-dot lx-dot-${tone}${pulse ? " lx-dot-pulse" : ""}`} aria-hidden="true" />;
}

export function StatusBadge({ label, tone = "neutral" }) {
  return (
    <span className="lx-badge" title={label}>
      <StatusDot tone={tone} pulse={tone === "active"} />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function Kbd({ children }) {
  return <kbd className="lx-kbd">{children}</kbd>;
}

export function Select({ value, onValueChange, options = [], placeholder = "—", ariaLabel, disabled, size = "md", className = "" }) {
  const safeVal = value === "" || value == null ? "__EMPTY__" : String(value);
  const mapped = options.map((opt) =>
    Array.isArray(opt)
      ? { value: opt[0] === "" ? "__EMPTY__" : String(opt[0]), rawValue: opt[0], label: opt[1], disabled: Boolean(opt[2]) }
      : {
          value: opt.value === "" ? "__EMPTY__" : String(opt.value),
          rawValue: opt.value,
          label: opt.label,
          disabled: Boolean(opt.disabled),
        }
  );

  return (
    <SelectPrimitive.Root
      value={safeVal}
      disabled={disabled}
      onValueChange={(v) => {
        const found = mapped.find((m) => m.value === v);
        onValueChange(found ? found.rawValue : v === "__EMPTY__" ? "" : v);
      }}
    >
      <SelectPrimitive.Trigger className={`lx-select-trigger lx-select-${size} ${className}`} aria-label={ariaLabel}>
        <span className="lx-select-value truncate">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon className="lx-select-icon">
          <ChevronDown size={14} strokeWidth={1.8} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className="lx-select-content" position="popper" sideOffset={5}>
          <SelectPrimitive.Viewport className="lx-select-viewport">
            {mapped.map((opt) => (
              <SelectPrimitive.Item key={opt.value} value={opt.value} disabled={opt.disabled} className="lx-select-item">
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="lx-select-check">
                  <Check size={13} strokeWidth={2.2} />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export function Modal({ open, onOpenChange, title, subtitle, children, width = 560 }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="lx-modal-overlay" />
        <DialogPrimitive.Content className="lx-modal-content" style={{ maxWidth: `${width}px` }}>
          <div className="lx-modal-header">
            <div className="min-w-0">
              <DialogPrimitive.Title className="lx-modal-title">{title}</DialogPrimitive.Title>
              {subtitle && <DialogPrimitive.Description className="lx-modal-subtitle">{subtitle}</DialogPrimitive.Description>}
            </div>
            <DialogPrimitive.Close asChild>
              <button type="button" className="lx-icon-btn" aria-label="Schließen">
                <X size={15} />
              </button>
            </DialogPrimitive.Close>
          </div>
          <div className="lx-modal-body">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Switch({ checked, onCheckedChange, id, disabled }) {
  return (
    <SwitchPrimitive.Root id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} className="lx-switch">
      <SwitchPrimitive.Thumb className="lx-switch-thumb" />
    </SwitchPrimitive.Root>
  );
}

export function Tip({ content, children }) {
  if (!content) return children;
  return (
    <TooltipPrimitive.Provider delayDuration={250}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content className="lx-tooltip" sideOffset={5}>
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export function InfoPopover({ title, children, align = "center", side = "top", label = "Info" }) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className="lx-info-trigger"
          aria-label={title || label}
          title={title || label}
          onClick={(e) => e.stopPropagation()}
        >
          <Info size={13} strokeWidth={2} />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content className="lx-popover-card" side={side} align={align} sideOffset={6} collisionPadding={12}>
          {title && <div className="lx-popover-title">{title}</div>}
          <div className="lx-popover-body">{children}</div>
          <PopoverPrimitive.Arrow className="lx-popover-arrow" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
