package it.velvet.studio.service;

import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.publicapi.dto.RegistrationSalonLocation;
import it.velvet.security.auth.VelvetUserPrincipal;
import it.velvet.studio.domain.SalonBusinessType;
import it.velvet.studio.domain.SalonClientGender;
import it.velvet.studio.domain.StudioGroup;
import it.velvet.studio.domain.StudioGroupRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Se un titolare ha ruolo OWNER ma nessuna riga directory (es. provisioning fallito),
 * crea in modo idempotente {@code studio_groups} + prima sede così {@code GET /me/salon} torna provisioned.
 */
@Service
public class MeSalonOwnerOrphanRepairService {

	private static final Logger log = LoggerFactory.getLogger(MeSalonOwnerOrphanRepairService.class);

	private final StudioGroupRepository studioGroupRepository;
	private final SalonDirectoryProvisioningService salonDirectoryProvisioningService;
	private final ConsumerProfileRepository consumerProfileRepository;

	public MeSalonOwnerOrphanRepairService(
			StudioGroupRepository studioGroupRepository,
			SalonDirectoryProvisioningService salonDirectoryProvisioningService,
			ConsumerProfileRepository consumerProfileRepository) {
		this.studioGroupRepository = studioGroupRepository;
		this.salonDirectoryProvisioningService = salonDirectoryProvisioningService;
		this.consumerProfileRepository = consumerProfileRepository;
	}

	@Transactional
	public void tryRepairIfOwnerWithNoStudio(VelvetUserPrincipal principal) {
		if (principal == null || principal.getSubject() == null || principal.getSubject().isBlank()) {
			return;
		}
		if (!principal.hasAppRole("OWNER")) {
			return;
		}
		String subRaw = principal.getSubject().trim();
		String sub = subRaw.toLowerCase(Locale.ROOT);
		String email = principal.getEmail();
		if (email == null || email.isBlank()) {
			email = consumerProfileRepository.findByKeycloakSub(subRaw)
					.filter(p -> p.getDeletedAt() == null)
					.map(p -> p.getEmail())
					.filter(e -> e != null && !e.isBlank())
					.map(e -> e.trim().toLowerCase(Locale.ROOT))
					.orElse(null);
		}
		else {
			email = email.trim().toLowerCase(Locale.ROOT);
		}
		if (email == null || email.isBlank()) {
			return;
		}
		if (studioGroupRepository.findByOwnerKeycloakSubIgnoreCase(sub).isPresent()) {
			return;
		}
		Optional<StudioGroup> byEmail = studioGroupRepository.findByOwnerEmailIgnoreCase(email);
		if (byEmail.isPresent()) {
			StudioGroup g = byEmail.get();
			if (g.assignOwnerKeycloakSubIfUnset(sub)) {
				studioGroupRepository.save(g);
				log.info("Riparazione directory: aggiornato owner_keycloak_sub per studio group email={}", email);
			}
			return;
		}
		String salonName = consumerProfileRepository.findByKeycloakSub(subRaw)
				.filter(p -> p.getDeletedAt() == null)
				.map(p -> p.getDisplayName())
				.filter(n -> n != null && !n.isBlank())
				.map(String::trim)
				.orElse("Salone");
		RegistrationSalonLocation loc = new RegistrationSalonLocation(
				"Indirizzo da completare in area account",
				"00000",
				"Non indicata",
				"EE",
				"IT",
				salonName);
		log.warn(
				"Riparazione directory: creo studio_groups per titolare orfano email={} sub={} (mancava riga dopo registrazione).",
				email,
				sub);
		salonDirectoryProvisioningService.provisionAfterPartnerRegistration(
				email, "BASE", salonName, loc, sub, List.of(SalonBusinessType.HAIR),
				List.of(SalonClientGender.MALE, SalonClientGender.FEMALE));
	}
}
