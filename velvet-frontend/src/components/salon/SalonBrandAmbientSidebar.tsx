import {
  PREVIEW_AMBIENT_SWATCH_HEX,
  PREVIEW_ANIMATED_BG_LABELS,
} from "../../data/previewAnimatedBackgrounds";

type Props = {
  selectedIndex: number;
  onSelect: (index: number) => void;
};

/**
 * Elenco sfondi scena (stessa struttura visiva della sidebar layout): colonna sinistra anteprima.
 */
export function SalonBrandAmbientSidebar({ selectedIndex, onSelect }: Props) {
  return (
    <aside className="velvet-brand-layout-sidebar velvet-brand-ambient-sidebar" aria-label="Sfondi animati card vetrina">
      <p className="velvet-brand-layout-sidebar__head">100 sfondi · scena</p>
      <ul>
        {PREVIEW_ANIMATED_BG_LABELS.map((label, i) => {
          const active = selectedIndex === i;
          return (
            <li key={`ambient-bg-${i}`}>
              <button
                type="button"
                className={`velvet-brand-layout-sidebar__item${active ? " velvet-brand-layout-sidebar__item--active" : ""}`}
                onClick={() => onSelect(i)}
                aria-pressed={active}
                title={label}
              >
                <span className="velvet-brand-layout-sidebar__item-index" aria-hidden="true">
                  {String(i + 1).padStart(3, "0")}
                </span>
                <span
                  className="velvet-brand-ambient-sidebar__thumb"
                  style={{ background: PREVIEW_AMBIENT_SWATCH_HEX[i] ?? "#64748b" }}
                  aria-hidden={true}
                />
                <span className="velvet-brand-layout-sidebar__item-text">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
