package it.luxury.billing.domain;

import it.luxury.studio.domain.StudioGroup;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/** Mirror locale dello stato abbonamento Stripe (Stripe = source of truth). */
@Entity
@Table(name = "billing_accounts")
public class BillingAccount {

	@Id
	@GeneratedValue
	private UUID id;

	@OneToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "studio_group_id", nullable = false, unique = true)
	private StudioGroup studioGroup;

	@Column(name = "stripe_customer_id", nullable = false, unique = true, length = 64)
	private String stripeCustomerId;

	@Column(name = "stripe_subscription_id", unique = true, length = 64)
	private String stripeSubscriptionId;

	@Column(name = "subscription_status", length = 32)
	private String subscriptionStatus;

	@Column(name = "stripe_price_id", length = 64)
	private String stripePriceId;

	@Column(name = "current_period_end")
	private Instant currentPeriodEnd;

	@Column(name = "cancel_at_period_end", nullable = false)
	private boolean cancelAtPeriodEnd;

	/** Impostato quando il titolare disdice (cancel at period end); azzerato se riattiva. */
	@Column(name = "subscription_cancel_requested_at")
	private Instant subscriptionCancelRequestedAt;

	@Column(name = "synced_at")
	private Instant syncedAt;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected BillingAccount() {
	}

	public BillingAccount(StudioGroup studioGroup, String stripeCustomerId) {
		this.studioGroup = studioGroup;
		this.stripeCustomerId = stripeCustomerId;
	}

	@PrePersist
	void onCreate() {
		Instant now = Instant.now();
		if (createdAt == null) {
			createdAt = now;
		}
		updatedAt = now;
	}

	@PreUpdate
	void onUpdate() {
		updatedAt = Instant.now();
	}

	public UUID getId() {
		return id;
	}

	public StudioGroup getStudioGroup() {
		return studioGroup;
	}

	public UUID getStudioGroupId() {
		return studioGroup != null ? studioGroup.getId() : null;
	}

	public String getStripeCustomerId() {
		return stripeCustomerId;
	}

	public String getStripeSubscriptionId() {
		return stripeSubscriptionId;
	}

	public void setStripeSubscriptionId(String stripeSubscriptionId) {
		this.stripeSubscriptionId = stripeSubscriptionId;
	}

	public String getSubscriptionStatus() {
		return subscriptionStatus;
	}

	public void setSubscriptionStatus(String subscriptionStatus) {
		this.subscriptionStatus = subscriptionStatus;
	}

	public String getStripePriceId() {
		return stripePriceId;
	}

	public void setStripePriceId(String stripePriceId) {
		this.stripePriceId = stripePriceId;
	}

	public Instant getCurrentPeriodEnd() {
		return currentPeriodEnd;
	}

	public void setCurrentPeriodEnd(Instant currentPeriodEnd) {
		this.currentPeriodEnd = currentPeriodEnd;
	}

	public boolean isCancelAtPeriodEnd() {
		return cancelAtPeriodEnd;
	}

	public void setCancelAtPeriodEnd(boolean cancelAtPeriodEnd) {
		this.cancelAtPeriodEnd = cancelAtPeriodEnd;
	}

	public Instant getSubscriptionCancelRequestedAt() {
		return subscriptionCancelRequestedAt;
	}

	public void setSubscriptionCancelRequestedAt(Instant subscriptionCancelRequestedAt) {
		this.subscriptionCancelRequestedAt = subscriptionCancelRequestedAt;
	}

	public Instant getSyncedAt() {
		return syncedAt;
	}

	public void setSyncedAt(Instant syncedAt) {
		this.syncedAt = syncedAt;
	}
}
