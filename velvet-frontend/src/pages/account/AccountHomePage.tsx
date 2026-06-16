import { Navigate } from "react-router-dom";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";
import { useEffectiveSalonPlanTier } from "../../hooks/useEffectiveSalonPlanTier";
import { isVelvetNativeAppShell } from "../../hooks/useVelvetNativeAppShell";
import { nativeSalonOwnerHubPath } from "../../lib/nativeAccountHubPaths";
import AccountConsumerHomePage from "./AccountConsumerHomePage";
import AccountOwnerHomePage from "./AccountOwnerHomePage";

/** `/account/home` — dashboard per ruolo (cliente, titolare; staff reindirizzato). */
export default function AccountHomePage() {
  const { isSalonTitolare, isSalonStaff, isVelvetSuperAdmin } = useVelvetAuth();
  const salonPlanTier = useEffectiveSalonPlanTier();

  if (isVelvetSuperAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (isSalonStaff) {
    return <Navigate to="/account/staff" replace />;
  }
  if (isSalonTitolare && isVelvetNativeAppShell() && salonPlanTier === "PREMIUM") {
    return <Navigate to={nativeSalonOwnerHubPath(salonPlanTier)} replace />;
  }
  if (isSalonTitolare && isVelvetNativeAppShell()) {
    return null;
  }
  if (isSalonTitolare) {
    return <AccountOwnerHomePage />;
  }
  return <AccountConsumerHomePage />;
}
