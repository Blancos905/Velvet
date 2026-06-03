import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { apiJson } from "../../api/client";
import type { SuperAdminMeProfileDto } from "../../api/types";

type Props = {
  accessToken: string;
  profile: SuperAdminMeProfileDto;
  idPrefix: string;
  headingId: string;
  /** Se false, non renderizza l’`h2` titolo sezione (es. pagina `/admin/profilo` con `h1` già presente). */
  showSectionTitle?: boolean;
};

export function AdminSuperAdminProfileSection({
  accessToken,
  profile,
  idPrefix,
  headingId,
  showSectionTitle = true,
}: Props) {
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredLocale, setPreferredLocale] = useState("");
  const [profMsg, setProfMsg] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile.displayName ?? "");
    setPhone(profile.phone ?? "");
    setPreferredLocale(profile.preferredLocale ?? "");
  }, [profile.displayName, profile.phone, profile.preferredLocale, profile.profileId]);

  const patchM = useMutation({
    mutationFn: () =>
      apiJson<SuperAdminMeProfileDto>("/api/v1/admin/overview", {
        method: "PATCH",
        accessToken,
        body: JSON.stringify({
          displayName,
          phone,
          preferredLocale,
        }),
      }),
    onSuccess: async () => {
      setProfMsg("Profilo aggiornato.");
      await qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (e: Error) => setProfMsg(e.message),
  });

  const pwdM = useMutation({
    mutationFn: () =>
      apiJson<void>("/api/v1/admin/overview/password", {
        method: "POST",
        accessToken,
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      }),
    onSuccess: () => {
      setPwdMsg("Password aggiornata. Al prossimo accesso usa la nuova password.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (e: Error) => setPwdMsg(e.message),
  });

  const submitProfile = (ev: FormEvent) => {
    ev.preventDefault();
    setProfMsg(null);
    patchM.mutate();
  };

  const submitPassword = (ev: FormEvent) => {
    ev.preventDefault();
    setPwdMsg(null);
    if (newPassword !== confirmPassword) {
      setPwdMsg("Le nuove password non coincidono.");
      return;
    }
    pwdM.mutate();
  };

  return (
    <section
      className="velvet-admin-panel velvet-admin-premium-card"
      aria-labelledby={showSectionTitle ? headingId : undefined}
      aria-label={showSectionTitle ? undefined : "Profilo super admin"}
    >
      {showSectionTitle ? (
        <h2 id={headingId} className="velvet-admin-section-title">
          Profilo super admin
        </h2>
      ) : null}

      <dl className="velvet-admin-super-profile__dl" aria-label="Riepilogo account">
        <div className="velvet-admin-super-profile__row">
          <dt>Email</dt>
          <dd>{profile.email?.trim() ? profile.email : "—"}</dd>
        </div>
        <div className="velvet-admin-super-profile__row">
          <dt>Nome in evidenza</dt>
          <dd>{profile.displayName?.trim() ? profile.displayName : "—"}</dd>
        </div>
        <div className="velvet-admin-super-profile__row">
          <dt>Telefono</dt>
          <dd>{profile.phone?.trim() ? profile.phone : "—"}</dd>
        </div>
        <div className="velvet-admin-super-profile__row">
          <dt>Lingua preferita</dt>
          <dd>{profile.preferredLocale?.trim() ? profile.preferredLocale : "—"}</dd>
        </div>
        <div className="velvet-admin-super-profile__row">
          <dt>Ruoli</dt>
          <dd>{profile.securityRoles?.trim() ? profile.securityRoles : "—"}</dd>
        </div>
        <div className="velvet-admin-super-profile__row">
          <dt>Profilo su database</dt>
          <dd>{profile.persistedProfile ? "Sì" : "No (solo dati sessione / JWT)"}</dd>
        </div>
      </dl>

      <div className="velvet-admin-super-profile__blocks">
        <div className="velvet-admin-super-profile__block">
          <h3 className="velvet-admin-super-profile__block-title">Modifica anagrafica</h3>
          {!profile.persistedProfile ? (
            <p className="velvet-admin-muted" role="status">
              Non è ancora presente il record consumer collegato: impossibile salvare da qui. Verifica il bootstrap super
              admin (credenziali DB o proprietà).
            </p>
          ) : (
            <form className="velvet-plans-modal__form" noValidate onSubmit={submitProfile}>
              <label className="velvet-plans-field velvet-plans-field--full" htmlFor={`${idPrefix}-dn`}>
                <span>Nome in evidenza</span>
                <input
                  id={`${idPrefix}-dn`}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={200}
                  autoComplete="name"
                />
              </label>
              <label className="velvet-plans-field velvet-plans-field--full" htmlFor={`${idPrefix}-ph`}>
                <span>Telefono</span>
                <input
                  id={`${idPrefix}-ph`}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={40}
                  autoComplete="tel"
                />
              </label>
              <label className="velvet-plans-field velvet-plans-field--full" htmlFor={`${idPrefix}-loc`}>
                <span>Lingua preferita (es. it)</span>
                <input
                  id={`${idPrefix}-loc`}
                  value={preferredLocale}
                  onChange={(e) => setPreferredLocale(e.target.value)}
                  maxLength={16}
                  autoComplete="off"
                />
              </label>
              {profMsg ? (
                <p
                  className={`velvet-alert velvet-plans-modal__alert ${profMsg.includes("aggiornato") ? "velvet-alert--success" : "velvet-alert--error"}`}
                  role={profMsg.includes("aggiornato") ? "status" : "alert"}
                >
                  {profMsg}
                </p>
              ) : null}
              <div className="velvet-plans-modal__actions">
                <button type="submit" className="velvet-plan-cta" disabled={patchM.isPending}>
                  {patchM.isPending ? "Salvataggio…" : "Salva anagrafica"}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="velvet-admin-super-profile__block">
          <h3 className="velvet-admin-super-profile__block-title">Cambio password</h3>
          <form className="velvet-plans-modal__form" noValidate onSubmit={submitPassword}>
            <label className="velvet-plans-field velvet-plans-field--full" htmlFor={`${idPrefix}-cur`}>
              <span>Password attuale</span>
              <input
                id={`${idPrefix}-cur`}
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            <label className="velvet-plans-field velvet-plans-field--full" htmlFor={`${idPrefix}-np`}>
              <span>Nuova password (min. 8 caratteri)</span>
              <input
                id={`${idPrefix}-np`}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
              />
            </label>
            <label className="velvet-plans-field velvet-plans-field--full" htmlFor={`${idPrefix}-cf`}>
              <span>Conferma nuova password</span>
              <input
                id={`${idPrefix}-cf`}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
              />
            </label>
            {pwdMsg ? (
              <p
                className={`velvet-alert velvet-plans-modal__alert ${pwdMsg.includes("aggiornata") ? "velvet-alert--success" : "velvet-alert--error"}`}
                role={pwdMsg.includes("aggiornata") ? "status" : "alert"}
              >
                {pwdMsg}
              </p>
            ) : null}
            <div className="velvet-plans-modal__actions">
              <button type="submit" className="velvet-plan-cta" disabled={pwdM.isPending}>
                {pwdM.isPending ? "Aggiornamento…" : "Aggiorna password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
