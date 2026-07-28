package it.luxury.studio.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Entity
@Table(name = "studio_groups")
public class StudioGroup {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(nullable = false, length = 200)
	private String name;

	/** Email titolare (normalizzata) alla registrazione `/piani` — per `GET /api/v1/me/salon`. */
	@Column(name = "owner_email", unique = true, length = 320)
	private String ownerEmail;

	/** Subject JWT (claim {@code sub}) — correlazione affidabile quando l'access token non espone {@code email}. */
	@Column(name = "owner_auth_sub", unique = true, length = 64)
	private String ownerAuthSub;

	/** Piano commerciale: {@code BASE} (Free) o {@code PREMIUM}. In persistenza storica possono comparire {@code STANDARD}/{@code FULL}, normalizzati a {@code PREMIUM}. */
	@Column(name = "plan_tier", nullable = false, length = 16)
	private String planTier = "BASE";

	/** Salone provider (impostato dal super admin in creazione). */
	@Column(name = "provider", nullable = false)
	private boolean provider = false;

	/** Hash bcrypt del PIN per accesso alle statistiche (solo piano Premium, scelto in registrazione). */
	@Column(name = "statistics_pin_hash", length = 120)
	private String statisticsPinHash;

	@Column(name = "created_at")
	private Instant createdAt;

	/**
	 * Le email già inviate con {@code sent_at} precedente o uguale a questo istante non contano più nel centro notifiche
	 * (conteggi «Inviate» ed elenco espanso), finché non arrivano nuove inviate successive.
	 */
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

	protected StudioGroup() {
	}

	@PrePersist
	void luxuryTouchCreatedAt() {
		if (createdAt == null) {
			createdAt = Instant.now();
		}
	}

	public StudioGroup(String name) {
		this.name = name;
		this.planTier = "BASE";
	}

	public StudioGroup(String name, String ownerEmail, String planTier) {
		this(name, ownerEmail, planTier, null);
	}

	public StudioGroup(String name, String ownerEmail, String planTier, String ownerAuthSub) {
		this.name = name;
		this.ownerEmail = ownerEmail != null ? ownerEmail.trim().toLowerCase(Locale.ROOT) : null;
		this.planTier = normalizePlanTier(planTier);
		this.ownerAuthSub = normalizeAuthSub(ownerAuthSub);
	}

	private static String normalizePlanTier(String raw) {
		if (raw == null || raw.isBlank()) {
			return "BASE";
		}
		String u = raw.trim().toUpperCase(Locale.ROOT);
		return switch (u) {
			case "BASE" -> "BASE";
			case "PREMIUM", "STANDARD", "FULL" -> "PREMIUM";
			default -> "BASE";
		};
	}

	/** Valore esposto in API: unifica tier legacy a {@code PREMIUM}. */
	public static String canonicalPlanTier(String stored) {
		return normalizePlanTier(stored);
	}

	public UUID getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getOwnerEmail() {
		return ownerEmail;
	}

	public void setOwnerEmail(String ownerEmail) {
		this.ownerEmail = ownerEmail != null ? ownerEmail.trim().toLowerCase(Locale.ROOT) : null;
	}

	public String getOwnerAuthSub() {
		return ownerAuthSub;
	}

	public String getPlanTier() {
		return planTier;
	}

	/** Aggiornamento piano (es. da pannello super admin); normalizza come in costruttore. */
	public void applyPlanTier(String raw) {
		this.planTier = normalizePlanTier(raw);
	}

	public boolean isProvider() {
		return provider;
	}

	public void setProvider(boolean provider) {
		this.provider = provider;
	}

	public String getStatisticsPinHash() {
		return statisticsPinHash;
	}

	public void setStatisticsPinHash(String statisticsPinHash) {
		this.statisticsPinHash = statisticsPinHash;
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

	/**
	 * Allinea {@code owner_auth_sub} se mancante (es. riga creata prima dell’introduzione del campo o retry dopo errore parziale).
	 *
	 * @return true se il valore è stato aggiornato in memoria (persistenza a carico del chiamante)
	 */
	public boolean assignOwnerAuthSubIfUnset(String sub) {
		String norm = normalizeAuthSub(sub);
		if (norm == null) {
			return false;
		}
		if (this.ownerAuthSub != null && !this.ownerAuthSub.isBlank()) {
			return false;
		}
		this.ownerAuthSub = norm;
		return true;
	}

	private static String normalizeAuthSub(String ownerAuthSub) {
		if (ownerAuthSub == null || ownerAuthSub.isBlank()) {
			return null;
		}
		return ownerAuthSub.trim().toLowerCase(Locale.ROOT);
	}
}
