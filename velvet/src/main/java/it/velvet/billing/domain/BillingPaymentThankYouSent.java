package it.velvet.billing.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.util.UUID;

/** Idempotenza email «grazie pagamento» (checkout session o fattura Stripe). */
@Entity
@Table(
		name = "billing_payment_thank_you_sent",
		uniqueConstraints = @UniqueConstraint(name = "uk_billing_payment_thank_you_stripe_ref", columnNames = "stripe_reference"))
public class BillingPaymentThankYouSent {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(name = "stripe_reference", nullable = false, length = 128)
	private String stripeReference;

	@Column(name = "studio_group_id", nullable = false)
	private UUID studioGroupId;

	@Column(name = "sent_at", nullable = false)
	private Instant sentAt;

	protected BillingPaymentThankYouSent() {
	}

	public BillingPaymentThankYouSent(String stripeReference, UUID studioGroupId) {
		this.stripeReference = stripeReference;
		this.studioGroupId = studioGroupId;
	}

	@PrePersist
	void onCreate() {
		if (sentAt == null) {
			sentAt = Instant.now();
		}
	}

	public UUID getId() {
		return id;
	}

	public String getStripeReference() {
		return stripeReference;
	}

	public UUID getStudioGroupId() {
		return studioGroupId;
	}

	public Instant getSentAt() {
		return sentAt;
	}
}
