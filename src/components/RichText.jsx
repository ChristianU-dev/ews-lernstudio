import React from "react";

/**
 * Rendert **fett** gedruckte Schlüsselbegriffe/Autoren und *kursive* Beispiele
 * sauber und sicher ohne dangerouslySetInnerHTML.
 */
export function RichText({ text, className = "" }) {
  if (!text) return null;
  const parts = String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <span className={className}>
      {parts.map((part, idx) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return (
            <strong key={idx} style={{ color: "var(--fg)", fontWeight: 700 }}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
          return <em key={idx}>{part.slice(1, -1)}</em>;
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </span>
  );
}
