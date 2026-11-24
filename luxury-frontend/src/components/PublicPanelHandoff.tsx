import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import { useLuxuryT } from "../i18n/useLuxuryLocale";
import { readSurfaceLocation, urlForSurface, type PanelHandoffKind } from "../lib/luxurySurfaces";
import "../styles/luxury-panel-handoff.css";

function searchHomeUrl(): string {
  return urlForSurface("public", "/", "", "", readSurfaceLocation());
}

/** Avviso: il profilo salone, dipendente o super admin non resta sulla home clienti. */
export function PublicPanelHandoff({
  href,
  kind,
}: {
  href: string;
  kind: PanelHandoffKind;
}) {
  const t = useLuxuryT();
  const { signOutForAccountSwitch, releasePublicSurfaceAfterPanelOpen } = useLuxuryAuth();
  const titleId = useId();
  const title =
    kind === "admin"
      ? t("auth.panelNotice.adminTitle")
      : kind === "staff"
        ? t("auth.panelNotice.staffTitle")
        : t("auth.panelNotice.salonTitle");
  const body =
    kind === "admin"
      ? t("auth.panelNotice.adminBody")
      : kind === "staff"
        ? t("auth.panelNotice.staffBody")
        : t("auth.panelNotice.salonBody");

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div className="luxury-panel-handoff" role="presentation">
      <div className="luxury-panel-handoff__card" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <p className="luxury-panel-handoff__eyebrow">{t("auth.panelNotice.eyebrow")}</p>
        <h2 id={titleId} className="luxury-panel-handoff__title">
          {title}
        </h2>
        <div className="luxury-panel-handoff__sheet">
          <p className="luxury-panel-handoff__body">{body}</p>
          <div className="luxury-panel-handoff__actions">
            <button
              type="button"
              className="luxury-panel-handoff__go"
              onClick={() => {
                window.open(href, "_blank", "noopener,noreferrer");
                releasePublicSurfaceAfterPanelOpen();
                window.location.replace(searchHomeUrl());
              }}
            >
              {t("auth.panelNotice.goProfile")}
            </button>
            <button
              type="button"
              className="luxury-panel-handoff__exit"
              onClick={() => {
                void (async () => {
                  try {
                    await signOutForAccountSwitch();
                  } finally {
                    window.location.replace(searchHomeUrl());
                  }
                })();
              }}
            >
              {t("auth.panelNotice.exit")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
