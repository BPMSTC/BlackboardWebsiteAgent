import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import { logError, logInfo } from "./utils/devLogger";

logInfo("app.bootstrap.started");

window.addEventListener("error", (event) => {
  logError("app.window_error", {
    message: event.message,
    filename: event.filename,
    line: event.lineno,
    column: event.colno,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  logError("app.unhandled_rejection", {
    reason: String(event.reason),
  });
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

logInfo("app.bootstrap.completed");
