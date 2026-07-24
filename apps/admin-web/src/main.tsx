import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { registerFleetServiceWorker } from "./pwa";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

void registerFleetServiceWorker();
