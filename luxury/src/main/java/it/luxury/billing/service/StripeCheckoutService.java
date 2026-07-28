package it.luxury.billing.service;

import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import it.luxury.billing.domain.BillingAccount;
import it.luxury.billing.domain.BillingAccountRepository;
import it.luxury.billing.domain.SalonBillingProfile;
import it.luxury.common.api.BusinessException;
import it.luxury.config.LuxuryNotificationProperties;
import it.luxury.config.LuxuryStripeCheckoutBrandingProperties;
import it.luxury.config.LuxuryStripeProperties;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.security.auth.LuxuryUserPrincipal;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.studio.service.StudioGroupOwnerResolver;
import it.luxury.billing.config.ConditionalOnStripeBillingOperational;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@ConditionalOnStripeBillingOperational
public class StripeCheckoutService {

	/** Allineato a {@code SALON_PREMIUM_TRIAL_DAYS} nel frontend ({@code salonPlans.ts}). */
	private static final long PREMIUM_TRIAL_PERIOD_DAYS = 60L;

	private final LuxuryStripeProperties stripeProperties;
	private final LuxuryStripeCheckoutBrandingProperties checkoutBranding;
	private final LuxuryNotificationProperties notificationProperties;
	private final StudioGroupOwnerResolver studioGroupOwnerResolver;
	private final ConsumerProfileRepository consumerProfileRepository;
	private final BillingAccountRepository billingAccountRepository;
	private final SalonBillingProfileService salonBillingProfileService;
	private final StripeBillingCustomerSyncService stripeBillingCustomerSyncService;
	private final StripeSubscriptionSyncService subscriptionSyncService;
	private final SalonBillingNotificationService billingNotificationService;
	private final com.stripe.StripeClient stripeClient;

	public StripeCheckoutService(
			LuxuryStripeProperties stripeProperties,
			LuxuryStripeCheckoutBrandingProperties checkoutBranding,
			LuxuryNotificationProperties notificationProperties,
			StudioGroupOwnerResolver studioGroupOwnerResolver,
			ConsumerProfileRepository consumerProfileRepository,
			BillingAccountRepository billingAccountRepository,
			SalonBillingProfileService salonBillingProfileService,
			StripeBillingCustomerSyncService stripeBillingCustomerSyncService,
			StripeSubscriptionSyncService subscriptionSyncService,
			SalonBillingNotificationService billingNotificationService,
			com.stripe.StripeClient stripeClient) {
		this.stripeProperties = stripeProperties;
		this.checkoutBranding = checkoutBranding;
		this.notificationProperties = notificationProperties;
		this.studioGroupOwnerResolver = studioGroupOwnerResolver;
		this.consumerProfileRepository = consumerProfileRepository;
		this.billingAccountRepository = billingAccountRepository;
		this.salonBillingProfileService = salonBillingProfileService;
		this.stripeBillingCustomerSyncService = stripeBillingCustomerSyncService;
		this.subscriptionSyncService = subscriptionSyncService;
		this.billingNotificationService = billingNotificationService;
		this.stripeClient = stripeClient;
	}

	@Transactional
	public String createCheckoutSessionUrl(LuxuryUserPrincipal principal) {
		requireConfigured();
		StudioGroup group = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Salone non trovato."));
		if ("PREMIUM".equals(StudioGroup.canonicalPlanTier(group.getPlanTier()))) {
			BillingAccount existing = billingAccountRepository.findByStudioGroup_Id(group.getId()).orElse(null);
			if (existing != null && StripeSubscriptionSyncService.planTierForStatus(existing.getSubscriptionStatus()).equals("PREMIUM")) {
				throw new BusinessException(HttpStatus.CONFLICT, "ALREADY_SUBSCRIBED", "Il salone ha già un abbonamento Premium attivo.");
			}
		}
		ConsumerProfile profile = consumerProfileRepository.findByAuthSub(principal.getSubject())
				.filter(p -> p.getDeletedAt() == null)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Profilo non trovato."));

		SalonBillingProfile billingProfile = salonBillingProfileService.requireCompleteProfile(principal);

		String customerId = stripeBillingCustomerSyncService.ensureCustomerWithProfile(group, profile, billingProfile);
		stripeBillingCustomerSyncService.syncProfileToStripeCustomer(group, billingProfile);

		Map<String, String> metadata = billingMetadata(group.getId(), profile.getId());
		String frontendBase = frontendBaseUrl();
		try {
			Session session = stripeClient.checkout().sessions().create(
					SessionCreateParams.builder()
							.setMode(SessionCreateParams.Mode.SUBSCRIPTION)
							.setCustomer(customerId)
							.setClientReferenceId(group.getId().toString())
							.addLineItem(
									SessionCreateParams.LineItem.builder()
											.setPrice(stripeProperties.premiumPriceId())
											.setQuantity(1L)
											.build())
							.setSuccessUrl(frontendBase + stripeProperties.checkoutSuccessPath() + "?session_id={CHECKOUT_SESSION_ID}")
							.setCancelUrl(frontendBase + stripeProperties.checkoutCancelPath())
							.putAllMetadata(metadata)
							.setBrandingSettings(StripeCheckoutBrandingSupport.brandingSettings(checkoutBranding, frontendBase))
							.setCustomText(StripeCheckoutBrandingSupport.customText())
							.setSubscriptionData(
									SessionCreateParams.SubscriptionData.builder()
											.setTrialPeriodDays(PREMIUM_TRIAL_PERIOD_DAYS)
											.putAllMetadata(metadata)
											.build())
							.setBillingAddressCollection(SessionCreateParams.BillingAddressCollection.REQUIRED)
							.setTaxIdCollection(
									SessionCreateParams.TaxIdCollection.builder()
											.setEnabled(true)
											.build())
							.setCustomerUpdate(
									SessionCreateParams.CustomerUpdate.builder()
											.setAddress(SessionCreateParams.CustomerUpdate.Address.AUTO)
											.setName(SessionCreateParams.CustomerUpdate.Name.AUTO)
											.build())
							.build());
			if (session.getUrl() == null || session.getUrl().isBlank()) {
				throw new BusinessException(HttpStatus.BAD_GATEWAY, "STRIPE_ERROR", "Stripe non ha restituito l'URL di checkout.");
			}
			return session.getUrl();
		}
		catch (StripeException ex) {
			throw new BusinessException(HttpStatus.BAD_GATEWAY, "STRIPE_ERROR", "Impossibile avviare il checkout Stripe.");
		}
	}

