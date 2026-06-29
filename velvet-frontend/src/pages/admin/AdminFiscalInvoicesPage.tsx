import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  downloadFiscalInvoiceXml,
  fetchFiscalInvoiceConfigStatus,
  fetchFiscalInvoices,
  fiscalInvoiceStatusLabel,
  formatFiscalInvoiceAmount,
  type VelvetFiscalInvoiceStatus,
} from "../../api/adminFiscalInvoices";
import { useAdminAuth } from "../../auth/AdminAuthProvider";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("it-IT");
  } catch {
    return "—";
  }
}

export default function AdminFiscalInvoicesPage() {
  const { accessToken, isAdminSession } = useAdminAuth();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<VelvetFiscalInvoiceStatus | "">("");
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const configQ = useQuery({
    queryKey: ["admin", "fiscal-invoices", "config", accessToken],
    enabled: Boolean(accessToken) && isAdminSession,
    queryFn: () => fetchFiscalInvoiceConfigStatus(accessToken),
  });

  const listQ = useQuery({
    queryKey: ["admin", "fiscal-invoices", page, statusFilter, accessToken],
    enabled: Boolean(accessToken) && isAdminSession,
    queryFn: () => fetchFiscalInvoices(accessToken, page, statusFilter || undefined),
  });

  const downloadM = useMutation({
    mutationFn: async (id: string) => {
      if (!accessToken) throw new Error("Sessione non disponibile.");
      await downloadFiscalInvoiceXml(accessToken, id);
    },
    onError: (err: unknown) => {
      setDownloadError(err instanceof Error ? err.message : "Download non riuscito.");
    },
    onSuccess: () => setDownloadError(null),
  });

  const rows = listQ.data?.content ?? [];
  const totalPages = listQ.data?.totalPages ?? 0;

  return (
    <div className="luxury-admin-page">
      <header className="luxury-admin-page__header">
        <div>
          <h1 className="luxury-admin-page__title">Fatture elettroniche</h1>
          <p className="luxury-text-muted">
            XML FatturaPA generati automaticamente ai pagamenti Stripe Premium. Carica gratuitamente ogni file sul{" "}
            <a
              href="https://ivaservizi.agenziaentrate.gov.it/portale/web/guest/home"
              target="_blank"
              rel="noopener noreferrer"
            >
              portale Fatture e Corrispettivi (AdE)
            </a>
            .
          </p>
        </div>
        <Link to="/admin/dashboard" className="luxury-plan-cta luxury-plan-cta--secondary">
          Torna alla panoramica
        </Link>
      </header>

      {configQ.data && !configQ.data.issuerConfigured ? (
        <div className="luxury-admin-alert luxury-admin-alert--warn" role="status">
          <strong>Emittente non configurato.</strong> Imposta le variabili{" "}
          <code>VELVET_BILLING_ISSUER_*</code> nel backend (P.IVA, indirizzo, regime fiscale). Vedi{" "}
          <code>velvet/spring-dev.local.env.example</code>.
        </div>
      ) : null}

      {downloadError ? (
        <div className="luxury-admin-alert luxury-admin-alert--warn" role="alert">
          {downloadError}
        </div>
      ) : null}

      <div className="luxury-admin-toolbar">
        <label className="luxury-form-label">
          <span>Stato</span>
          <select
            className="luxury-soft-field"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as VelvetFiscalInvoiceStatus | "");
              setPage(0);
            }}
          >
            <option value="">Tutti</option>
            <option value="READY">Pronte per AdE</option>
            <option value="SKIPPED_INCOMPLETE_PROFILE">Profilo salone incompleto</option>
            <option value="SKIPPED_ISSUER_NOT_CONFIGURED">Emittente non configurato</option>
            <option value="SKIPPED_ZERO_AMOUNT">Importo zero</option>
          </select>
        </label>
      </div>

      {listQ.isLoading ? <p className="luxury-text-muted">Caricamento fatture…</p> : null}
      {listQ.isError ? (
        <p className="luxury-text-muted" role="alert">
          Impossibile caricare l&apos;elenco fatture.
        </p>
      ) : null}

      {!listQ.isLoading && rows.length === 0 ? (
        <p className="luxury-text-muted">Nessuna fattura generata finora.</p>
      ) : null}

      {rows.length > 0 ? (
        <div className="luxury-admin-table-wrap">
          <table className="luxury-admin-table">
            <thead>
              <tr>
                <th>Numero</th>
                <th>Data</th>
                <th>Cliente</th>
                <th>Importo</th>
                <th>Stato</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.invoiceNumber}</td>
                  <td>{formatDate(row.invoiceDate)}</td>
                  <td>{row.recipientLegalName ?? "—"}</td>
                  <td>{formatFiscalInvoiceAmount(row.amountCents, row.currency)}</td>
                  <td>
                    <span title={row.skipReason ?? undefined}>{fiscalInvoiceStatusLabel(row.status)}</span>
                  </td>
                  <td>
                    {row.downloadable ? (
                      <button
                        type="button"
                        className="luxury-plan-cta luxury-plan-cta--secondary"
                        disabled={downloadM.isPending}
                        onClick={() => downloadM.mutate(row.id)}
                      >
                        Scarica XML
                      </button>
                    ) : (
                      <span className="luxury-text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {totalPages > 1 ? (
        <nav className="luxury-admin-pagination" aria-label="Paginazione fatture">
          <button
            type="button"
            className="luxury-plan-cta luxury-plan-cta--secondary"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Precedente
          </button>
          <span className="luxury-text-muted">
            Pagina {page + 1} di {totalPages}
          </span>
          <button
            type="button"
            className="luxury-plan-cta luxury-plan-cta--secondary"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Successiva
          </button>
        </nav>
      ) : null}
    </div>
  );
}
