import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { downloadMeDataExport } from "../../api/meDataExport";
import { apiFetch, apiJson } from "../../api/client";
import { fetchBillingStatus, openBillingPortal, openCancelSubscriptionPortal } from "../../api/billing";
import { isNativePremiumBillingBlocked } from "../../lib/nativePremiumUpgradePolicy";
import type { MeStaffOperatorSelf, ProfileDto } from "../../api/types";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";
import { SalonBillingProfileEditor } from "../../components/SalonBillingProfileEditor";
import { VelvetPremiumSubscriptionCancellationNoticeBox } from "../../components/VelvetPremiumSubscriptionCancellationNoticeBox";
import { VelvetPremiumSubscriptionCancellationThankYouModal } from "../../components/VelvetPremiumSubscriptionCancellationThankYouModal";
import { LEGAL_CONTACT_EMAIL } from "../../content/legalReferences";
import { SALON_CLIENT_GENDER_OPTIONS } from "../../data/salonClientGenders";
import { parseSalonPlanTier, planDisplayName } from "../../data/salonPlans";
import { SUBSCRIPTION_CANCEL_RETURN_STORAGE_KEY } from "../../lib/subscriptionCancelReturn";
import { useMeProfileQuery } from "../../hooks/useMeProfile";
import { useMeSalonSummaryQuery } from "../../hooks/useMeSalonSummary";
import { DEFAULT_IT_PHONE_PREFIX, phoneForProfilePatchApi } from "../../lib/itPhoneDefaults";
import { readImageFileAsStaffPhotoDataUrl } from "../../lib/readImageDataUrl";
import { staffFallbackAvatar } from "../../lib/salonStaffAvatar";
import "../../styles/luxury-consumer-bookings-page.css";
import "../../styles/luxury-account-page-shell.css";
import "../../styles/luxury-profile-page.css";
import "../../styles/luxury-plans.css";

