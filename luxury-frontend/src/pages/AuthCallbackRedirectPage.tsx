import { Navigate } from "react-router-dom";

/** Route legacy `/auth/callback`: reindirizza alla home (auth Luxury via JWT, non IdP esterno). */
export default function AuthCallbackRedirectPage() {
  return <Navigate to="/" replace />;
}
