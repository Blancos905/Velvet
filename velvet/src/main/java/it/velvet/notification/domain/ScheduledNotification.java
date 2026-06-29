package it.velvet.notification.domain;

import it.velvet.appointment.domain.Appointment;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.studio.domain.StudioGroup;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "scheduled_notifications")
public class ScheduledNotification {

	/**
	 * Soggetto usato in passato per messaggi in-app su nuova recensione cliente; non più creati — restano esclusi dal
	 * centro notifiche salone (si usa la pagina Recensioni).
	 */
	public static final String LEGACY_SALON_REVIEW_INBOX_SUBJECT = "Nuova recensione ricevuta";

	@Id
	@GeneratedValue
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = true)
	@JoinColumn(name = "appointment_id")
	private Appointment appointment;

	/** Per {@link NotificationType#ADMIN_PLATFORM_MESSAGE}: salone destinatario (senza appuntamento). */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "studio_group_id")
	private StudioGroup studioGroup;

	/** Per {@link NotificationType#SUPPORT_REQUEST_TO_VELVET}: profilo consumer del super admin che riceve l'inbox.
	 *  Per {@link NotificationType#ADMIN_PLATFORM_MESSAGE} senza appuntamento: profilo cliente destinatario. */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "recipient_consumer_id")
	private ConsumerProfile recipientConsumer;

	@Column(name = "platform_message_subject", length = 200)
	private String platformMessageSubject;

	@Column(name = "platform_message_body", length = 4000)
	private String platformMessageBody;

	/** Per {@link NotificationType#SUPPORT_REQUEST_TO_VELVET}: richiesta inviata da titolare o staff salone. */
	@Column(name = "support_request_from_salon")
	private Boolean supportRequestFromSalon;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 32)
	private NotificationType type;

	@Column(name = "scheduled_at", nullable = false)
	private Instant scheduledAt;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 16)
	private QueuedNotificationStatus status = QueuedNotificationStatus.PENDING;

	@Column(name = "sent_at")
	private Instant sentAt;

	/** Se valorizzato, il messaggio e' stato rimosso dalla inbox titolare. */
	@Column(name = "owner_deleted_at")
	private Instant ownerDeletedAt;

	/**
	 * Rimosso dalla inbox degli account staff (operatore); il titolare continua a vedere la riga finché non usa
	 * {@link #ownerDeletedAt}.
	 */
	@Column(name = "staff_deleted_at")
	private Instant staffDeletedAt;

	/** Se valorizzato, rimosso dalla inbox assistenza del super admin ({@link #recipientConsumer}). */
	@Column(name = "recipient_consumer_deleted_at")
	private Instant recipientConsumerDeletedAt;

	/** Se valorizzato, il messaggio e' stato rimosso dalla inbox cliente. */
	@Column(name = "consumer_deleted_at")
	private Instant consumerDeletedAt;

	/** Colonna legacy (ex invio WhatsApp via webhook); non più popolata. */
	@Column(name = "whatsapp_sent_at")
	private Instant whatsappSentAt;

	protected ScheduledNotification() {
	}

	public ScheduledNotification(Appointment appointment, NotificationType type, Instant scheduledAt) {
		this.appointment = appointment;
		this.type = type;
		this.scheduledAt = scheduledAt;
	}

	/**
	 * Avviso solo inbox titolare/staff: nessun canale esterno, disponibile subito nel centro notifiche salone.
	 */
	public static ScheduledNotification salonInboxDelivered(Appointment appointment, NotificationType type) {
		Instant now = Instant.now();
		ScheduledNotification n = new ScheduledNotification(appointment, type, now);
		n.status = QueuedNotificationStatus.SENT;
		n.sentAt = now;
		return n;
	}

	/** Messaggio centro notifiche titolare: già consegnato in-app, nessun job email. */
	public static ScheduledNotification adminPlatformInbox(StudioGroup group, String subject, String body, Instant at) {
		ScheduledNotification n = new ScheduledNotification();
		n.studioGroup = group;
		n.appointment = null;
		n.type = NotificationType.ADMIN_PLATFORM_MESSAGE;
		n.scheduledAt = at;
		n.status = QueuedNotificationStatus.SENT;
		n.sentAt = at;
		String s = subject != null ? subject.trim() : "";
		n.platformMessageSubject = s.isEmpty() ? "Messaggio da Saloni Luxury" : s.substring(0, Math.min(s.length(), 200));
		n.platformMessageBody = body != null ? body.trim() : "";
		return n;
	}

	/** Messaggio centro notifiche cliente (bucket «Messaggi Luxury» / SYSTEM): già consegnato in-app. */
	public static ScheduledNotification adminPlatformInboxForConsumer(
			ConsumerProfile consumer, String subject, String body, Instant at) {
		ScheduledNotification n = new ScheduledNotification();
		n.recipientConsumer = consumer;
		n.appointment = null;
		n.studioGroup = null;
		n.type = NotificationType.ADMIN_PLATFORM_MESSAGE;
		n.scheduledAt = at;
		n.status = QueuedNotificationStatus.SENT;
		n.sentAt = at;
		String s = subject != null ? subject.trim() : "";
		n.platformMessageSubject = s.isEmpty() ? "Messaggio da Saloni Luxury" : s.substring(0, Math.min(s.length(), 200));
		n.platformMessageBody = body != null ? body.trim() : "";
		return n;
	}

	/** Richiesta assistenza da form account: consegnata in-app al super admin, senza coda email. */
	public static ScheduledNotification supportRequestToVelvetInbox(
			ConsumerProfile recipient,
			String subject,
			String body,
			Instant at,
			boolean fromSalonSide) {
		ScheduledNotification n = new ScheduledNotification();
		n.recipientConsumer = recipient;
		n.appointment = null;
		n.studioGroup = null;
		n.type = NotificationType.SUPPORT_REQUEST_TO_VELVET;
		n.scheduledAt = at;
		n.status = QueuedNotificationStatus.SENT;
		n.sentAt = at;
		n.supportRequestFromSalon = fromSalonSide;
		String s = subject != null ? subject.trim() : "";
		n.platformMessageSubject = s.isEmpty() ? "Richiesta assistenza" : s.substring(0, Math.min(s.length(), 200));
		String b = body != null ? body.trim() : "";
		n.platformMessageBody = b.length() > 4000 ? b.substring(0, 4000) : b;
		return n;
	}

	public UUID getId() {
		return id;
	}

	public Appointment getAppointment() {
		return appointment;
	}

	public StudioGroup getStudioGroup() {
		return studioGroup;
	}

	public ConsumerProfile getRecipientConsumer() {
		return recipientConsumer;
	}

	public Instant getRecipientConsumerDeletedAt() {
		return recipientConsumerDeletedAt;
	}

	public void markRecipientConsumerDeleted(Instant at) {
		this.recipientConsumerDeletedAt = at;
	}

	public String getPlatformMessageSubject() {
		return platformMessageSubject;
	}

	public String getPlatformMessageBody() {
		return platformMessageBody;
	}

	public Boolean getSupportRequestFromSalon() {
		return supportRequestFromSalon;
	}

	public NotificationType getType() {
		return type;
	}

	public Instant getScheduledAt() {
		return scheduledAt;
	}

	public QueuedNotificationStatus getStatus() {
		return status;
	}

	public void setStatus(QueuedNotificationStatus status) {
		this.status = status;
	}

	public Instant getSentAt() {
		return sentAt;
	}

	public void markSent(Instant at) {
		this.status = QueuedNotificationStatus.SENT;
		this.sentAt = at;
	}

	public Instant getOwnerDeletedAt() {
		return ownerDeletedAt;
	}

	public void markOwnerDeleted(Instant at) {
		this.ownerDeletedAt = at;
	}

	public Instant getStaffDeletedAt() {
		return staffDeletedAt;
	}

	public void markStaffDeleted(Instant at) {
		this.staffDeletedAt = at;
	}

	public Instant getConsumerDeletedAt() {
		return consumerDeletedAt;
	}

	public void markConsumerDeleted(Instant at) {
		this.consumerDeletedAt = at;
	}

	public Instant getWhatsappSentAt() {
		return whatsappSentAt;
	}

	public void setWhatsappSentAt(Instant whatsappSentAt) {
		this.whatsappSentAt = whatsappSentAt;
	}
}