	private static Map<String, String> billingMetadata(UUID studioGroupId, UUID consumerProfileId) {
		Map<String, String> metadata = new HashMap<>();
		metadata.put("luxury_studio_group_id", studioGroupId.toString());
		metadata.put("luxury_consumer_profile_id", consumerProfileId.toString());
		metadata.put("luxury_plan", "PREMIUM");
		return metadata;
	}

	private String frontendBaseUrl() {
		String base = notificationProperties.getFrontendBaseUrl();
		if (base == null || base.isBlank()) {
			throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "BILLING_MISCONFIGURED", "URL frontend non configurato.");
		}
		return base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
	}

	/**
	 * Conferma lato server al ritorno da Stripe Checkout (fallback se il webhook è in ritardo in dev).
	 */
	@Transactional
	public void confirmCheckoutSession(String sessionId, LuxuryUserPrincipal principal) {
		requireConfigured();
		if (sessionId == null || sessionId.isBlank()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_SESSION", "Sessione checkout mancante.");
		}
		StudioGroup group = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Salone non trovato."));
		try {
			Session session = stripeClient.checkout().sessions().retrieve(sessionId.trim());
			UUID sessionGroupId = parseStudioGroupId(session);
			if (sessionGroupId == null || !sessionGroupId.equals(group.getId())) {
				throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Sessione checkout non valida per questo salone.");
			}
			if (!"complete".equalsIgnoreCase(session.getStatus())) {
				return;
			}
			String subscriptionId = session.getSubscription();
			if (subscriptionId != null && !subscriptionId.isBlank()) {
				subscriptionSyncService.syncFromSubscriptionId(subscriptionId, group.getId());
			}
			Long amountTotal = session.getAmountTotal();
			if (amountTotal != null && amountTotal > 0) {
				billingNotificationService.onCheckoutSessionConfirmedPaid(session, group.getId());
			}
			else {
				billingNotificationService.onCheckoutSessionCompleted(session, group.getId());
			}
		}
		catch (StripeException ex) {
			throw new BusinessException(HttpStatus.BAD_GATEWAY, "STRIPE_ERROR", "Impossibile verificare il pagamento Stripe.");
		}
	}

	private static UUID parseStudioGroupId(Session session) {
		if (session == null) {
			return null;
		}
		String fromReference = session.getClientReferenceId();
		if (fromReference != null && !fromReference.isBlank()) {
			try {
				return UUID.fromString(fromReference.trim());
			}
			catch (IllegalArgumentException ignored) {
				// fall through to metadata
			}
		}
		if (session.getMetadata() != null) {
			String fromMetadata = session.getMetadata().get("luxury_studio_group_id");
			if (fromMetadata != null && !fromMetadata.isBlank()) {
				try {
					return UUID.fromString(fromMetadata.trim());
				}
				catch (IllegalArgumentException ignored) {
					return null;
				}
			}
		}
		return null;
	}

	private void requireConfigured() {
		if (!stripeProperties.configured()) {
			throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "BILLING_DISABLED", "Pagamenti non ancora disponibili.");
		}
	}
}
