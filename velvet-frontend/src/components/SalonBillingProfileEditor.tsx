import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  fetchBillingProfile,
  saveBillingProfile,
  type SalonBillingProfile,
  type SalonBillingProfilePayload,
} from "../api/billing";
import { salonBillingProfileFormKey } from "../lib/salonBillingProfileForm";
import { SalonBillingProfileForm } from "./SalonBillingProfileForm";

type SalonBillingProfileEditorProps = {
  accessToken: string | undefined;
  /** checkout = messaggi per attivazione Premium; profile = sezione profilo titolare */
  context?: "checkout" | "profile";
  onSaved?: (profile: SalonBillingProfile) => void;
};

export function SalonBillingProfileEditor({
  accessToken,
  context = "checkout",
  onSaved,
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
      setSaveNotice("Dati fatturazione salvati nel profilo del salone.");
      onSaved?.(saved);
    },
    onError: () => {
      setSaveNotice(null);
    },
  });

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

  return (
    <>
      {context === "checkout" && profile && !profile.persisted ? (
        <p className="luxury-text-muted" style={{ margin: "0 0 1rem", lineHeight: 1.55 }}>
          Abbiamo precompilato i campi con i dati del salone. Controlla e salva prima di procedere al pagamento.
        </p>
      ) : null}

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
        submitLabel={context === "profile" ? "Salva dati fatturazione" : "Salva dati fatturazione"}
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
