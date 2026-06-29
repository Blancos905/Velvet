export type AdminSalonSubscriptionBillingFilter = "PAYING" | "TRIAL" | "CANCELLED";

export function subscriptionBillingFilterLabel(filter: AdminSalonSubscriptionBillingFilter): string {
  switch (filter) {
    case "PAYING":
      return "Abbonati paganti";
    case "TRIAL":
      return "In prova";
    case "CANCELLED":
      return "Disdetta";
  }
}

export function subscriptionBillingCategoryLabel(category: string | null | undefined): string {
  switch (category) {
    case "PAYING":
      return "Pagante";
    case "TRIAL":
      return "In prova";
    case "CANCELLED":
      return "Disdetta";
    default:
      return "—";
  }
}

export function subscriptionStatusLabel(
  status: string | null | undefined,
  cancelAtPeriodEnd?: boolean | null,
): string {
  if (cancelAtPeriodEnd) {
    return "Disdetta a fine periodo";
  }
  switch (status?.toLowerCase()) {
    case "active":
      return "Attivo";
    case "trialing":
      return "Prova gratuita";
    case "past_due":
      return "Pagamento in sospeso";
    case "canceled":
      return "Terminato";
    case "unpaid":
      return "Non pagato";
    case "incomplete_expired":
      return "Checkout scaduto";
    default:
      return status?.trim() ? status : "—";
  }
}

export function formatSubscriptionPeriodEnd(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}
