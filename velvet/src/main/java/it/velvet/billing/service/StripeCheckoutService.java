package it.velvet.billing.service;

import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.checkout.Session;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import it.velvet.billing.domain.BillingAccount;
import it.velvet.billing.domain.BillingAccountRepository;
import it.velvet.common.api.BusinessException;
import it.velvet.config.VelvetNotificationProperties;
import it.velvet.config.VelvetStripeProperties;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.security.auth.VelvetUserPrincipal;
import it.velvet.studio.domain.StudioGroup;
import it.velvet.studio.service.StudioGroupOwnerResolver;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "velvet.billing.enabled", havingValue = "true")
public class StripeCheckoutService {

	private final VelvetStripeProperties stripeProperties;
	private final VelvetNotificationProperties notificationProperties;
	private final StudioGroupOwnerResolver studioGroupOwnerResolver;
	private final ConsumerProfileRepository consumerProfileRepository;
	private final BillingAccountRepository billingAccountRepository;
	private final com.stripe.StripeClient stripeClient;

	public StripeCheckoutService(
			VelvetStripeProperties stripeProperties,
			VelvetNotificationProperties notificationProperties,
			StudioGroupOwnerResolver studioGroupOwnerResolver,
			ConsumerProfileRepository consumerProfileRepository,
			BillingAccountRepository billingAccountRepository,
			com.stripe.StripeClient stripeClient) {
		this.stripeProperties = stripeProperties;
		this.notificationProperties = notificationProperties;
		this.studioGroupOwnerResolver = studioGroupOwnerResolver;
		this.consumerProfileRepository = consumerProfileRepository;
		this.billingAccountRepository = billingAccountRepository;
		this.stripeClient = stripeClient;
	}

	@Transactional
	public String createCheckoutSessionUrl(VelvetUserPrincipal principal) {
		requireConfigured();
		StudioGroup group = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Salone non trovato."));
		if ("PREMIUM".equals(StudioGroup.canonicalPlanTier(group.getPlanTier()))) {
			BillingAccount existing = billingAccountRepository.findByStudioGroup_Id(group.getId()).orElse(null);
			if (existing != null && StripeSubscriptionSyncService.planTierForStatus(existing.getSubscriptionStatus()).equals("PREMIUM")) {
				throw new BusinessException(HttpStatus.CONFLICT, "ALREADY_SUBSCRIBED", "Il salone ha già un abbonamento Premium attivo.");
			}
		}
		ConsumerProfile profile = consumerProfileRepository.findByKeycloakSub(principal.getSubject())
				.filter(p -> p.getDeletedAt() == null)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Profilo non trovato."));

		String customerId = billingAccountRepository.findByStudioGroup_Id(group.getId())
				.map(BillingAccount::getStripeCustomerId)
				.orElseGet(() -> createStripeCustomer(group, profile));

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
							.setSubscriptionData(
									SessionCreateParams.SubscriptionData.builder()
											.putAllMetadata(metadata)
											.build())
							.setBillingAddressCollection(SessionCreateParams.BillingAddressCollection.AUTO)
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

	private String createStripeCustomer(StudioGroup group, ConsumerProfile profile) {
		try {
			Map<String, String> metadata = billingMetadata(group.getId(), profile.getId());
			Customer customer = stripeClient.customers().create(
					CustomerCreateParams.builder()
							.putAllMetadata(metadata)
							.build());
			billingAccountRepository.save(new BillingAccount(group, customer.getId()));
			return customer.getId();
		}
		catch (StripeException ex) {
			throw new BusinessException(HttpStatus.BAD_GATEWAY, "STRIPE_ERROR", "Impossibile creare il cliente Stripe.");
		}
	}

	private static Map<String, String> billingMetadata(UUID studioGroupId, UUID consumerProfileId) {
		Map<String, String> metadata = new HashMap<>();
		metadata.put("velvet_studio_group_id", studioGroupId.toString());
		metadata.put("velvet_consumer_profile_id", consumerProfileId.toString());
		metadata.put("velvet_plan", "PREMIUM");
		return metadata;
	}

	private String frontendBaseUrl() {
		String base = notificationProperties.getFrontendBaseUrl();
		if (base == null || base.isBlank()) {
			throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "BILLING_MISCONFIGURED", "URL frontend non configurato.");
		}
		return base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
	}

	private void requireConfigured() {
		if (!stripeProperties.configured()) {
			throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "BILLING_DISABLED", "Pagamenti non ancora disponibili.");
		}
	}
}
