package it.velvet.studio.service;

import it.velvet.appointment.domain.Appointment;
import it.velvet.catalog.domain.StaffOperator;
import it.velvet.catalog.domain.StaffOperatorRepository;
import it.velvet.common.api.BusinessException;
import it.velvet.notification.domain.NotificationType;
import it.velvet.notification.domain.QueuedNotificationStatus;
import it.velvet.notification.domain.ScheduledNotification;
import it.velvet.notification.domain.ScheduledNotificationRepository;
import it.velvet.security.auth.VelvetUserPrincipal;
import it.velvet.studio.domain.Location;
import it.velvet.studio.domain.StudioGroup;
import it.velvet.studio.domain.StudioGroupRepository;
import it.velvet.studio.dto.MeSalonNotificationInboxDto;
import it.velvet.studio.dto.MeSalonNotificationMessageDto;
import it.velvet.studio.dto.MeSalonNotificationTypeStatDto;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class MeSalonNotificationInboxService {

	private final StudioGroupOwnerResolver studioGroupOwnerResolver;
	private final StudioGroupRepository studioGroupRepository;
	private final StaffOperatorRepository staffOperatorRepository;
	private final ScheduledNotificationRepository scheduledNotificationRepository;
	private final MeSalonOwnerOrphanRepairService meSalonOwnerOrphanRepairService;

	public MeSalonNotificationInboxService(
			StudioGroupOwnerResolver studioGroupOwnerResolver,
			StudioGroupRepository studioGroupRepository,
			StaffOperatorRepository staffOperatorRepository,
			ScheduledNotificationRepository scheduledNotificationRepository,
			MeSalonOwnerOrphanRepairService meSalonOwnerOrphanRepairService) {
		this.studioGroupOwnerResolver = studioGroupOwnerResolver;
		this.studioGroupRepository = studioGroupRepository;
		this.staffOperatorRepository = staffOperatorRepository;
		this.scheduledNotificationRepository = scheduledNotificationRepository;
		this.meSalonOwnerOrphanRepairService = meSalonOwnerOrphanRepairService;
	}

	/**
	 * Titolare: {@code staffOperator == null} (tutte le notifiche dello studio).
	 * Operatore: profilo collegato a {@link StaffOperator} — per le email legate agli appuntamenti solo righe con
	 * {@code appointment.operator} uguale a quell'operatore (nessuna notifica degli altri operatori). Messaggi
	 * piattaforma ({@code ADMIN_PLATFORM_MESSAGE} senza appuntamento) sono condivisi dallo studio: una sola colonna
	 * {@code staffDeletedAt} implica che la rimozione da uno staff nasconda il messaggio anche agli altri (limite
	 * modello dati).
	 */
	private record SalonNotificationInboxActor(StudioGroup studioGroup, StaffOperator staffOperator) {
		UUID operatorFilterId() {
			return staffOperator != null ? staffOperator.getId() : null;
		}
	}

	private static final int MESSAGE_PAGE_SIZE = 80;
	private static final DateTimeFormatter IT_DATE =
			DateTimeFormatter.ofPattern("d MMMM uuuu", Locale.ITALIAN);
	private static final DateTimeFormatter IT_TIME = DateTimeFormatter.ofPattern("HH:mm");

	@Transactional(readOnly = true)
	public MeSalonNotificationInboxDto resolve(VelvetUserPrincipal principal) {
		if (principal == null || principal.getSubject() == null || principal.getSubject().isBlank()) {
			return emptyInbox();
		}
		Optional<SalonNotificationInboxActor> actor = resolveActor(principal);
		if (actor.isPresent()) {
			return buildInbox(actor.get());
		}
		if (principal.hasAppRole("OWNER")) {
			meSalonOwnerOrphanRepairService.tryRepairIfOwnerWithNoStudio(principal);
			return resolveActor(principal).map(this::buildInbox).orElseGet(MeSalonNotificationInboxService::emptyInbox);
		}
		return emptyInbox();
	}

	/**
	 * Il titolare conferma di aver consultato le email già inviate: fino a questo istante spariscono da conteggi «Inviate»
	 * e dall'elenco espanso; restano in database e ricompaiono se ne arrivano di nuove dopo l'ack.
	 */
	@Transactional
	public MeSalonNotificationInboxDto acknowledgeSentInbox(VelvetUserPrincipal principal) {
		if (principal == null || principal.getSubject() == null || principal.getSubject().isBlank()) {
			return emptyInbox();
		}
		SalonNotificationInboxActor actor = ensureActorForWrite(principal);
		Instant now = Instant.now();
		if (actor.staffOperator() != null) {
			actor.staffOperator().setNotificationInboxSentAckAt(now);
			staffOperatorRepository.save(actor.staffOperator());
		}
		else {
			actor.studioGroup().setNotificationInboxSentAckAt(now);
			studioGroupRepository.save(actor.studioGroup());
		}
		return buildInbox(actor);
	}

	/** Conferma consultazione di una categoria: azzera quella riga fino a nuove notifiche successive. */
	@Transactional
	public MeSalonNotificationInboxDto acknowledgeBucketInbox(VelvetUserPrincipal principal, String bucketParam) {
		if (principal == null || principal.getSubject() == null || principal.getSubject().isBlank()) {
			return emptyInbox();
		}
		NotificationBucket bucket = parseBucket(bucketParam);
		SalonNotificationInboxActor actor = ensureActorForWrite(principal);
		Instant now = Instant.now();
		if (actor.staffOperator() != null) {
			setBucketAckAt(actor.staffOperator(), bucket, now);
			staffOperatorRepository.save(actor.staffOperator());
		}
		else {
			setBucketAckAt(actor.studioGroup(), bucket, now);
			studioGroupRepository.save(actor.studioGroup());
		}
		return buildInbox(actor);
	}

	/**
	 * Storico notifiche per categoria (stesso raggruppamento dei conteggi in {@link #resolve}).
	 * Non applica l'ack di consultazione: il titolare/lo staff vedono tutte le righe non eliminate e possono
	 * rimuoverle singolarmente; l'ack bucket azzera solo i conteggi in inbox fino a nuovi messaggi.
	 */
	@Transactional(readOnly = true)
	public List<MeSalonNotificationMessageDto> listMessagesForBucket(VelvetUserPrincipal principal, String bucketParam) {
		if (principal == null || principal.getSubject() == null || principal.getSubject().isBlank()) {
			return List.of();
		}
		NotificationBucket bucket = parseBucket(bucketParam);
		List<NotificationType> types = typesForBucket(bucket);
		if (types.isEmpty()) {
			return List.of();
		}
		Optional<SalonNotificationInboxActor> actor = resolveActor(principal);
		if (actor.isPresent()) {
			return loadMessagesForActor(actor.get(), types, bucket);
		}
		if (principal.hasAppRole("OWNER")) {
			meSalonOwnerOrphanRepairService.tryRepairIfOwnerWithNoStudio(principal);
			return resolveActor(principal).map(a -> loadMessagesForActor(a, types, bucket)).orElse(List.of());
		}
		return List.of();
	}

	@Transactional
	public void deleteMessage(VelvetUserPrincipal principal, UUID messageId) {
		if (principal == null || principal.getSubject() == null || principal.getSubject().isBlank() || messageId == null) {
			return;
		}
		SalonNotificationInboxActor actor = ensureActorForWrite(principal);
		Instant now = Instant.now();
		StudioGroup g = actor.studioGroup();
		if (actor.staffOperator() != null) {
			UUID operatorId = actor.staffOperator().getId();
			int updated = scheduledNotificationRepository.markStaffDeletedForAppointmentMessage(messageId, g.getId(), operatorId, now);
			if (updated == 0) {
				int platform = scheduledNotificationRepository.markStaffDeletedPlatformMessage(
						messageId,
						g.getId(),
						NotificationType.ADMIN_PLATFORM_MESSAGE,
						now);
				if (platform == 0) {
					throw new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Notifica non trovata.");
				}
			}
			return;
		}
		int updated = scheduledNotificationRepository.markDeletedForOwner(messageId, g.getId(), now);
		if (updated == 0) {
			int platform = scheduledNotificationRepository.markDeletedPlatformForOwner(
					messageId,
					g.getId(),
					NotificationType.ADMIN_PLATFORM_MESSAGE,
					now);
			if (platform == 0) {
				throw new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Notifica non trovata.");
			}
		}
	}

	private Optional<SalonNotificationInboxActor> resolveActor(VelvetUserPrincipal principal) {
		Optional<StudioGroup> ownerGroup = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal);
		if (ownerGroup.isPresent()) {
			return Optional.of(new SalonNotificationInboxActor(ownerGroup.get(), null));
		}
		UUID profileId = principal.getProfileId();
		String sub = principal.getSubject();
		if (profileId == null && (sub == null || sub.isBlank())) {
			return Optional.empty();
		}
		return staffOperatorRepository
				.resolveLinkedOperatorForInbox(profileId, sub != null ? sub : "")
				.map(op -> new SalonNotificationInboxActor(op.getLocation().getStudioGroup(), op));
	}

	private SalonNotificationInboxActor ensureActorForWrite(VelvetUserPrincipal principal) {
		Optional<SalonNotificationInboxActor> actor = resolveActor(principal);
		if (actor.isPresent()) {
			return actor.get();
		}
		if (principal.hasAppRole("OWNER")) {
			meSalonOwnerOrphanRepairService.tryRepairIfOwnerWithNoStudio(principal);
			return resolveActor(principal).orElseThrow(
					() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Nessuno studio associato a questo account."));
		}
		throw new BusinessException(
				HttpStatus.NOT_FOUND,
				"NOT_FOUND",
				"Nessun profilo operatore collegato a questo account.");
	}

	private List<MeSalonNotificationMessageDto> loadMessagesForActor(
			SalonNotificationInboxActor actor,
			List<NotificationType> types,
			NotificationBucket bucket) {
		UUID studioGroupId = actor.studioGroup().getId();
		UUID operatorId = actor.operatorFilterId();
		if (types.size() == 1 && types.get(0) == NotificationType.ADMIN_PLATFORM_MESSAGE) {
			List<ScheduledNotification> rows = scheduledNotificationRepository.findRecentPlatformByStudioGroupAck(
					studioGroupId,
					NotificationType.ADMIN_PLATFORM_MESSAGE,
					QueuedNotificationStatus.SENT,
					null,
					operatorId,
					ScheduledNotification.LEGACY_SALON_REVIEW_INBOX_SUBJECT,
					PageRequest.of(0, MESSAGE_PAGE_SIZE));
			return rows.stream().map(this::toMessageDto).toList();
		}
		List<ScheduledNotification> rows = scheduledNotificationRepository.findRecentByStudioGroupAndTypesAck(
				studioGroupId,
				types,
				QueuedNotificationStatus.PENDING,
				QueuedNotificationStatus.SENT,
				null,
				operatorId,
				PageRequest.of(0, MESSAGE_PAGE_SIZE));
		return rows.stream().map(this::toMessageDto).toList();
	}

	private MeSalonNotificationMessageDto toMessageDto(ScheduledNotification n) {
		if (n.getType() == NotificationType.ADMIN_PLATFORM_MESSAGE) {
			String title = n.getPlatformMessageSubject() != null && !n.getPlatformMessageSubject().isBlank()
					? n.getPlatformMessageSubject().trim()
					: "Saloni Luxury";
			String body = n.getPlatformMessageBody() != null ? n.getPlatformMessageBody().trim() : "";
			String preview = body.length() > 280 ? body.substring(0, 277) + "…" : body;
			return new MeSalonNotificationMessageDto(
					n.getId(),
					n.getType().name(),
					n.getStatus().name(),
					n.getScheduledAt(),
					n.getSentAt(),
					null,
					title,
					preview.isEmpty() ? "Messaggio da Saloni Luxury." : preview);
		}
		Appointment a = n.getAppointment();
		if (a == null) {
			return new MeSalonNotificationMessageDto(
					n.getId(),
					n.getType().name(),
					n.getStatus().name(),
					n.getScheduledAt(),
					n.getSentAt(),
					null,
					"Cliente",
					previewWithoutAppointment(n.getType()));
		}
		Location loc = a.getLocation();
		String clientName = a.getSalonClient() != null && a.getSalonClient().getDisplayName() != null
				? a.getSalonClient().getDisplayName()
				: "Cliente";
		ZoneId zone = safeZone(loc != null ? loc.getTimeZone() : null);
		ZonedDateTime startLocal = a.getStart() != null ? ZonedDateTime.ofInstant(a.getStart(), zone) : null;
		String dateStr = startLocal != null ? IT_DATE.format(startLocal) : "data non disponibile";
		String timeStr = startLocal != null ? IT_TIME.format(startLocal) : "ora non disponibile";
		String operatorName = operatorDisplayName(a);
		String preview = buildPreviewLine(n.getType(), clientName, dateStr, timeStr, operatorName);
		return new MeSalonNotificationMessageDto(
				n.getId(),
				n.getType().name(),
				n.getStatus().name(),
				n.getScheduledAt(),
				n.getSentAt(),
				a.getId(),
				clientName,
				preview);
	}

	private static String previewWithoutAppointment(NotificationType type) {
		return switch (type) {
			case BOOKING_CONFIRMATION -> "Conferma prenotazione inviata.";
			case BOOKING_UPDATED -> "Aggiornamento prenotazione inviato.";
			case BOOKING_CANCELLED_BY_CONSUMER, BOOKING_CANCELLED_BY_SALON -> "Annullamento prenotazione inviato.";
			case BOOKING_CREATED_FOR_SALON -> "Nuova richiesta prenotazione registrata.";
			case REMINDER_24H -> "Promemoria appuntamento inviato.";
			case REMINDER_1H -> "Promemoria (circa 2 ore prima) inviato.";
			case REVIEW_INVITE -> "Invito recensione inviato.";
			case ADMIN_PLATFORM_MESSAGE -> "Messaggio da Saloni Luxury.";
			case SUPPORT_REQUEST_TO_VELVET -> "Richiesta assistenza.";
		};
	}

	private static ZoneId safeZone(String tz) {
		if (tz == null || tz.isBlank()) {
			return ZoneId.of("Europe/Rome");
		}
		try {
			return ZoneId.of(tz.trim());
		}
		catch (RuntimeException ignored) {
			return ZoneId.of("Europe/Rome");
		}
	}

	private static String operatorDisplayName(Appointment a) {
		StaffOperator op = a.getOperator();
		if (op == null || op.getDisplayName() == null || op.getDisplayName().isBlank()) {
			return null;
		}
		return op.getDisplayName().trim();
	}

	private static String withOperator(String base, String operatorName) {
		if (operatorName == null || operatorName.isBlank()) {
			return base;
		}
		return base + " con " + operatorName.trim();
	}

	private static String buildPreviewLine(
			NotificationType type, String clientName, String dateStr, String timeStr, String operatorName) {
		return switch (type) {
			case BOOKING_CONFIRMATION ->
					withOperator(clientName + " ha prenotato il " + dateStr + " alle " + timeStr, operatorName) + ".";
			case BOOKING_UPDATED ->
					withOperator(clientName + " ha aggiornato la prenotazione al " + dateStr + " alle " + timeStr, operatorName)
							+ ".";
			case BOOKING_CANCELLED_BY_CONSUMER, BOOKING_CANCELLED_BY_SALON ->
					withOperator(
									clientName + " — annullamento per l'appuntamento del " + dateStr + " alle " + timeStr,
									operatorName)
							+ ".";
			case BOOKING_CREATED_FOR_SALON ->
					withOperator(clientName + " ha richiesto il " + dateStr + " alle " + timeStr, operatorName)
							+ " — in attesa di conferma.";
			case REMINDER_24H ->
					withOperator("Promemoria: " + clientName + " — appuntamento il " + dateStr + " alle " + timeStr, operatorName)
							+ ".";
			case REMINDER_1H ->
					withOperator(
									"Promemoria (circa 2 ore prima): "
											+ clientName
											+ " — appuntamento il "
											+ dateStr
											+ " alle "
											+ timeStr,
									operatorName)
							+ ".";
			case REVIEW_INVITE ->
					withOperator("Invito recensione: " + clientName + " — servizio il " + dateStr + " alle " + timeStr, operatorName)
							+ ".";
			case ADMIN_PLATFORM_MESSAGE -> "Messaggio da Saloni Luxury.";
			case SUPPORT_REQUEST_TO_VELVET -> "Richiesta assistenza.";
		};
	}

	private static NotificationBucket parseBucket(String raw) {
		if (raw == null || raw.isBlank()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Parametro bucket obbligatorio.");
		}
		try {
			return NotificationBucket.valueOf(raw.trim());
		}
		catch (IllegalArgumentException e) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Tipo notifica non valido.");
		}
	}

	private static List<NotificationType> typesForBucket(NotificationBucket b) {
		return switch (b) {
			case BOOKING_CONFIRMATION -> List.of(
					NotificationType.BOOKING_CREATED_FOR_SALON,
					NotificationType.BOOKING_CONFIRMATION); /* REVIEW_INVITE: solo inbox cliente */
			case BOOKING_UPDATED -> List.of(NotificationType.BOOKING_UPDATED);
			case BOOKING_CANCELLED -> List.of(
					NotificationType.BOOKING_CANCELLED_BY_CONSUMER,
					NotificationType.BOOKING_CANCELLED_BY_SALON);
			case SYSTEM -> List.of(NotificationType.ADMIN_PLATFORM_MESSAGE);
		};
	}

	private MeSalonNotificationInboxDto buildInbox(SalonNotificationInboxActor actor) {
		UUID studioGroupId = actor.studioGroup().getId();
		UUID operatorId = actor.operatorFilterId();
		List<MeSalonNotificationTypeStatDto> rows = new java.util.ArrayList<>();
		for (NotificationBucket t : NotificationBucket.values()) {
			if (t == NotificationBucket.SYSTEM) {
				Instant cutoff = effectiveAck(actor, t);
				long sentCount = scheduledNotificationRepository.countSentPlatformByStudioGroupAfter(
						studioGroupId,
						NotificationType.ADMIN_PLATFORM_MESSAGE,
						QueuedNotificationStatus.SENT,
						cutoff,
						operatorId,
						ScheduledNotification.LEGACY_SALON_REVIEW_INBOX_SUBJECT);
				rows.add(new MeSalonNotificationTypeStatDto(t.name(), italianLabel(t), sentCount, 0));
				continue;
			}
			List<NotificationType> types = typesForBucket(t);
			if (types.isEmpty()) {
				rows.add(new MeSalonNotificationTypeStatDto(t.name(), italianLabel(t), 0, 0));
				continue;
			}
			Instant cutoff = effectiveAck(actor, t);
			long sentCount = scheduledNotificationRepository.countSentByStudioGroupAndTypesAfter(
					studioGroupId, types, QueuedNotificationStatus.SENT, cutoff, operatorId);
			long pendingCount = scheduledNotificationRepository.countPendingByStudioGroupAndTypesAfter(
					studioGroupId, types, QueuedNotificationStatus.PENDING, cutoff, operatorId);
			rows.add(new MeSalonNotificationTypeStatDto(
					t.name(),
					italianLabel(t),
					sentCount,
					pendingCount));
		}
		return new MeSalonNotificationInboxDto(rows);
	}

	private static MeSalonNotificationInboxDto emptyInbox() {
		List<MeSalonNotificationTypeStatDto> rows = new java.util.ArrayList<>();
		for (NotificationBucket t : NotificationBucket.values()) {
			rows.add(new MeSalonNotificationTypeStatDto(t.name(), italianLabel(t), 0, 0));
		}
		return new MeSalonNotificationInboxDto(rows);
	}

	private static String italianLabel(NotificationBucket t) {
		return switch (t) {
			case BOOKING_CONFIRMATION -> "Email — prenotazioni e conferme clienti";
			case BOOKING_UPDATED -> "Email — prenotazione aggiornata";
			case BOOKING_CANCELLED -> "Email — annullamento prenotazione";
			case SYSTEM -> "Messaggi Saloni Luxury";
		};
	}

	private static Instant bucketAckAt(StudioGroup group, NotificationBucket bucket) {
		return switch (bucket) {
			case BOOKING_CONFIRMATION -> group.getNotificationInboxAckBookingConfirmationAt();
			case BOOKING_UPDATED -> group.getNotificationInboxAckBookingUpdatedAt();
			case BOOKING_CANCELLED -> group.getNotificationInboxAckBookingCancelledAt();
			case SYSTEM -> group.getNotificationInboxAckSystemAt();
		};
	}

	private static Instant bucketAckAt(StaffOperator op, NotificationBucket bucket) {
		return switch (bucket) {
			case BOOKING_CONFIRMATION -> op.getNotificationInboxAckBookingConfirmationAt();
			case BOOKING_UPDATED -> op.getNotificationInboxAckBookingUpdatedAt();
			case BOOKING_CANCELLED -> op.getNotificationInboxAckBookingCancelledAt();
			case SYSTEM -> op.getNotificationInboxAckSystemAt();
		};
	}

	private static void setBucketAckAt(StudioGroup group, NotificationBucket bucket, Instant ackAt) {
		switch (bucket) {
			case BOOKING_CONFIRMATION -> group.setNotificationInboxAckBookingConfirmationAt(ackAt);
			case BOOKING_UPDATED -> group.setNotificationInboxAckBookingUpdatedAt(ackAt);
			case BOOKING_CANCELLED -> group.setNotificationInboxAckBookingCancelledAt(ackAt);
			case SYSTEM -> group.setNotificationInboxAckSystemAt(ackAt);
			default -> throw new IllegalArgumentException("Bucket notifica non gestito: " + bucket);
		}
	}

	private static void setBucketAckAt(StaffOperator op, NotificationBucket bucket, Instant ackAt) {
		switch (bucket) {
			case BOOKING_CONFIRMATION -> op.setNotificationInboxAckBookingConfirmationAt(ackAt);
			case BOOKING_UPDATED -> op.setNotificationInboxAckBookingUpdatedAt(ackAt);
			case BOOKING_CANCELLED -> op.setNotificationInboxAckBookingCancelledAt(ackAt);
			case SYSTEM -> op.setNotificationInboxAckSystemAt(ackAt);
			default -> throw new IllegalArgumentException("Bucket notifica non gestito: " + bucket);
		}
	}

	private static Instant effectiveAck(SalonNotificationInboxActor actor, NotificationBucket bucket) {
		if (actor.staffOperator() != null) {
			StaffOperator op = actor.staffOperator();
			return maxInstant(op.getNotificationInboxSentAckAt(), bucketAckAt(op, bucket));
		}
		StudioGroup g = actor.studioGroup();
		return maxInstant(g.getNotificationInboxSentAckAt(), bucketAckAt(g, bucket));
	}

	private static Instant maxInstant(Instant a, Instant b) {
		if (a == null) return b;
		if (b == null) return a;
		return a.isAfter(b) ? a : b;
	}

	private enum NotificationBucket {
		BOOKING_CONFIRMATION,
		BOOKING_UPDATED,
		BOOKING_CANCELLED,
		SYSTEM
	}
}
