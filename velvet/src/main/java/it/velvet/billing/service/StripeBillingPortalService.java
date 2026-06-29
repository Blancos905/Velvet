package it.velvet.billing.service;

import com.stripe.exception.StripeException;
import com.stripe.model.Subscription;
import com.stripe.model.billingportal.Session;
import com.stripe.param.SubscriptionListParams;
import com.stripe.param.billingportal.SessionCreateParams;
import it.velvet.billing.domain.BillingAccount;
import it.velvet.billing.domain.BillingAccountRepository;
import it.velvet.common.api.BusinessException;
import it.velvet.config.VelvetNotificationProperties;
import it.velvet.config.VelvetStripeProperties;
import it.velvet.security.auth.VelvetUserPrincipal;
import it.velvet.studio.domain.StudioGroup;
import it.velvet.studio.service.StudioGroupOwnerResolver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "velvet.billing.enabled", havingValue = "true")
public class StripeBillingPortalService {

	private static final Logger log = LoggerFactory.getLogger(StripeBillingPortalService.class);

	private static final Set<String> CANCELLABLE_SUBSCRIPTION_STATUSES = Set.of("active", "trialing", "past_due");

	private final VelvetStripeProperties stripeProperties;
	private final VelvetNotificationProperties notificationProperties;
	private final StudioGroupOwnerResolver studioGroupOwnerResolver;
	private final BillingAccountRepository billingAccountRepository;
	private final StripeSubscriptionSyncService subscriptionSyncService;
	private final com.stripe.StripeClient stripeClient;

	public StripeBillingPortalService(
			VelvetStripeProperties stripeProperties,
			VelvetNotificationProperties notificationProperties,
			StudioGroupOwnerResolver studioGroupOwnerResolver,
			BillingAccountRepository billingAccountRepository,
			StripeSubscriptionSyncService subscriptionSyncService,
			com.stripe.StripeClient stripeClient) {
		this.stripeProperties = stripeProperties;
		this.notificationProperties = notificationProperties;
		this.studioGroupOwnerResolver = studioGroupOwnerResolver;
		this.billingAccountRepository = billingAccountRepository;
		this.subscriptionSyncService = subscriptionSyncService;
		this.stripeClient = stripeClient;
	}

	public String createPortalSessionUrl(VelvetUserPrincipal principal) {
		return createPortalSessionUrl(principal, false);
	}

	public String createCancelSubscriptionPortalSessionUrl(VelvetUserPrincipal principal) {
		return createPortalSessionUrl(principal, true);
	}

