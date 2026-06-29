import type { SalonBillingProfile } from "../api/billing";
import type { SalonBillingProfileFieldValues } from "../components/SalonBillingProfileFields";

export function emptySalonBillingFieldValues(): SalonBillingProfileFieldValues {
  return {
    legalName: "",
    billingEmail: "",
    vatNumber: "",
    fiscalCode: "",
    subjectType: "",
    addressLine1: "",
    postalCode: "",
    city: "",
    province: "",
    country: "IT",
    sdiCode: "",
    pecEmail: "",
  };
}

export function salonBillingProfileToFieldValues(
  profile: SalonBillingProfile | undefined,
): SalonBillingProfileFieldValues {
  if (!profile) return emptySalonBillingFieldValues();
  return {
    legalName: profile.legalName ?? "",
    billingEmail: profile.billingEmail ?? "",
    vatNumber: profile.vatNumber ?? "",
    fiscalCode: profile.fiscalCode ?? "",
    subjectType: profile.subjectType ?? "",
    addressLine1: profile.addressLine1 ?? "",
    postalCode: profile.postalCode ?? "",
    city: profile.city ?? "",
    province: profile.province ?? "",
    country: profile.country?.trim() || "IT",
    sdiCode: profile.sdiCode ?? "",
    pecEmail: profile.pecEmail ?? "",
  };
}

/** Chiave remount form: cambia solo quando il server aggiorna il profilo salvato. */
export function salonBillingProfileFormKey(profile: SalonBillingProfile | undefined): string {
  if (!profile) return "empty";
  return `${profile.persisted ? "saved" : "prefill"}:${profile.updatedAt ?? "0"}:${profile.complete ? "1" : "0"}`;
}
