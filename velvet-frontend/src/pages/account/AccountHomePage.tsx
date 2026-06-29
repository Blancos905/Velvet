import { Navigate } from "react-router-dom";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";

/** `/account/home` — compatibilità link legacy: titolare → dashboard salone; altri → prenotazioni. */
export default function AccountHomePage() {
  const { isSalonTitolare, isSalonStaff, isVelvetSuperAdmin } = useVelvetAuth();

  if (isVelvetSuperAdmin) {
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
