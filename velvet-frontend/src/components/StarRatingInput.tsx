import type { MouseEvent } from "react";

type Props = {
  value: number;
  onChange: (n: number) => void;
  max?: number;
  disabled?: boolean;
  id?: string;
  label?: string;
};

/** Input accessibile: voto da 1 a `max` (default 5 stelle) con stelle cliccabili. */
export function StarRatingInput({ value, onChange, max = 5, disabled, id, label }: Props) {
  const safeMax = Math.max(2, Math.min(20, max));
  const v = Math.min(safeMax, Math.max(1, value));
  const labelId = id ? `${id}-label` : undefined;

  return (
    <div className="luxury-star-rating" role="group" aria-labelledby={labelId}>
      {label ? (
        <span id={labelId} className="luxury-star-rating__label">
          {label}
        </span>
      ) : null}
      <div className="luxury-star-rating__row" aria-hidden={!!label}>
        {Array.from({ length: safeMax }, (_, i) => {
          const n = i + 1;
          const filled = n <= v;
          return (
            <button
              key={n}
              type="button"
              disabled={disabled}
              className={`luxury-star-rating__star ${filled ? "is-filled" : ""}`}
              aria-label={`${n} su ${safeMax}`}
              onClick={() => onChange(n)}
              onMouseDown={(e: MouseEvent) => e.preventDefault()}
            >
              ★
            </button>
          );
        })}
      </div>
      <span className="luxury-star-rating__value" aria-live="polite">
        {v}/{safeMax}
      </span>
    </div>
  );
}
