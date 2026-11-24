import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../../api/client";
import { useAdminAuth } from "../../auth/AdminAuthProvider";
import { useLuxuryT } from "../../i18n/useLuxuryLocale";
import {
  AGENDA_SPONSOR_PLACEMENT,
  AGENDA_SPONSOR_SLOTS,
  type AgendaSponsor,
} from "../../lib/agendaSponsors";

const MAX_IMAGE_BYTES = 350_000;

type Draft = {
  brandName: string;
  headline: string;
  ctaLabel: string;
  href: string;
  imageSrc: string;
};

const EMPTY_DRAFT: Draft = {
  brandName: "",
  headline: "",
  ctaLabel: "",
  href: "https://",
  imageSrc: "",
};

export default function AdminPlacementSponsorsPage() {
  const t = useLuxuryT();
  const { accessToken, isAdminSession } = useAdminAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [formError, setFormError] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ["admin", "placement-sponsors", AGENDA_SPONSOR_PLACEMENT, accessToken],
    enabled: Boolean(accessToken) && isAdminSession,
    queryFn: () =>
      apiJson<AgendaSponsor[]>(
        `/api/v1/admin/placement-sponsors?placement=${AGENDA_SPONSOR_PLACEMENT}`,
        { accessToken },
      ),
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "placement-sponsors"] });
    await queryClient.invalidateQueries({ queryKey: ["public", "placement-sponsors"] });
  };

  const saveM = useMutation({
    mutationFn: (body: Draft) =>
      apiJson<AgendaSponsor>("/api/v1/admin/placement-sponsors", {
        method: "POST",
        accessToken,
        body: JSON.stringify({
          placement: AGENDA_SPONSOR_PLACEMENT,
          ...body,
          active: true,
        }),
      }),
    onSuccess: async () => {
      setDraft(EMPTY_DRAFT);
      setFormError(null);
      await refresh();
    },
    onError: (error: unknown) => {
      setFormError(error instanceof Error ? error.message : t("admin.sponsors.error"));
    },
  });

  const updateM = useMutation({
    mutationFn: (sponsor: AgendaSponsor) =>
      apiJson<AgendaSponsor>(`/api/v1/admin/placement-sponsors/${sponsor.id}`, {
        method: "PUT",
        accessToken,
        body: JSON.stringify(sponsor),
      }),
    onSuccess: refresh,
  });

  const deleteM = useMutation({
    mutationFn: (id: string) =>
      apiJson<void>(`/api/v1/admin/placement-sponsors/${id}`, {
        method: "DELETE",
        accessToken,
      }),
    onSuccess: refresh,
  });

  const rows = listQ.data ?? [];

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!draft.brandName.trim() || !draft.headline.trim() || !draft.ctaLabel.trim() || !draft.href.trim() || !draft.imageSrc.trim()) {
      setFormError(t("admin.sponsors.required"));
      return;
    }
    saveM.mutate(draft);
  };

  const onImageFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError(t("admin.sponsors.imageType"));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFormError(t("admin.sponsors.imageSize"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setDraft((current) => ({ ...current, imageSrc: result }));
      setFormError(null);
    };
    reader.readAsDataURL(file);
  };

  const moveM = useMutation({
    mutationFn: async ({ index, delta }: { index: number; delta: number }) => {
      const reordered = [...rows];
      const [item] = reordered.splice(index, 1);
      if (!item) return;
      reordered.splice(index + delta, 0, item);
      for (let order = 0; order < reordered.length; order += 1) {
        const sponsor = reordered[order];
        if (!sponsor || sponsor.sortOrder === order) continue;
        await apiJson<AgendaSponsor>(`/api/v1/admin/placement-sponsors/${sponsor.id}`, {
          method: "PUT",
          accessToken,
          body: JSON.stringify({ ...sponsor, sortOrder: order }),
        });
      }
    },
    onSuccess: refresh,
  });

  return (
    <div className="luxury-admin-page">
      <h1 className="luxury-admin-page-title">{t("admin.sponsors.title")}</h1>
      <p className="luxury-admin-muted">{t("admin.sponsors.lead", { n: AGENDA_SPONSOR_SLOTS })}</p>
      <p>
        <Link to="/admin/dashboard">{t("admin.sponsors.back")}</Link>
      </p>

      <section className="luxury-admin-panel" aria-label={t("admin.sponsors.formLabel")}>
        <form className="luxury-admin-sponsor-form" onSubmit={onSubmit}>
          <label>
            {t("admin.sponsors.brand")}
            <input
              className="luxury-admin-input"
              value={draft.brandName}
              maxLength={80}
              onChange={(event) => setDraft((current) => ({ ...current, brandName: event.target.value }))}
            />
          </label>
          <label>
            {t("admin.sponsors.headline")}
            <input
              className="luxury-admin-input"
              value={draft.headline}
              maxLength={160}
              onChange={(event) => setDraft((current) => ({ ...current, headline: event.target.value }))}
            />
          </label>
          <label>
            {t("admin.sponsors.cta")}
            <input
              className="luxury-admin-input"
              value={draft.ctaLabel}
              maxLength={40}
              onChange={(event) => setDraft((current) => ({ ...current, ctaLabel: event.target.value }))}
            />
          </label>
          <label>
            {t("admin.sponsors.href")}
            <input
              className="luxury-admin-input"
              value={draft.href}
              inputMode="url"
              onChange={(event) => setDraft((current) => ({ ...current, href: event.target.value }))}
            />
          </label>
          <label>
            {t("admin.sponsors.image")}
            <input
              className="luxury-admin-input"
              value={draft.imageSrc.startsWith("data:") ? "" : draft.imageSrc}
              placeholder={draft.imageSrc.startsWith("data:") ? t("admin.sponsors.imageReady") : "/ads/…"}
              onChange={(event) => setDraft((current) => ({ ...current, imageSrc: event.target.value }))}
            />
          </label>
          <label>
            {t("admin.sponsors.imageFile")}
            <input
              type="file"
              accept="image/*"
              onChange={(event) => onImageFile(event.target.files?.[0])}
            />
          </label>
          {formError ? (
            <p className="luxury-alert luxury-alert--error" role="alert">
              {formError}
            </p>
          ) : null}
          <button type="submit" className="luxury-plan-cta" disabled={saveM.isPending}>
            {t("admin.sponsors.add")}
          </button>
        </form>
      </section>

      <section className="luxury-admin-panel" aria-label={t("admin.sponsors.listLabel")}>
        {listQ.isLoading ? <p className="luxury-admin-muted">{t("common.loading")}</p> : null}
        {listQ.isError ? <p className="luxury-admin-muted">{t("admin.sponsors.error")}</p> : null}
        {rows.length === 0 && !listQ.isLoading ? <p className="luxury-admin-muted">{t("admin.sponsors.empty")}</p> : null}
        <ol className="luxury-admin-sponsor-list">
          {rows.map((sponsor, index) => (
            <li key={sponsor.id} className="luxury-admin-sponsor-list__item">
              <img src={sponsor.imageSrc} alt="" width={88} height={50} />
              <div>
                <strong>{sponsor.brandName}</strong>
                <p>{sponsor.headline}</p>
                <p className="luxury-admin-muted">
                  {index < AGENDA_SPONSOR_SLOTS && sponsor.active
                    ? t("admin.sponsors.inCarousel")
                    : t("admin.sponsors.waiting")}
                </p>
              </div>
              <div className="luxury-admin-sponsor-list__actions">
                <button type="button" className="luxury-plan-cta luxury-plan-cta--secondary" onClick={() => moveM.mutate({ index, delta: -1 })} disabled={index === 0 || moveM.isPending}>
                  {t("admin.sponsors.up")}
                </button>
                <button
                  type="button"
                  className="luxury-plan-cta luxury-plan-cta--secondary"
                  onClick={() => moveM.mutate({ index, delta: 1 })}
                  disabled={index === rows.length - 1 || moveM.isPending}
                >
                  {t("admin.sponsors.down")}
                </button>
                <button
                  type="button"
                  className="luxury-plan-cta luxury-plan-cta--secondary"
                  onClick={() => updateM.mutate({ ...sponsor, active: !sponsor.active })}
                >
                  {sponsor.active ? t("admin.sponsors.hide") : t("admin.sponsors.show")}
                </button>
                <button type="button" className="luxury-plan-cta luxury-plan-cta--secondary" onClick={() => deleteM.mutate(sponsor.id)}>
                  {t("admin.sponsors.delete")}
                </button>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
