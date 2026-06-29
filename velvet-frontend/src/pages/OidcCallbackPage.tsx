import { Navigate } from "react-router-dom";

/** Route legacy post-OIDC: reindirizza alla home. */
export default function OidcCallbackPage() {
  return <Navigate to="/" replace />;
}
