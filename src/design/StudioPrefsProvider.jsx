import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const THEME_KEY = "ews_studio_theme";

const StudioPrefsContext = createContext({
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

export function StudioPrefsProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const s = localStorage.getItem(THEME_KEY);
      if (s === "dark" || s === "light") return s;
    } catch {}
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }, [theme]);

  const setTheme = useCallback((next) => setThemeState(next === "dark" ? "dark" : "light"), []);
  const toggleTheme = useCallback(
    () => setThemeState((prev) => (prev === "dark" ? "light" : "dark")),
    []
  );

  return (
    <StudioPrefsContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </StudioPrefsContext.Provider>
  );
}

export function usePrefs() {
  return useContext(StudioPrefsContext);
}
