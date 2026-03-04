import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { TodoWidget } from "./components/TodoWidget";
import "./styles.css";

const mode = new URLSearchParams(window.location.search).get("mode");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {mode === "widget" ? <TodoWidget /> : <App />}
  </React.StrictMode>
);
