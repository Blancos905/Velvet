package it.luxury.consumer.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "consumer_profiles")
public class ConsumerProfile {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(nullable = false, unique = true, length = 256)
	private String authSub;

	@Column(length = 320)
	private String email;

	@Column(length = 200)
	private String displayName;

	@Column(length = 40)
	private String phone;

	/** Paese di residenza / contatto — ISO 3166-1 alpha-2 (es. {@code IT}). */
	@Column(length = 2)
	private String country;

	@Column(length = 16)
	private String preferredLocale;

	@Column(name = "password_hash", length = 120)
	private String passwordHash;

	/** SHA-256 esadecimale (64 caratteri) del token inviato per email; nullo se nessun reset in corso. */
	@Column(name = "password_reset_token_hash", length = 64)
	private String passwordResetTokenHash;

	@Column(name = "password_reset_expires_at")
	private Instant passwordResetExpiresAt;

	@Column(name = "email_verified_at")
	private Instant emailVerifiedAt;

	/** SHA-256 esadecimale (64 caratteri) del token inviato per email; nullo se nessuna conferma in corso. */
	@Column(name = "email_verification_token_hash", length = 64)
	private String emailVerificationTokenHash;

		@Column(name = "email_verification_expires_at")
		private Instant emailVerificationExpiresAt;

		/** SHA-256 del segreto di poll creato in registrazione. Nullo dopo l'emissione della sessione. */
		@Column(name = "registration_poll_secret_hash", length = 64)
		private String registrationPollSecretHash;

	/** Valori applicativi separati da virgola, es. {@code CLIENT}, {@code OWNER}. */
	@Column(name = "security_roles", length = 64)
	private String securityRoles;

	@Column(name = "plan_tier", length = 32)
	private String planTier;

	@Column(name = "created_at")
	private Instant createdAt;

	@Column(name = "notification_inbox_sent_ack_at")
	private Instant notificationInboxSentAckAt;

	@Column(name = "notification_inbox_ack_booking_confirmation_at")
	private Instant notificationInboxAckBookingConfirmationAt;

	@Column(name = "notification_inbox_ack_booking_updated_at")
	private Instant notificationInboxAckBookingUpdatedAt;

	@Column(name = "notification_inbox_ack_booking_cancelled_at")
	private Instant notificationInboxAckBookingCancelledAt;

	@Column(name = "notification_inbox_ack_system_at")
	private Instant notificationInboxAckSystemAt;

	@Column(name = "notification_inbox_ack_support_request_at")
	private Instant notificationInboxAckSupportRequestAt;

	/**
	 * Profilo bootstrap super admin: ultima apertura dell'inbox «Messaggi dai saloni» nel pannello admin
	 * (richieste {@code SUPPORT_REQUEST_TO_LUXURY} con {@code supportRequestFromSalon = true}).
	 */
	@Column(name = "admin_luxury_support_inbox_salon_seen_at")
	private Instant adminLuxurySupportInboxSalonSeenAt;

	@Column(name = "deleted_at")
	private Instant deletedAt;

	@Column(name = "terms_accepted_at")
	private Instant termsAcceptedAt;

	@Column(name = "legal_document_version", length = 40)
	private String legalDocumentVersion;

	@Column(name = "dpa_accepted_at")
	private Instant dpaAcceptedAt;

	@Column(name = "dpa_document_version", length = 40)
	private String dpaDocumentVersion;

	/** Data URL compresso (JPEG/PNG/WebP) scelto dal cliente in profilo, pannello e app. */
	@JdbcTypeCode(SqlTypes.LONGVARCHAR)
	@Column(name = "photo_data_url", columnDefinition = "text")
	private String photoDataUrl;

	protected ConsumerProfile() {
	}

	public ConsumerProfile(String authSub, String email, String displayName) {
		this.authSub = authSub;
		this.email = email;
		this.displayName = displayName;
		this.securityRoles = "CLIENT";
	}

	@PrePersist
	void luxuryTouchCreatedAt() {
		if (createdAt == null) {
			createdAt = Instant.now();
		}
	}

	public UUID getId() {
		return id;
	}

	public String getAuthSub() {
		return authSub;
	}

	/** Solo per bootstrap super admin: allinea il sub canonico senza ricreare la riga. */
	public void setAuthSub(String authSub) {
		this.authSub = authSub;
	}

	public String getEmail() {
		return email;
	}

	public String getDisplayName() {
		return displayName;
	}

	public Instant getDeletedAt() {
		return deletedAt;
	}

