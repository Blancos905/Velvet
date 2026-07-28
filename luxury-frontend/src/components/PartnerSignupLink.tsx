import { Link } from "react-router-dom";
import { partnerSignupUrl } from "../config/env";
import { isLuxuryNativeAppShell } from "../hooks/useLuxuryNativeAppShell";

type Props = React.PropsWithChildren<{
  className?: string;
}>;

/**
 * «Diventa partner»: se `VITE_PARTNER_SIGNUP_URL` è un path (`/partner`), navigazione SPA;
 * se è un URL assoluto (https://…), apre in nuova scheda.
 */
export function PartnerSignupLink({ className, children }: Props) {
  const url = isLuxuryNativeAppShell() ? "/piani" : partnerSignupUrl.trim();
  if (url.startsWith("/")) {
    return (
      <Link to={url} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={url} className={className} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
