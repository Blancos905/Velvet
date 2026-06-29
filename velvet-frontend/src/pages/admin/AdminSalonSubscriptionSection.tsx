import { useQuery } from "@tanstack/react-query";
import { Fragment, useEffect, useState } from "react";
import { apiJson } from "../../api/client";
import type { SuperAdminCountsDto, SuperAdminRecentSalonRowDto } from "../../api/types";
import { formatSalonCityForDisplay } from "../../lib/formatSalonCityForDisplay";
import {
  formatSubscriptionPeriodEnd,
  subscriptionBillingFilterLabel,
  subscriptionStatusLabel,
  type AdminSalonSubscriptionBillingFilter,
} from "./adminSalonSubscriptionLabels";

const PAGE_SIZE = 10;

type PageResponse<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
};

const FILTERS: AdminSalonSubscriptionBillingFilter[] = ["PAYING", "TRIAL", "CANCELLED"];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("it-IT");
  } catch {
    return "—";
  }
}

function countForFilter(counts: SuperAdminCountsDto | null, filter: AdminSalonSubscriptionBillingFilter): number {
  if (!counts) return 0;
  switch (filter) {
    case "PAYING":
      return counts.studioGroupsSubscribedPaying ?? 0;
    case "TRIAL":
      return counts.studioGroupsSubscribedTrial ?? 0;
    case "CANCELLED":
      return counts.studioGroupsSubscribedCancelled ?? 0;
  }
}

export type AdminSalonSubscriptionSectionProps = {
  accessToken: string;
  counts: SuperAdminCountsDto | null;
  idPrefix: string;
  headingId: string;
  onEditSalon: (row: SuperAdminRecentSalonRowDto) => void;
};

export function AdminSalonSubscriptionSection({
  accessToken,
  counts,
  idPrefix,
  headingId,
  onEditSalon,
}: AdminSalonSubscriptionSectionProps) {
  const [filter, setFilter] = useState<AdminSalonSubscriptionBillingFilter>("PAYING");
  const [page, setPage] = useState(0);
  const [salonSearch, setSalonSearch] = useState("");

  const salonsQ = useQuery({
    queryKey: ["admin", "overview", "salons", "subscription", filter, accessToken, page],
    enabled: Boolean(accessToken),
    queryFn: () =>
      apiJson<PageResponse<SuperAdminRecentSalonRowDto>>(
        `/api/v1/admin/overview/salons?subscriptionBilling=${encodeURIComponent(filter)}&page=${page}&size=${PAGE_SIZE}&sort=createdAt,desc`,
        { accessToken },
      ),
  });

  const totalPages = Math.max(1, salonsQ.data?.totalPages ?? 1);
  const pageSafe = Math.min(page, totalPages - 1);
  const slice = salonsQ.data?.content ?? [];
  const filteredSlice = slice.filter((row) => row.name.toLowerCase().includes(salonSearch.trim().toLowerCase()));

  useEffect(() => {
    setPage(0);
    setSalonSearch("");
  }, [filter]);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  return (
    <section className="luxury-admin-panel luxury-admin-premium-card" aria-labelledby={headingId}>
      <h2 id={headingId} className="luxury-admin-section-title">
        Abbonamenti Stripe
      </h2>
      <p className="luxury-admin-subchips__intro" style={{ marginTop: "-0.25rem", marginBottom: "0.75rem" }}>
        Saloni non provider con abbonamento Premium su Stripe: paganti attivi, periodo di prova o disdetta registrata.
      </p>

      <div className="luxury-admin-subchips" role="tablist" aria-label="Filtro stato abbonamento">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            className={`luxury-admin-subchip ${filter === f ? "is-active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {subscriptionBillingFilterLabel(f)} ({countForFilter(counts, f)})
          </button>
        ))}
      </div>

      <div className="luxury-admin-subreveal is-open">
        <div className="luxury-admin-premium-card__search-panel">
          <label className="luxury-admin-premium-card__search-label" htmlFor={`${idPrefix}-search`}>
            Cerca per nome salone
          </label>
          <div className="luxury-admin-premium-card__search-row">
            <input
              id={`${idPrefix}-search`}
              type="search"
              className="luxury-admin-input luxury-admin-premium-card__search-input"
              placeholder="Es. Luxury, Bologna…"
              value={salonSearch}
              onChange={(e) => setSalonSearch(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            {salonSearch.trim() ? (
              <button type="button" className="luxury-admin-premium-card__search-clear" onClick={() => setSalonSearch("")}>
                Azzera
              </button>
            ) : null}
          </div>
        </div>

        <div className="luxury-admin-table-wrap luxury-admin-premium-card__table-wrap">
          <table className="luxury-admin-table luxury-admin-table--compact luxury-admin-premium-card__table">
            <thead>
              <tr>
                <th scope="col">Salone</th>
                <th scope="col">Titolare</th>
                <th scope="col">Stato Stripe</th>
                <th scope="col">Fine periodo</th>
                <th scope="col">Città</th>
                <th scope="col">Creato</th>
                <th scope="col">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {salonsQ.isLoading ? (
                <tr>
                  <td colSpan={7}>Caricamento saloni…</td>
                </tr>
              ) : salonsQ.isError ? (
                <tr>
                  <td colSpan={7}>
                    {salonsQ.error instanceof Error ? salonsQ.error.message : "Impossibile caricare i saloni."}
                  </td>
                </tr>
              ) : filteredSlice.length === 0 ? (
                <tr>
                  <td colSpan={7}>Nessun salone in questa categoria.</td>
                </tr>
              ) : (
                filteredSlice.map((row) => (
                  <Fragment key={row.studioGroupId}>
                    <tr>
                      <td>
                        {row.name}
                        {row.planTier ? (
                          <span className="luxury-admin-muted"> · {row.planTier}</span>
                        ) : null}
                      </td>
                      <td>{row.ownerEmail ?? "—"}</td>
                      <td>{subscriptionStatusLabel(row.subscriptionStatus, row.cancelAtPeriodEnd)}</td>
                      <td>{formatSubscriptionPeriodEnd(row.subscriptionCurrentPeriodEnd)}</td>
                      <td>
                        {row.primaryLocationCity
                          ? formatSalonCityForDisplay(row.primaryLocationCity) ?? row.primaryLocationCity
                          : "—"}
                      </td>
                      <td>{formatDate(row.createdAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="luxury-admin-btn luxury-admin-premium-card__action-btn"
                          onClick={() => onEditSalon(row)}
                        >
                          Modifica
                        </button>
                      </td>
                    </tr>
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {salonsQ.isSuccess && salonsQ.data && salonsQ.data.totalElements > 0 ? (
          <div
            className="luxury-admin-subchips luxury-admin-premium-card__pagination"
            aria-label={`Paginazione ${subscriptionBillingFilterLabel(filter).toLowerCase()}`}
          >
            <button
              type="button"
              className="luxury-admin-subchip"
              disabled={pageSafe === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              ← Precedente
            </button>
            <span className="luxury-admin-muted">
              Pagina {pageSafe + 1} di {totalPages} · {salonsQ.data.totalElements} saloni
            </span>
            <button
              type="button"
              className="luxury-admin-subchip"
              disabled={pageSafe >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Successiva →
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
