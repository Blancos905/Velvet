package it.velvet.bootstrap;

import it.velvet.catalog.domain.SalonClient;
import it.velvet.catalog.domain.SalonClientRepository;
import it.velvet.catalog.domain.SalonService;
import it.velvet.catalog.domain.SalonServiceRepository;
import it.velvet.catalog.domain.StaffOperator;
import it.velvet.catalog.domain.StaffOperatorRepository;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.studio.domain.Location;
import it.velvet.studio.domain.LocationRepository;
import it.velvet.studio.domain.StudioGroup;
import it.velvet.studio.domain.StudioGroupRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Order(1)
public class VelvetDemoDataLoader implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(VelvetDemoDataLoader.class);

	/**
	 * Subject stabile allineato a {@code studio_groups.owner_keycloak_sub} e profilo demo (login: email + password {@code demo}).
	 */
	public static final String DEMO_OWNER_KEYCLOAK_SUB = "f0000000-0000-4000-8000-000000000001";

	public static final String DEMO_OWNER_EMAIL = "dev-owner@velvet.local";

	private final StudioGroupRepository studioGroupRepository;
	private final LocationRepository locationRepository;
	private final SalonServiceRepository salonServiceRepository;
	private final StaffOperatorRepository staffOperatorRepository;
	private final SalonClientRepository salonClientRepository;
	private final ConsumerProfileRepository consumerProfileRepository;
	private final PasswordEncoder passwordEncoder;

	public VelvetDemoDataLoader(
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

	@Override
	public void run(ApplicationArguments args) {
		if (consumerProfileRepository.findByKeycloakSub(DEMO_OWNER_KEYCLOAK_SUB).isEmpty()) {
			ConsumerProfile p = new ConsumerProfile(DEMO_OWNER_KEYCLOAK_SUB, DEMO_OWNER_EMAIL, "Dev Titolare");
			p.setPasswordHash(passwordEncoder.encode("demo"));
			p.setSecurityRoles("OWNER");
			p.setPlanTier("PREMIUM");
			consumerProfileRepository.save(p);
		}

		StudioGroup group = studioGroupRepository
				.findByOwnerKeycloakSub(DEMO_OWNER_KEYCLOAK_SUB)
				.orElseGet(() -> studioGroupRepository.save(
						new StudioGroup("Velvet Demo Salon", DEMO_OWNER_EMAIL, "PREMIUM", DEMO_OWNER_KEYCLOAK_SUB)));

		Location loc = locationRepository.findBySlug("demo-salone").orElse(null);
		boolean createdDemoSalon = false;
		if (loc == null) {
			loc = new Location(group, "demo-salone", "Velvet Demo Salon", "Milano");
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
			log.info("Demo salon già presente (slug=demo-salone, id={})", loc.getId());
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

		log.info("Velvet demo: sede slug=demo-salone id={} — usa header X-Location-Id per API staff.", loc.getId());
		log.info("Servizio esempio id={} (durata {} min)", baffo.getId(), baffo.getDurationMinutes());
		log.info("Operatore esempio id={}", op1.getId());
		log.info("Demo titolare: email={} password=demo", DEMO_OWNER_EMAIL);
	}
}