	private String createPortalSessionUrl(VelvetUserPrincipal principal, boolean cancelSubscriptionFlow) {
		if (!stripeProperties.configured()) {
			throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "BILLING_DISABLED", "Pagamenti non ancora disponibili.");
		}
		StudioGroup group = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Salone non trovato."));
		BillingAccount account = billingAccountRepository.findByStudioGroup_Id(group.getId())
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "BILLING_NOT_FOUND", "Nessun profilo di fatturazione collegato."));
		String returnUrl = frontendBaseUrl() + stripeProperties.portalReturnPath();
		try {
			if (cancelSubscriptionFlow) {
				String subscriptionId = resolveCancellableSubscriptionId(account, group.getId());
				if (subscriptionId == null || subscriptionId.isBlank()) {
					throw new BusinessException(
							HttpStatus.CONFLICT,
							"BILLING_NO_SUBSCRIPTION",
							"Nessun abbonamento attivo da disdire.");
				}
				try {
					return createCancelFlowPortalSession(account, returnUrl, subscriptionId);
				}
				catch (StripeException ex) {
					if (isCancelDeepLinkUnsupported(ex)) {
						log.warn(
								"Deep link disdetta Stripe non disponibile per studioGroupId={}: {} — fallback portale generico.",
								group.getId(),
								stripeErrorSummary(ex));
						return createGenericPortalSession(account, returnUrl);
					}
					throw ex;
				}
			}
			return createGenericPortalSession(account, returnUrl);
		}
		catch (StripeException ex) {
			log.warn(
					"Stripe Customer Portal fallito (cancelFlow={}): {}",
					cancelSubscriptionFlow,
					stripeErrorSummary(ex));
			throw toBusinessException(ex, cancelSubscriptionFlow);
		}
	}

	private String createGenericPortalSession(BillingAccount account, String returnUrl) throws StripeException {
		Session session = stripeClient.billingPortal().sessions().create(
				SessionCreateParams.builder()
						.setCustomer(account.getStripeCustomerId())
						.setReturnUrl(returnUrl)
						.build());
		return requirePortalUrl(session);
	}

	private String createCancelFlowPortalSession(BillingAccount account, String returnUrl, String subscriptionId)
			throws StripeException {
		Session session = stripeClient.billingPortal().sessions().create(
				SessionCreateParams.builder()
						.setCustomer(account.getStripeCustomerId())
						.setReturnUrl(returnUrl)
						.setFlowData(
								SessionCreateParams.FlowData.builder()
										.setType(SessionCreateParams.FlowData.Type.SUBSCRIPTION_CANCEL)
										.setSubscriptionCancel(
												SessionCreateParams.FlowData.SubscriptionCancel.builder()
														.setSubscription(subscriptionId)
														.build())
										.setAfterCompletion(
												SessionCreateParams.FlowData.AfterCompletion.builder()
														.setType(SessionCreateParams.FlowData.AfterCompletion.Type.REDIRECT)
														.setRedirect(
																SessionCreateParams.FlowData.AfterCompletion.Redirect.builder()
																		.setReturnUrl(returnUrl)
																		.build())
														.build())
										.build())
						.build());
		return requirePortalUrl(session);
	}

	private String resolveCancellableSubscriptionId(BillingAccount account, UUID studioGroupId) throws StripeException {
		String stored = account.getStripeSubscriptionId();
		if (stored != null && !stored.isBlank()) {
			try {
				Subscription subscription = stripeClient.subscriptions().retrieve(stored);
				if (isCancellableStatus(subscription.getStatus())) {
					subscriptionSyncService.syncFromSubscriptionObject(subscription, studioGroupId);
					return subscription.getId();
				}
			}
			catch (StripeException ex) {
				if (!"resource_missing".equals(ex.getCode())) {
					throw ex;
				}
				log.info(
						"Abbonamento Stripe {} non trovato per studioGroupId={}: ricerca tra le subscription del customer.",
						stored,
						studioGroupId);
			}
		}
		var subscriptions = stripeClient.subscriptions().list(
				SubscriptionListParams.builder()
						.setCustomer(account.getStripeCustomerId())
						.setLimit(10L)
						.build());
		if (subscriptions.getData() == null) {
			return null;
		}
		for (Subscription subscription : subscriptions.getData()) {
			if (!isCancellableStatus(subscription.getStatus())) {
				continue;
			}
			subscriptionSyncService.syncFromSubscriptionObject(subscription, studioGroupId);
			return subscription.getId();
		}
		return null;
	}

	private static boolean isCancellableStatus(String status) {
		return status != null && CANCELLABLE_SUBSCRIPTION_STATUSES.contains(status.trim().toLowerCase(Locale.ROOT));
	}

	private static String requirePortalUrl(Session session) {
		if (session.getUrl() == null || session.getUrl().isBlank()) {
			throw new BusinessException(HttpStatus.BAD_GATEWAY, "STRIPE_ERROR", "Stripe non ha restituito l'URL del portale.");
		}
		return session.getUrl();
	}

	private static boolean isCancelDeepLinkUnsupported(StripeException ex) {
		String message = ex.getMessage() != null ? ex.getMessage().toLowerCase(Locale.ROOT) : "";
		return message.contains("subscription_cancel")
				|| message.contains("portal configuration")
				|| message.contains("flow_data")
				|| message.contains("not enabled");
	}

	private static BusinessException toBusinessException(StripeException ex, boolean cancelSubscriptionFlow) {
		String code = ex.getCode() != null ? ex.getCode() : "STRIPE_ERROR";
		String message = switch (code) {
			case "resource_missing" -> cancelSubscriptionFlow
					? "Abbonamento non trovato su Stripe. Verifica lo stato del pagamento o contatta l'assistenza."
					: "Cliente Stripe non trovato. Contatta l'assistenza.";
			case "url_invalid" -> "URL di ritorno non valido per Stripe. Aggiungi "
					+ "http://localhost:5173/account/profilo nelle impostazioni del Customer Portal Stripe (Billing → Customer portal).";
			default -> cancelSubscriptionFlow
					? "Impossibile aprire la pagina di disdetta su Stripe. Verifica che la disdetta sia abilitata nel Customer Portal Stripe."
					: "Impossibile aprire il portale clienti Stripe.";
		};
		return new BusinessException(HttpStatus.BAD_GATEWAY, code, message);
	}

	private static String stripeErrorSummary(StripeException ex) {
		String code = ex.getCode();
		String message = ex.getMessage();
		if (code == null || code.isBlank()) {
			return message != null ? message : ex.getClass().getSimpleName();
		}
		return code + ": " + (message != null ? message : "");
	}

	private String frontendBaseUrl() {
		String base = notificationProperties.getFrontendBaseUrl();
		if (base == null || base.isBlank()) {
			throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "BILLING_MISCONFIGURED", "URL frontend non configurato.");
		}
		return base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
	}
}
