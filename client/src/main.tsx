import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AuthWrapper from "./AuthWrapper";
import "./index.css";

console.log("🚀 main.tsx executing");
console.log("🚀 Current URL:", window.location.href);
console.log("🚀 Current pathname:", window.location.pathname);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthWrapper />
  </StrictMode>
);

console.log("🚀 React app mounted");