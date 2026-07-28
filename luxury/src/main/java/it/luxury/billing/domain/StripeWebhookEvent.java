package it.luxury.billing.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/** Idempotenza + audit trail eventi webhook Stripe (senza payload completo / PII). */
@Entity
@Table(name = "stripe_webhook_events")
public class StripeWebhookEvent {

	public enum ProcessingStatus {
		PENDING,
		PROCESSED,
		SKIPPED,
		FAILED
	}

	@Id
	@GeneratedValue
	private UUID id;

	@Column(name = "stripe_event_id", nullable = false, unique = true, length = 64)
	private String stripeEventId;

	@Column(name = "event_type", nullable = false, length = 64)
	private String eventType;

	@Column(name = "livemode", nullable = false)
	private boolean livemode;

	@Column(name = "studio_group_id")
	private UUID studioGroupId;

	@Column(name = "payload_hash", length = 64)
	private String payloadHash;

	@Enumerated(EnumType.STRING)
	@Column(name = "processing_status", nullable = false, length = 16)
	private ProcessingStatus processingStatus = ProcessingStatus.PENDING;

	@Column(name = "processed_at")
	private Instant processedAt;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	protected StripeWebhookEvent() {
	}

	public StripeWebhookEvent(String stripeEventId, String eventType, boolean livemode) {
		this.stripeEventId = stripeEventId;
		this.eventType = eventType;
		this.livemode = livemode;
	}

	@PrePersist
	void onCreate() {
		if (createdAt == null) {
			createdAt = Instant.now();
		}
	}

	public UUID getId() {
		return id;
	}

	public String getStripeEventId() {
		return stripeEventId;
	}

	public String getEventType() {
		return eventType;
	}

	public boolean isLivemode() {
		return livemode;
	}

	public UUID getStudioGroupId() {
		return studioGroupId;
	}

	public void setStudioGroupId(UUID studioGroupId) {
		this.studioGroupId = studioGroupId;
	}

	public String getPayloadHash() {
		return payloadHash;
	}

	public void setPayloadHash(String payloadHash) {
		this.payloadHash = payloadHash;
	}

	public ProcessingStatus getProcessingStatus() {
		return processingStatus;
	}

	public void setProcessingStatus(ProcessingStatus processingStatus) {
		this.processingStatus = processingStatus;
	}

	public Instant getProcessedAt() {
		return processedAt;
	}

	public void setProcessedAt(Instant processedAt) {
		this.processedAt = processedAt;
	}
}
