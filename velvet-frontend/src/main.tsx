import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AppProviders } from "./providers/AppProviders";
import "./index.css";
import "./styles/salon-premium-tw-utilities.css";
import "./styles/velvet-surfaces.css";
import "./styles/velvet-plans.css";
import "./styles/velvet-auth-login.css";
import "./styles/velvet-admin.css";
import "./styles/velvet-star-rating.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>
);
