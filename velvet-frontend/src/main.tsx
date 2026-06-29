import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AppProviders } from "./providers/AppProviders";
import { installSubscriptionGuardsWindow } from "./lib/subscription-guards";
import "./index.css";
import "./styles/salon-premium-tw-utilities.css";
import "./styles/luxury-surfaces.css";
import "./styles/luxury-plans.css";
import "./styles/luxury-auth-login.css";
import "./styles/luxury-admin.css";
import "./styles/luxury-star-rating.css";

installSubscriptionGuardsWindow();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>
);