function PasswordRevealIcon({ revealed }: { revealed: boolean }) {
  if (revealed) {
    return (
      <svg className="luxury-profile-password-toggle__icon" viewBox="0 0 24 24" width={20} height={20} aria-hidden>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"
        />
        <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className="luxury-profile-password-toggle__icon" viewBox="0 0 24 24" width={20} height={20} aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function ProfilePage() {
  const { accessToken, signOut, isSalonTitolare, isSalonStaff, isVelvetSuperAdmin } = useVelvetAuth();
  const canSelfDeleteAccount = isSalonTitolare || (!isSalonStaff && !isVelvetSuperAdmin);
  const qc = useQueryClient();
  const meSalon = useMeSalonSummaryQuery();
  const billingStatus = useQuery({
    queryKey: ["me", "billing", "status", accessToken],
    queryFn: () => fetchBillingStatus(accessToken),
    enabled: Boolean(isSalonTitolare && accessToken),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const [portalBusy, setPortalBusy] = useState(false);
  const [cancelSubscriptionBusy, setCancelSubscriptionBusy] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [cancelThankYouOpen, setCancelThankYouOpen] = useState(false);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [salonMsg, setSalonMsg] = useState<string | null>(null);
  const [salonAudienceMsg, setSalonAudienceMsg] = useState<string | null>(null);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const pwdFieldBaseId = useId();
  const [salonName, setSalonName] = useState("");
  const [salonSlug, setSalonSlug] = useState("");
  const [salonCity, setSalonCity] = useState("");
  const [salonPostalCode, setSalonPostalCode] = useState("");
  const [salonAddressLine, setSalonAddressLine] = useState("");
  const [salonClientGenders, setSalonClientGenders] = useState<Set<string>>(() => new Set());
  const salonClientGendersLegendId = useId();
  const [staffPhotoMsg, setStaffPhotoMsg] = useState<string | null>(null);
  const [staffPhotoDraft, setStaffPhotoDraft] = useState<string | null>(null);
  const [staffPhotoRemovePending, setStaffPhotoRemovePending] = useState(false);
  const staffPhotoSuccessTimeoutRef = useRef<number | null>(null);
  const cancelReturnHandledRef = useRef(false);

  const q = useMeProfileQuery();

  useEffect(() => {
    if (isSalonTitolare && accessToken) {
      void billingStatus.refetch();
    }
    // Al ritorno da Stripe Customer Portal (disdetta) aggiorna lo stato abbonamento.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch solo al mount profilo titolare
  }, [isSalonTitolare, accessToken]);

  useEffect(() => {
    if (cancelReturnHandledRef.current) {
      return;
    }
    const pendingThankYou = sessionStorage.getItem(SUBSCRIPTION_CANCEL_RETURN_STORAGE_KEY) === "1";
    const fromQuery = searchParams.get("subscription_cancel_confirmed") === "1";
    if (!pendingThankYou && !fromQuery) {
      return;
    }
    cancelReturnHandledRef.current = true;

    void billingStatus.refetch().then((result) => {
      sessionStorage.removeItem(SUBSCRIPTION_CANCEL_RETURN_STORAGE_KEY);
      if (fromQuery) {
        const next = new URLSearchParams(searchParams);
        next.delete("subscription_cancel_confirmed");
        setSearchParams(next, { replace: true });
      }
      const cancelled = Boolean(
        result.data?.cancelAtPeriodEnd || result.data?.subscriptionCancelRequestedAt,
      );
      if (cancelled) {
        setCancelThankYouOpen(true);
        void qc.invalidateQueries({ queryKey: ["me", "billing"] });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gestione unica al ritorno da Stripe disdetta
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!q.data) return;
    setEmail(q.data.email ?? "");
    setDisplayName(q.data.displayName ?? "");
    setPhone(q.data.phone?.trim() ? q.data.phone : DEFAULT_IT_PHONE_PREFIX);
  }, [q.data]);

  useEffect(() => {
    if (!meSalon.data) return;
    setSalonName(meSalon.data.primaryLocationName ?? "");
    setSalonSlug(meSalon.data.primaryLocationSlug ?? "");
    setSalonCity(meSalon.data.primaryLocationCity ?? "");
    setSalonPostalCode(meSalon.data.primaryLocationPostalCode ?? "");
    setSalonAddressLine(meSalon.data.primaryLocationAddressLine ?? "");
    setSalonClientGenders(new Set(meSalon.data.primaryLocationSalonClientGenders ?? []));
  }, [meSalon.data]);

  useEffect(() => {
    return () => {
      if (staffPhotoSuccessTimeoutRef.current !== null) {
        window.clearTimeout(staffPhotoSuccessTimeoutRef.current);
        staffPhotoSuccessTimeoutRef.current = null;
      }
    };
  }, []);

  const saveM = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = {};
      if (email.trim()) body.email = email.trim().toLowerCase();
      if (displayName.trim()) body.displayName = displayName.trim();
      body.phone = phoneForProfilePatchApi(phone);
      return apiJson<ProfileDto>("/api/v1/me/profile", {
        method: "PATCH",
        accessToken,
        body: JSON.stringify(body),
      });
    },
    onSuccess: async () => {
      setMsg("Profilo aggiornato.");
      await qc.invalidateQueries({ queryKey: ["me", "profile"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const staffOperatorQ = useQuery({
    queryKey: ["me", "staff", "operator-profile"],
    queryFn: () => apiJson<MeStaffOperatorSelf>("/api/v1/me/staff/operator-profile", { accessToken }),
    enabled: Boolean(accessToken && isSalonStaff),
  });

  const staffPhotoM = useMutation({
    mutationFn: (photoDataUrl: string | null) =>
      apiJson<MeStaffOperatorSelf>("/api/v1/me/staff/operator-profile", {
        method: "PATCH",
        accessToken,
        body: JSON.stringify({ photoDataUrl: photoDataUrl ?? "" }),
      }),
    onSuccess: async () => {
      setStaffPhotoDraft(null);
      setStaffPhotoRemovePending(false);
      setStaffPhotoMsg("Foto aggiornata.");
      if (staffPhotoSuccessTimeoutRef.current !== null) {
        window.clearTimeout(staffPhotoSuccessTimeoutRef.current);
      }
      staffPhotoSuccessTimeoutRef.current = window.setTimeout(() => {
        staffPhotoSuccessTimeoutRef.current = null;
        setStaffPhotoMsg((m) => (m === "Foto aggiornata." ? null : m));
      }, 3000);
      await qc.invalidateQueries({ queryKey: ["me", "staff", "operator-profile"] });
      await qc.invalidateQueries({ queryKey: ["me", "salon", "staff"] });
    },
    onError: (e: Error) => {
      if (staffPhotoSuccessTimeoutRef.current !== null) {
        window.clearTimeout(staffPhotoSuccessTimeoutRef.current);
        staffPhotoSuccessTimeoutRef.current = null;
      }
      setStaffPhotoMsg(e.message);
    },
  });

  const pwdM = useMutation({
    mutationFn: async () =>
      apiJson<void>("/api/v1/me/profile/password", {
        method: "POST",
        accessToken,
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      }),
    onSuccess: () => {
      setPwdMsg("Password aggiornata.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPwd(false);
      setShowNewPwd(false);
      setShowConfirmPwd(false);
    },
    onError: (e: Error) => setPwdMsg(e.message),
  });

  const deleteM = useMutation({
    mutationFn: async () => {
      const r = await apiFetch("/api/v1/me/account", { method: "DELETE", accessToken });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || r.statusText);
      }
    },
    onSuccess: async () => {
      setDeleteArmed(false);
      await qc.cancelQueries({ queryKey: ["me"] });
      await signOut();
    },
    onError: (e: Error) => {
      setDeleteArmed(false);
      setMsg(e.message);
    },
  });

  const saveSalonM = useMutation({
    mutationFn: async () =>
      apiJson("/api/v1/me/salon", {
        method: "PATCH",
        accessToken,
        body: JSON.stringify({
          primaryLocationName: salonName.trim(),
          primaryLocationSlug: salonSlug.trim(),
          primaryLocationCity: salonCity.trim(),
          primaryLocationPostalCode: salonPostalCode.trim(),
          primaryLocationAddressLine: salonAddressLine.trim(),
        }),
      }),
    onSuccess: async () => {
      setSalonMsg("Dati salone aggiornati.");
      await qc.invalidateQueries({ queryKey: ["me", "salon"] });
      await qc.invalidateQueries({ queryKey: ["orgs"] });
    },
    onError: (e: Error) => setSalonMsg(e.message),
  });

  const saveSalonAudienceM = useMutation({
    mutationFn: async () =>
      apiJson("/api/v1/me/salon", {
        method: "PATCH",
        accessToken,
        body: JSON.stringify({
          primaryLocationName: salonName.trim(),
          primaryLocationSlug: salonSlug.trim(),
          primaryLocationCity: salonCity.trim(),
          primaryLocationPostalCode: salonPostalCode.trim(),
          primaryLocationAddressLine: salonAddressLine.trim(),
          primaryLocationSalonClientGenders: [...salonClientGenders].sort(),
        }),
      }),
    onSuccess: async () => {
      setSalonAudienceMsg("Pubblico del salone aggiornato.");
      await qc.invalidateQueries({ queryKey: ["me", "salon"] });
      await qc.invalidateQueries({ queryKey: ["orgs"] });
    },
    onError: (e: Error) => setSalonAudienceMsg(e.message),
  });

  if (q.isLoading) {
    return (
      <div className="luxury-profile-page luxury-profile-page--shell">
        <div className="luxury-profile-page__loading" aria-busy="true" aria-live="polite">
          <span className="luxury-profile-page__loading-dot" aria-hidden />
          <span className="luxury-profile-page__loading-text">Caricamento profilo…</span>
        </div>
      </div>
    );
  }
  if (q.error) {
    return (
      <div className="luxury-profile-page luxury-profile-page--shell">
        <p className="luxury-profile-page__error luxury-alert luxury-alert--error" role="alert">
          {q.error instanceof Error ? q.error.message : "Errore"}
        </p>
      </div>
    );
  }
  if (!q.data) {
    return null;
  }

  const salonPlanTier = parseSalonPlanTier(meSalon.data?.planTier);
  const salonPlan = salonPlanTier ? planDisplayName(salonPlanTier) : "—";
  const salonRequiresClientGenders = salonPlanTier === "BASE" || salonPlanTier === "PREMIUM";
  const showBillingProfileSection = isSalonTitolare && salonPlanTier === "PREMIUM";
  const showCancelSubscription =
    isSalonTitolare &&
    !isNativePremiumBillingBlocked() &&
    Boolean(billingStatus.data?.configured && billingStatus.data.premiumAccess && !billingStatus.data.cancelAtPeriodEnd);
  const showReactivateSubscription =
    isSalonTitolare &&
    !isNativePremiumBillingBlocked() &&
    Boolean(
      billingStatus.data?.configured &&
        (billingStatus.data.cancelAtPeriodEnd ||
          (billingStatus.data.subscriptionCancelRequestedAt && !billingStatus.data.premiumAccess)),
    );
  const showSubscriptionCancellationNotice = showReactivateSubscription;
  const publicSalonUrl = salonSlug.trim() ? `/s/${encodeURIComponent(salonSlug.trim())}` : "";

  const handleOpenBillingPortal = () => {
    if (!accessToken) return;
    setMsg(null);
    setPortalBusy(true);
    void openBillingPortal(accessToken)
      .catch(() => {
        setMsg("Impossibile aprire il portale Stripe per riattivare l'abbonamento.");
      })
      .finally(() => setPortalBusy(false));
  };

  const handleOpenCancelSubscriptionPortal = () => {
    if (!accessToken) return;
    setMsg(null);
    setCancelSubscriptionBusy(true);
    void openCancelSubscriptionPortal(accessToken)
      .catch((err: unknown) => {
        sessionStorage.removeItem(SUBSCRIPTION_CANCEL_RETURN_STORAGE_KEY);
        setMsg(
          err instanceof Error
            ? err.message
            : "Impossibile aprire la pagina di disdetta abbonamento su Stripe.",
        );
      })
      .finally(() => setCancelSubscriptionBusy(false));
  };

  return (
    <div className="luxury-profile-page luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44">
      <VelvetPremiumSubscriptionCancellationThankYouModal
        open={cancelThankYouOpen}
        premiumAccessUntil={billingStatus.data?.currentPeriodEnd ?? null}
        accountDeletionScheduledAt={billingStatus.data?.accountDeletionScheduledAt ?? null}
        onClose={() => setCancelThankYouOpen(false)}
      />
      <div className="luxury-consumer-bookings-dash__shell">
      {isVelvetSuperAdmin ? (
        <aside className="luxury-profile-page__super-admin-callout" aria-label="Informazioni super admin">
          <p className="luxury-profile-page__super-admin-callout-title">Stai usando un account super admin</p>
          <p className="luxury-profile-page__super-admin-callout-body">
            Qui aggiorni <strong>email</strong>, <strong>nome</strong>, <strong>telefono</strong> e{" "}
            <strong>password</strong> di accesso. Per vedere iscritti, saloni e metriche apri il{" "}
            <Link className="luxury-link-inline" to="/admin/dashboard">
              pannello di gestione
            </Link>
            .
          </p>
        </aside>
      ) : null}
      <header className="luxury-consumer-bookings-dash__header--hero">
        <div className="luxury-consumer-bookings-dash__hero-glow" aria-hidden />
        <div className="luxury-consumer-bookings-dash__title-row">
          <h1 className="luxury-consumer-bookings-dash__headline">
            <span className="luxury-consumer-bookings-dash__headline-pre">
              {isVelvetSuperAdmin ? "Super admin " : "Il mio "}
            </span>
            <span className="luxury-consumer-bookings-dash__headline-accent">
              {isVelvetSuperAdmin ? "profilo" : isSalonTitolare ? "account titolare" : "profilo"}
            </span>
          </h1>
          {isVelvetSuperAdmin ? (
            <p className="luxury-page-subtitle" style={{ margin: 0 }}>
              Credenziali, telefono e password dell’account amministratore.
            </p>
          ) : null}
        </div>
        {isSalonTitolare ? (
          <div className="luxury-account-page-shell__hero-aside">
            <div className="luxury-profile-page__plan-pill" aria-label="Piano salone">
              Piano {salonPlan}
            </div>
            {salonPlanTier === "PREMIUM" ? (
              <Link
                to="/account/info-privacy"
                className="luxury-profile-page__privacy-card"
                title="Informativa sul trattamento dati per saloni Premium"
              >
                <span className="luxury-profile-page__privacy-card-label">Privacy</span>
                <span className="luxury-profile-page__privacy-card-value">Info e privacy</span>
              </Link>
            ) : null}
            {isSalonTitolare && billingStatus.data?.configured && !isNativePremiumBillingBlocked() ? (
              <button
                type="button"
                className="luxury-profile-page__privacy-card"
                disabled={portalBusy}
                onClick={handleOpenBillingPortal}
              >
                <span className="luxury-profile-page__privacy-card-label">
                  {showReactivateSubscription ? "Abbonamento" : "Fatturazione"}
                </span>
                <span className="luxury-profile-page__privacy-card-value">
                  {portalBusy
                    ? "Apertura…"
                    : showReactivateSubscription
                      ? "Riattiva abbonamento"
                      : "Pagamenti e fatture"}
                </span>
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      {showSubscriptionCancellationNotice ? (
        <VelvetPremiumSubscriptionCancellationNoticeBox
          premiumAccessUntil={billingStatus.data?.currentPeriodEnd ?? null}
          accountDeletionScheduledAt={billingStatus.data?.accountDeletionScheduledAt ?? null}
          reactivateBusy={portalBusy}
          onReactivate={accessToken && !isNativePremiumBillingBlocked() ? handleOpenBillingPortal : undefined}
        />
      ) : null}

      <section className="luxury-profile-grid" aria-label="Dati profilo e salone">
        <article className="luxury-profile-card luxury-profile-card--account">
          <div className="luxury-profile-insert-panel">
            <h2 className="luxury-section-title luxury-profile-card__title">Dati account</h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setMsg(null);
                saveM.mutate();
              }}
              className="luxury-profile-form luxury-profile-form--account"
            >
              <label className="luxury-form-label">
                Email registrazione
                <input
                  className="luxury-soft-field"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={320}
                  required
                />
              </label>
              <label className="luxury-form-label">
                Nome visualizzato
                <input className="luxury-soft-field" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </label>
              <label className="luxury-form-label">
                Telefono
                <input className="luxury-soft-field" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
              <button type="submit" className="luxury-btn luxury-btn--primary luxury-profile-form__submit" disabled={saveM.isPending}>
                Salva
              </button>
            </form>
          </div>

          {msg && (
            <p className={`luxury-alert ${msg.includes("aggiornato") ? "luxury-alert--success" : "luxury-alert--error"}`} role="status">
              {msg}
            </p>
          )}

          {isSalonStaff ? (
            <div className="luxury-profile-insert-panel" style={{ marginTop: "1.1rem" }}>
              <h3 className="luxury-profile-password__title">Foto in agenda</h3>
              <p className="luxury-text-muted" style={{ margin: "0 0 0.85rem", lineHeight: 1.55 }}>
                Scegli una foto, verifica l&apos;anteprima e premi <strong>Salva</strong>: comparirà nell&apos;agenda e nel team
                del salone.
              </p>
              {staffOperatorQ.isLoading ? (
                <p className="luxury-text-muted" style={{ margin: 0 }}>
                  Caricamento profilo operatore…
                </p>
              ) : null}
              {staffOperatorQ.error ? (
                <p className="luxury-alert luxury-alert--error" role="alert" style={{ margin: "0 0 0.75rem" }}>
                  {staffOperatorQ.error instanceof Error ? staffOperatorQ.error.message : "Profilo operatore non disponibile."}
                </p>
              ) : null}
              {staffOperatorQ.data ? (
                (() => {
                  const op = staffOperatorQ.data;
                  const serverPhoto = op.photoDataUrl?.trim() || null;
                  const fb = staffFallbackAvatar(op.firstName, op.lastName);
                  const previewSrc = staffPhotoRemovePending ? fb : staffPhotoDraft ?? (serverPhoto || fb);
                  const staffPhotoDirty = staffPhotoDraft !== null || staffPhotoRemovePending;
                  return (
                    <div className="luxury-profile-staff-photo">
                      <div className="luxury-profile-staff-photo__preview-wrap">
                        <img className="luxury-profile-staff-photo__preview" src={previewSrc} alt="" />
                      </div>
                      <div className="luxury-profile-staff-photo__actions">
                        <label className="luxury-btn luxury-btn--secondary">
                          <input
                            type="file"
                            accept="image/*"
                            className="luxury-profile-hidden-file"
                            disabled={staffPhotoM.isPending}
                            onChange={(e) => {
                              const f = e.target.files?.[0] ?? null;
                              e.target.value = "";
                              if (!f) return;
                              setStaffPhotoMsg(null);
                              setStaffPhotoRemovePending(false);
                              void (async () => {
                                try {
                                  const dataUrl = await readImageFileAsStaffPhotoDataUrl(f);
                                  setStaffPhotoDraft(dataUrl);
                                } catch (err) {
                                  setStaffPhotoMsg(err instanceof Error ? err.message : "Caricamento non riuscito.");
                                }
                              })();
                            }}
                          />
                          Scegli foto…
                        </label>
                        {serverPhoto && !staffPhotoDraft && !staffPhotoRemovePending ? (
                          <button
                            type="button"
                            className="luxury-btn luxury-btn--secondary"
                            disabled={staffPhotoM.isPending}
                            onClick={() => {
                              setStaffPhotoMsg(null);
                              setStaffPhotoRemovePending(true);
                            }}
                          >
                            Rimuovi foto
                          </button>
                        ) : null}
                        {staffPhotoDraft !== null ? (
                          <button
                            type="button"
                            className="luxury-btn luxury-btn--secondary"
                            disabled={staffPhotoM.isPending}
                            onClick={() => {
                              setStaffPhotoMsg(null);
                              setStaffPhotoDraft(null);
                            }}
                          >
                            Scarta nuova foto
                          </button>
                        ) : null}
                        {staffPhotoRemovePending ? (
                          <button
                            type="button"
                            className="luxury-btn luxury-btn--secondary"
                            disabled={staffPhotoM.isPending}
                            onClick={() => {
                              setStaffPhotoMsg(null);
                              setStaffPhotoRemovePending(false);
                            }}
                          >
                            Annulla rimozione
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="luxury-btn luxury-btn--primary"
                          disabled={!staffPhotoDirty || staffPhotoM.isPending}
                          onClick={() => {
                            setStaffPhotoMsg(null);
                            if (staffPhotoRemovePending) {
                              staffPhotoM.mutate("");
                            } else if (staffPhotoDraft !== null) {
                              staffPhotoM.mutate(staffPhotoDraft);
                            }
                          }}
                        >
                          {staffPhotoM.isPending ? "Salvataggio…" : "Salva"}
                        </button>
                        {staffPhotoDirty ? (
                          <button
                            type="button"
                            className="luxury-btn luxury-btn--secondary"
                            disabled={staffPhotoM.isPending}
                            onClick={() => {
                              setStaffPhotoMsg(null);
                              setStaffPhotoDraft(null);
                              setStaffPhotoRemovePending(false);
                            }}
                          >
                            Annulla
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })()
              ) : null}
              {staffPhotoMsg ? (
                <p
                  className={`luxury-alert ${staffPhotoMsg.includes("aggiornata") ? "luxury-alert--success" : "luxury-alert--error"}`}
                  role={staffPhotoMsg.includes("aggiornata") ? "status" : "alert"}
                  style={{ margin: "0.75rem 0 0" }}
                >
                  {staffPhotoMsg}
                </p>
              ) : null}
            </div>
          ) : null}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPwdMsg(null);
              if (newPassword !== confirmPassword) {
                setPwdMsg("Le nuove password non coincidono.");
                return;
              }
              pwdM.mutate();
            }}
            className="luxury-profile-form luxury-profile-form--password"
          >
            <h3 className="luxury-profile-password__title">Cambio password</h3>
            <div className="luxury-profile-password-recovery">
              <div className="luxury-profile-password-recovery__row">
                <Link
                  className="luxury-link-inline"
                  to={`/reimposta-password${email.trim() ? `?email=${encodeURIComponent(email.trim().toLowerCase())}` : ""}`}
                >
                  Apri pagina recupero
                </Link>
              </div>
            </div>
            <label className="luxury-form-label" htmlFor={`${pwdFieldBaseId}-current`}>
              Password attuale
              <div className="luxury-profile-password-field__wrap">
                <input
                  id={`${pwdFieldBaseId}-current`}
                  className="luxury-soft-field luxury-profile-password-input"
                  type={showCurrentPwd ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  maxLength={200}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="luxury-profile-password-toggle"
                  aria-pressed={showCurrentPwd}
                  aria-label={showCurrentPwd ? "Nascondi password attuale" : "Mostra password attuale"}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowCurrentPwd((v) => !v)}
                >
                  <PasswordRevealIcon revealed={showCurrentPwd} />
                </button>
              </div>
            </label>
            <label className="luxury-form-label" htmlFor={`${pwdFieldBaseId}-new`}>
              Nuova password
              <div className="luxury-profile-password-field__wrap">
                <input
                  id={`${pwdFieldBaseId}-new`}
                  className="luxury-soft-field luxury-profile-password-input"
                  type={showNewPwd ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  maxLength={200}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="luxury-profile-password-toggle"
                  aria-pressed={showNewPwd}
                  aria-label={showNewPwd ? "Nascondi nuova password" : "Mostra nuova password"}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowNewPwd((v) => !v)}
                >
                  <PasswordRevealIcon revealed={showNewPwd} />
                </button>
              </div>
            </label>
            <label className="luxury-form-label" htmlFor={`${pwdFieldBaseId}-confirm`}>
              Conferma nuova password
              <div className="luxury-profile-password-field__wrap">
                <input
                  id={`${pwdFieldBaseId}-confirm`}
                  className="luxury-soft-field luxury-profile-password-input"
                  type={showConfirmPwd ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  maxLength={200}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="luxury-profile-password-toggle"
                  aria-pressed={showConfirmPwd}
                  aria-label={showConfirmPwd ? "Nascondi conferma password" : "Mostra conferma password"}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowConfirmPwd((v) => !v)}
                >
                  <PasswordRevealIcon revealed={showConfirmPwd} />
                </button>
              </div>
            </label>
            <button type="submit" className="luxury-btn luxury-btn--primary luxury-profile-form__submit" disabled={pwdM.isPending}>
              {pwdM.isPending ? "Salvataggio..." : "Aggiorna password"}
            </button>
          </form>

          {pwdMsg && (
            <p className={`luxury-alert ${pwdMsg.includes("aggiornata") ? "luxury-alert--success" : "luxury-alert--error"}`} role="status">
              {pwdMsg}
            </p>
          )}
        </article>

        {isSalonTitolare ? (
          <article className="luxury-profile-card luxury-profile-card--salon">
            <div className="luxury-profile-insert-panel">
              <h2 className="luxury-section-title luxury-profile-card__title">Dati salone</h2>
              {meSalon.isLoading ? (
                <p className="luxury-profile-page__salon-loading luxury-text-muted">Caricamento dati salone…</p>
              ) : meSalon.error ? (
                <p className="luxury-alert luxury-alert--error" role="alert">
                  {meSalon.error instanceof Error ? meSalon.error.message : "Errore caricamento salone"}
                </p>
              ) : (
                <>
                  <form
                    id="luxury-profile-salon-data-form"
                    className="luxury-profile-salon-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setSalonMsg(null);
                      saveSalonM.mutate();
                    }}
                  >
                    <label className="luxury-form-label">
                      Nome salone
                      <input
                        className="luxury-soft-field"
                        value={salonName}
                        onChange={(e) => setSalonName(e.target.value)}
                        maxLength={200}
                        required
                      />
                    </label>
                    <label className="luxury-form-label">
                      Slug pubblico
                      <input
                        className="luxury-soft-field"
                        value={salonSlug}
                        onChange={(e) => setSalonSlug(e.target.value)}
                        maxLength={120}
                        required
                      />
                    </label>
                    <label className="luxury-form-label">
                      Città
                      <input className="luxury-soft-field" value={salonCity} onChange={(e) => setSalonCity(e.target.value)} maxLength={120} />
                    </label>
                    <label className="luxury-form-label">
                      CAP
                      <input
                        className="luxury-soft-field"
                        value={salonPostalCode}
                        onChange={(e) => setSalonPostalCode(e.target.value)}
                        maxLength={20}
                      />
                    </label>
                    <label className="luxury-form-label">
                      Indirizzo
                      <input
                        className="luxury-soft-field"
                        value={salonAddressLine}
                        onChange={(e) => setSalonAddressLine(e.target.value)}
                        maxLength={500}
                      />
                    </label>
                  </form>
                  <div className="luxury-profile-salon-static-row">
                    <span className="luxury-profile-salon-static-label">Piano</span>
                    <strong className="luxury-profile-salon-static-value">{salonPlan}</strong>
                  </div>
                  <div className="luxury-profile-salon-static-row">
                    <span className="luxury-profile-salon-static-label">Vetrina pubblica</span>
                    {publicSalonUrl ? (
                      <Link to={publicSalonUrl} className="luxury-profile-page__public-link">
                        Apri pagina pubblica
                      </Link>
                    ) : (
                      <span className="luxury-text-muted">—</span>
                    )}
                  </div>
                  <button
                    type="submit"
                    form="luxury-profile-salon-data-form"
                    className="luxury-btn luxury-btn--primary luxury-profile-form__submit"
                    disabled={saveSalonM.isPending}
                  >
                    {saveSalonM.isPending ? "Salvataggio..." : "Salva"}
                  </button>
                  {salonRequiresClientGenders ? (
                    <form
                      id="luxury-profile-salon-audience-form"
                      className="luxury-profile-salon-audience-panel"
                      aria-labelledby={salonClientGendersLegendId}
                      onSubmit={(e) => {
                        e.preventDefault();
                        setSalonAudienceMsg(null);
                        if (salonClientGenders.size === 0) {
                          setSalonAudienceMsg(
                            "Seleziona almeno un pubblico di riferimento: maschile e/o femminile. Puoi indicare entrambi se il salone serve clienti uomo e donna.",
                          );
                          return;
                        }
                        saveSalonAudienceM.mutate();
                      }}
                    >
                      <h3 id={salonClientGendersLegendId} className="luxury-profile-salon-audience-panel__title">
                        Per chi è il salone?
                      </h3>
                      <div
                        className="luxury-profile-salon-audience-panel__chips luxury-plans-salon-types__chips"
                        role="group"
                        aria-label="Pubblico di riferimento del salone"
                      >
                        {SALON_CLIENT_GENDER_OPTIONS.map((opt) => {
                          const selected = salonClientGenders.has(opt.id);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              className={`luxury-plans-salon-type-chip${selected ? " luxury-plans-salon-type-chip--selected" : ""}`}
                              aria-pressed={selected}
                              disabled={saveSalonAudienceM.isPending}
                              onClick={() => {
                                setSalonClientGenders((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(opt.id)) next.delete(opt.id);
                                  else next.add(opt.id);
                                  return next;
                                });
                              }}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="submit"
                        className="luxury-btn luxury-btn--primary luxury-profile-salon-audience-panel__submit"
                        disabled={saveSalonAudienceM.isPending}
                      >
                        {saveSalonAudienceM.isPending ? "Salvataggio..." : "Salva"}
                      </button>
                      {salonAudienceMsg ? (
                        <p
                          className={`luxury-alert ${salonAudienceMsg.includes("aggiornato") ? "luxury-alert--success" : "luxury-alert--error"}`}
                          role="status"
                        >
                          {salonAudienceMsg}
                        </p>
                      ) : null}
                    </form>
                  ) : null}
                </>
              )}
            </div>

            {salonMsg ? (
              <p className={`luxury-alert ${salonMsg.includes("aggiornati") ? "luxury-alert--success" : "luxury-alert--error"}`} role="status">
                {salonMsg}
              </p>
            ) : null}
          </article>
        ) : null}

        {showBillingProfileSection ? (
          <article className="luxury-profile-card luxury-profile-card--account luxury-profile-card--billing-wide">
            <div className="luxury-profile-insert-panel">
              <h2 className="luxury-section-title luxury-profile-card__title">Dati fatturazione</h2>
              <SalonBillingProfileEditor accessToken={accessToken} context="profile" />
            </div>
          </article>
        ) : null}
      </section>

      <section className="luxury-profile-close" aria-labelledby="luxury-profile-data-export-title">
        <h2 id="luxury-profile-data-export-title" className="luxury-section-title luxury-profile-card__title">
          I tuoi dati
        </h2>
        <p className="luxury-text-muted">
          Scarica una copia dei dati del tuo account in formato JSON (diritto alla portabilità, art. 20 GDPR).
        </p>
        {exportMsg ? (
          <p className="luxury-alert luxury-alert--success" role="status">
            {exportMsg}
          </p>
        ) : null}
        <button
          type="button"
          className="luxury-btn luxury-btn--secondary"
          disabled={exportBusy || !accessToken}
          onClick={() => {
            if (!accessToken) return;
            setExportMsg(null);
            setExportBusy(true);
            void downloadMeDataExport(accessToken)
              .then(() => setExportMsg("Export scaricato."))
              .catch((err: unknown) =>
                setExportMsg(err instanceof Error ? err.message : "Impossibile scaricare l'export."),
              )
              .finally(() => setExportBusy(false));
          }}
        >
          {exportBusy ? "Preparazione export…" : "Scarica export JSON"}
        </button>
      </section>

      <section className="luxury-profile-close">
        <h2 className="luxury-section-title luxury-profile-card__title">Chiudi account</h2>
        {showReactivateSubscription ? (
          <>
            <p className="luxury-text-muted">
              L&apos;abbonamento Premium è in disdetta. Puoi riattivarlo in qualsiasi momento prima della scadenza
              dal portale Stripe.
            </p>
            <button
              type="button"
              className="luxury-btn luxury-btn--primary luxury-profile-close__reactivate-subscription-btn"
              disabled={portalBusy || !accessToken}
              onClick={handleOpenBillingPortal}
            >
              {portalBusy ? "Apertura Stripe…" : "Riattiva abbonamento"}
            </button>
          </>
        ) : null}
        {showCancelSubscription ? (
          <>
            <p className="luxury-text-muted">
              Puoi disdire l&apos;abbonamento Premium in qualsiasi momento. Verrai reindirizzato su Stripe per confermare
              la disdetta; riceverai anche un&apos;email di conferma.
            </p>
            <button
              type="button"
              className="luxury-btn luxury-btn--secondary luxury-profile-close__cancel-subscription-btn"
              disabled={cancelSubscriptionBusy || !accessToken}
              onClick={handleOpenCancelSubscriptionPortal}
            >
              {cancelSubscriptionBusy ? "Apertura Stripe…" : "Disdici abbonamento"}
            </button>
          </>
        ) : null}
        {canSelfDeleteAccount ? (
          <>
            <p
              className={
                showCancelSubscription || showReactivateSubscription
                  ? "luxury-text-muted luxury-profile-close__delete-intro"
                  : "luxury-text-muted"
              }
            >
              L&apos;account verrà disattivato; i dati identificativi del profilo saranno anonimizzati secondo l&apos;informativa
              privacy.
            </p>
            {!deleteArmed ? (
              <button
                type="button"
                className="luxury-btn luxury-profile-close__danger-btn luxury-profile-close__first-action"
                disabled={deleteM.isPending || !accessToken}
                onClick={() => {
                  setMsg(null);
                  setDeleteArmed(true);
                }}
              >
                Elimina account
              </button>
            ) : (
              <div className="luxury-profile-close__confirm-box">
                <p className="luxury-profile-close__confirm-text" role="alert">
                  Conferma finale: chiuderemo l&apos;account e anonimizzeremo i dati personali del profilo.
                </p>
                <div className="luxury-profile-close__confirm-actions">
                  <button
                    type="button"
                    className="luxury-btn luxury-btn--secondary"
                    disabled={deleteM.isPending}
                    onClick={() => setDeleteArmed(false)}
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    className="luxury-btn luxury-profile-close__danger-btn"
                    disabled={deleteM.isPending || !accessToken}
                    onClick={() => {
                      setMsg(null);
                      deleteM.mutate();
                    }}
                  >
                    {deleteM.isPending ? "Eliminazione..." : "Conferma elimina account"}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="luxury-text-muted">
            Per account staff o amministrativi la chiusura non è disponibile da Profilo. Scrivi a{" "}
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="luxury-link-inline">
              {LEGAL_CONTACT_EMAIL}
            </a>{" "}
            o consulta la pagina{" "}
            <Link to="/privacy/elimina-account" className="luxury-link-inline">
              Elimina account
            </Link>
            .
          </p>
        )}
      </section>
      </div>
    </div>
  );
}
