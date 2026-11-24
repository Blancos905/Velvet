import { useMemo, useState } from "react";
import type { PublicSalonReview } from "../../api/types";
import "../../styles/luxury-salon-page.css";

function formatRatingIt(value: number): string {
  return value.toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

function computeReviewStats(reviews: PublicSalonReview[]) {
  const n = reviews.length;
  if (n === 0) return null;
  const salonSum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return {
    count: n,
    salonAvg: salonSum / n,
  };
}

function starsForRating(rating: number): string {
  return "★".repeat(Math.max(1, Math.min(5, rating)));
}

export type SalonPublicReviewsBlockProps = {
  isLoading: boolean;
  isError: boolean;
  reviews: PublicSalonReview[] | undefined;
};

export function SalonPublicReviewsBlock({ isLoading, isError, reviews }: SalonPublicReviewsBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const list = useMemo(() => reviews ?? [], [reviews]);
  const stats = useMemo(() => computeReviewStats(list), [list]);

  if (isLoading) {
    return (
      <p className="luxury-public-reviews__state luxury-text-muted">Caricamento recensioni...</p>
    );
  }
  if (isError) {
    return (
      <p className="luxury-public-reviews__state luxury-text-muted">Recensioni non disponibili al momento.</p>
    );
  }
  if (!stats) {
    return <p className="luxury-public-reviews__state luxury-text-muted">Nessuna recensione disponibile.</p>;
  }

  return (
    <div className="luxury-public-reviews__block">
      <button
        type="button"
        className="luxury-public-reviews__summary"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="luxury-public-reviews__summary-main">
          <p className="luxury-public-reviews__summary-line">
            <span className="luxury-public-reviews__summary-label">Media salone</span>
            <span className="luxury-public-reviews__summary-value">
              <span className="luxury-public-reviews__stars luxury-public-reviews__stars--summary" aria-hidden>
                {starsForRating(Math.round(stats.salonAvg))}
              </span>{" "}
              {formatRatingIt(stats.salonAvg)}/5{" "}
              <span className="luxury-text-muted">({stats.count} recensioni)</span>
            </span>
          </p>
        </div>
        <span className="luxury-public-reviews__summary-hint luxury-text-muted">
          {expanded
            ? "Tocca per chiudere l'elenco"
            : `Tocca per aprire le recensioni (${stats.count})`}
        </span>
      </button>

      {expanded ? (
        <div className="luxury-public-reviews__expand">
          <div
            className="luxury-public-reviews__scroll"
            role="region"
            aria-label="Elenco recensioni — scorri per vedere le successive"
            tabIndex={0}
          >
            <div className="luxury-public-reviews__list luxury-public-reviews__list--expanded">
              {list.map((review) => (
                <article key={review.id} className="luxury-public-reviews__item">
                  <div className="luxury-public-reviews__item-head">
                    <p className="luxury-public-reviews__reviewer">{review.reviewerName}</p>
                    <p className="luxury-public-reviews__date luxury-text-muted">
                      {new Date(review.createdAt).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                  <p className="luxury-public-reviews__rating">
                    Salone:{" "}
                    <span className="luxury-public-reviews__stars" aria-hidden="true">
                      {starsForRating(review.rating)}
                    </span>{" "}
                    <span className="luxury-text-muted">({review.rating}/5)</span>
                  </p>
                  {review.staffRating != null ? (
                    <p className="luxury-public-reviews__rating luxury-public-reviews__rating--staff">
                      {(review.staffDisplayName?.trim() || "Operatore")}:{" "}
                      <span className="luxury-public-reviews__stars" aria-hidden="true">
                        {starsForRating(review.staffRating)}
                      </span>{" "}
                      <span className="luxury-text-muted">({review.staffRating}/5)</span>
                    </p>
                  ) : null}
                  {review.serviceName ? (
                    <p className="luxury-public-reviews__service luxury-text-muted">Servizio: {review.serviceName}</p>
                  ) : null}
                  <p className="luxury-public-reviews__comment">{review.comment?.trim() || "Nessun commento."}</p>
                </article>
              ))}
            </div>
          </div>
          {list.length > 5 ? (
            <p className="luxury-public-reviews__scroll-foot luxury-text-muted">
              Scorri l&apos;elenco per leggere le altre {list.length - 5} recensioni.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
