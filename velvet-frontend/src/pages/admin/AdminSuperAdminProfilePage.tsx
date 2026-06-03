import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiJson } from "../../api/client";
import type { SuperAdminMeProfileDto } from "../../api/types";
import { useAdminAuth } from "../../auth/AdminAuthProvider";
import {
  extractSuperAdminProfileFromOverview,
  readVelvetAdminJwtEmail,
} from "../../utils/superAdminOverviewProfile";
import { AdminSuperAdminProfileSection } from "./AdminSuperAdminProfileSection";

type SuperAdminOverviewWithProfile = {
  superAdminProfile: SuperAdminMeProfileDto;
};

function formatRoles(raw: string | null | undefined): string {
  if (!raw?.trim()) return "—";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" · ");
}

function dash(s: string | null | undefined): string {
  const t = s?.trim();
  return t ? t : "—";
}

export default function AdminSuperAdminProfilePage() {
  const { accessToken } = useAdminAuth();
  const sessionEmail = readVelvetAdminJwtEmail(accessToken);

  const overviewQ = useQuery({
    queryKey: ["admin", "overview", accessToken],
    enabled: Boolean(accessToken),
    queryFn: () =>
      apiJson<SuperAdminOverviewWithProfile>("/api/v1/admin/overview", {
        accessToken,
      }),
  });

  const p = extractSuperAdminProfileFromOverview(overviewQ.data, accessToken);

  return (
    <div className="velvet-admin-panel">
      <p className="velvet-admin-support-page__back">
        <Link to="/admin/dashboard" className="velvet-admin-back-link">
          ← Panoramica
        </Link>
      </p>
      <h1 className="velvet-admin-page-title">Profilo super admin</h1>

      {overviewQ.isLoading ? <p className="velvet-admin-muted">Sincronizzazione con il server…</p> : null}
      {overviewQ.isError ? (
        <p className="velvet-alert velvet-alert--error" role="alert">
          {overviewQ.error instanceof Error ? overviewQ.error.message : "Impossibile caricare l’overview."} Mostriamo comunque
          quanto ricavabile dal token di sessione.
        </p>
      ) : null}

      {!p.persistedProfile ? (
        <p className="velvet-admin-muted velvet-admin-profile-card velvet-admin-profile-card--notice" role="status">
          <strong>Profilo non ancora persistito</strong> (nessun record consumer allineato al super admin). Completa il
          bootstrap avviando il backend con credenziali super admin, oppure segui la documentazione SQL in{" "}
          <code>deploy/sql/</code>. Finché manca, il telefono non può essere salvato sul database.
        </p>
      ) : null}

      {accessToken ? (
        <AdminSuperAdminProfileSection
          accessToken={accessToken}
          profile={p}
          idPrefix="admin-sa-standalone"
          headingId="admin-sa-standalone-h"
          showSectionTitle={false}
        />
      ) : null}

      <section className="velvet-admin-profile-card" aria-labelledby="admin-profile-dl-h">
        <h2 id="admin-profile-dl-h" className="velvet-admin-profile-card__title">
          Dettaglio tecnico
        </h2>
        <dl className="velvet-admin-dl velvet-admin-profile-card__dl">
          <div>
            <dt>Nome in evidenza (database)</dt>
            <dd>{dash(p.displayName)}</dd>
          </div>
          <div>
            <dt>ID profilo</dt>
            <dd className="velvet-admin-mono">{dash(p.profileId)}</dd>
          </div>
          {sessionEmail && sessionEmail !== (p.email ?? "").trim() ? (
            <div>
              <dt>Email nel token JWT</dt>
              <dd>{sessionEmail}</dd>
            </div>
          ) : null}
          <div>
            <dt>Ruoli di sicurezza</dt>
            <dd>{formatRoles(p.securityRoles)}</dd>
          </div>
          <div>
            <dt>Profilo persistito in database</dt>
            <dd>{p.persistedProfile ? "Sì" : "No"}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
