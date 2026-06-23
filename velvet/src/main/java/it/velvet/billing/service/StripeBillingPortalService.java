package it.velvet.billing.service;

import com.stripe.exception.StripeException;
import com.stripe.model.billingportal.Session;
import com.stripe.param.billingportal.SessionCreateParams;
import it.velvet.billing.domain.BillingAccount;
import it.velvet.billing.domain.BillingAccountRepository;
import it.velvet.common.api.BusinessException;
import it.velvet.config.VelvetNotificationProperties;
import it.velvet.config.VelvetStripeProperties;
import it.velvet.security.auth.VelvetUserPrincipal;
import it.velvet.studio.domain.StudioGroup;
import it.velvet.studio.service.StudioGroupOwnerResolver;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "velvet.billing.enabled", havingValue = "true")
public class StripeBillingPortalService {

	private final VelvetStripeProperties stripeProperties;
	private final VelvetNotificationProperties notificationProperties;
	private final StudioGroupOwnerResolver studioGroupOwnerResolver;
	private final BillingAccountRepository billingAccountRepository;
	private final com.stripe.StripeClient stripeClient;

	public StripeBillingPortalService(
			VelvetStripeProperties stripeProperties,
			VelvetNotificationProperties notificationProperties,
			StudioGroupOwnerResolver studioGroupOwnerResolver,
			BillingAccountRepository billingAccountRepository,
			com.stripe.StripeClient stripeClient) {
		this.stripeProperties = stripeProperties;
		this.notificationProperties = notificationProperties;
		this.studioGroupOwnerResolver = studioGroupOwnerResolver;
		this.billingAccountRepository = billingAccountRepository;
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
		String frontendBase = frontendBaseUrl();
		String returnUrl = frontendBase + stripeProperties.portalReturnPath();
		try {
			SessionCreateParams.Builder params = SessionCreateParams.builder()
					.setCustomer(account.getStripeCustomerId())
					.setReturnUrl(returnUrl);
			if (cancelSubscriptionFlow) {
				String subscriptionId = account.getStripeSubscriptionId();
				if (subscriptionId == null || subscriptionId.isBlank()) {
					throw new BusinessException(
							HttpStatus.CONFLICT,
							"BILLING_NO_SUBSCRIPTION",
							"Nessun abbonamento attivo da disdire.");
				}
				params.setFlowData(
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
								.build());
			}
			Session session = stripeClient.billingPortal().sessions().create(params.build());
			if (session.getUrl() == null || session.getUrl().isBlank()) {
				throw new BusinessException(HttpStatus.BAD_GATEWAY, "STRIPE_ERROR", "Stripe non ha restituito l'URL del portale.");
			}
			return session.getUrl();
		}
		catch (StripeException ex) {
			throw new BusinessException(HttpStatus.BAD_GATEWAY, "STRIPE_ERROR", "Impossibile aprire il portale clienti Stripe.");
		}
	}

	private String frontendBaseUrl() {
		String base = notificationProperties.getFrontendBaseUrl();
		if (base == null || base.isBlank()) {
			throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "BILLING_MISCONFIGURED", "URL frontend non configurato.");
		}
		return base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
	}
}
