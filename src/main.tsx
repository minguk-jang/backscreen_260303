import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { TodoWidget } from "./components/TodoWidget";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/forms.css";
import "./styles/panels.css";
import "./styles/preview.css";
import "./styles/widget.css";
import "./styles/responsive.css";

const mode = new URLSearchParams(window.location.search).get("mode");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {mode === "widget" ? <TodoWidget /> : <App />}
  </React.StrictMode>
);
