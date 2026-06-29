import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StandardLayoutWireframe } from "../../../components/salon/StandardLayoutWireframe";
import {
  STANDARD_LAYOUT_CATALOG,
  type StandardLayoutTemplateId,
  readStoredStandardLayoutTemplateId,
  writeStoredStandardLayoutTemplateId,
} from "../../../data/standardLayoutCatalog";
import { SalonStandardSectionGuard } from "./SalonStandardSectionGuard";

/**
 * Galleria catalogo layout (Premium): 100 template (10 strutture + 90 tinte), anteprima wireframe, scelta locale fino al backend `theme_config`.
 */
export default function SalonLayoutCatalogPage() {
  const [activeId, setActiveId] = useState<StandardLayoutTemplateId | null>(null);

  useEffect(() => {
    setActiveId(readStoredStandardLayoutTemplateId());
  }, []);

  const selectTemplate = useCallback((id: StandardLayoutTemplateId) => {
    writeStoredStandardLayoutTemplateId(id);
    setActiveId(id);
  }, []);

  return (
    <SalonStandardSectionGuard>
      <div>
        <Link to="/account/salone" className="luxury-link-back">
          ← Panoramica salone
        </Link>
        <h1 className="luxury-page-title">Catalogo layout</h1>
        <p className="luxury-page-subtitle">
          Scegli uno dei 100 template Luxury (piano Premium), poi affina i token — colori, tipografia, densità, ordine blocchi — dal
          pannello impostazioni quando sarà collegato al motore tema (doc § template).
        </p>

        {activeId ? (
          <p className="luxury-surface-card luxury-surface-card--plan-standard" style={{ marginTop: 0, marginBottom: "1rem", fontSize: "0.92rem", lineHeight: 1.55 }}>
            <strong style={{ color: "#fffbeb" }}>Layout selezionato in questa sessione:</strong>{" "}
            {STANDARD_LAYOUT_CATALOG.find((t) => t.id === activeId)?.name ?? activeId}. L’applicazione effettiva all’interfaccia staff
            avverrà al publish di <code className="luxury-text-muted">theme_config</code> lato backend.
          </p>
        ) : (
          <p className="luxury-text-muted" style={{ margin: "0 0 1rem", fontSize: "0.9rem" }}>
            Nessun template ancora scelto: seleziona una card per impostare la preferenza (memorizzata in sessione sul browser).
          </p>
        )}

        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "1rem 0 0",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(272px, 1fr))",
            gap: "0.85rem",
          }}
        >
          {STANDARD_LAYOUT_CATALOG.map((t) => {
            const selected = activeId === t.id;
            return (
              <li
                key={t.id}
                className={`luxury-surface-card luxury-standard-layout-catalog-card${selected ? " luxury-standard-layout-catalog-card--active" : ""}`}
                style={{ marginTop: 0 }}
              >
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                  <StandardLayoutWireframe templateId={t.id} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: "0 0 0.2rem",
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        color: "rgba(125, 211, 252, 0.95)",
                      }}
                    >
                      {String(t.order).padStart(2, "0")} · TEMPLATE
                    </p>
                    <h2 style={{ margin: "0 0 0.35rem", fontSize: "1.08rem", color: "#fffbeb" }}>{t.name}</h2>
                  </div>
                </div>
                <p className="luxury-text-muted" style={{ margin: "0.65rem 0 0", fontSize: "0.88rem", lineHeight: 1.5 }}>
                  {t.description}
                </p>
                <ul className="luxury-text-muted" style={{ margin: "0.5rem 0 0", paddingLeft: "1.1rem", fontSize: "0.8rem", lineHeight: 1.45 }}>
                  {t.tokenHighlights.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <div style={{ marginTop: "0.85rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                  {selected ? (
                    <span
                      style={{
                        display: "block",
                        textAlign: "center",
                        padding: "0.45rem 0.5rem",
                        borderRadius: 8,
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color: "rgba(187, 247, 208, 0.95)",
                        background: "rgba(22, 101, 52, 0.35)",
                        border: "1px solid rgba(34, 197, 94, 0.35)",
                      }}
                    >
                      Layout attivo (sessione)
                    </span>
                  ) : (
                    <button type="button" className="luxury-btn luxury-btn--primary" style={{ width: "100%" }} onClick={() => selectTemplate(t.id)}>
                      Usa questo layout
                    </button>
                  )}
                  <button type="button" className="luxury-btn luxury-btn--secondary" style={{ width: "100%" }} disabled>
                    Anteprima live (in arrivo)
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="luxury-text-muted" style={{ marginTop: "1.25rem", fontSize: "0.9rem", lineHeight: 1.55 }}>
          In bozza potrai vedere le modifiche senza pubblicarle; al publish il backend versiona il tema e invalida la cache della configurazione
          (doc §88).
        </p>
      </div>
    </SalonStandardSectionGuard>
  );
}
