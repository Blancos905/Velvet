package it.velvet.consumer.service;

import it.velvet.appointment.domain.AppointmentRepository;
import it.velvet.catalog.domain.SalonClient;
import it.velvet.catalog.domain.SalonClientRepository;
import it.velvet.common.api.BusinessException;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.service.ConsumerB2CEligibility;
import it.velvet.security.auth.VelvetUserPrincipal;
import it.velvet.studio.domain.Location;
import it.velvet.studio.domain.LocationRepository;
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

	private final SalonClientRepository salonClientRepository;
	private final LocationRepository locationRepository;
	private final ConsumerProfileService consumerProfileService;
	private final AppointmentRepository appointmentRepository;

	public SalonClientMembershipService(
			SalonClientRepository salonClientRepository,
			LocationRepository locationRepository,
			ConsumerProfileService consumerProfileService,
			AppointmentRepository appointmentRepository) {
		this.salonClientRepository = salonClientRepository;
		this.locationRepository = locationRepository;
		this.consumerProfileService = consumerProfileService;
		this.appointmentRepository = appointmentRepository;
	}

	@Transactional(readOnly = true)
	public List<SalonClient> list(VelvetUserPrincipal principal) {
		ConsumerProfile consumer = consumerProfileService.requireActiveProfile(principal);
		return salonClientRepository.findByConsumerProfile_IdOrderByCreatedAtDesc(consumer.getId());
	}

	@Transactional
	public SalonClient becomeClient(VelvetUserPrincipal principal, UUID locationId) {
		ConsumerProfile consumer = consumerProfileService.requireActiveProfile(principal);
		ConsumerB2CEligibility.assertMayActAsConsumer(consumer);
		Location location = locationRepository.findById(locationId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Sede non trovata."));
		Optional<SalonClient> linked =
				salonClientRepository.findByLocation_IdAndConsumerProfile_Id(location.getId(), consumer.getId());
		if (linked.isPresent()) {
			return linked.get();
		}
		Optional<SalonClient> orphan = findOrphanSalonClientForRelink(location.getId(), consumer);
		if (orphan.isPresent()) {
			SalonClient sc = orphan.get();
			sc.setConsumerProfile(consumer);
			sc.setDisplayName(resolveDisplayName(consumer));
			sc.setEmail(consumer.getEmail());
			sc.setPhone(consumer.getPhone());
			return salonClientRepository.save(sc);
		}
		return createSalonClient(location, consumer);
	}

	/**
	 * Rimuove il legame B2C con la sede: elimina l'anagrafica se non ci sono appuntamenti, altrimenti scollega solo il
	 * profilo consumatore (storico sede invariato).
	 */
	@Transactional
	public void leaveClient(VelvetUserPrincipal principal, UUID locationId) {
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
	 * attività (max fine appuntamenti o data creazione anagrafica) è più vecchia di {@code days} giorni.
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
			Instant lastTouch =
					maxEnd != null && maxEnd.isAfter(sc.getCreatedAt()) ? maxEnd : sc.getCreatedAt();
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
			salonClientRepository.delete(salonClient);
		}
	}

	private Optional<SalonClient> findOrphanSalonClientForRelink(UUID locationId, ConsumerProfile consumer) {
		String email = consumer.getEmail();
		if (email == null || email.isBlank()) {
			return Optional.empty();
		}
		return salonClientRepository.findFirstByLocation_IdAndConsumerProfileIsNullAndEmailIgnoreCaseOrderByCreatedAtDesc(
				locationId, email.trim());
	}

	private SalonClient createSalonClient(Location location, ConsumerProfile consumer) {
		String displayName = resolveDisplayName(consumer);
		SalonClient salonClient = new SalonClient(location, displayName);
		salonClient.setConsumerProfile(consumer);
		salonClient.setEmail(consumer.getEmail());
		salonClient.setPhone(consumer.getPhone());
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
