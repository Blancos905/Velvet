import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  fetchBillingProfile,
  saveBillingProfile,
  type SalonBillingProfile,
  type SalonBillingProfilePayload,
} from "../api/billing";
import { salonBillingProfileFormKey } from "../lib/salonBillingProfileForm";
import { SalonBillingProfileForm } from "./SalonBillingProfileForm";

export const BILLING_CHECKOUT_FORM_ID = "luxury-billing-checkout-form";

type SalonBillingProfileEditorProps = {
  accessToken: string | undefined;
  /** checkout = messaggi per attivazione Premium; profile = sezione profilo titolare */
  context?: "checkout" | "profile";
  onSaved?: (profile: SalonBillingProfile) => void;
  onPendingChange?: (pending: boolean) => void;
};

export function SalonBillingProfileEditor({
  accessToken,
  context = "checkout",
  onSaved,
  onPendingChange,
}: SalonBillingProfileEditorProps) {
  const queryClient = useQueryClient();
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const billingProfile = useQuery({
    queryKey: ["me", "billing", "profile", accessToken],
    queryFn: () => fetchBillingProfile(accessToken),
    enabled: Boolean(accessToken),
  });

  const saveProfileM = useMutation({
    mutationFn: (payload: SalonBillingProfilePayload) => saveBillingProfile(accessToken, payload),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["me", "billing"] });
      if (context !== "checkout") {
        setSaveNotice("Dati fatturazione salvati nel profilo del salone.");
      }
      onSaved?.(saved);
    },
    onError: () => {
      setSaveNotice(null);
    },
  });

  useEffect(() => {
    onPendingChange?.(saveProfileM.isPending);
  }, [onPendingChange, saveProfileM.isPending]);

  if (billingProfile.isPending) {
    return <p className="luxury-text-muted" aria-live="polite">Caricamento dati fatturazione…</p>;
  }

  if (billingProfile.isError) {
    return (
      <p className="luxury-alert luxury-alert--error" role="alert">
        {billingProfile.error instanceof Error
          ? billingProfile.error.message
          : "Impossibile caricare i dati di fatturazione."}
      </p>
    );
  }

  const profile = billingProfile.data;
  const formKey = salonBillingProfileFormKey(profile);
  const checkout = context === "checkout";

  return (
    <>
      {context === "checkout" && profile?.persisted && profile.complete && !saveProfileM.isPending && !saveNotice ? (
        <p className="luxury-alert luxury-alert--success" role="status" style={{ marginBottom: "1rem" }}>
          Dati fatturazione già salvati nel profilo. Puoi modificarli qui sotto se serve.
        </p>
      ) : null}

      {saveNotice ? (
        <p className="luxury-alert luxury-alert--success" role="status" style={{ marginBottom: "1rem" }}>
          {saveNotice}
        </p>
      ) : null}

      {saveProfileM.isError ? (
        <p className="luxury-alert luxury-alert--error" role="alert" style={{ marginBottom: "1rem" }}>
          {saveProfileM.error.message}
        </p>
      ) : null}

      <SalonBillingProfileForm
        key={formKey}
        initial={profile}
        submitting={saveProfileM.isPending}
        formId={checkout ? BILLING_CHECKOUT_FORM_ID : undefined}
        hideSubmit={checkout}
        submitLabel="Salva dati fatturazione"
        onSubmit={async (payload) => {
          setSaveNotice(null);
          await saveProfileM.mutateAsync(payload);
        }}
      />
    </>
  );
}

export function useSalonBillingProfileComplete(accessToken: string | undefined): {
  isLoading: boolean;
  isComplete: boolean;
} {
  const q = useQuery({
    queryKey: ["me", "billing", "profile", accessToken],
    queryFn: () => fetchBillingProfile(accessToken),
    enabled: Boolean(accessToken),
  });
  return {
    isLoading: q.isPending,
    isComplete: q.data?.complete === true,
  };
}
