import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiJson } from "../../../api/client";
import type { OrganizationDetail, SalonCatalogClientRow } from "../../../api/types";
import { useLuxuryAuth } from "../../../auth/LuxuryAuthProvider";
import { parseSalonPlanTier } from "../../../data/salonPlans";
import { useEffectiveSalonPlanTier } from "../../../hooks/useEffectiveSalonPlanTier";
import { useMeSalonSummaryQuery } from "../../../hooks/useMeSalonSummary";
import { useMeStaffSalonQuery } from "../../../hooks/useMeStaffSalon";
import { writeSalonClientsLastSeenCount } from "../../../lib/salonClientsNavBadge";
import { CLIENT_ACCOUNT_ICONS } from "../../../components/account/ClientAccountContentCard";
import { ClientAccountHeroHeader } from "../../../components/account/ClientAccountHeroHeader";
import { CLIENT_ACCOUNT_PAGE_SHELL_CLASS } from "../../../lib/clientAccountPageShellClasses";
import "../../../styles/luxury-consumer-bookings-page.css";
import "../../../styles/luxury-info-privacy-hero.css";
import "../../../styles/salon-clients-page.css";
import "../../../styles/luxury-salon-clients-salon.css";
import "../../../styles/luxury-salon-clients-staff.css";

function clientInitials(displayName: string): string {
  const parts = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0] ?? "";
    const b = parts[parts.length - 1][0] ?? "";
    return `${a}${b}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

function clientMatchesQuery(c: SalonCatalogClientRow, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const name = (c.displayName ?? "").toLowerCase();
  const email = (c.email ?? "").toLowerCase();
  const phone = (c.phone ?? "").replace(/\s/g, "").toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  if (qDigits.length >= 2 && phone.replace(/\D/g, "").includes(qDigits)) return true;
  return name.includes(q) || email.includes(q) || phone.includes(q.replace(/\s/g, "").toLowerCase());
}

export default function SalonClientsPage() {
  const { isSalonTitolare, isSalonStaff, accessToken } = useLuxuryAuth();
  const [clientSearch, setClientSearch] = useState("");
  const tier = useEffectiveSalonPlanTier();
  const meSalon = useMeSalonSummaryQuery();
  const staffSalon = useMeStaffSalonQuery();

  const staffPrimaryId = staffSalon.data?.primaryLocationId?.trim() ?? "";
  const staffPremiumEligible =
    isSalonStaff &&
    Boolean(staffPrimaryId) &&
    (parseSalonPlanTier(staffSalon.data?.planTier) === "PREMIUM" ||
      parseSalonPlanTier(staffSalon.data?.planTier) === "PLUS");

  const slug = meSalon.data?.primaryLocationSlug?.trim() ?? "";
  const primaryLocationId = meSalon.data?.primaryLocationId?.trim() ?? "";

  const orgFallbackQ = useQuery({
    queryKey: ["public", "organization", slug],
    queryFn: () => apiJson<OrganizationDetail>(`/api/v1/public/organizations/${encodeURIComponent(slug)}`),
    enabled: Boolean(isSalonTitolare && slug && !primaryLocationId),
  });

  const resolvedLocationId = isSalonStaff ? staffPrimaryId : primaryLocationId || orgFallbackQ.data?.id || "";

  const clientsQ = useQuery({
    queryKey: ["catalog", "clients", resolvedLocationId, accessToken],
    queryFn: () =>
      apiJson<SalonCatalogClientRow[]>("/api/v1/clients", {
        accessToken,
        headers: { "X-Location-Id": resolvedLocationId },
      }),
    enabled: Boolean(accessToken && resolvedLocationId && (isSalonTitolare || isSalonStaff)),
  });

  const orgLoading = useMemo(() => {
    if (!isSalonTitolare || primaryLocationId) return false;
    return orgFallbackQ.isLoading;
  }, [isSalonTitolare, primaryLocationId, orgFallbackQ.isLoading]);

  const filteredClients = useMemo(() => {
    const rows = clientsQ.data;
    if (!Array.isArray(rows)) return [];
    return rows.filter((c) => clientMatchesQuery(c, clientSearch));
  }, [clientsQ.data, clientSearch]);

  useEffect(() => {
    const locId = resolvedLocationId;
    const rows = clientsQ.data;
    if (!locId || !Array.isArray(rows)) return;
    writeSalonClientsLastSeenCount(locId, rows.length);
  }, [resolvedLocationId, clientsQ.data]);

  if (!isSalonTitolare && !isSalonStaff) {
    return <Navigate to="/account" replace />;
  }

  const clientsShellClass = `luxury-page-main luxury-account-page-shell luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44 luxury-clients-dash luxury-clients-dash--base44 luxury-clients-dash--salon-side ${CLIENT_ACCOUNT_PAGE_SHELL_CLASS}`;
  const staffDashClass = isSalonStaff ? " luxury-clients-dash--staff" : "";
  const clientCount = clientsQ.isSuccess && Array.isArray(clientsQ.data) ? clientsQ.data.length : null;

  if (isSalonStaff) {
    if (staffSalon.isPending) {
      return (
        <main className={clientsShellClass + staffDashClass}>
          <div className="luxury-consumer-bookings-dash__shell luxury-clients-dash__shell">
            <p className="luxury-text-muted" style={{ marginTop: "1.5rem" }}>
              Caricamento…
            </p>
          </div>
        </main>
      );
    }
    if (!staffPremiumEligible) {
      return <Navigate to="/account/staff" replace />;
    }
  }

  if (isSalonTitolare && tier !== "PREMIUM" && tier !== "PLUS") {
    return <Navigate to="/salone" replace />;
  }

  const showTitolareSlugWarning =
    isSalonTitolare && !slug && !primaryLocationId && !meSalon.isPending;

  return (
    <main className={clientsShellClass + staffDashClass}>
      <div className="luxury-consumer-bookings-dash__shell luxury-clients-dash__shell">
        <ClientAccountHeroHeader
          headlinePre={isSalonStaff ? "I " : "I tuoi "}
          headlineAccent={isSalonStaff ? "clienti della sede" : "clienti"}
          badgePrimary="Area salone"
          badgeSecondary={isSalonStaff ? "Operatore" : "Anagrafica"}
          kickerLabel="Clienti"
          kickerChip={isSalonStaff ? "Anagrafica sede" : "Chat & contatti"}
          subtitle={
            isSalonStaff ? (
              <>
                Anagrafica della sede: da ogni scheda puoi aprire la <strong>chat</strong> con il cliente.
              </>
            ) : (
              <>
                Elenco clienti collegati alla sede. Cerca per nome, email o telefono e apri la{" "}
                <strong>chat</strong> da ogni scheda.
              </>
            )
          }
          metaItems={[
            ...(clientCount !== null
              ? [
                  {
                    icon: CLIENT_ACCOUNT_ICONS.user,
                    label: `${clientCount} ${clientCount === 1 ? "cliente" : "clienti"}`,
                  },
                ]
              : []),
            { icon: CLIENT_ACCOUNT_ICONS.chat, label: "Chat da ogni scheda" },
          ]}
        />

        {showTitolareSlugWarning ? (
          <p className="luxury-alert luxury-alert--error" role="alert" style={{ marginTop: "0.5rem" }}>
            Non risulta uno slug sede nel profilo salone. Completa la posizione o i dati sede in account, poi riprova.
          </p>
        ) : null}

        {isSalonTitolare && (orgLoading || meSalon.isPending) ? <p className="luxury-text-muted">Caricamento…</p> : null}
        {isSalonTitolare && !primaryLocationId && orgFallbackQ.error ? (
          <p className="luxury-alert luxury-alert--error" role="alert">
            {orgFallbackQ.error instanceof Error ? orgFallbackQ.error.message : "Impossibile caricare la sede."}
          </p>
        ) : null}

        {clientsQ.isLoading && resolvedLocationId ? <p className="luxury-text-muted">Caricamento elenco clienti…</p> : null}
        {clientsQ.error ? (
          <p className="luxury-alert luxury-alert--error" role="alert">
            {clientsQ.error instanceof Error ? clientsQ.error.message : "Elenco non disponibile."}
          </p>
        ) : null}

        {clientsQ.data && clientsQ.data.length === 0 ? (
          <div
            className="luxury-clients-dash__empty"
            role="status"
            aria-label="Nessun cliente collegato a questa sede."
          >
            <div className="luxury-clients-dash__empty-glow" aria-hidden />
            <div className="luxury-clients-dash__empty-frame" aria-hidden />
            <p className="luxury-clients-dash__empty-title">
              <span className="luxury-clients-dash__empty-title-pre">Nessun</span>
              <span className="luxury-clients-dash__empty-title-accent"> cliente</span>
            </p>
          </div>
        ) : null}

        {clientsQ.data && clientsQ.data.length > 0 ? (
          <div className="luxury-clients-dash__toolbar">
            <label className="luxury-clients-dash__search" htmlFor="luxury-salon-clients-search">
              <span className="luxury-clients-dash__search-label">Cerca cliente</span>
              <input
                id="luxury-salon-clients-search"
                type="search"
                className="luxury-clients-dash__search-input"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Nome, email o telefono…"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            {clientSearch.trim() ? (
              <p className="luxury-clients-dash__search-meta" aria-live="polite">
                {filteredClients.length === 0
                  ? "Nessun cliente corrisponde alla ricerca."
                  : `${filteredClients.length} ${filteredClients.length === 1 ? "risultato" : "risultati"}`}
              </p>
            ) : null}
          </div>
        ) : null}

        {clientsQ.data && clientsQ.data.length > 0 && filteredClients.length > 0 ? (
          <div className="luxury-clients-grid" aria-label="Elenco clienti della sede">
            {filteredClients.map((c) => (
              <article key={c.id} className="luxury-client-card">
                <div className="luxury-client-card__top">
                  <div className="luxury-client-card__avatar" aria-hidden>
                    {clientInitials(c.displayName || "Cliente")}
                  </div>
                  <h2 className="luxury-card-title luxury-client-card__name">{c.displayName?.trim() || "Cliente"}</h2>
                </div>
                <div className="luxury-client-card__body">
                  <div className="luxury-client-card__row">
                    <span className="luxury-client-card__label">Email</span>
                    <span className="luxury-client-card__value">
                      {c.email?.trim() ? (
                        <a href={`mailto:${encodeURIComponent(c.email.trim())}`}>{c.email.trim()}</a>
                      ) : (
                        "—"
                      )}
                    </span>
                  </div>
                  <div className="luxury-client-card__row">
                    <span className="luxury-client-card__label">Telefono</span>
                    <span className="luxury-client-card__value">{c.phone?.trim() ? c.phone.trim() : "—"}</span>
                  </div>
                </div>
                <div className="luxury-client-card__actions">
                  <Link
                    to={`/account/chat?salonClientId=${encodeURIComponent(c.id)}`}
                    className="luxury-client-card__chat"
                  >
                    Apri chat
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
