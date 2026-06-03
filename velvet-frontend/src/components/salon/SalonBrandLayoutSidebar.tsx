import { Link } from "react-router-dom";
import { STANDARD_LAYOUT_CATALOG, type StandardLayoutTemplateId } from "../../data/standardLayoutCatalog";
import { StandardLayoutWireframe } from "./StandardLayoutWireframe";

export type SalonLayoutSidebarService = { id: string; name: string };

function trimChip(name: string, max = 26): string {
  const t = name.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

type Props = {
  selectedId: StandardLayoutTemplateId;
  onSelect: (id: StandardLayoutTemplateId) => void;
  services?: SalonLayoutSidebarService[];
};

export function SalonBrandLayoutSidebar({ selectedId, onSelect, services = [] }: Props) {
  return (
    <aside className="velvet-brand-layout-sidebar" aria-label="Template layout vetrina">
      <div className="velvet-brand-layout-sidebar__services-block">
        <p className="velvet-brand-layout-sidebar__services-head">I tuoi servizi</p>
        {services.length > 0 ? (
          <div className="velvet-brand-layout-sidebar__services-chips" role="list">
            {services.map((s) => (
              <span key={s.id} className="velvet-brand-layout-sidebar__service-chip" role="listitem" title={s.name}>
                {trimChip(s.name)}
              </span>
            ))}
          </div>
        ) : (
          <p className="velvet-brand-layout-sidebar__services-empty">
            Aggiungi trattamenti da{" "}
            <Link to="/account/salone/servizi" className="velvet-link-inline">
              Servizi
            </Link>{" "}
            per vederli qui e nella vetrina.
          </p>
        )}
      </div>
      <p className="velvet-brand-layout-sidebar__head">100 layout · colori</p>
      <ul>
        {STANDARD_LAYOUT_CATALOG.map((t) => {
          const active = selectedId === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                className={`velvet-brand-layout-sidebar__item${active ? " velvet-brand-layout-sidebar__item--active" : ""}`}
                onClick={() => onSelect(t.id)}
              >
                <span className="velvet-brand-layout-sidebar__item-index" aria-hidden="true">
                  {String(t.order).padStart(2, "0")}
                </span>
                <span style={{ flexShrink: 0 }} aria-hidden="true">
                  <StandardLayoutWireframe templateId={t.id} />
                </span>
                <span className="velvet-brand-layout-sidebar__item-text">{t.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
