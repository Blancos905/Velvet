import { useMemo, useState } from "react";
import type { PublicSalonReview } from "../../api/types";
import "../../styles/velvet-salon-page.css";

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
  const list = reviews ?? [];
  const stats = useMemo(() => computeReviewStats(list), [list]);

  if (isLoading) {
    return (
      <p className="velvet-public-reviews__state velvet-text-muted">Caricamento recensioni...</p>
    );
  }
  if (isError) {
    return (
      <p className="velvet-public-reviews__state velvet-text-muted">Recensioni non disponibili al momento.</p>
    );
  }
  if (!stats) {
    return <p className="velvet-public-reviews__state velvet-text-muted">Nessuna recensione disponibile.</p>;
  }

  return (
    <div className="velvet-public-reviews__block">
      <button
        type="button"
        className="velvet-public-reviews__summary"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="velvet-public-reviews__summary-main">
          <p className="velvet-public-reviews__summary-line">
            <span className="velvet-public-reviews__summary-label">Media salone</span>
            <span className="velvet-public-reviews__summary-value">
              <span className="velvet-public-reviews__stars velvet-public-reviews__stars--summary" aria-hidden>
                {starsForRating(Math.round(stats.salonAvg))}
              </span>{" "}
              {formatRatingIt(stats.salonAvg)}/5{" "}
              <span className="velvet-text-muted">({stats.count} recensioni)</span>
            </span>
          </p>
        </div>
        <span className="velvet-public-reviews__summary-hint velvet-text-muted">
          {expanded
            ? "Tocca per chiudere l'elenco"
            : `Tocca per aprire le recensioni (${stats.count})`}
        </span>
      </button>

      {expanded ? (
        <div className="velvet-public-reviews__expand">
          <div
            className="velvet-public-reviews__scroll"
            role="region"
            aria-label="Elenco recensioni — scorri per vedere le successive"
            tabIndex={0}
          >
            <div className="velvet-public-reviews__list velvet-public-reviews__list--expanded">
              {list.map((review) => (
                <article key={review.id} className="velvet-public-reviews__item">
                  <div className="velvet-public-reviews__item-head">
                    <p className="velvet-public-reviews__reviewer">{review.reviewerName}</p>
                    <p className="velvet-public-reviews__date velvet-text-muted">
                      {new Date(review.createdAt).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                  <p className="velvet-public-reviews__rating">
                    Salone:{" "}
                    <span className="velvet-public-reviews__stars" aria-hidden="true">
                      {starsForRating(review.rating)}
                    </span>{" "}
                    <span className="velvet-text-muted">({review.rating}/5)</span>
                  </p>
                  {review.staffRating != null ? (
                    <p className="velvet-public-reviews__rating velvet-public-reviews__rating--staff">
                      {(review.staffDisplayName?.trim() || "Operatore")}:{" "}
                      <span className="velvet-public-reviews__stars" aria-hidden="true">
                        {starsForRating(review.staffRating)}
                      </span>{" "}
                      <span className="velvet-text-muted">({review.staffRating}/5)</span>
                    </p>
                  ) : null}
                  {review.serviceName ? (
                    <p className="velvet-public-reviews__service velvet-text-muted">Servizio: {review.serviceName}</p>
                  ) : null}
                  <p className="velvet-public-reviews__comment">{review.comment?.trim() || "Nessun commento."}</p>
                </article>
              ))}
            </div>
          </div>
          {list.length > 5 ? (
            <p className="velvet-public-reviews__scroll-foot velvet-text-muted">
              Scorri l&apos;elenco per leggere le altre {list.length - 5} recensioni.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