	public void setDeletedAt(Instant deletedAt) {
		this.deletedAt = deletedAt;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public void setDisplayName(String displayName) {
		this.displayName = displayName;
	}

	public String getPhone() {
		return phone;
	}

	public void setPhone(String phone) {
		this.phone = phone;
	}

	public String getCountry() {
		return country;
	}

	public void setCountry(String country) {
		this.country = country;
	}

	public String getPreferredLocale() {
		return preferredLocale;
	}

	public void setPreferredLocale(String preferredLocale) {
		this.preferredLocale = preferredLocale;
	}

	public String getPasswordHash() {
		return passwordHash;
	}

	public void setPasswordHash(String passwordHash) {
		this.passwordHash = passwordHash;
	}

	public String getPasswordResetTokenHash() {
		return passwordResetTokenHash;
	}

	public void setPasswordResetTokenHash(String passwordResetTokenHash) {
		this.passwordResetTokenHash = passwordResetTokenHash;
	}

	public Instant getPasswordResetExpiresAt() {
		return passwordResetExpiresAt;
	}

	public void setPasswordResetExpiresAt(Instant passwordResetExpiresAt) {
		this.passwordResetExpiresAt = passwordResetExpiresAt;
	}

	public Instant getEmailVerifiedAt() {
		return emailVerifiedAt;
	}

	public void setEmailVerifiedAt(Instant emailVerifiedAt) {
		this.emailVerifiedAt = emailVerifiedAt;
	}

	public String getEmailVerificationTokenHash() {
		return emailVerificationTokenHash;
	}

	public void setEmailVerificationTokenHash(String emailVerificationTokenHash) {
		this.emailVerificationTokenHash = emailVerificationTokenHash;
	}

	public Instant getEmailVerificationExpiresAt() {
		return emailVerificationExpiresAt;
	}

		public void setEmailVerificationExpiresAt(Instant emailVerificationExpiresAt) {
			this.emailVerificationExpiresAt = emailVerificationExpiresAt;
		}

		public String getRegistrationPollSecretHash() {
			return registrationPollSecretHash;
		}

		public void setRegistrationPollSecretHash(String registrationPollSecretHash) {
			this.registrationPollSecretHash = registrationPollSecretHash;
		}

	public String getSecurityRoles() {
		return securityRoles;
	}

	public void setSecurityRoles(String securityRoles) {
		this.securityRoles = securityRoles;
	}

	public String getPlanTier() {
		return planTier;
	}

	public void setPlanTier(String planTier) {
		this.planTier = planTier;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getNotificationInboxSentAckAt() {
		return notificationInboxSentAckAt;
	}

	public void setNotificationInboxSentAckAt(Instant notificationInboxSentAckAt) {
		this.notificationInboxSentAckAt = notificationInboxSentAckAt;
	}

	public Instant getNotificationInboxAckBookingConfirmationAt() {
		return notificationInboxAckBookingConfirmationAt;
	}

	public void setNotificationInboxAckBookingConfirmationAt(Instant notificationInboxAckBookingConfirmationAt) {
		this.notificationInboxAckBookingConfirmationAt = notificationInboxAckBookingConfirmationAt;
	}

	public Instant getNotificationInboxAckBookingUpdatedAt() {
		return notificationInboxAckBookingUpdatedAt;
	}

	public void setNotificationInboxAckBookingUpdatedAt(Instant notificationInboxAckBookingUpdatedAt) {
		this.notificationInboxAckBookingUpdatedAt = notificationInboxAckBookingUpdatedAt;
	}

	public Instant getNotificationInboxAckBookingCancelledAt() {
		return notificationInboxAckBookingCancelledAt;
	}

	public void setNotificationInboxAckBookingCancelledAt(Instant notificationInboxAckBookingCancelledAt) {
		this.notificationInboxAckBookingCancelledAt = notificationInboxAckBookingCancelledAt;
	}

	public Instant getNotificationInboxAckSystemAt() {
		return notificationInboxAckSystemAt;
	}

	public void setNotificationInboxAckSystemAt(Instant notificationInboxAckSystemAt) {
		this.notificationInboxAckSystemAt = notificationInboxAckSystemAt;
	}

	public Instant getNotificationInboxAckSupportRequestAt() {
		return notificationInboxAckSupportRequestAt;
	}

	public void setNotificationInboxAckSupportRequestAt(Instant notificationInboxAckSupportRequestAt) {
		this.notificationInboxAckSupportRequestAt = notificationInboxAckSupportRequestAt;
	}

	public Instant getAdminLuxurySupportInboxSalonSeenAt() {
		return adminLuxurySupportInboxSalonSeenAt;
	}

	public void setAdminLuxurySupportInboxSalonSeenAt(Instant adminLuxurySupportInboxSalonSeenAt) {
		this.adminLuxurySupportInboxSalonSeenAt = adminLuxurySupportInboxSalonSeenAt;
	}

	public Instant getTermsAcceptedAt() {
		return termsAcceptedAt;
	}

	public void setTermsAcceptedAt(Instant termsAcceptedAt) {
		this.termsAcceptedAt = termsAcceptedAt;
	}

	public String getLegalDocumentVersion() {
		return legalDocumentVersion;
	}

	public void setLegalDocumentVersion(String legalDocumentVersion) {
		this.legalDocumentVersion = legalDocumentVersion;
	}

	public Instant getDpaAcceptedAt() {
		return dpaAcceptedAt;
	}

	public void setDpaAcceptedAt(Instant dpaAcceptedAt) {
		this.dpaAcceptedAt = dpaAcceptedAt;
	}

	public String getDpaDocumentVersion() {
		return dpaDocumentVersion;
	}

	public void setDpaDocumentVersion(String dpaDocumentVersion) {
		this.dpaDocumentVersion = dpaDocumentVersion;
	}

	public String getPhotoDataUrl() {
		return photoDataUrl;
	}

	public void setPhotoDataUrl(String photoDataUrl) {
		this.photoDataUrl = (photoDataUrl == null || photoDataUrl.isBlank()) ? null : photoDataUrl;
	}
}
