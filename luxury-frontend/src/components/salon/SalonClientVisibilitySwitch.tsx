import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiJson } from "../../api/client";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";
import { useMeSalonSummaryQuery } from "../../hooks/useMeSalonSummary";
import { useLuxuryT } from "../../i18n/useLuxuryLocale";
import "../../styles/luxury-salon-visibility.css";

/** Switch titolare: la vetrina resta in anteprima finché non è visibile ai clienti. */
export function SalonClientVisibilitySwitch() {
  const t = useLuxuryT();
  const qc = useQueryClient();
  const { accessToken } = useLuxuryAuth();
  const meSalon = useMeSalonSummaryQuery();
  const [feedback, setFeedback] = useState<string | null>(null);
  const enabled = Boolean(meSalon.data?.visibleToClients);
  const failed = feedback === t("account.showcase.saveError");

  const mutation = useMutation({
    mutationFn: async (next: boolean) =>
      apiJson("/api/v1/me/salon/client-visibility", {
        method: "PATCH",
        accessToken,
        body: JSON.stringify({ enabled: next }),
      }),
    onSuccess: async (_data, next) => {
      setFeedback(next ? t("account.showcase.savedOn") : t("account.showcase.savedOff"));
      await qc.invalidateQueries({ queryKey: ["me", "salon"] });
      await qc.invalidateQueries({ queryKey: ["org"] });
      await qc.invalidateQueries({ queryKey: ["orgs"] });
    },
    onError: () => setFeedback(t("account.showcase.saveError")),
  });

  if (!meSalon.data?.provisioned) return null;

  return (
    <section className="luxury-salon-visibility" aria-labelledby="salon-client-visibility-label">
      <p className="luxury-salon-visibility__kicker">{t("account.showcase.settingsKicker")}</p>
      <p className="luxury-salon-visibility__lead">{t("account.showcase.visibilityLead")}</p>
      <div className="luxury-salon-visibility__row">
        <div className="luxury-salon-visibility__copy">
          <p className="luxury-salon-visibility__label" id="salon-client-visibility-label">
            {t("account.showcase.visibilityLabel")}
          </p>
          <p className="luxury-salon-visibility__hint">
            {enabled ? t("account.showcase.visibilityOnHint") : t("account.showcase.visibilityOffHint")}
          </p>
        </div>
        <button
          type="button"
          className={
            "luxury-salon-visibility__switch" + (enabled ? " luxury-salon-visibility__switch--on" : "")
          }
          role="switch"
          aria-checked={enabled}
          aria-labelledby="salon-client-visibility-label"
          disabled={mutation.isPending || !accessToken}
          onClick={() => {
            setFeedback(null);
            mutation.mutate(!enabled);
          }}
        >
          <span className="luxury-salon-visibility__knob" aria-hidden />
        </button>
      </div>
      {feedback ? (
        <p
          className={
            "luxury-salon-visibility__feedback luxury-alert " +
            (failed ? "luxury-alert--error" : "luxury-alert--success")
          }
          role="status"
        >
          {feedback}
        </p>
      ) : null}
    </section>
  );
}
