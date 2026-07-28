import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiJson } from "../../api/client";
import type { FavoriteDto } from "../../api/types";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";
import { formatSalonCityForDisplay } from "../../lib/formatSalonCityForDisplay";
import "../../styles/luxury-favorites-page.css";

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden fill="currentColor">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export default function FavoritesPage() {
  const { accessToken } = useLuxuryAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["me", "favorites"],
    queryFn: () => apiJson<FavoriteDto[]>("/api/v1/me/favorites", { accessToken }),
    enabled: Boolean(accessToken),
  });

  const removeM = useMutation({
    mutationFn: (organizationId: string) =>
      apiJson(`/api/v1/me/favorites/${organizationId}`, { method: "DELETE", accessToken }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me", "favorites"] }),
  });

  const rows = q.data ?? [];

  return (
    <div className="luxury-favorites-page">
      <header className="luxury-favorites-page__header">
        <h1 className="luxury-page-title luxury-favorites-page__title">Saloni preferiti</h1>
      </header>

      {q.isLoading ? (
        <p className="luxury-favorites-state luxury-favorites-state--loading" aria-live="polite">
          Caricamento…
        </p>
      ) : null}

      {q.error ? (
        <p className="luxury-alert luxury-alert--error" role="alert">
          {q.error instanceof Error ? q.error.message : "Errore"}
        </p>
      ) : null}

      {!q.isLoading && !q.error && rows.length === 0 ? (
        <div className="luxury-favorites-empty" role="status">
          <svg className="luxury-favorites-empty__icon" viewBox="0 0 24 24" width={22} height={22} aria-hidden fill="none">
            <path
              d="M12 21s-6.7-4.5-9-8.5C.5 8.5 2.5 5 6.5 5c2.2 0 3.9 1.3 5.5 3.4C13.6 6.3 15.3 5 17.5 5c4 0 6 3.5 3.5 7.5-2.3 4-9 8.5-9 8.5z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinejoin="round"
            />
          </svg>
          <p className="luxury-favorites-empty__title">Nessun preferito ancora</p>
          <p className="luxury-favorites-empty__body">
            Esplora i saloni e usa <span className="luxury-favorites-empty__hl">Aggiungi ai preferiti</span> sulla scheda del
            salone che ti interessa.
          </p>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <ul className="luxury-favorites-list">
          {rows.map((f) => (
            <li key={f.id} className="luxury-favorites-row">
              <div className="luxury-favorites-row__main">
                <span className="luxury-favorites-row__heart" aria-hidden>
                  <HeartIcon />
                </span>
                <div className="luxury-favorites-row__text">
                  <Link to={`/s/${encodeURIComponent(f.slug)}`} className="luxury-favorites-row__link">
                    {f.name}
                    <span className="luxury-favorites-row__chevron" aria-hidden>
                      →
                    </span>
                  </Link>
                  {f.city ? (
                    <p className="luxury-favorites-row__city">{formatSalonCityForDisplay(f.city) ?? f.city}</p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                className="luxury-favorites-remove"
                onClick={() => removeM.mutate(f.organizationId)}
                disabled={removeM.isPending}
              >
                Rimuovi
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
