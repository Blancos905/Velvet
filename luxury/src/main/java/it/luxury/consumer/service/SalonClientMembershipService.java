package it.luxury.consumer.service;

import it.luxury.appointment.domain.AppointmentRepository;
import it.luxury.catalog.domain.SalonClient;
import it.luxury.catalog.domain.SalonClientRepository;
import it.luxury.catalog.domain.SalonLuxuryChatMessageRepository;
import it.luxury.catalog.domain.SalonLuxuryChatReadStateRepository;
import it.luxury.common.api.BusinessException;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.security.auth.LuxuryUserPrincipal;
import it.luxury.notification.service.SalonEngagementNotificationService;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.LocationRepository;
import org.springframework.http.HttpStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class SalonClientMembershipService {

	private static final Logger log = LoggerFactory.getLogger(SalonClientMembershipService.class);

	/** Giorni senza appuntamenti (passati o futuri non annullati) dopo cui si scollega il profilo B2C dalla sede. */
	public static final int DEFAULT_INACTIVITY_EXPIRY_DAYS = 60;

	private final SalonClientRepository salonClientRepository;
	private final LocationRepository locationRepository;
	private final ConsumerProfileService consumerProfileService;
	private final AppointmentRepository appointmentRepository;
	private final SalonEngagementNotificationService salonEngagementNotificationService;
	private final SalonLuxuryChatMessageRepository salonLuxuryChatMessageRepository;
	private final SalonLuxuryChatReadStateRepository salonLuxuryChatReadStateRepository;

	public SalonClientMembershipService(
			SalonClientRepository salonClientRepository,
			LocationRepository locationRepository,
			ConsumerProfileService consumerProfileService,
			AppointmentRepository appointmentRepository,
			SalonEngagementNotificationService salonEngagementNotificationService,
			SalonLuxuryChatMessageRepository salonLuxuryChatMessageRepository,
			SalonLuxuryChatReadStateRepository salonLuxuryChatReadStateRepository) {
		this.salonClientRepository = salonClientRepository;
		this.locationRepository = locationRepository;
		this.consumerProfileService = consumerProfileService;
		this.appointmentRepository = appointmentRepository;
		this.salonEngagementNotificationService = salonEngagementNotificationService;
		this.salonLuxuryChatMessageRepository = salonLuxuryChatMessageRepository;
		this.salonLuxuryChatReadStateRepository = salonLuxuryChatReadStateRepository;
	}

	@Transactional(readOnly = true)
	public List<SalonClient> list(LuxuryUserPrincipal principal) {
		ConsumerProfile consumer = consumerProfileService.requireActiveProfile(principal);
		return salonClientRepository.findByConsumerProfile_IdOrderByCreatedAtDesc(consumer.getId());
	}

	@Transactional
	public SalonClient becomeClient(LuxuryUserPrincipal principal, UUID locationId) {
		ConsumerProfile consumer = consumerProfileService.requireActiveProfile(principal);
		ConsumerB2CEligibility.assertMayActAsConsumer(consumer);
		Location location = locationRepository.findById(locationId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Sede non trovata."));
		Optional<SalonClient> linked =
				salonClientRepository.findByLocation_IdAndConsumerProfile_Id(location.getId(), consumer.getId());
		if (linked.isPresent()) {
			return syncSalonClientFromConsumer(linked.get(), consumer);
		}
		return ensureLinkedConsumerAtLocation(consumer, location, true);
	}

	/**
	 * Collega il consumatore alla sede per una prenotazione B2C: crea o riusa l'anagrafica salone. L'operatore
	 * dell'appuntamento completa il legame cliente anche verso lo staff scelto (chat e agenda operatore).
	 */
	@Transactional
	public SalonClient ensureLinkedConsumerAtLocation(ConsumerProfile consumer, Location location) {
		return ensureLinkedConsumerAtLocation(consumer, location, false);
	}

	@Transactional
	public SalonClient ensureLinkedConsumerAtLocation(
			ConsumerProfile consumer, Location location, boolean notifySalonOnCreate) {
		ConsumerB2CEligibility.assertMayActAsConsumer(consumer);
		Optional<SalonClient> linked =
				salonClientRepository.findByLocation_IdAndConsumerProfile_Id(location.getId(), consumer.getId());
		if (linked.isPresent()) {
			return syncSalonClientFromConsumer(linked.get(), consumer);
		}
		Optional<SalonClient> orphan = findOrphanSalonClientForRelink(location.getId(), consumer);
		if (orphan.isPresent()) {
			SalonClient sc = orphan.get();
			sc.setConsumerProfile(consumer);
			return syncSalonClientFromConsumer(sc, consumer);
		}
		return createSalonClient(location, consumer, notifySalonOnCreate);
	}

	/**
	 * Rimuove il legame B2C con la sede: elimina l'anagrafica se non ci sono appuntamenti, altrimenti scollega solo il
	 * profilo consumatore (storico sede invariato).
	 */
	@Transactional
	public void leaveClient(LuxuryUserPrincipal principal, UUID locationId) {
		ConsumerProfile consumer = consumerProfileService.requireActiveProfile(principal);
		Optional<SalonClient> row =
				salonClientRepository.findByLocation_IdAndConsumerProfile_Id(locationId, consumer.getId());
		if (row.isEmpty()) {
			return;
		}
		unlinkConsumerFromSalonClientRow(row.get());
	}

	/**
	 * Job periodico: toglie il legame profilo↔sede se non c’è un appuntamento futuro (non annullato) e l’ultima
	 * attività (max fine appuntamenti o data creazione anagrafica) è più vecchia di {@code days} giorni senza nuove
	 * prenotazioni verso la sede.
	 *
	 * @return numero di legami rimossi
	 */
	@Transactional
	public int expireLinkedClientsWithoutRecentActivity(int days) {
		if (days <= 0) {
			return 0;
		}
		Instant now = Instant.now();
		Instant threshold = now.minus(days, ChronoUnit.DAYS);
		int removed = 0;
		for (SalonClient sc : salonClientRepository.findByConsumerProfileIsNotNull()) {
			if (appointmentRepository.existsUpcomingNonCancelledForSalonClient(sc.getId(), now)) {
				continue;
			}
			Instant maxEnd = appointmentRepository.findMaxEndsAtBySalonClientId(sc.getId());
			Instant lastTouch = maxEnd != null ? maxEnd : sc.getCreatedAt();
			if (lastTouch.isBefore(threshold)) {
				UUID scId = sc.getId();
				UUID locId = sc.getLocation().getId();
				unlinkConsumerFromSalonClientRow(sc);
				removed++;
				log.debug(
						"Scaduto legame cliente sede (inattività {} giorni): salonClientId={} locationId={}",
						days,
						scId,
						locId);
			}
		}
		return removed;
	}

	private void unlinkConsumerFromSalonClientRow(SalonClient salonClient) {
		if (appointmentRepository.countBySalonClient_Id(salonClient.getId()) > 0) {
			salonClient.setConsumerProfile(null);
			salonClientRepository.save(salonClient);
		} else {
			purgeSalonClientChatData(salonClient.getId());
			salonClientRepository.delete(salonClient);
		}
	}

	private void purgeSalonClientChatData(UUID salonClientId) {
		salonLuxuryChatMessageRepository.deleteBySalonClient_Id(salonClientId);
		salonLuxuryChatReadStateRepository.deleteBySalonClient_Id(salonClientId);
	}

	private Optional<SalonClient> findOrphanSalonClientForRelink(UUID locationId, ConsumerProfile consumer) {
		String email = consumer.getEmail();
		if (email == null || email.isBlank()) {
			return Optional.empty();
		}
		return salonClientRepository.findFirstByLocation_IdAndConsumerProfileIsNullAndEmailIgnoreCaseOrderByCreatedAtDesc(
				locationId, email.trim());
	}

	private SalonClient createSalonClient(Location location, ConsumerProfile consumer, boolean notifySalonOnCreate) {
		String displayName = resolveDisplayName(consumer);
		SalonClient salonClient = new SalonClient(location, displayName);
		salonClient.setConsumerProfile(consumer);
		salonClient.setEmail(consumer.getEmail());
		salonClient.setPhone(consumer.getPhone());
		SalonClient saved = salonClientRepository.save(salonClient);
		if (notifySalonOnCreate) {
			salonEngagementNotificationService.onNewSalonClientJoined(saved);
		}
		return saved;
	}

	private SalonClient syncSalonClientFromConsumer(SalonClient salonClient, ConsumerProfile consumer) {
		salonClient.setDisplayName(resolveDisplayName(consumer));
		if (consumer.getEmail() != null && !consumer.getEmail().isBlank()) {
			salonClient.setEmail(consumer.getEmail().trim());
		}
		if (consumer.getPhone() != null && !consumer.getPhone().isBlank()) {
			salonClient.setPhone(consumer.getPhone().trim());
		}
		return salonClientRepository.save(salonClient);
	}

	private static String resolveDisplayName(ConsumerProfile consumer) {
		if (consumer.getDisplayName() != null && !consumer.getDisplayName().isBlank()) {
			return consumer.getDisplayName().trim();
		}
		if (consumer.getEmail() != null && !consumer.getEmail().isBlank()) {
			return consumer.getEmail().trim();
		}
		return "Cliente";
	}
}
