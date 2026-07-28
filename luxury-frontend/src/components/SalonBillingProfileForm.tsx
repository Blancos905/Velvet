import { useState } from "react";
import type { SalonBillingProfile } from "../api/billing";
import { salonBillingProfileToFieldValues } from "../lib/salonBillingProfileForm";
import { toBillingProfilePayload, validateSalonBillingProfileForm } from "../lib/salonBillingProfileValidation";
import {
  SalonBillingProfileFields,
  type SalonBillingProfileFieldValues,
} from "./SalonBillingProfileFields";

type SalonBillingProfileFormProps = {
  initial: SalonBillingProfile | undefined;
  submitting: boolean;
  submitLabel?: string;
  onSubmit: (payload: ReturnType<typeof toBillingProfilePayload>) => Promise<void>;
};

export function SalonBillingProfileForm({
  initial,
  submitting,
  submitLabel = "Salva dati fatturazione",
  onSubmit,
}: SalonBillingProfileFormProps) {
  const [values, setValues] = useState<SalonBillingProfileFieldValues>(() =>
    salonBillingProfileToFieldValues(initial),
  );
  const [errorHint, setErrorHint] = useState<string | null>(null);

  const onChange = <K extends keyof SalonBillingProfileFieldValues>(key: K, value: SalonBillingProfileFieldValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateSalonBillingProfileForm(values);
    if (err) {
      setErrorHint(err);
      return;
    }
    setErrorHint(null);
    void onSubmit(toBillingProfilePayload(values));
  };

  return (
    <form className="luxury-profile-form luxury-profile-form--account" noValidate onSubmit={handleSubmit}>
      {errorHint ? (
        <p className="luxury-alert luxury-alert--error" role="alert">
          {errorHint}
        </p>
      ) : null}
      <SalonBillingProfileFields values={values} onChange={onChange} disabled={submitting} variant="account" />
      <button type="submit" className="luxury-btn luxury-btn--primary luxury-profile-form__submit" disabled={submitting}>
        {submitting ? "Salvataggio…" : submitLabel}
      </button>
    </form>
  );
}
