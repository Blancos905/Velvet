package it.luxury.bootstrap;

import it.luxury.catalog.domain.SalonClient;
import it.luxury.catalog.domain.SalonClientRepository;
import it.luxury.catalog.domain.SalonService;
import it.luxury.catalog.domain.SalonServiceRepository;
import it.luxury.catalog.domain.StaffOperator;
import it.luxury.catalog.domain.StaffOperatorRepository;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.LocationRepository;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.studio.domain.StudioGroupRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static it.luxury.bootstrap.SuperAdminConsumerBootstrap.markEmailVerified;
import static it.luxury.config.LuxuryAsyncConfiguration.BOOTSTRAP_EXECUTOR;

@Component
@Profile("local")
public class LuxuryDemoDataLoader {

	private static final Logger log = LoggerFactory.getLogger(LuxuryDemoDataLoader.class);

	/**
	 * Subject stabile allineato a {@code studio_groups.owner_auth_sub} e profilo demo (login: email + password {@code demo}).
	 */
	public static final String DEMO_OWNER_AUTH_SUB = "f0000000-0000-4000-8000-000000000001";

	public static final String DEMO_OWNER_EMAIL = "dev-owner@luxury.local";

	private final StudioGroupRepository studioGroupRepository;
	private final LocationRepository locationRepository;
	private final SalonServiceRepository salonServiceRepository;
	private final StaffOperatorRepository staffOperatorRepository;
	private final SalonClientRepository salonClientRepository;
	private final ConsumerProfileRepository consumerProfileRepository;
	private final PasswordEncoder passwordEncoder;

	public LuxuryDemoDataLoader(
			StudioGroupRepository studioGroupRepository,
			LocationRepository locationRepository,
			SalonServiceRepository salonServiceRepository,
			StaffOperatorRepository staffOperatorRepository,
			SalonClientRepository salonClientRepository,
			ConsumerProfileRepository consumerProfileRepository,
			PasswordEncoder passwordEncoder) {
		this.studioGroupRepository = studioGroupRepository;
		this.locationRepository = locationRepository;
		this.salonServiceRepository = salonServiceRepository;
		this.staffOperatorRepository = staffOperatorRepository;
		this.salonClientRepository = salonClientRepository;
		this.consumerProfileRepository = consumerProfileRepository;
		this.passwordEncoder = passwordEncoder;
	}

	@EventListener(ApplicationReadyEvent.class)
	@Async(BOOTSTRAP_EXECUTOR)
	public void onApplicationReady() {
		consumerProfileRepository.findByAuthSub(DEMO_OWNER_AUTH_SUB).ifPresentOrElse(
				existing -> {
					if (existing.getEmailVerifiedAt() == null) {
						markEmailVerified(existing);
						consumerProfileRepository.save(existing);
					}
				},
				() -> {
					ConsumerProfile p = new ConsumerProfile(DEMO_OWNER_AUTH_SUB, DEMO_OWNER_EMAIL, "Dev Titolare");
					p.setPasswordHash(passwordEncoder.encode("demo"));
					p.setSecurityRoles("OWNER");
					p.setPlanTier("PREMIUM");
					markEmailVerified(p);
					consumerProfileRepository.save(p);
				});

		StudioGroup group = studioGroupRepository
				.findByOwnerAuthSub(DEMO_OWNER_AUTH_SUB)
				.orElseGet(() -> studioGroupRepository.save(
						new StudioGroup("Luxury Demo Salon", DEMO_OWNER_EMAIL, "PREMIUM", DEMO_OWNER_AUTH_SUB)));

		List<Location> groupLocations = locationRepository.findByStudioGroup_IdOrderByNameAsc(group.getId());
		Location loc = groupLocations.isEmpty() ? null : groupLocations.get(0);
		boolean createdDemoSalon = false;
		if (loc == null) {
			String slug = resolveAvailableDemoSlug(group);
			loc = new Location(group, slug, "Luxury Demo Salon", "Milano");
			loc.setAddressLine("Via Esempio 1");
			loc.setPostalCode("20100");
			loc.setPhoneE164("+393331234567");
			loc.setWhatsappE164("393331234567");
			loc.setWelcomeMessage("Benvenuti — dati dimostrativi per sviluppo.");
			loc.setLatitude(45.4642);
			loc.setLongitude(9.1900);
			loc = locationRepository.save(loc);
			createdDemoSalon = true;
		}
		else if (loc.getLatitude() == null || loc.getLongitude() == null) {
			loc.setLatitude(45.4642);
			loc.setLongitude(9.1900);
			locationRepository.save(loc);
		}

		if (!createdDemoSalon) {
			log.info("Demo salon già presente (slug={}, id={})", loc.getSlug(), loc.getId());
			log.info("Demo titolare: email={} password=demo", DEMO_OWNER_EMAIL);
			return;
		}

		StaffOperator op1 = staffOperatorRepository.save(new StaffOperator(loc, "Maria"));
		staffOperatorRepository.save(new StaffOperator(loc, "Giulia"));

		salonServiceRepository.save(new SalonService(loc, "Taglio", 45, 3500, "Taglio donna/uomo, shampoo incluso."));
		salonServiceRepository.save(new SalonService(loc, "Colore", 120, 8500, "Tintura o ricrescita — consulenza in salone."));
		SalonService baffo = salonServiceRepository.save(new SalonService(loc, "Barba", 30, 1500, "Rifinitura barba e contorni."));

		SalonClient walkIn = new SalonClient(loc, "Cliente walk-in");
		salonClientRepository.save(walkIn);

		log.info("Luxury demo: sede slug={} id={} — usa header X-Location-Id per API staff.", loc.getSlug(), loc.getId());
		log.info("Servizio esempio id={} (durata {} min)", baffo.getId(), baffo.getDurationMinutes());
		log.info("Operatore esempio id={}", op1.getId());
		log.info("Demo titolare: email={} password=demo", DEMO_OWNER_EMAIL);
	}

	/**
	 * Slug demo idempotente: riusa {@code demo-salone} se libero o già del gruppo demo; altrimenti suffisso numerico.
	 */
	private String resolveAvailableDemoSlug(StudioGroup demoGroup) {
		final String base = "demo-salone";
		Optional<Location> existing = locationRepository.findBySlug(base);
		if (existing.isEmpty()) {
			return base;
		}
		if (existing.get().getStudioGroup().getId().equals(demoGroup.getId())) {
			return base;
		}
		log.warn(
				"Slug {} già usato da studio_group_id={}: creo sede demo con slug alternativo per groupId={}",
				base,
				existing.get().getStudioGroup().getId(),
				demoGroup.getId());
		String candidate = base;
		int n = 0;
		while (locationRepository.existsBySlug(candidate)) {
			n++;
			candidate = base + "-" + n;
			if (n > 5000) {
				return base + "-" + UUID.randomUUID().toString().substring(0, 8);
			}
		}
		return candidate;
	}
}
