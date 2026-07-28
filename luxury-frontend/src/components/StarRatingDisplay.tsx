type Props = {
  rating: number;
  max?: number;
  /** Testo breve accanto alle stelle (es. media). */
  caption?: string;
};

export function StarRatingDisplay({ rating, max = 5, caption }: Props) {
  const safeMax = Math.max(2, Math.min(20, max));
  const r = Math.min(safeMax, Math.max(0, rating));
  const rounded = Math.round(r);
  return (
    <span className="luxury-star-rating luxury-star-rating--readonly" title={`${r} su ${safeMax}`}>
      <span className="luxury-star-rating__row" aria-hidden>
        {Array.from({ length: safeMax }, (_, i) => {
          const n = i + 1;
          const filled = n <= rounded;
          return (
            <span key={n} className={`luxury-star-rating__star ${filled ? "is-filled" : ""}`}>
              ★
            </span>
          );
        })}
      </span>
      {caption ? <span className="luxury-star-rating__caption">{caption}</span> : null}
    </span>
  );
}
