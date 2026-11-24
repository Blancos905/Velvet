import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { apiJson } from "../../api/client";
import type { ProfileDto } from "../../api/types";
import { useLuxuryT } from "../../i18n/useLuxuryLocale";
import { readImageFileAsStaffPhotoDataUrl } from "../../lib/readImageDataUrl";

function clientProfileFallbackAvatar(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0).toLocaleUpperCase("it-IT") || "C";
  const second = parts.length > 1 ? parts[parts.length - 1]!.charAt(0).toLocaleUpperCase("it-IT") : "";
  const initials = `${first}${second}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fb923c"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient></defs><rect width="120" height="120" rx="60" fill="url(#g)"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Inter,Arial,sans-serif" font-size="42" font-weight="700">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

type Notice = { kind: "ok" | "err"; text: string };

type AvatarAdjustments = {
  zoom: number;
  offsetX: number;
  offsetY: number;
};

const DEFAULT_AVATAR_ADJUSTMENTS: AvatarAdjustments = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
};

function styleFromAdjustments(adjustments: AvatarAdjustments): CSSProperties {
  return {
    transform: `translate(${adjustments.offsetX}%, ${adjustments.offsetY}%) scale(${adjustments.zoom})`,
    transformOrigin: "center center",
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

async function renderAvatarDataUrl(sourceDataUrl: string, adjustments: AvatarAdjustments, size = 320): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("photo"));
    img.src = sourceDataUrl;
  });

  const w = image.naturalWidth || image.width;
  const h = image.naturalHeight || image.height;
  if (!w || !h) return sourceDataUrl;

  const zoom = clamp(adjustments.zoom, 1, 2.6);
  const baseScale = Math.max(size / w, size / h);
  const scale = baseScale * zoom;
  const drawW = w * scale;
  const drawH = h * scale;
  const overflowX = Math.max(0, drawW - size);
  const overflowY = Math.max(0, drawH - size);
  const x = clamp(adjustments.offsetX, -100, 100) / 100;
  const y = clamp(adjustments.offsetY, -100, 100) / 100;
  const drawX = -overflowX / 2 + (overflowX / 2) * x;
  const drawY = -overflowY / 2 + (overflowY / 2) * y;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return sourceDataUrl;
  ctx.drawImage(image, drawX, drawY, drawW, drawH);
  return canvas.toDataURL("image/jpeg", 0.86);
}

type ClientProfilePhotoEditorProps = {
  accessToken: string | null | undefined;
  displayName: string;
  serverPhoto: string | null;
};

/** Foto del profilo cliente: stessa UI nel pannello web e nell’overlay dell’app. */
export function ClientProfilePhotoEditor({ accessToken, displayName, serverPhoto }: ClientProfilePhotoEditorProps) {
  const t = useLuxuryT();
  const qc = useQueryClient();
  const [source, setSource] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<AvatarAdjustments>(DEFAULT_AVATAR_ADJUSTMENTS);
  const [removePending, setRemovePending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const successTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current !== null) {
        window.clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const saveM = useMutation({
    mutationFn: (photoDataUrl: string) =>
      apiJson<ProfileDto>("/api/v1/me/profile/photo", {
        method: "PATCH",
        accessToken,
        body: JSON.stringify({ photoDataUrl }),
      }),
    onSuccess: async () => {
      setSource(null);
      setAdjustments(DEFAULT_AVATAR_ADJUSTMENTS);
      setRemovePending(false);
      setNotice({ kind: "ok", text: t("account.profile.photoSaved") });
      if (successTimeoutRef.current !== null) {
        window.clearTimeout(successTimeoutRef.current);
      }
      successTimeoutRef.current = window.setTimeout(() => {
        successTimeoutRef.current = null;
        setNotice((current) => (current?.kind === "ok" ? null : current));
      }, 3000);
      await qc.invalidateQueries({ queryKey: ["me", "profile"] });
    },
    onError: (e: Error) => {
      if (successTimeoutRef.current !== null) {
        window.clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
      setNotice({ kind: "err", text: e.message || t("account.profile.photoReadError") });
    },
  });

  const fallback = clientProfileFallbackAvatar(displayName);
  const previewSrc = removePending ? fallback : source ?? (serverPhoto || fallback);
  const dirty = source !== null || removePending;
  const framing = source !== null && !removePending;

  return (
    <div className="luxury-profile-client-photo" aria-label={t("account.profile.photoAria")}>
      <h3 className="luxury-profile-password__title">{t("account.profile.photoTitle")}</h3>
      <p className="luxury-text-muted luxury-profile-client-photo__lead">{t("account.profile.photoLead")}</p>
      <div className="luxury-profile-staff-photo">
        <div className="luxury-profile-staff-photo__preview-wrap">
          <img
            className={`luxury-profile-staff-photo__preview${framing ? " is-framing" : ""}`}
            src={previewSrc}
            alt={t("account.profile.photoAlt")}
            style={framing ? styleFromAdjustments(adjustments) : undefined}
          />
        </div>
        {framing ? (
          <div className="luxury-profile-client-photo__controls">
            <label className="luxury-form-label">
              {t("account.profile.photoZoom")}
              <input
                type="range"
                min={1}
                max={2.6}
                step={0.01}
                value={adjustments.zoom}
                onChange={(e) =>
                  setAdjustments((prev) => ({ ...prev, zoom: Number.parseFloat(e.target.value) || prev.zoom }))
                }
              />
            </label>
            <label className="luxury-form-label">
              {t("account.profile.photoOffsetX")}
              <input
                type="range"
                min={-100}
                max={100}
                step={1}
                value={adjustments.offsetX}
                onChange={(e) =>
                  setAdjustments((prev) => ({ ...prev, offsetX: Number.parseInt(e.target.value, 10) || 0 }))
                }
              />
            </label>
            <label className="luxury-form-label">
              {t("account.profile.photoOffsetY")}
              <input
                type="range"
                min={-100}
                max={100}
                step={1}
                value={adjustments.offsetY}
                onChange={(e) =>
                  setAdjustments((prev) => ({ ...prev, offsetY: Number.parseInt(e.target.value, 10) || 0 }))
                }
              />
            </label>
          </div>
        ) : null}
        <div className="luxury-profile-staff-photo__actions">
          <label className="luxury-btn luxury-btn--secondary">
            <input
              type="file"
              accept="image/*"
              className="luxury-profile-hidden-file"
              disabled={saveM.isPending || !accessToken}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                e.target.value = "";
                if (!file) return;
                setNotice(null);
                setRemovePending(false);
                void (async () => {
                  try {
                    const dataUrl = await readImageFileAsStaffPhotoDataUrl(file, { maxSide: 640 });
                    setSource(dataUrl);
                    setAdjustments(DEFAULT_AVATAR_ADJUSTMENTS);
                  } catch (err) {
                    setNotice({
                      kind: "err",
                      text: err instanceof Error ? err.message : t("account.profile.photoReadError"),
                    });
                  }
                })();
              }}
            />
            {t("account.profile.photoChoose")}
          </label>
          {serverPhoto && source === null && !removePending ? (
            <button
              type="button"
              className="luxury-btn luxury-btn--secondary"
              disabled={saveM.isPending}
              onClick={() => {
                setNotice(null);
                setRemovePending(true);
              }}
            >
              {t("account.profile.photoRemove")}
            </button>
          ) : null}
          {source !== null ? (
            <button
              type="button"
              className="luxury-btn luxury-btn--secondary"
              disabled={saveM.isPending}
              onClick={() => {
                setNotice(null);
                setSource(null);
                setAdjustments(DEFAULT_AVATAR_ADJUSTMENTS);
              }}
            >
              {t("account.profile.photoDiscard")}
            </button>
          ) : null}
          {removePending ? (
            <button
              type="button"
              className="luxury-btn luxury-btn--secondary"
              disabled={saveM.isPending}
              onClick={() => {
                setNotice(null);
                setRemovePending(false);
              }}
            >
              {t("account.profile.photoUndoRemove")}
            </button>
          ) : null}
          <button
            type="button"
            className="luxury-btn luxury-btn--primary"
            disabled={!dirty || saveM.isPending || !accessToken}
            onClick={() => {
              setNotice(null);
              if (removePending) {
                saveM.mutate("");
                return;
              }
              if (source === null) return;
              void renderAvatarDataUrl(source, adjustments)
                .then((baked) => saveM.mutate(baked))
                .catch(() => {
                  setNotice({ kind: "err", text: t("account.profile.photoReadError") });
                });
            }}
          >
            {saveM.isPending ? t("account.profile.photoSaving") : t("account.profile.photoSave")}
          </button>
          {dirty ? (
            <button
              type="button"
              className="luxury-btn luxury-btn--secondary"
              disabled={saveM.isPending}
              onClick={() => {
                setNotice(null);
                setSource(null);
                setAdjustments(DEFAULT_AVATAR_ADJUSTMENTS);
                setRemovePending(false);
              }}
            >
              {t("account.profile.photoCancel")}
            </button>
          ) : null}
        </div>
      </div>
      {notice ? (
        <p
          className={`luxury-alert ${notice.kind === "ok" ? "luxury-alert--success" : "luxury-alert--error"}`}
          role={notice.kind === "ok" ? "status" : "alert"}
        >
          {notice.text}
        </p>
      ) : null}
    </div>
  );
}
