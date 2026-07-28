/**
 * Base path @RequestMapping documentate per radar audit (`luxury-audit.sh`).
 * Non tutte sono invocate dal FE: webhook, dev-only o alias legacy.
 */
export const LUXURY_BACKEND_BASE_PATHS = {
  /** Metadati legali pubblici (es. retention log) — `PublicLegalMetaController`. */
  publicLegalMeta: "/api/v1/public/legal-meta",
  /**
   * Alias legacy operatori top-rated — il FE usa
   * `/api/v1/public/organizations/top-rated-operators` (`topRatedOperatorsApiPath`).
   */
  publicOperatorsAlias: "/api/v1/public/operators",
  /** Webhook Stripe server-to-server — `StripeWebhookController`. */
  webhooksStripe: "/api/v1/webhooks/stripe",
  /** Dev locale: anteprima email — `LocalDevEmailController`. */
  devEmail: "/api/v1/dev/email",
} as const;
