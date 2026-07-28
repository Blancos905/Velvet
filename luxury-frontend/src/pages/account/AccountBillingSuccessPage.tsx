import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import {
  LuxuryPremiumSubscriptionPendingBox,
  LuxuryPremiumSubscriptionSuccessBox,
} from "../../components/LuxuryPremiumSubscriptionSuccessBox";
import { confirmPremiumCheckoutSession } from "../../api/billing";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";
import { useBillingStatusQuery } from "../../hooks/useSalonFeaturePlanTier";
import { useMeSalonSummaryQuery } from "../../hooks/useMeSalonSummary";
import { clearPostLoginReturnPath } from "../../lib/postLoginReturnPath";
import { clearIntendedSalonPlan } from "../../lib/salonRegistrationPostLogin";
import { notifyNativeSalonSessionSync } from "../../lib/notifyNativeSalonSessionSync";
import { isLuxuryNativeAppShell } from "../../hooks/useLuxuryNativeAppShell";
import "../../styles/luxury-account-page-shell.css";

const POLL_MS = 2000;
const TIMEOUT_MS = 90_000;

/** Ringraziamento post Stripe Checkout — redirect da `checkoutSuccessPath` con `?session_id=…`. */
export default function AccountBillingSuccessPage() {
  const queryClient = useQueryClient();
  const { isSalonTitolare, accessToken } = useLuxuryAuth();
  const meSalon = useMeSalonSummaryQuery();
  const billingStatus = useBillingStatusQuery();
  const [searchParams] = useSearchParams();
  const [timedOut, setTimedOut] = useState(false);
  const confirmStartedRef = useRef(false);
  const premiumUnlockedNotifiedRef = useRef(false);

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
        void queryClient.invalidateQueries({ queryKey: ["me"] });
        void meSalon.refetch();
        void billingStatus.refetch();
      })
      .catch(() => {
        confirmStartedRef.current = false;
      });
  }, [accessToken, billingStatus, isSalonTitolare, meSalon, queryClient, sessionId]);

  useEffect(() => {
    if (!isSalonTitolare || showSuccess) {
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => {
      void billingStatus.refetch();
      void meSalon.refetch();
      if (Date.now() - started >= TIMEOUT_MS) {
        setTimedOut(true);
        window.clearInterval(timer);
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [billingStatus, isSalonTitolare, meSalon, showSuccess]);

  /** Premium attivo: sblocca hub React + rimuove nav Free nativa (Flutter sync). */
  useEffect(() => {
    if (!premiumActive || premiumUnlockedNotifiedRef.current) return;
    premiumUnlockedNotifiedRef.current = true;
    void queryClient.invalidateQueries({ queryKey: ["me"] });
    void meSalon.refetch();
    if (isLuxuryNativeAppShell()) {
      notifyNativeSalonSessionSync();
      window.setTimeout(() => notifyNativeSalonSessionSync(), 400);
      window.setTimeout(() => notifyNativeSalonSessionSync(), 1200);
    }
  }, [meSalon, premiumActive, queryClient]);

  if (!isSalonTitolare) {
    return <Navigate to="/account/salone" replace />;
  }

  const salonName = meSalon.data?.primaryLocationName ?? null;

  return (
    <div className="luxury-account-page-shell luxury-account-page-shell--narrow luxury-account-page-shell--billing-success">
      {!showSuccess ? (
        <LuxuryPremiumSubscriptionPendingBox />
      ) : (
        <LuxuryPremiumSubscriptionSuccessBox
          salonName={salonName}
          activationPending={!premiumActive && timedOut}
          onContinue={
            isLuxuryNativeAppShell()
              ? () => {
                  notifyNativeSalonSessionSync();
                  window.location.assign("/account/salone");
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
