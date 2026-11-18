import React from "react";
import ReactDOM from "react-dom/client";
import { StudioPrefsProvider } from "./design/StudioPrefsProvider";
import App from "./App";
import "./styles/studio_complete_theme.css";
import "./styles/lernstudio_extensions.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <StudioPrefsProvider>
      <App />
    </StudioPrefsProvider>
  </React.StrictMode>
);
