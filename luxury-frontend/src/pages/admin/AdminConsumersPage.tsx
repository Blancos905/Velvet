import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, apiJson } from "../../api/client";
import { useAdminAuth } from "../../auth/AdminAuthProvider";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";
import { luxuryPostConsumerSessionPath } from "../../lib/luxuryPostConsumerSessionPath";
import { parseLuxurySecurityRoles } from "../../lib/parseLuxurySecurityRoles";
import { useAdminConfirmAction } from "./useAdminConfirmAction";

type ConsumerSessionResponse = {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
};

type SuperAdminConsumerRow = {
  id: string;
  email: string | null;
  displayName: string | null;
  securityRoles: string | null;
  planTier: string | null;
  deletedAt: string | null;
};

type PageConsumers = {
  content: SuperAdminConsumerRow[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

const CONSUMERS_PAGE_SIZE = 10;

function canOpenConsumerLuxurySession(row: SuperAdminConsumerRow): boolean {
  if (row.deletedAt) return false;
  return !parseLuxurySecurityRoles(row.securityRoles).includes("ADMIN");
}

export default function AdminConsumersPage() {
  const { accessToken } = useAdminAuth();
  const navigate = useNavigate();
  const { signInWithIssuedToken } = useLuxuryAuth();
  const qc = useQueryClient();
  const { confirm, showSuccess, confirmDialog, actionBanner } = useAdminConfirmAction();
  const [page, setPage] = useState(0);

  const listQ = useQuery({
    queryKey: ["admin", "consumers", accessToken, page, CONSUMERS_PAGE_SIZE],
    enabled: Boolean(accessToken),
    queryFn: () =>
      apiJson<PageConsumers>(
        `/api/v1/admin/consumers?page=${page}&size=${CONSUMERS_PAGE_SIZE}&sort=email,asc`,
        {
          accessToken,
        },
      ),
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiFetch(`/api/v1/admin/consumers/${id}`, { method: "DELETE", accessToken });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || r.statusText);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "consumers"] }),
  });

  const consumerLoginM = useMutation({
    mutationFn: (id: string) =>
      apiJson<ConsumerSessionResponse>(`/api/v1/admin/overview/consumers/${id}/session`, {
        method: "POST",
        accessToken,
      }),
    onSuccess: async (body) => {
      await signInWithIssuedToken(body.accessToken, { preserveAdminSession: true });
      navigate(luxuryPostConsumerSessionPath(body.accessToken));
    },
  });

  return (
    <div className="luxury-admin-panel">
      {confirmDialog}
      {actionBanner}
      <h1 className="luxury-admin-page-title">Profili consumatore</h1>
      <p className="luxury-admin-muted">
        Elenco da database: soft-delete se necessario. Il piano è solo informativo qui: non si applica upgrade a Premium
        per i profili consumatore da questo pannello.
      </p>
      {listQ.isLoading ? <p className="luxury-admin-muted">Caricamento…</p> : null}
      {listQ.isError ? (
        <p className="luxury-alert luxury-alert--error" role="alert">
          {listQ.error instanceof Error ? listQ.error.message : "Errore elenco."}
        </p>
      ) : null}
      {listQ.data && listQ.data.content.length === 0 ? <p>Nessun profilo.</p> : null}
      {listQ.data && listQ.data.content.length > 0 ? (
        <div className="luxury-admin-table-wrap">
          <table className="luxury-admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Nome</th>
                <th>Ruoli</th>
                <th>Piano</th>
                <th>Stato</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {listQ.data.content.map((row) => (
                <tr key={row.id}>
                  <td>{row.email ?? "—"}</td>
                  <td>{row.displayName ?? "—"}</td>
                  <td className="luxury-admin-mono">{row.securityRoles ?? "—"}</td>
                  <td>{row.planTier ?? "—"}</td>
                  <td>{row.deletedAt ? "eliminato" : "attivo"}</td>
                  <td className="luxury-admin-actions">
                    <button
                      type="button"
                      className="luxury-admin-btn"
                      title={
                        canOpenConsumerLuxurySession(row)
                          ? "Apri l’account nell’area Saloni Luxury"
                          : row.deletedAt
                            ? "Profilo eliminato"
                            : "Profilo super admin: sessione non disponibile"
                      }
                      disabled={
                        !canOpenConsumerLuxurySession(row) || consumerLoginM.isPending || deleteM.isPending
                      }
                      onClick={() => consumerLoginM.mutate(row.id)}
                    >
                      {consumerLoginM.isPending && consumerLoginM.variables === row.id ? "Login…" : "Login"}
                    </button>
                    <button
                      type="button"
                      className="luxury-admin-btn luxury-admin-btn--danger"
                      disabled={Boolean(row.deletedAt) || deleteM.isPending || consumerLoginM.isPending}
                      onClick={() => {
                        const label = row.email?.trim() || row.displayName?.trim() || "profilo";
                        confirm({
                          title: "Elimina profilo",
                          message: `Sei sicuro di voler eliminare il profilo «${label}»? Il profilo verrà disattivato (soft-delete).`,
                          confirmLabel: "Sì, elimina profilo",
                          onConfirm: async () => {
                            await deleteM.mutateAsync(row.id);
                            showSuccess(`Profilo «${label}» eliminato con successo.`);
                          },
                        });
                      }}
                    >
                      Elimina
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {listQ.data && listQ.data.totalElements > CONSUMERS_PAGE_SIZE ? (
        <div className="luxury-admin-pagination">
          <button type="button" className="luxury-admin-btn" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
            Precedente
          </button>
          <span className="luxury-admin-muted">
            Pagina {page + 1} di {Math.max(1, listQ.data.totalPages)} · {CONSUMERS_PAGE_SIZE} per pagina ·{" "}
            {listQ.data.totalElements} profili
          </span>
          <button
            type="button"
            className="luxury-admin-btn"
            disabled={page >= Math.max(0, listQ.data.totalPages - 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Successiva
          </button>
        </div>
      ) : null}
      {deleteM.isError ? (
        <p className="luxury-alert luxury-alert--error" role="alert">
          {deleteM.error instanceof Error ? deleteM.error.message : "Operazione fallita."}
        </p>
      ) : null}
      {consumerLoginM.isError ? (
        <p className="luxury-alert luxury-alert--error" role="alert">
          {consumerLoginM.error instanceof Error ? consumerLoginM.error.message : "Login account non riuscito."}
        </p>
      ) : null}
    </div>
  );
}
