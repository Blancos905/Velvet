package it.velvet.consumer.domain;

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

/**
 * Registrazione cliente / titolare salone in attesa di conferma email.
 * Nessuna riga in {@code consumer_profiles} (né salone in directory) finché il link non è validato.
 */
@Entity
@Table(name = "pending_registrations")
public class PendingRegistration {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(nullable = false, unique = true, length = 320)
	private String email;

	@Column(name = "password_hash", nullable = false, length = 120)
	private String passwordHash;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 16)
	private PendingRegistrationKind kind;

	@Column(name = "payload_json", nullable = false, columnDefinition = "TEXT")
	private String payloadJson;

	@Column(name = "display_name", length = 200)
	private String displayName;

	@Column(name = "verification_token_hash", length = 64)
	private String verificationTokenHash;

	@Column(name = "verification_expires_at")
	private Instant verificationExpiresAt;

	@Column(name = "created_at")
	private Instant createdAt;

	protected PendingRegistration() {
	}

	public PendingRegistration(
			String email,
			String passwordHash,
			PendingRegistrationKind kind,
			String payloadJson,
			String displayName) {
		this.email = email;
		this.passwordHash = passwordHash;
		this.kind = kind;
		this.payloadJson = payloadJson;
		this.displayName = displayName;
	}

	@PrePersist
	void touchCreatedAt() {
		if (createdAt == null) {
			createdAt = Instant.now();
		}
	}

	public UUID getId() {
		return id;
	}

	public String getEmail() {
		return email;
	}

	public String getPasswordHash() {
		return passwordHash;
	}

	public PendingRegistrationKind getKind() {
		return kind;
	}

	public String getPayloadJson() {
		return payloadJson;
	}

	public String getDisplayName() {
		return displayName;
	}

	public String getVerificationTokenHash() {
		return verificationTokenHash;
	}

	public void setVerificationTokenHash(String verificationTokenHash) {
		this.verificationTokenHash = verificationTokenHash;
	}

	public Instant getVerificationExpiresAt() {
		return verificationExpiresAt;
	}

	public void setVerificationExpiresAt(Instant verificationExpiresAt) {
		this.verificationExpiresAt = verificationExpiresAt;
	}
}
