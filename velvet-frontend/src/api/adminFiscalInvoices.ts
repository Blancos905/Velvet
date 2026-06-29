import { apiFetch, apiJson } from "./client";

export type VelvetFiscalInvoiceStatus =
  | "READY"
  | "SKIPPED_INCOMPLETE_PROFILE"
  | "SKIPPED_ISSUER_NOT_CONFIGURED"
  | "SKIPPED_ZERO_AMOUNT"
  | "SKIPPED_DISABLED";

export type VelvetFiscalInvoiceListItem = {
  id: string;
  stripeInvoiceId: string;
  studioGroupId: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  amountCents: number;
  currency: string;
  recipientLegalName: string | null;
  status: VelvetFiscalInvoiceStatus;
  skipReason: string | null;
  xmlFilename: string | null;
  downloadable: boolean;
  stripePaidAt: string | null;
  adminNotifiedAt: string | null;
  createdAt: string;
};

export type FiscalInvoiceConfigStatus = {
  fatturapaEnabled: boolean;
  issuerConfigured: boolean;
  issuerLegalName: string;
  issuerVatDigits: string | null;
};

export type FiscalInvoicePage = {
  content: VelvetFiscalInvoiceListItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export async function fetchFiscalInvoiceConfigStatus(
  accessToken: string | null | undefined,
): Promise<FiscalInvoiceConfigStatus> {
  return apiJson<FiscalInvoiceConfigStatus>("/api/v1/admin/fiscal-invoices/config-status", { accessToken });
}

export async function fetchFiscalInvoices(
  accessToken: string | null | undefined,
  page = 0,
  status?: VelvetFiscalInvoiceStatus,
): Promise<FiscalInvoicePage> {
  const params = new URLSearchParams({ page: String(page), size: "20", sort: "createdAt,desc" });
  if (status) params.set("status", status);
  return apiJson<FiscalInvoicePage>(`/api/v1/admin/fiscal-invoices?${params.toString()}`, { accessToken });
}

export function fiscalInvoiceXmlDownloadUrl(id: string): string {
  return `/api/v1/admin/fiscal-invoices/${encodeURIComponent(id)}/xml`;
}

export function formatFiscalInvoiceAmount(cents: number, currency: string): string {
  const value = (cents / 100).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${value} ${currency.toUpperCase()}`;
}

export async function downloadFiscalInvoiceXml(accessToken: string, id: string): Promise<void> {
  const response = await apiFetch(fiscalInvoiceXmlDownloadUrl(id), { accessToken });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Download XML non riuscito.");
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(disposition);
  const filename = match?.[1] ?? `fattura-${id}.xml`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function fiscalInvoiceStatusLabel(status: VelvetFiscalInvoiceStatus): string {
  switch (status) {
    case "READY":
      return "Pronta per AdE";
    case "SKIPPED_INCOMPLETE_PROFILE":
      return "Profilo salone incompleto";
    case "SKIPPED_ISSUER_NOT_CONFIGURED":
      return "Emittente non configurato";
    case "SKIPPED_ZERO_AMOUNT":
      return "Importo zero";
    case "SKIPPED_DISABLED":
      return "Disabilitata";
    default:
      return status;
  }
}
