import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type AdminHScrollProps = {
  children: ReactNode;
  /** Etichetta accessibile per la lane (es. «Indicatori profili»). */
  label: string;
  className?: string;
};

/**
 * Fascia orizzontale con frecce: scorre il contenuto su overflow; pulsanti si disabilitano agli estremi.
 */
export function AdminHScroll({ children, label, className = "" }: AdminHScrollProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const refresh = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 6);
    setCanNext(max > 6 && el.scrollLeft < max - 6);
  }, []);

  useEffect(() => {
    refresh();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", refresh, { passive: true });
    const ro = new ResizeObserver(() => refresh());
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", refresh);
      ro.disconnect();
    };
  }, [refresh, children]);

  const stride = () => {
    const w = trackRef.current?.clientWidth ?? 320;
    return Math.max(200, Math.floor(w * 0.72));
  };

  const go = (dir: -1 | 1) => {
    trackRef.current?.scrollBy({ left: dir * stride(), behavior: "smooth" });
  };

  return (
    <div className={`luxury-admin-hscroll ${className}`.trim()} role="group" aria-label={label}>
      <button
        type="button"
        className="luxury-admin-hscroll__fab luxury-admin-hscroll__fab--prev"
        aria-label={`Scorri a sinistra: ${label}`}
        disabled={!canPrev}
        onClick={() => go(-1)}
      />
      <div ref={trackRef} className="luxury-admin-hscroll__track">
        {children}
      </div>
      <button
        type="button"
        className="luxury-admin-hscroll__fab luxury-admin-hscroll__fab--next"
        aria-label={`Scorri a destra: ${label}`}
        disabled={!canNext}
        onClick={() => go(1)}
      />
    </div>
  );
}
