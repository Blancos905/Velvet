package it.velvet.catalog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "salon_velvet_chat_messages")
public class SalonVelvetChatMessage {

	@Id
	@GeneratedValue
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "salon_client_id", nullable = false)
	private SalonClient salonClient;

	/** {@code null} = conversazione con il titolare; valorizzato = conversazione con l’operatore indicato. */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "staff_operator_id")
	private StaffOperator staffOperator;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 16)
	private SalonVelvetChatSender sender;

	@Column(nullable = false, length = 4000)
	private String body;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	protected SalonVelvetChatMessage() {
	}

	public SalonVelvetChatMessage(SalonClient salonClient, StaffOperator staffOperator, SalonVelvetChatSender sender, String body) {
		this.salonClient = salonClient;
		this.staffOperator = staffOperator;
		this.sender = sender;
		this.body = body;
	}

	@PrePersist
	void velvetTouchCreatedAt() {
		if (createdAt == null) {
			createdAt = Instant.now();
		}
	}

	public UUID getId() {
		return id;
	}

	public SalonClient getSalonClient() {
		return salonClient;
	}

	public StaffOperator getStaffOperator() {
		return staffOperator;
	}

	public SalonVelvetChatSender getSender() {
		return sender;
	}

	public String getBody() {
		return body;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}
