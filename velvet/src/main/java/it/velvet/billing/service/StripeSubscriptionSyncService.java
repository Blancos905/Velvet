package it.velvet.billing.service;

import com.stripe.exception.StripeException;
import com.stripe.model.Subscription;
import com.stripe.param.SubscriptionRetrieveParams;
import it.velvet.billing.domain.BillingAccount;
import it.velvet.billing.domain.BillingAccountRepository;
import it.velvet.studio.domain.StudioGroup;
import it.velvet.studio.domain.StudioGroupRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/** Unico writer di {@code studio_groups.plan_tier} da eventi Stripe. */
@Service
@ConditionalOnProperty(name = "velvet.billing.enabled", havingValue = "true")
public class StripeSubscriptionSyncService {

	private static final Set<String> PREMIUM_STATUSES = Set.of("active", "trialing", "past_due");

	private final BillingAccountRepository billingAccountRepository;
	private final StudioGroupRepository studioGroupRepository;
	private final com.stripe.StripeClient stripeClient;

	public StripeSubscriptionSyncService(
			BillingAccountRepository billingAccountRepository,
			StudioGroupRepository studioGroupRepository,
			com.stripe.StripeClient stripeClient) {
		this.billingAccountRepository = billingAccountRepository;
		this.studioGroupRepository = studioGroupRepository;
		this.stripeClient = stripeClient;
	}

	@Transactional
	public void syncFromSubscriptionObject(Subscription subscription, UUID studioGroupIdHint) {
		if (subscription == null) {
			return;
		}
		UUID studioGroupId = resolveStudioGroupId(subscription, studioGroupIdHint);
		if (studioGroupId == null) {
			return;
		}
		StudioGroup group = studioGroupRepository.findById(studioGroupId)
				.orElse(null);
		if (group == null) {
			return;
		}
		BillingAccount account = billingAccountRepository.findByStudioGroup_Id(studioGroupId)
				.orElseGet(() -> findOrCreateByCustomer(subscription, group));

		account.setStripeSubscriptionId(subscription.getId());
		account.setSubscriptionStatus(normalizeStatus(subscription.getStatus()));
		account.setCancelAtPeriodEnd(Boolean.TRUE.equals(subscription.getCancelAtPeriodEnd()));
		if (subscription.getCurrentPeriodEnd() != null) {
			account.setCurrentPeriodEnd(Instant.ofEpochSecond(subscription.getCurrentPeriodEnd()));
		}
		String priceId = extractPriceId(subscription);
		if (priceId != null) {
			account.setStripePriceId(priceId);
		}
		account.setSyncedAt(Instant.now());
		billingAccountRepository.save(account);

		String planTier = planTierForStatus(account.getSubscriptionStatus());
		group.applyPlanTier(planTier);
		studioGroupRepository.save(group);
	}

	@Transactional
	public void syncFromSubscriptionId(String subscriptionId, UUID studioGroupIdHint) throws StripeException {
		if (subscriptionId == null || subscriptionId.isBlank()) {
			return;
		}
		Subscription subscription = stripeClient.subscriptions().retrieve(
				subscriptionId,
				SubscriptionRetrieveParams.builder().addExpand("items.data.price").build());
		syncFromSubscriptionObject(subscription, studioGroupIdHint);
	}

	public static String planTierForStatus(String subscriptionStatus) {
		if (subscriptionStatus != null && PREMIUM_STATUSES.contains(subscriptionStatus.toLowerCase(Locale.ROOT))) {
			return "PREMIUM";
		}
		return "BASE";
	}

	public Optional<BillingAccount> findByStudioGroupId(UUID studioGroupId) {
		return billingAccountRepository.findByStudioGroup_Id(studioGroupId);
	}

	public UUID findByStudioGroupIdFromSubscription(Subscription subscription) {
		if (subscription == null) {
			return null;
		}
		return billingAccountRepository.findByStripeSubscriptionId(subscription.getId())
				.map(BillingAccount::getStudioGroupId)
				.or(() -> billingAccountRepository.findByStripeCustomerId(subscription.getCustomer())
						.map(BillingAccount::getStudioGroupId))
				.orElse(null);
	}

	private BillingAccount findOrCreateByCustomer(Subscription subscription, StudioGroup group) {
		String customerId = subscription.getCustomer();
		return billingAccountRepository.findByStripeCustomerId(customerId)
				.orElseGet(() -> billingAccountRepository.save(new BillingAccount(group, customerId)));
	}

	private UUID resolveStudioGroupId(Subscription subscription, UUID studioGroupIdHint) {
		if (studioGroupIdHint != null) {
			return studioGroupIdHint;
		}
		UUID fromMetadata = parseUuid(metadataValue(subscription.getMetadata(), "velvet_studio_group_id"));
		if (fromMetadata != null) {
			return fromMetadata;
		}
		return billingAccountRepository.findByStripeSubscriptionId(subscription.getId())
				.map(BillingAccount::getStudioGroupId)
				.or(() -> billingAccountRepository.findByStripeCustomerId(subscription.getCustomer())
						.map(BillingAccount::getStudioGroupId))
				.orElse(null);
	}

	private static String metadataValue(Map<String, String> metadata, String key) {
		if (metadata == null || key == null) {
			return null;
		}
		return metadata.get(key);
	}

	private static UUID parseUuid(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		try {
			return UUID.fromString(raw.trim());
		}
		catch (IllegalArgumentException ex) {
			return null;
		}
	}

	private static String normalizeStatus(String status) {
		return status != null ? status.trim().toLowerCase(Locale.ROOT) : null;
	}

	private static String extractPriceId(Subscription subscription) {
		if (subscription.getItems() == null || subscription.getItems().getData() == null
				|| subscription.getItems().getData().isEmpty()) {
			return null;
		}
		var item = subscription.getItems().getData().get(0);
		if (item.getPrice() != null) {
			return item.getPrice().getId();
		}
		return item.getPlan() != null ? item.getPlan().getId() : null;
	}
}
