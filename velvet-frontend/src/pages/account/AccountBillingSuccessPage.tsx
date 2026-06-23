import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import {
  VelvetPremiumSubscriptionPendingBox,
  VelvetPremiumSubscriptionSuccessBox,
} from "../../components/VelvetPremiumSubscriptionSuccessBox";
import { confirmPremiumCheckoutSession } from "../../api/billing";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";
import { useBillingStatusQuery } from "../../hooks/useSalonFeaturePlanTier";
import { useMeSalonSummaryQuery } from "../../hooks/useMeSalonSummary";
import { clearPostLoginReturnPath } from "../../lib/postLoginReturnPath";
import { clearIntendedSalonPlan } from "../../lib/salonRegistrationPostLogin";
import "../../styles/velvet-account-page-shell.css";

const POLL_MS = 2000;
const TIMEOUT_MS = 90_000;

/** Ringraziamento post Stripe Checkout — redirect da `checkoutSuccessPath` con `?session_id=…`. */
export default function AccountBillingSuccessPage() {
  const queryClient = useQueryClient();
  const { isSalonTitolare, accessToken } = useVelvetAuth();
  const meSalon = useMeSalonSummaryQuery();
  const billingStatus = useBillingStatusQuery();
  const [searchParams] = useSearchParams();
  const [timedOut, setTimedOut] = useState(false);
  const confirmStartedRef = useRef(false);

  const sessionId = searchParams.get("session_id")?.trim() ?? "";
  const premiumActive = billingStatus.data?.premiumAccess === true;
  const showSuccess = premiumActive || timedOut;

  useEffect(() => {
    clearPostLoginReturnPath();
    clearIntendedSalonPlan();
  }, []);

  useEffect(() => {
    if (!isSalonTitolare || !accessToken || !sessionId || confirmStartedRef.current) {
      return;
    }
    confirmStartedRef.current = true;
    void confirmPremiumCheckoutSession(accessToken, sessionId)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ["me", "billing"] });
        void queryClient.invalidateQueries({ queryKey: ["me", "profile"] });
        void meSalon.refetch();
      })
      .catch(() => {
        confirmStartedRef.current = false;
      });
  }, [accessToken, isSalonTitolare, meSalon, queryClient, sessionId]);

  useEffect(() => {
    if (!isSalonTitolare || showSuccess) {
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => {
      void billingStatus.refetch();
      if (Date.now() - started >= TIMEOUT_MS) {
        setTimedOut(true);
        window.clearInterval(timer);
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [billingStatus, isSalonTitolare, showSuccess]);

  if (!isSalonTitolare) {
    return <Navigate to="/account/salone" replace />;
  }

  const salonName = meSalon.data?.primaryLocationName ?? null;

  return (
    <div className="velvet-account-page-shell velvet-account-page-shell--narrow velvet-account-page-shell--billing-success">
      {!showSuccess ? (
        <VelvetPremiumSubscriptionPendingBox />
      ) : (
        <VelvetPremiumSubscriptionSuccessBox salonName={salonName} activationPending={!premiumActive && timedOut} />
      )}
    </div>
  );
}
