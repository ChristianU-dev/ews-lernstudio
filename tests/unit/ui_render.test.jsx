import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StudioPrefsProvider, usePrefs } from "../../src/design/StudioPrefsProvider";
import { VisualDiagramSvg } from "../../src/components/VisualDiagramSvg";
import { RichText } from "../../src/components/RichText";

function ThemeProbe() {
  const { theme, toggleTheme } = usePrefs();
  return (
    <button type="button" onClick={toggleTheme}>
      Mode:{theme}
    </button>
  );
}

describe("UX-mAInd UI Components (Light/Dark Provider, HiDPI SVG Diagram & RichText)", () => {
  it("toggles Light and Dark theme and updates document.documentElement.dataset.theme", () => {
    localStorage.setItem("ews_studio_theme", "light");
    render(
      <StudioPrefsProvider>
        <ThemeProbe />
      </StudioPrefsProvider>
    );
    const btn = screen.getByRole("button");
    expect(btn.textContent).toBe("Mode:light");
    expect(document.documentElement.dataset.theme).toBe("light");

    fireEvent.click(btn);
    expect(btn.textContent).toBe("Mode:dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("renders crisp vector SVG diagrams and typographic emphasis markers", () => {
    render(
      <div>
        <RichText text="**Pawlow (1905)** untersuchte *Signallernen*." />
        <VisualDiagramSvg
          domain="A"
          visual={{
            type: "process_flow",
            title: "Klassisches Konditionieren",
            steps_or_rows: [
              { label: "Akquisition", detail: "NS + UCS -> UCR" },
              { label: "Testphase", detail: "CS -> CR" },
            ],
          }}
        />
      </div>
    );
    expect(screen.getByText("Pawlow (1905)").tagName).toBe("STRONG");
    expect(screen.getByText("Signallernen").tagName).toBe("EM");
    expect(screen.getByTestId("visual-diagram-svg")).toBeTruthy();
  });
});
