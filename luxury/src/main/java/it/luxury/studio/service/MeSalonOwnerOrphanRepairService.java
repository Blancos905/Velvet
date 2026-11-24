package it.luxury.studio.service;

import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.publicapi.dto.RegistrationSalonLocation;
import it.luxury.security.auth.LuxuryUserPrincipal;
import it.luxury.studio.domain.LocationRepository;
import it.luxury.studio.domain.SalonBusinessType;
import it.luxury.studio.domain.SalonClientGender;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.studio.domain.StudioGroupRepository;
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
	private final LocationRepository locationRepository;
	private final StudioGroupOwnerResolver studioGroupOwnerResolver;
	private final SalonDirectoryProvisioningService salonDirectoryProvisioningService;
	private final ConsumerProfileRepository consumerProfileRepository;

	public MeSalonOwnerOrphanRepairService(
			StudioGroupRepository studioGroupRepository,
			LocationRepository locationRepository,
			StudioGroupOwnerResolver studioGroupOwnerResolver,
			SalonDirectoryProvisioningService salonDirectoryProvisioningService,
			ConsumerProfileRepository consumerProfileRepository) {
		this.studioGroupRepository = studioGroupRepository;
		this.locationRepository = locationRepository;
		this.studioGroupOwnerResolver = studioGroupOwnerResolver;
		this.salonDirectoryProvisioningService = salonDirectoryProvisioningService;
		this.consumerProfileRepository = consumerProfileRepository;
	}

	@Transactional
	public void tryRepairIfOwnerWithNoStudio(LuxuryUserPrincipal principal) {
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
			email = consumerProfileRepository.findByAuthSub(subRaw)
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
		if (studioGroupRepository.findByOwnerAuthSubIgnoreCase(sub).isPresent()) {
			return;
		}
		Optional<StudioGroup> byEmail = studioGroupRepository.findByOwnerEmailIgnoreCase(email);
		if (byEmail.isPresent()) {
			StudioGroup g = byEmail.get();
			if (g.assignOwnerAuthSubIfUnset(sub)) {
				studioGroupRepository.save(g);
				log.info("Riparazione directory: aggiornato owner_auth_sub per studio group email={}", email);
			}
			return;
		}
		String salonName = consumerProfileRepository.findByAuthSub(subRaw)
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
				"Riparazione directory: creo studio_groups non entitled per titolare orfano email={} sub={} (mancava riga dopo registrazione).",
				email,
				sub);
		// BASE è solo lo stato tecnico «non entitled»: l’unico piano commerciale è Premium (hasActivePremium).
		salonDirectoryProvisioningService.provisionAfterPartnerRegistration(
				email, "BASE", salonName, loc, sub, List.of(SalonBusinessType.HAIR),
				List.of(SalonClientGender.MALE, SalonClientGender.FEMALE));
	}

	/**
	 * Titolare con {@code studio_groups} ma zero sedi (provisioning interrotto): crea sede di default idempotente.
	 */
	@Transactional
	public void tryRepairIfOwnerWithNoLocation(LuxuryUserPrincipal principal) {
		if (principal == null || principal.getSubject() == null || principal.getSubject().isBlank()) {
			return;
		}
		if (!principal.hasAppRole("OWNER")) {
			return;
		}
		Optional<StudioGroup> groupOpt = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal);
		if (groupOpt.isEmpty()) {
			return;
		}
		StudioGroup group = groupOpt.get();
		if (!locationRepository.findByStudioGroup_IdOrderByNameAsc(group.getId()).isEmpty()) {
			return;
		}
		String salonName = firstNonBlank(group.getName(), "Salone");
		RegistrationSalonLocation loc = new RegistrationSalonLocation(
				"Indirizzo da completare in area account",
				"00000",
				"Non indicata",
				"EE",
				"IT",
				salonName);
		log.warn(
				"Riparazione directory: creo prima sede per titolare senza location groupId={} email={}",
				group.getId(),
				group.getOwnerEmail());
		salonDirectoryProvisioningService.ensurePrimaryLocationIfMissing(
				group,
				salonName,
				loc,
				List.of(SalonBusinessType.HAIR),
				List.of(SalonClientGender.MALE, SalonClientGender.FEMALE));
	}

	private static String firstNonBlank(String... parts) {
		if (parts == null) {
			return "Salone";
		}
		for (String p : parts) {
			if (p != null && !p.isBlank()) {
				return p.trim();
			}
		}
		return "Salone";
	}
}
