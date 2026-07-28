import { Navigate } from "react-router-dom";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";

/** `/account/home` — compatibilità link legacy: titolare → dashboard salone; altri → prenotazioni. */
export default function AccountHomePage() {
  const { isSalonTitolare, isSalonStaff, isLuxurySuperAdmin } = useLuxuryAuth();

  if (isLuxurySuperAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (isSalonStaff) {
    return <Navigate to="/account/staff" replace />;
  }
  if (isSalonTitolare) {
    return <Navigate to="/account/salone" replace />;
  }
  return <Navigate to="/account/prenotazioni" replace />;
}
