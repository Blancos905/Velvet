import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiJson } from "../../../api/client";
import type { MeSalonSummary } from "../../../api/types";
import { useLuxuryAuth } from "../../../auth/LuxuryAuthProvider";
import { CLIENT_ACCOUNT_ICONS } from "../../../components/account/ClientAccountContentCard";
import { ClientAccountHeroHeader } from "../../../components/account/ClientAccountHeroHeader";
import { SalonLocationMapCard } from "../../../components/salon/SalonLocationMapCard";
import { useMeSalonSummaryQuery } from "../../../hooks/useMeSalonSummary";
import { CLIENT_ACCOUNT_PAGE_SHELL_CLASS } from "../../../lib/clientAccountPageShellClasses";
import "../../../styles/luxury-account-page-shell.css";
import "../../../styles/luxury-consumer-bookings-page.css";
import "../../../styles/luxury-info-privacy-hero.css";
import "../../../styles/luxury-account-salon-services.css";
import "../../../styles/luxury-salon-services-salon.css";
import "../../../styles/salon-location-map.css";
import "../../../styles/luxury-salon-location-salon.css";

export default function SalonLocationPage() {
  const { isSalonTitolare, accessToken } = useLuxuryAuth();
  const qc = useQueryClient();
  const meSalon = useMeSalonSummaryQuery();

  const [addressLine, setAddressLine] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [formMsgTone, setFormMsgTone] = useState<"ok" | "err">("ok");

  useEffect(() => {
    if (!meSalon.data) return;
    setAddressLine(meSalon.data.primaryLocationAddressLine ?? "");
    setPostalCode(meSalon.data.primaryLocationPostalCode ?? "");
    setCity(meSalon.data.primaryLocationCity ?? "");
  }, [meSalon.data]);

  const previewSalon = useMemo((): MeSalonSummary | undefined => {
    if (!meSalon.data) return undefined;
    const a = addressLine.trim();
    const p = postalCode.trim();
    const c = city.trim();
    return {
      ...meSalon.data,
      primaryLocationAddressLine: a ? a : null,
      primaryLocationPostalCode: p ? p : null,
      primaryLocationCity: c ? c : null,
    };
  }, [meSalon.data, addressLine, postalCode, city]);

  const saveM = useMutation({
    mutationFn: async () => {
      if (!meSalon.data) throw new Error("Salone non disponibile.");
      return apiJson("/api/v1/me/salon", {
        method: "PATCH",
        accessToken,
        body: JSON.stringify({
          primaryLocationName: (meSalon.data.primaryLocationName ?? "").trim(),
          primaryLocationSlug: (meSalon.data.primaryLocationSlug ?? "").trim(),
          primaryLocationCity: city.trim(),
          primaryLocationPostalCode: postalCode.trim(),
          primaryLocationAddressLine: addressLine.trim(),
        }),
      });
    },
    onSuccess: async () => {
      setFormMsgTone("ok");
      setFormMsg("Indirizzo salvato. La mappa si aggiorna con i nuovi dati.");
      await qc.invalidateQueries({ queryKey: ["me", "salon"] });
      await qc.invalidateQueries({ queryKey: ["orgs"] });
    },
    onError: (e: Error) => {
      setFormMsgTone("err");
      setFormMsg(e.message);
    },
  });

  if (!isSalonTitolare) {
    return <Navigate to="/account/prenotazioni" replace />;
  }

  const showEditor = Boolean(meSalon.data?.provisioned);

  return (
    <div
      className={`luxury-account-page-shell luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44 luxury-salon-location-account-shell luxury-salon-location-account-shell--salon-side ${CLIENT_ACCOUNT_PAGE_SHELL_CLASS}`}
    >
      <div className="luxury-consumer-bookings-dash__shell">
        <ClientAccountHeroHeader
          headlinePre="Posizione del "
          headlineAccent="salone"
          badgePrimary="Area salone"
          badgeSecondary="Sede fisica"
          kickerLabel="Indirizzo"
          kickerChip="Ricerca & mappa"
          subtitle={
            <>
              Indirizzo usato per ricerca, scheda pubblica e mappa. Nome commerciale e URL restano in{" "}
              <Link className="luxury-link-inline" to="/account/profilo">
                Profilo
              </Link>
              .
            </>
          }
          metaItems={[
            { icon: CLIENT_ACCOUNT_ICONS.calendar, label: "Ricerca geolocalizzata" },
            { icon: CLIENT_ACCOUNT_ICONS.user, label: "Scheda pubblica" },
          ]}
        />

        <div className="luxury-salon-services-page luxury-salon-services-page--salon-side luxury-salon-location-account luxury-salon-location-account--salon-side">
        {meSalon.isSuccess && meSalon.data && !meSalon.data.provisioned ? (
          <p className="luxury-alert luxury-alert--error luxury-salon-location-page__alert" role="alert">
            Nessun salone collegato all&apos;account. Quando il salone sarà attivo potrai impostare l&apos;indirizzo qui.
          </p>
        ) : null}
        {meSalon.isError ? (
          <p className="luxury-alert luxury-alert--error luxury-salon-location-page__alert" role="alert">
            Impossibile caricare il salone ({meSalon.error instanceof Error ? meSalon.error.message : "errore"}).
          </p>
        ) : null}

        {showEditor ? (
          <div className="luxury-salon-location-account__stack">
            <div className="luxury-surface-card luxury-salon-services-form-card luxury-salon-location-page__editor">
              <h2 className="luxury-card-title">Aggiorna indirizzo sede</h2>
              <p className="luxury-text-muted luxury-salon-location-page__hint">
                Modifica i campi qui sotto: l&apos;anteprima sulla mappa si aggiorna subito. Nome commerciale e URL pubblico
                restano nel{" "}
                <Link className="luxury-link-inline" to="/account/profilo">
                  Profilo
                </Link>
                .
              </p>
              <form
                className="luxury-salon-services-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  setFormMsg(null);
                  setFormMsgTone("ok");
                  saveM.mutate();
                }}
              >
                <label className="luxury-form-label">
                  Indirizzo (via e numero)
                  <input
                    className="luxury-soft-field"
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    maxLength={240}
                    autoComplete="street-address"
                    placeholder="Es. Via Roma 12"
                  />
                </label>
                <label className="luxury-form-label luxury-salon-services-form__label-tight">
                  CAP
                  <input
                    className="luxury-soft-field"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    maxLength={16}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    placeholder="40121"
                  />
                </label>
                <label className="luxury-form-label luxury-salon-services-form__label-tight">
                  Città
                  <input
                    className="luxury-soft-field"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    maxLength={120}
                    autoComplete="address-level2"
                    placeholder="Bologna"
                  />
                </label>
                {formMsg ? (
                  <p
                    className={`luxury-salon-services-form__alert luxury-alert ${formMsgTone === "err" ? "luxury-alert--error" : "luxury-alert--success"}`}
                    role={formMsgTone === "err" ? "alert" : "status"}
                    style={{ margin: 0, lineHeight: 1.5 }}
                  >
                    {formMsg}
                  </p>
                ) : null}
                <div className="luxury-salon-location-page__actions">
                  <button type="submit" className="luxury-btn luxury-btn--primary" disabled={saveM.isPending}>
                    {saveM.isPending ? "Salvataggio…" : "Salva indirizzo"}
                  </button>
                  <button
                    type="button"
                    className="luxury-btn luxury-btn--secondary"
                    disabled={saveM.isPending || !meSalon.data}
                    onClick={() => {
                      if (!meSalon.data) return;
                      setFormMsg(null);
                      setFormMsgTone("ok");
                      setAddressLine(meSalon.data.primaryLocationAddressLine ?? "");
                      setPostalCode(meSalon.data.primaryLocationPostalCode ?? "");
                      setCity(meSalon.data.primaryLocationCity ?? "");
                    }}
                  >
                    Annulla modifiche
                  </button>
                </div>
              </form>
            </div>

            <div className="luxury-salon-location-page__map-wrap">
              <SalonLocationMapCard
                meSalon={previewSalon}
                isPending={meSalon.isPending}
                heading="Anteprima sulla mappa"
              />
            </div>
          </div>
        ) : (
          <SalonLocationMapCard meSalon={meSalon.data} isPending={meSalon.isPending} heading="Google Maps" />
        )}
        </div>
      </div>
    </div>
  );
}
