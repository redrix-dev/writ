import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./styles.css";

// No StrictMode: the demo drives real interval timers through a simulated
// server, and double-invoked mounts would spin up duplicate rooms.
createRoot(document.getElementById("root")!).render(<App />);
