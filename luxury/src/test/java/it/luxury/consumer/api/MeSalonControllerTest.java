package it.luxury.consumer.api;

import it.luxury.appointment.domain.Appointment;
import it.luxury.appointment.domain.AppointmentRepository;
import it.luxury.appointment.domain.AppointmentStatus;
import it.luxury.appointment.service.SalonOpenDays;
import it.luxury.catalog.domain.SalonClient;
import it.luxury.catalog.domain.SalonClientRepository;
import it.luxury.catalog.domain.SalonService;
import it.luxury.catalog.domain.SalonServiceRepository;
import it.luxury.catalog.domain.StaffOperator;
import it.luxury.catalog.domain.StaffOperatorRepository;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.notification.domain.NotificationType;
import it.luxury.notification.domain.QueuedNotificationStatus;
import it.luxury.notification.domain.ScheduledNotification;
import it.luxury.notification.domain.ScheduledNotificationRepository;
import it.luxury.security.auth.LuxuryTokenService;
import it.luxury.security.auth.LuxuryUserPrincipal;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.LocationRepository;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.studio.domain.StudioGroupRepository;
import it.luxury.testsupport.PremiumEntitlementTestFixture;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;
import java.time.DayOfWeek;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class MeSalonControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private StudioGroupRepository studioGroupRepository;

	@Autowired
	private LocationRepository locationRepository;

	@Autowired
	private ConsumerProfileRepository consumerProfileRepository;

	@Autowired
	private LuxuryTokenService luxuryTokenService;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private SalonServiceRepository salonServiceRepository;

	@Autowired
	private StaffOperatorRepository staffOperatorRepository;

	@Autowired
	private SalonClientRepository salonClientRepository;

	@Autowired
	private AppointmentRepository appointmentRepository;

	@Autowired
	private ScheduledNotificationRepository scheduledNotificationRepository;

	@Autowired
	private PremiumEntitlementTestFixture premiumEntitlementTestFixture;

	private ConsumerProfile saveOwner(String sub, String email) {
		ConsumerProfile p = new ConsumerProfile(sub, email, "Owner");
		p.setPasswordHash(passwordEncoder.encode("x"));
		p.setSecurityRoles("OWNER");
		return consumerProfileRepository.save(p);
	}

	private ConsumerProfile saveStaff(String sub, String email) {
		ConsumerProfile p = new ConsumerProfile(sub, email, "Staff");
		p.setPasswordHash(passwordEncoder.encode("x"));
		p.setSecurityRoles("STAFF");
		return consumerProfileRepository.save(p);
	}

	private ConsumerProfile saveClient(String sub, String email, String displayName) {
		ConsumerProfile p = new ConsumerProfile(sub, email, displayName);
		p.setPasswordHash(passwordEncoder.encode("x"));
		p.setSecurityRoles("CLIENT");
		return consumerProfileRepository.save(p);
	}

	private String bearer(ConsumerProfile p) {
		return "Bearer " + luxuryTokenService.createAccessToken(p);
	}

	private String bearer(ConsumerProfile p, String emailInToken) {
		return "Bearer " + luxuryTokenService.createAccessToken(
				p.getId(), p.getAuthSub(), emailInToken, List.of("OWNER"), p.getPlanTier());
	}

	private StudioGroup savePremiumGroup(StudioGroup group) {
		StudioGroup saved = studioGroupRepository.save(group);
		premiumEntitlementTestFixture.ensureActivePremiumSubscription(saved);
		return saved;
	}

	@Test
	void salonNotifications_ownerWithStudio_returnsAllTypes() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String email = "studio-owner-notif-" + suffix + "@test.com";
		String slug = "slug-notif-" + suffix;
		StudioGroup g = studioGroupRepository.save(new StudioGroup("Salone Notif", email, "PREMIUM"));
		locationRepository.save(new Location(g, slug, "Sede", "MI"));
		ConsumerProfile p = saveOwner("sub-notif-" + suffix, email);

		mockMvc.perform(get("/api/v1/me/salon/notifications").header("Authorization", bearer(p)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.types").isArray())
				.andExpect(jsonPath("$.types[0].type").exists())
				.andExpect(jsonPath("$.types[0].label").exists())
				.andExpect(jsonPath("$.types[0].sent").exists())
				.andExpect(jsonPath("$.types[0].pending").exists())
				.andExpect(jsonPath("$.types[3].type").exists());
	}

	@Test
	void salonNotificationMessages_ownerWithStudio_returnsArray() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String email = "studio-owner-msg-" + suffix + "@test.com";
		String slug = "slug-msg-" + suffix;
		StudioGroup g = studioGroupRepository.save(new StudioGroup("Salone Msg", email, "PREMIUM"));
		locationRepository.save(new Location(g, slug, "Sede", "MI"));
		ConsumerProfile p = saveOwner("sub-msg-" + suffix, email);

		mockMvc.perform(get("/api/v1/me/salon/notifications/messages")
						.param("bucket", "BOOKING_CONFIRMATION")
						.header("Authorization", bearer(p)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isArray());
	}

	/**
	 * Flusso prenotazione → job notifiche → centro notifiche titolare: {@code BOOKING_CREATED_FOR_SALON} deve comparire
	 * nel bucket {@code BOOKING_CONFIRMATION} (prima era escluso e spariva dall'inbox).
	 */
	@Test
	void salonNotifications_bookingCreatedForSalon_appearsInBookingConfirmationBucket() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String ownerEmail = "owner-bcfs-" + suffix + "@test.com";
		String slug = "slug-bcfs-" + suffix;
		StudioGroup group = studioGroupRepository.save(new StudioGroup("Salone BCFS", ownerEmail, "PREMIUM"));
		Location location = locationRepository.save(new Location(group, slug, "Sede BCFS", "MI"));
		SalonService service = salonServiceRepository.save(new SalonService(location, "Taglio", 30, 3000));
		StaffOperator operator = staffOperatorRepository.save(new StaffOperator(location, "Op"));
		ConsumerProfile client = new ConsumerProfile("sub-client-bcfs-" + suffix, "client-bcfs-" + suffix + "@test.com", "Anna");
		client.setPasswordHash(passwordEncoder.encode("x"));
		client.setSecurityRoles("CLIENT");
		client = consumerProfileRepository.save(client);
		SalonClient sc = salonClientRepository.save(new SalonClient(location, "Anna"));
		sc.setConsumerProfile(client);
		salonClientRepository.save(sc);
		Instant startsAt = Instant.now().plus(2, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS);
		Instant endsAt = startsAt.plus(30, ChronoUnit.MINUTES);
		Appointment appointment = new Appointment(location, service, operator, sc, startsAt, endsAt);
		appointment.setConsumerProfile(client);
		appointment.setStatus(AppointmentStatus.CONFIRMED);
		appointment = appointmentRepository.save(appointment);

		ScheduledNotification salonNewBooking = new ScheduledNotification(
				appointment, NotificationType.BOOKING_CREATED_FOR_SALON, Instant.now());
		salonNewBooking.markSent(Instant.now());
		scheduledNotificationRepository.save(salonNewBooking);

		ConsumerProfile owner = saveOwner("sub-owner-bcfs-" + suffix, ownerEmail);

		mockMvc.perform(get("/api/v1/me/salon/notifications").header("Authorization", bearer(owner)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.types[0].type").value("BOOKING_CONFIRMATION"))
				.andExpect(jsonPath("$.types[0].sent").value(1))
				.andExpect(jsonPath("$.types[0].pending").value(0));

		mockMvc.perform(get("/api/v1/me/salon/notifications/messages")
						.param("bucket", "BOOKING_CONFIRMATION")
						.header("Authorization", bearer(owner)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].notificationType").value("BOOKING_CREATED_FOR_SALON"))
				.andExpect(jsonPath("$[0].appointmentId").value(appointment.getId().toString()))
				.andExpect(jsonPath("$[0].previewLine").value(org.hamcrest.Matchers.containsString("ha prenotato")));

		mockMvc.perform(post("/api/v1/me/salon/notifications/inbox/ack-bucket")
						.param("bucket", "BOOKING_CONFIRMATION")
						.header("Authorization", bearer(owner)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.types[0].type").value("BOOKING_CONFIRMATION"))
				.andExpect(jsonPath("$.types[0].sent").value(0))
				.andExpect(jsonPath("$.types[0].pending").value(0));

		mockMvc.perform(get("/api/v1/me/salon/notifications/messages")
						.param("bucket", "BOOKING_CONFIRMATION")
						.header("Authorization", bearer(owner)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].notificationType").value("BOOKING_CREATED_FOR_SALON"))
				.andExpect(jsonPath("$[0].appointmentId").value(appointment.getId().toString()));
	}

	/**
	 * Operatore collegato: vede le notifiche solo per i propri appuntamenti; il titolare continua a vedere tutto lo studio.
	 */
	@Test
	void salonNotifications_staffLinked_seesOnlyOwnOperatorBookings() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String ownerEmail = "owner-staff-inbox-" + suffix + "@test.com";
		String slug = "slug-staff-inbox-" + suffix;
		StudioGroup group = studioGroupRepository.save(new StudioGroup("Salone Staff Inbox", ownerEmail, "PREMIUM"));
		Location location = locationRepository.save(new Location(group, slug, "Sede", "MI"));
		SalonService service = salonServiceRepository.save(new SalonService(location, "Taglio", 30, 3000));
		StaffOperator operatorA = staffOperatorRepository.save(new StaffOperator(location, "Op A"));
		StaffOperator operatorB = staffOperatorRepository.save(new StaffOperator(location, "Op B"));
		ConsumerProfile staff = saveStaff("sub-staff-inbox-" + suffix, "staff-inbox-" + suffix + "@test.com");
		operatorA.setConsumerProfile(staff);
		staffOperatorRepository.save(operatorA);

		ConsumerProfile client = new ConsumerProfile("sub-client-si-" + suffix, "client-si-" + suffix + "@test.com", "Bea");
		client.setPasswordHash(passwordEncoder.encode("x"));
		client.setSecurityRoles("CLIENT");
		client = consumerProfileRepository.save(client);
		SalonClient sc = salonClientRepository.save(new SalonClient(location, "Bea"));
		sc.setConsumerProfile(client);
		salonClientRepository.save(sc);

		Instant startsA = Instant.now().plus(2, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS);
		Instant endsA = startsA.plus(30, ChronoUnit.MINUTES);
		Appointment apptA = appointmentRepository.save(new Appointment(location, service, operatorA, sc, startsA, endsA));
		apptA.setConsumerProfile(client);
		apptA.setStatus(AppointmentStatus.BOOKED);
		apptA = appointmentRepository.save(apptA);

		Instant startsB = startsA.plus(1, ChronoUnit.HOURS);
		Instant endsB = startsB.plus(30, ChronoUnit.MINUTES);
		Appointment apptB = appointmentRepository.save(new Appointment(location, service, operatorB, sc, startsB, endsB));
		apptB.setConsumerProfile(client);
		apptB.setStatus(AppointmentStatus.BOOKED);
		apptB = appointmentRepository.save(apptB);

		ScheduledNotification nA = new ScheduledNotification(
				apptA, NotificationType.BOOKING_CREATED_FOR_SALON, Instant.now());
		nA.markSent(Instant.now());
		scheduledNotificationRepository.save(nA);
		ScheduledNotification nB = new ScheduledNotification(
				apptB, NotificationType.BOOKING_CREATED_FOR_SALON, Instant.now());
		nB.markSent(Instant.now());
		scheduledNotificationRepository.save(nB);

		ConsumerProfile owner = saveOwner("sub-owner-si-" + suffix, ownerEmail);

		mockMvc.perform(get("/api/v1/me/salon/notifications").header("Authorization", bearer(owner)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.types[0].type").value("BOOKING_CONFIRMATION"))
				.andExpect(jsonPath("$.types[0].sent").value(2));

		mockMvc.perform(get("/api/v1/me/salon/notifications").header("Authorization", bearer(staff)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.types[0].type").value("BOOKING_CONFIRMATION"))
				.andExpect(jsonPath("$.types[0].sent").value(1));

		mockMvc.perform(get("/api/v1/me/salon/notifications/messages")
						.param("bucket", "BOOKING_CONFIRMATION")
						.header("Authorization", bearer(staff)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].appointmentId").value(apptA.getId().toString()));

		mockMvc.perform(delete("/api/v1/me/salon/notifications/messages/" + nA.getId())
						.header("Authorization", bearer(staff)))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/v1/me/salon/notifications/messages")
						.param("bucket", "BOOKING_CONFIRMATION")
						.header("Authorization", bearer(staff)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isEmpty());

		mockMvc.perform(get("/api/v1/me/salon/notifications").header("Authorization", bearer(staff)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.types[0].type").value("BOOKING_CONFIRMATION"))
				.andExpect(jsonPath("$.types[0].sent").value(0))
				.andExpect(jsonPath("$.types[0].pending").value(0));

		mockMvc.perform(get("/api/v1/me/salon/notifications").header("Authorization", bearer(owner)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.types[0].type").value("BOOKING_CONFIRMATION"))
				.andExpect(jsonPath("$.types[0].sent").value(2));
	}

	/**
	 * Titolare anche collegato come operatore A: deve vedere le richieste degli altri operatori (es. B), non solo la
	 * propria inbox staff filtrata.
	 */
	@Test
	void salonNotifications_ownerLinkedAsStaff_seesOtherOperatorsBookingRequests() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String ownerEmail = "owner-linked-staff-" + suffix + "@test.com";
		String slug = "slug-linked-staff-" + suffix;
		StudioGroup group = studioGroupRepository.save(new StudioGroup("Salone Linked Owner", ownerEmail, "PREMIUM"));
		Location location = locationRepository.save(new Location(group, slug, "Sede", "MI"));
		SalonService service = salonServiceRepository.save(new SalonService(location, "Taglio", 30, 3000));
		StaffOperator operatorA = staffOperatorRepository.save(new StaffOperator(location, "Op A"));
		StaffOperator operatorB = staffOperatorRepository.save(new StaffOperator(location, "Op B"));
		ConsumerProfile owner = saveOwner("sub-linked-staff-" + suffix, ownerEmail);
		operatorA.setConsumerProfile(owner);
		staffOperatorRepository.save(operatorA);

		ConsumerProfile client = new ConsumerProfile("sub-client-ls-" + suffix, "client-ls-" + suffix + "@test.com", "Bea");
		client.setPasswordHash(passwordEncoder.encode("x"));
		client.setSecurityRoles("CLIENT");
		client = consumerProfileRepository.save(client);
		SalonClient sc = salonClientRepository.save(new SalonClient(location, "Bea"));
		sc.setConsumerProfile(client);
		salonClientRepository.save(sc);

		Instant startsB = Instant.now().plus(2, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS);
		Instant endsB = startsB.plus(30, ChronoUnit.MINUTES);
		Appointment apptB = appointmentRepository.save(new Appointment(location, service, operatorB, sc, startsB, endsB));
		apptB.setConsumerProfile(client);
		apptB.setStatus(AppointmentStatus.BOOKED);
		apptB = appointmentRepository.save(apptB);

		ScheduledNotification nB = ScheduledNotification.salonInboxDelivered(
				apptB, NotificationType.BOOKING_CREATED_FOR_SALON);
		scheduledNotificationRepository.save(nB);

		mockMvc.perform(get("/api/v1/me/salon/notifications").header("Authorization", bearer(owner)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.types[0].type").value("BOOKING_CONFIRMATION"))
				.andExpect(jsonPath("$.types[0].sent").value(1));

		mockMvc.perform(get("/api/v1/me/salon/notifications/messages")
						.param("bucket", "BOOKING_CONFIRMATION")
						.header("Authorization", bearer(owner)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].appointmentId").value(apptB.getId().toString()))
				.andExpect(jsonPath("$[0].previewLine", org.hamcrest.Matchers.containsString("ha prenotato")));

		mockMvc.perform(post("/api/v1/me/salon/appointments/" + apptB.getId() + "/confirm")
						.header("Authorization", bearer(owner)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("CONFIRMED"))
				.andExpect(jsonPath("$.operatorId").value(operatorB.getId().toString()));
	}

	/** Prenotazione consumatore con operatore esplicito: inbox + messaggio per l'operatore collegato, non per altri operatori. */
	@Test
	void consumerBooking_withExplicitOperator_staffLinkedReceivesSalonNotification() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String ownerEmail = "owner-consumer-book-" + suffix + "@test.com";
		String slug = "slug-consumer-book-" + suffix;
		StudioGroup group = studioGroupRepository.save(new StudioGroup("Salone Consumer Book", ownerEmail, "PREMIUM"));
		Location location = locationRepository.save(new Location(group, slug, "Sede", "MI"));
		SalonService service = salonServiceRepository.save(new SalonService(location, "Taglio", 30, 3000));
		StaffOperator operatorA = staffOperatorRepository.save(new StaffOperator(location, "Op A"));
		StaffOperator operatorB = staffOperatorRepository.save(new StaffOperator(location, "Op B"));
		ConsumerProfile staff = saveStaff("sub-staff-cbook-" + suffix, "staff-cbook-" + suffix + "@test.com");
		operatorA.setConsumerProfile(staff);
		staffOperatorRepository.save(operatorA);

		ConsumerProfile client = saveClient("sub-client-cbook-" + suffix, "client-cbook-" + suffix + "@test.com", "Luca");
		ZoneId zone = ZoneId.of("Europe/Rome");
		LocalDate bookDay = LocalDate.now(zone).plusDays(6);
		Instant startsAt = bookDay.atTime(10, 0).atZone(zone).toInstant();

		mockMvc.perform(post("/api/v1/me/appointments")
						.header("Authorization", bearer(client))
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "organizationSlug": "%s",
								  "serviceId": "%s",
								  "operatorId": "%s",
								  "start": "%s"
								}
								"""
								.formatted(slug, service.getId(), operatorA.getId(), startsAt)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("BOOKED"));

		mockMvc.perform(get("/api/v1/me/salon/notifications").header("Authorization", bearer(staff)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.types[0].type").value("BOOKING_CONFIRMATION"))
				.andExpect(jsonPath("$.types[0].sent").value(1));

		mockMvc.perform(get("/api/v1/me/salon/notifications/messages")
						.param("bucket", "BOOKING_CONFIRMATION")
						.header("Authorization", bearer(staff)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].notificationType").value("BOOKING_CREATED_FOR_SALON"))
				.andExpect(jsonPath("$[0].clientName").value("Luca"))
				.andExpect(jsonPath("$[0].previewLine", org.hamcrest.Matchers.containsString("in attesa di conferma")));

		ConsumerProfile staffB = saveStaff("sub-staff-cbook-b-" + suffix, "staff-cbook-b-" + suffix + "@test.com");
		operatorB.setConsumerProfile(staffB);
		staffOperatorRepository.save(operatorB);

		mockMvc.perform(get("/api/v1/me/salon/notifications").header("Authorization", bearer(staffB)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.types[0].type").value("BOOKING_CONFIRMATION"))
				.andExpect(jsonPath("$.types[0].sent").value(0));
	}

	/** Titolare elimina una notifica: sparisce anche dall'inbox dell'operatore collegato. */
	@Test
	void salonNotifications_ownerDelete_hidesFromLinkedStaff() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String ownerEmail = "owner-del-staff-" + suffix + "@test.com";
		String slug = "slug-del-staff-" + suffix;
		StudioGroup group = studioGroupRepository.save(new StudioGroup("Salone Del Staff", ownerEmail, "PREMIUM"));
		Location location = locationRepository.save(new Location(group, slug, "Sede", "MI"));
		SalonService service = salonServiceRepository.save(new SalonService(location, "Taglio", 30, 3000));
		StaffOperator operatorA = staffOperatorRepository.save(new StaffOperator(location, "Op A"));
		ConsumerProfile staff = saveStaff("sub-staff-del-" + suffix, "staff-del-" + suffix + "@test.com");
		operatorA.setConsumerProfile(staff);
		staffOperatorRepository.save(operatorA);

		ConsumerProfile client = new ConsumerProfile("sub-client-del-" + suffix, "client-del-" + suffix + "@test.com", "Bea");
		client.setPasswordHash(passwordEncoder.encode("x"));
		client.setSecurityRoles("CLIENT");
		client = consumerProfileRepository.save(client);
		SalonClient sc = salonClientRepository.save(new SalonClient(location, "Bea"));
		sc.setConsumerProfile(client);
		salonClientRepository.save(sc);

		Instant starts = Instant.now().plus(2, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS);
		Instant ends = starts.plus(30, ChronoUnit.MINUTES);
		Appointment appt = appointmentRepository.save(new Appointment(location, service, operatorA, sc, starts, ends));
		appt.setConsumerProfile(client);
		appt.setStatus(AppointmentStatus.CONFIRMED);
		appt = appointmentRepository.save(appt);

		ScheduledNotification n = new ScheduledNotification(appt, NotificationType.BOOKING_CREATED_FOR_SALON, Instant.now());
		n.markSent(Instant.now());
		scheduledNotificationRepository.save(n);

		ConsumerProfile owner = saveOwner("sub-owner-del-" + suffix, ownerEmail);

		mockMvc.perform(get("/api/v1/me/salon/notifications").header("Authorization", bearer(staff)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.types[0].sent").value(1));

		mockMvc.perform(delete("/api/v1/me/salon/notifications/messages/" + n.getId())
						.header("Authorization", bearer(owner)))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/v1/me/salon/notifications/messages")
						.param("bucket", "BOOKING_CONFIRMATION")
						.header("Authorization", bearer(staff)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isEmpty());

		mockMvc.perform(get("/api/v1/me/salon/notifications").header("Authorization", bearer(staff)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.types[0].sent").value(0))
				.andExpect(jsonPath("$.types[0].pending").value(0));
	}

	@Test
	void staffSalon_returnsStudioDisplayName() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String ownerEmail = "owner-staff-salon-" + suffix + "@test.com";
		String slug = "slug-staff-salon-" + suffix;
		StudioGroup group = studioGroupRepository.save(new StudioGroup("Parruccieri Rossi", ownerEmail, "BASE"));
		Location location = locationRepository.save(new Location(group, slug, "Sede Centro", "MI"));
		StaffOperator operator = staffOperatorRepository.save(new StaffOperator(location, "Op"));
		ConsumerProfile staff = saveStaff("sub-staff-salon-" + suffix, "staff-salon-" + suffix + "@test.com");
		operator.setConsumerProfile(staff);
		staffOperatorRepository.save(operator);

		mockMvc.perform(get("/api/v1/me/staff/salon").header("Authorization", bearer(staff)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.salonDisplayName").value("Parruccieri Rossi"))
				.andExpect(jsonPath("$.staffOperatorId").value(operator.getId().toString()))
				.andExpect(jsonPath("$.primaryLocationId").value(location.getId().toString()))
				.andExpect(jsonPath("$.planTier").value("BASE"));
	}

	@Test
	void staffSalon_whenOperatorNotLinked_returnsNullDisplayName() throws Exception {
		ConsumerProfile staff = saveStaff("sub-staff-unlinked-" + UUID.randomUUID(), "staff-unlinked-" + UUID.randomUUID() + "@test.com");
		mockMvc.perform(get("/api/v1/me/staff/salon").header("Authorization", bearer(staff)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.salonDisplayName", nullValue()))
				.andExpect(jsonPath("$.staffOperatorId", nullValue()))
				.andExpect(jsonPath("$.primaryLocationId", nullValue()))
				.andExpect(jsonPath("$.planTier", nullValue()));
	}

	@Test
	void staffSalon_whenUidMismatchButSubMatchesLinkedOperator_ok() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String ownerEmail = "owner-staff-uid-mis-" + suffix + "@test.com";
		String slug = "slug-staff-uid-mis-" + suffix;
		StudioGroup group = studioGroupRepository.save(new StudioGroup("Studio UID Mis", ownerEmail, "PREMIUM"));
		Location location = locationRepository.save(new Location(group, slug, "Sede", "MI"));
		StaffOperator operator = staffOperatorRepository.save(new StaffOperator(location, "Op"));
		ConsumerProfile staff = saveStaff("sub-staff-uid-mis-" + suffix, "staff-uid-mis-" + suffix + "@test.com");
		operator.setConsumerProfile(staff);
		staffOperatorRepository.save(operator);

		List<String> roles = LuxuryUserPrincipal.parseRoleStrings(staff.getSecurityRoles());
		String token = luxuryTokenService.createAccessToken(
				UUID.randomUUID(),
				staff.getAuthSub(),
				staff.getEmail(),
				roles,
				staff.getPlanTier());

		mockMvc.perform(get("/api/v1/me/staff/salon").header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.salonDisplayName").value("Studio UID Mis"))
				.andExpect(jsonPath("$.primaryLocationId").value(location.getId().toString()))
				.andExpect(jsonPath("$.planTier").value("PREMIUM"));
	}

	@Test
	void staffOperatorProfile_get_returnsLinkedOperator() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String ownerEmail = "owner-staff-opprof-" + suffix + "@test.com";
		String slug = "slug-staff-opprof-" + suffix;
		StudioGroup group = studioGroupRepository.save(new StudioGroup("Studio Op Prof", ownerEmail, "BASE"));
		Location location = locationRepository.save(new Location(group, slug, "Sede", "MI"));
		StaffOperator operator = staffOperatorRepository.save(new StaffOperator(location, "Mario", "Rossi", "Stylist", null));
		ConsumerProfile staff = saveStaff("sub-staff-opprof-" + suffix, "staff-opprof-" + suffix + "@test.com");
		operator.setConsumerProfile(staff);
		staffOperatorRepository.save(operator);

		mockMvc.perform(get("/api/v1/me/staff/operator-profile").header("Authorization", bearer(staff)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(operator.getId().toString()))
				.andExpect(jsonPath("$.firstName").value("Mario"))
				.andExpect(jsonPath("$.lastName").value("Rossi"))
				.andExpect(jsonPath("$.role").value("Stylist"))
				.andExpect(jsonPath("$.photoDataUrl", nullValue()));
	}

	@Test
	void staffOperatorProfile_patch_updatesPhoto() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String ownerEmail = "owner-staff-ph-" + suffix + "@test.com";
		String slug = "slug-staff-ph-" + suffix;
		StudioGroup group = studioGroupRepository.save(new StudioGroup("Studio Photo", ownerEmail, "BASE"));
		Location location = locationRepository.save(new Location(group, slug, "Sede", "MI"));
		StaffOperator operator = staffOperatorRepository.save(new StaffOperator(location, "Lu", "Na", "Barber", null));
		ConsumerProfile staff = saveStaff("sub-staff-ph-" + suffix, "staff-ph-" + suffix + "@test.com");
		operator.setConsumerProfile(staff);
		staffOperatorRepository.save(operator);

		String dataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8BP//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8BP//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEABj8Cf//Z";
		mockMvc.perform(
						patch("/api/v1/me/staff/operator-profile")
								.header("Authorization", bearer(staff))
								.contentType(MediaType.APPLICATION_JSON)
								.content("{\"photoDataUrl\":\"" + dataUrl.replace("\\", "\\\\").replace("\"", "\\\"") + "\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.photoDataUrl").value(dataUrl));

		mockMvc.perform(get("/api/v1/me/staff/operator-profile").header("Authorization", bearer(staff)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.photoDataUrl").value(dataUrl));
	}

	@Test
	void staffOperatorProfile_whenUnlinked_returns404() throws Exception {
		ConsumerProfile staff = saveStaff("sub-staff-nolink-op-" + UUID.randomUUID(), "staff-nolink-op-" + UUID.randomUUID() + "@test.com");
		mockMvc.perform(get("/api/v1/me/staff/operator-profile").header("Authorization", bearer(staff)))
				.andExpect(status().isNotFound());
		mockMvc.perform(
						patch("/api/v1/me/staff/operator-profile")
								.header("Authorization", bearer(staff))
								.contentType(MediaType.APPLICATION_JSON)
								.content("{\"photoDataUrl\":null}"))
				.andExpect(status().isNotFound());
	}

	@Test
	void salonNotifications_ackSent_returnsInbox() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String email = "studio-owner-ack-" + suffix + "@test.com";
		String slug = "slug-ack-" + suffix;
		StudioGroup g = studioGroupRepository.save(new StudioGroup("Salone Ack", email, "PREMIUM"));
		locationRepository.save(new Location(g, slug, "Sede", "MI"));
		ConsumerProfile p = saveOwner("sub-ack-" + suffix, email);

		mockMvc.perform(post("/api/v1/me/salon/notifications/inbox/ack-sent").header("Authorization", bearer(p)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.types").isArray())
				.andExpect(jsonPath("$.types[0].sent").exists())
				.andExpect(jsonPath("$.types[0].pending").exists());
	}


	@Test
	void salonSummary_anonymous_unauthorized() throws Exception {
		mockMvc.perform(get("/api/v1/me/salon"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void salonSummary_client_forbidden() throws Exception {
		String sub = "sub-client-" + UUID.randomUUID();
		ConsumerProfile p = new ConsumerProfile(sub, "a@b.c", "C");
		p.setPasswordHash(passwordEncoder.encode("x"));
		p.setSecurityRoles("CLIENT");
		p = consumerProfileRepository.save(p);
		mockMvc.perform(get("/api/v1/me/salon").header("Authorization", bearer(p)))
				.andExpect(status().isForbidden());
	}

	@Test
	void salonSummary_ownerWithoutStudio_getsOrphanRepairedThenProvisioned() throws Exception {
		String ghostEmail = "ghost-" + UUID.randomUUID() + "@b.c";
		ConsumerProfile p = saveOwner("sub-x-" + UUID.randomUUID(), ghostEmail);
		mockMvc.perform(get("/api/v1/me/salon").header("Authorization", bearer(p)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.provisioned").value(true));
	}

	@Test
	void salonSummary_ownerWithDbRow_usesEmailFromToken() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String email = "studio-owner-pref-" + suffix + "@test.com";
		String slug = "slug-pref-" + suffix;
		StudioGroup group = studioGroupRepository.save(new StudioGroup("Salone Pref", email, "BASE"));
		locationRepository.save(new Location(group, slug, "Hair Studio", "TO"));
		ConsumerProfile p = saveOwner("sub-pref", email);

		mockMvc.perform(get("/api/v1/me/salon").header("Authorization", bearer(p)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.provisioned").value(true))
				.andExpect(jsonPath("$.primaryLocationName").value("Salone Pref"));
	}

	@Test
	void salonSummary_owner_resolvesByAuthSubWhenEmailAbsentFromToken() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String email = "owner-auth-sub-" + suffix + "@test.com";
		String authSub = "auth-user-" + suffix;
		String slug = "slug-auth-sub-" + suffix;
		StudioGroup g = studioGroupRepository.save(new StudioGroup("Vetrina Sub", email, "BASE", authSub));
		locationRepository.save(new Location(g, slug, "Vetrina Sub", "NA"));
		ConsumerProfile p = saveOwner(authSub, email);

		mockMvc.perform(get("/api/v1/me/salon").header("Authorization", bearer(p, "")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.provisioned").value(true))
				.andExpect(jsonPath("$.primaryLocationName").value("Vetrina Sub"));
	}

	@Test
	void salonSummary_owner_resolvesEmailFromConsumerProfileWhenTokenHasNoEmail() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String email = "owner-prof-" + suffix + "@test.com";
		String sub = "sub-prof-" + suffix;
		String slug = "slug-prof-" + suffix;
		StudioGroup g = studioGroupRepository.save(new StudioGroup("Salone Profilo", email, "BASE"));
		locationRepository.save(new Location(g, slug, "Salone Profilo", "CT"));
		ConsumerProfile p = saveOwner(sub, email);

		mockMvc.perform(get("/api/v1/me/salon").header("Authorization", bearer(p, "")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.provisioned").value(true))
				.andExpect(jsonPath("$.primaryLocationName").value("Salone Profilo"));
	}

	@Test
	void salonAgenda_client_forbidden() throws Exception {
		String sub = "sub-agenda-client-" + UUID.randomUUID();
		ConsumerProfile p = new ConsumerProfile(sub, "a@b.c", "C");
		p.setPasswordHash(passwordEncoder.encode("x"));
		p.setSecurityRoles("CLIENT");
		p = consumerProfileRepository.save(p);
		mockMvc.perform(get("/api/v1/me/salon/agenda")
						.param("from", "2026-04-07")
						.param("to", "2026-04-13")
						.header("Authorization", bearer(p)))
				.andExpect(status().isForbidden());
	}

	@Test
	void salonAgenda_ownerNotProvisioned_returnsEmptyArray() throws Exception {
		String ghostEmail = "ghost-ag-" + UUID.randomUUID() + "@b.c";
		ConsumerProfile p = saveOwner("sub-ag-" + UUID.randomUUID(), ghostEmail);
		mockMvc.perform(get("/api/v1/me/salon/agenda")
						.param("from", "2026-04-07")
						.param("to", "2026-04-13")
						.header("Authorization", bearer(p)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isArray());
	}

	/**
	 * Agenda titolare: include appuntamenti nel range e non fallisce se la sede ha un fuso non valido in DB
	 * (si usa fallback Europa/Rome).
	 */
	@Test
	void salonAgenda_owner_returnsConfirmedAppointment_evenWithInvalidLocationTimezone() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String ownerEmail = "owner-agenda-tz-" + suffix + "@test.com";
		String slug = "slug-agenda-tz-" + suffix;
		StudioGroup group = studioGroupRepository.save(new StudioGroup("Salone Agenda TZ", ownerEmail, "PREMIUM"));
		Location location = locationRepository.save(new Location(group, slug, "Sede TZ", "MI"));
		location.setTimeZone("Not/AValidZone");
		locationRepository.save(location);
		SalonService service = salonServiceRepository.save(new SalonService(location, "Piega", 45, 3500));
		StaffOperator operator = staffOperatorRepository.save(new StaffOperator(location, "Op TZ"));
		ConsumerProfile client = new ConsumerProfile("sub-client-agtz-" + suffix, "client-agtz-" + suffix + "@test.com", "Bea");
		client.setPasswordHash(passwordEncoder.encode("x"));
		client.setSecurityRoles("CLIENT");
		client = consumerProfileRepository.save(client);
		SalonClient sc = salonClientRepository.save(new SalonClient(location, "Bea"));
		sc.setConsumerProfile(client);
		salonClientRepository.save(sc);
		Instant startsAt = Instant.now().plus(3, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS);
		Instant endsAt = startsAt.plus(45, ChronoUnit.MINUTES);
		Appointment appointment = new Appointment(location, service, operator, sc, startsAt, endsAt);
		appointment.setConsumerProfile(client);
		appointment.setStatus(AppointmentStatus.CONFIRMED);
		appointment = appointmentRepository.save(appointment);
		ConsumerProfile owner = saveOwner("sub-owner-agtz-" + suffix, ownerEmail);
		LocalDate d = startsAt.atZone(ZoneId.of("Europe/Rome")).toLocalDate();
		LocalDate from = d.minusDays(2);
		LocalDate to = d.plusDays(2);
		mockMvc.perform(get("/api/v1/me/salon/agenda")
						.param("from", from.toString())
						.param("to", to.toString())
						.header("Authorization", bearer(owner)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].id").value(appointment.getId().toString()));
	}

	@Test
	void salonAppointmentCreate_owner_persistsAndAppearsInAgenda() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String ownerEmail = "owner-create-appt-" + suffix + "@test.com";
		String slug = "slug-create-appt-" + suffix;
		StudioGroup group = studioGroupRepository.save(new StudioGroup("Salone Create Appt", ownerEmail, "PREMIUM"));
		Location location = locationRepository.save(new Location(group, slug, "Sede Create", "MI"));
		SalonService service = salonServiceRepository.save(new SalonService(location, "Colore", 60, 4500));
		StaffOperator operator = staffOperatorRepository.save(new StaffOperator(location, "Op Create"));
		SalonClient sc = salonClientRepository.save(new SalonClient(location, "Cliente Walk-in"));
		ZoneId zone = ZoneId.of("Europe/Rome");
		LocalDate bookDay = LocalDate.now(zone).plusDays(4);
		Instant startsAt = bookDay.atTime(10, 30).atZone(zone).toInstant();
		ConsumerProfile owner = saveOwner("sub-owner-create-appt-" + suffix, ownerEmail);

		mockMvc.perform(post("/api/v1/me/salon/appointments")
						.header("Authorization", bearer(owner))
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "salonClientId": "%s",
								  "serviceId": "%s",
								  "operatorId": "%s",
								  "start": "%s"
								}
								"""
								.formatted(sc.getId(), service.getId(), operator.getId(), startsAt)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.serviceName").value("Colore"))
				.andExpect(jsonPath("$.salonClientDisplayName").value("Cliente Walk-in"));

		LocalDate d = startsAt.atZone(ZoneId.of("Europe/Rome")).toLocalDate();
		mockMvc.perform(get("/api/v1/me/salon/agenda")
						.param("from", d.minusDays(1).toString())
						.param("to", d.plusDays(1).toString())
						.header("Authorization", bearer(owner)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].salonClientDisplayName").value("Cliente Walk-in"));
	}

	@Test
	void salonAppointmentCreate_walkInClient_schedulesSalonInboxOnly() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String ownerEmail = "owner-walkin-" + suffix + "@test.com";
		String slug = "slug-walkin-" + suffix;
		StudioGroup group = studioGroupRepository.save(new StudioGroup("Salone Walk-in", ownerEmail, "PREMIUM"));
		Location location = locationRepository.save(new Location(group, slug, "Sede", "MI"));
		SalonService service = salonServiceRepository.save(new SalonService(location, "Piega", 45, 3500));
		StaffOperator operator = staffOperatorRepository.save(new StaffOperator(location, "Op"));
		SalonClient sc = salonClientRepository.save(new SalonClient(location, "Mario Rossi"));
		ZoneId zone = ZoneId.of("Europe/Rome");
		LocalDate bookDay = LocalDate.now(zone).plusDays(5);
		Instant startsAt = bookDay.atTime(11, 0).atZone(zone).toInstant();
		ConsumerProfile owner = saveOwner("sub-owner-walkin-" + suffix, ownerEmail);

		mockMvc.perform(post("/api/v1/me/salon/appointments")
						.header("Authorization", bearer(owner))
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "salonClientId": "%s",
								  "serviceId": "%s",
								  "operatorId": "%s",
								  "start": "%s"
								}
								"""
								.formatted(sc.getId(), service.getId(), operator.getId(), startsAt)))
				.andExpect(status().isCreated());

		var walkInNotifications = scheduledNotificationRepository.findAll().stream()
				.filter(n -> n.getAppointment() != null && n.getType() == NotificationType.BOOKING_CREATED_FOR_SALON)
				.toList();
		assert walkInNotifications.size() == 1;
		assert walkInNotifications.get(0).getType() == NotificationType.BOOKING_CREATED_FOR_SALON;
		assert walkInNotifications.get(0).getStatus() == QueuedNotificationStatus.SENT;
		assert walkInNotifications.get(0).getSentAt() != null;

		mockMvc.perform(get("/api/v1/me/salon/notifications/messages")
						.param("bucket", "BOOKING_CONFIRMATION")
						.header("Authorization", bearer(owner)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].notificationType").value("BOOKING_CREATED_FOR_SALON"))
				.andExpect(jsonPath("$[0].clientName").value("Mario Rossi"))
				.andExpect(jsonPath("$[0].previewLine", org.hamcrest.Matchers.containsString("Mario Rossi ha prenotato")));
	}

	@Test
	void salonAppointmentCreate_client_forbidden() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		ConsumerProfile client = new ConsumerProfile("sub-client-create-appt-" + suffix, "c-" + suffix + "@test.com", "Cli");
		client.setPasswordHash(passwordEncoder.encode("x"));
		client.setSecurityRoles("CLIENT");
		client = consumerProfileRepository.save(client);

		mockMvc.perform(post("/api/v1/me/salon/appointments")
						.header("Authorization", bearer(client))
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "salonClientId": "%s",
								  "serviceId": "%s",
								  "operatorId": "%s",
								  "start": "%s"
								}
								"""
								.formatted(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), Instant.now())))
				.andExpect(status().isForbidden());
	}

	@Test
	void salonNotifications_client_forbidden() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		ConsumerProfile client = new ConsumerProfile("sub-client-notif-" + suffix, "c-notif-" + suffix + "@test.com", "Cli");
		client.setPasswordHash(passwordEncoder.encode("x"));
		client.setSecurityRoles("CLIENT");
		client = consumerProfileRepository.save(client);

		mockMvc.perform(get("/api/v1/me/salon/notifications").header("Authorization", bearer(client)))
				.andExpect(status().isForbidden());

		mockMvc.perform(get("/api/v1/me/salon/notifications/messages")
						.param("bucket", "BOOKING_CONFIRMATION")
						.header("Authorization", bearer(client)))
				.andExpect(status().isForbidden());
	}

	@Test
	void salonAppointmentDetail_ownerWrongGroup_notFound() throws Exception {
		UUID randomId = UUID.randomUUID();
		String email = "owner-appt-" + UUID.randomUUID() + "@test.com";
		StudioGroup g = studioGroupRepository.save(new StudioGroup("Salone Appt", email, "BASE"));
		locationRepository.save(new Location(g, "slug-appt-" + UUID.randomUUID(), "Sede", "MI"));
		ConsumerProfile p = saveOwner("sub-z", email);

		mockMvc.perform(get("/api/v1/me/salon/appointments/" + randomId).header("Authorization", bearer(p)))
				.andExpect(status().isNotFound());
	}

	@Test
	void salonSummary_ownerWithDbRow_returnsPlanAndSlug() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String email = "studio-owner-me-salon-" + suffix + "@test.com";
		String slug = "slug-me-salon-" + suffix;
		StudioGroup g = studioGroupRepository.save(new StudioGroup("Salone X", email, "PREMIUM"));
		Location loc = new Location(g, slug, "Nome pub", "RM");
		loc.setAddressLine("Via Nazionale 1");
		locationRepository.save(loc);
		ConsumerProfile p = saveOwner("sub-y", email);

		mockMvc.perform(get("/api/v1/me/salon").header("Authorization", bearer(p)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.provisioned").value(true))
				.andExpect(jsonPath("$.planTier").value("PREMIUM"))
				.andExpect(jsonPath("$.primaryLocationSlug").value(slug))
				.andExpect(jsonPath("$.primaryLocationName").value("Salone X"))
				.andExpect(jsonPath("$.primaryLocationCity").value("RM"))
				.andExpect(jsonPath("$.primaryLocationAddressLine").value("Via Nazionale 1"))
				.andExpect(jsonPath("$.primaryLocationSalonClientGenders").isArray())
				.andExpect(jsonPath("$.primaryLocationSalonClientGenders").isEmpty());
	}

	@Test
	void salonSummary_ownerWithClientGenders_returnsList() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String email = "studio-owner-me-genders-" + suffix + "@test.com";
		String slug = "slug-me-genders-" + suffix;
		StudioGroup g = studioGroupRepository.save(new StudioGroup("Salone G", email, "PREMIUM"));
		Location loc = new Location(g, slug, "Nome pub", "RM");
		loc.setSalonClientGenders("MALE");
		locationRepository.save(loc);
		ConsumerProfile p = saveOwner("sub-genders-" + suffix, email);

		mockMvc.perform(get("/api/v1/me/salon").header("Authorization", bearer(p)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.primaryLocationSalonClientGenders[0]").value("MALE"));
	}

	@Test
	void salonUpdate_ownerAddsFemaleClientGender_persists() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String email = "studio-owner-me-patch-genders-" + suffix + "@test.com";
		String slug = "slug-me-patch-genders-" + suffix;
		StudioGroup g = studioGroupRepository.save(new StudioGroup("Salone Patch", email, "PREMIUM"));
		Location loc = new Location(g, slug, "Salone Patch", "RM");
		loc.setSalonClientGenders("MALE");
		locationRepository.save(loc);
		ConsumerProfile p = saveOwner("sub-patch-genders-" + suffix, email);

		mockMvc.perform(patch("/api/v1/me/salon")
						.header("Authorization", bearer(p))
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "primaryLocationName": "Salone Patch",
								  "primaryLocationSlug": "%s",
								  "primaryLocationCity": "RM",
								  "primaryLocationSalonClientGenders": ["MALE", "FEMALE"]
								}
								""".formatted(slug)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.primaryLocationSalonClientGenders[0]").value("FEMALE"))
				.andExpect(jsonPath("$.primaryLocationSalonClientGenders[1]").value("MALE"));
	}

	@Test
	void salonUpdate_ownerSetsOpeningHours_persistsAndDrivesBookingWindow() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String email = "studio-owner-me-hours-" + suffix + "@test.com";
		String slug = "slug-me-hours-" + suffix;
		StudioGroup g = studioGroupRepository.save(new StudioGroup("Salone Orari", email, "PREMIUM"));
		Location loc = new Location(g, slug, "Salone Orari", "RM");
		locationRepository.save(loc);
		ConsumerProfile p = saveOwner("sub-hours-" + suffix, email);

		mockMvc.perform(patch("/api/v1/me/salon")
						.header("Authorization", bearer(p))
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "primaryLocationName": "Salone Orari",
								  "primaryLocationSlug": "%s",
								  "primaryLocationCity": "RM",
								  "primaryLocationOpeningMinuteOfDay": 510,
								  "primaryLocationClosingMinuteOfDay": 1170
								}
								""".formatted(slug)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.primaryLocationOpeningMinuteOfDay").value(510))
				.andExpect(jsonPath("$.primaryLocationClosingMinuteOfDay").value(1170));

		Location updated = locationRepository.findBySlug(slug).orElseThrow();
		org.junit.jupiter.api.Assertions.assertEquals(510, updated.getWorkStartMinuteOfDay());
		org.junit.jupiter.api.Assertions.assertEquals(1170, updated.getWorkEndMinuteOfDay());
	}

	@Test
	void publicAvailability_respectsSalonClosingHour() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String slug = "slug-avail-close-" + suffix;
		StudioGroup g = savePremiumGroup(new StudioGroup("Salone Avail", "owner-avail-" + suffix + "@test.com", "PREMIUM"));
		Location loc = new Location(g, slug, "Sede Avail", "RM");
		loc.setWorkStartMinuteOfDay(540);
		loc.setWorkEndMinuteOfDay(1140);
		loc.setTimeZone("UTC");
		locationRepository.save(loc);
		SalonService service = salonServiceRepository.save(new SalonService(loc, "Taglio", 30, 3000));
		staffOperatorRepository.save(new StaffOperator(loc, "Op"));
		LocalDate day = LocalDate.now(ZoneId.of("Europe/Rome")).plusDays(3);

		mockMvc.perform(get("/api/v1/public/organizations/" + slug + "/availability")
						.param("serviceId", service.getId().toString())
						.param("from", day.toString())
						.param("to", day.toString()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].date").value(day.toString()))
				.andExpect(jsonPath("$[0].totalSlots").value(39))
				.andExpect(jsonPath("$[0].slotsIso[0]").value(org.hamcrest.Matchers.containsString("T09:00")));
	}

	@Test
	void publicAvailability_marksClosedWeekdayWithoutSlots() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String slug = "slug-avail-closed-" + suffix;
		StudioGroup g = savePremiumGroup(new StudioGroup("Salone Chiuso", "owner-closed-" + suffix + "@test.com", "PREMIUM"));
		Location loc = new Location(g, slug, "Sede Chiuso", "RM");
		loc.setWorkStartMinuteOfDay(540);
		loc.setWorkEndMinuteOfDay(1140);
		loc.setTimeZone("Europe/Rome");
		loc.setWorkOpenDaysMask(SalonOpenDays.ALL_DAYS_MASK & ~(1 << (DayOfWeek.MONDAY.getValue() - 1)));
		locationRepository.save(loc);
		SalonService service = salonServiceRepository.save(new SalonService(loc, "Taglio", 30, 3000));
		staffOperatorRepository.save(new StaffOperator(loc, "Op"));
		LocalDate monday = LocalDate.of(2026, 7, 6);

		mockMvc.perform(get("/api/v1/public/organizations/" + slug + "/availability")
						.param("serviceId", service.getId().toString())
						.param("from", monday.toString())
						.param("to", monday.toString()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].date").value(monday.toString()))
				.andExpect(jsonPath("$[0].closed").value(true))
				.andExpect(jsonPath("$[0].totalSlots").value(0))
				.andExpect(jsonPath("$[0].slotsIso").isEmpty());
	}

	@Test
	void salonSummary_premiumWithStatisticsPinHash_flagsPinRequired() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String email = "studio-owner-pin-" + suffix + "@test.com";
		String slug = "slug-pin-" + suffix;
		StudioGroup g = studioGroupRepository.save(new StudioGroup("Salone Pin", email, "PREMIUM"));
		g.setStatisticsPinHash(passwordEncoder.encode("123456"));
		studioGroupRepository.save(g);
		locationRepository.save(new Location(g, slug, "Sede", "MI"));
		ConsumerProfile p = saveOwner("sub-pin-" + suffix, email);

		mockMvc.perform(get("/api/v1/me/salon").header("Authorization", bearer(p)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.statisticsPinRequired").value(true));
	}

	@Test
	void statisticsVerifyPin_ownerCorrectPin_noContent() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String email = "studio-owner-vpin-" + suffix + "@test.com";
		String slug = "slug-vpin-" + suffix;
		StudioGroup g = savePremiumGroup(new StudioGroup("Salone VPin", email, "PREMIUM"));
		g.setStatisticsPinHash(passwordEncoder.encode("654321"));
		studioGroupRepository.save(g);
		locationRepository.save(new Location(g, slug, "Sede", "TO"));
		ConsumerProfile p = saveOwner("sub-vpin-" + suffix, email);

		mockMvc.perform(post("/api/v1/me/salon/statistics/verify-pin")
						.header("Authorization", bearer(p))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"pin\":\"654321\"}"))
				.andExpect(status().isNoContent());

		mockMvc.perform(post("/api/v1/me/salon/verify-statistics-pin")
						.header("Authorization", bearer(p))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"pin\":\"654321\"}"))
				.andExpect(status().isNoContent());
	}

	@Test
	void statisticsVerifyPin_ownerWrongPin_badRequest() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String email = "studio-owner-badpin-" + suffix + "@test.com";
		String slug = "slug-badpin-" + suffix;
		StudioGroup g = studioGroupRepository.save(new StudioGroup("Salone BadPin", email, "PREMIUM"));
		g.setStatisticsPinHash(passwordEncoder.encode("111111"));
		studioGroupRepository.save(g);
		locationRepository.save(new Location(g, slug, "Sede", "NA"));
		ConsumerProfile p = saveOwner("sub-badpin-" + suffix, email);

		mockMvc.perform(post("/api/v1/me/salon/statistics/verify-pin")
						.header("Authorization", bearer(p))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"pin\":\"999999\"}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void statisticsVerifyPin_client_forbidden() throws Exception {
		String sub = "sub-vpin-client-" + UUID.randomUUID();
		ConsumerProfile p = new ConsumerProfile(sub, "a@b.c", "C");
		p.setPasswordHash(passwordEncoder.encode("x"));
		p.setSecurityRoles("CLIENT");
		p = consumerProfileRepository.save(p);
		mockMvc.perform(post("/api/v1/me/salon/statistics/verify-pin")
						.header("Authorization", bearer(p))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"pin\":\"123456\"}"))
				.andExpect(status().isForbidden());
	}

	@Test
	void statisticsChangePin_ownerCorrectCurrent_noContent() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String email = "studio-owner-chpin-" + suffix + "@test.com";
		String slug = "slug-chpin-" + suffix;
		StudioGroup g = savePremiumGroup(new StudioGroup("Salone ChPin", email, "PREMIUM"));
		g.setStatisticsPinHash(passwordEncoder.encode("111111"));
		studioGroupRepository.save(g);
		locationRepository.save(new Location(g, slug, "Sede", "MI"));
		ConsumerProfile p = saveOwner("sub-chpin-" + suffix, email);

		mockMvc.perform(patch("/api/v1/me/salon/statistics/pin")
						.header("Authorization", bearer(p))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"currentPin\":\"111111\",\"newPin\":\"222222\",\"confirmNewPin\":\"222222\"}"))
				.andExpect(status().isNoContent());

		mockMvc.perform(post("/api/v1/me/salon/statistics/verify-pin")
						.header("Authorization", bearer(p))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"pin\":\"222222\"}"))
				.andExpect(status().isNoContent());
	}

	@Test
	void statisticsChangePin_ownerWrongCurrent_badRequest() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String email = "studio-owner-wcpin-" + suffix + "@test.com";
		String slug = "slug-wcpin-" + suffix;
		StudioGroup g = studioGroupRepository.save(new StudioGroup("Salone WcPin", email, "PREMIUM"));
		g.setStatisticsPinHash(passwordEncoder.encode("111111"));
		studioGroupRepository.save(g);
		locationRepository.save(new Location(g, slug, "Sede", "MI"));
		ConsumerProfile p = saveOwner("sub-wcpin-" + suffix, email);

		mockMvc.perform(patch("/api/v1/me/salon/statistics/pin")
						.header("Authorization", bearer(p))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"currentPin\":\"999999\",\"newPin\":\"222222\",\"confirmNewPin\":\"222222\"}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void statisticsChangePin_freePlan_badRequest() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String email = "studio-owner-basepin-" + suffix + "@test.com";
		String slug = "slug-basepin-" + suffix;
		StudioGroup g = studioGroupRepository.save(new StudioGroup("Salone Base", email, "BASE"));
		locationRepository.save(new Location(g, slug, "Sede", "MI"));
		ConsumerProfile p = saveOwner("sub-basepin-" + suffix, email);

		mockMvc.perform(patch("/api/v1/me/salon/statistics/pin")
						.header("Authorization", bearer(p))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"newPin\":\"222222\",\"confirmNewPin\":\"222222\"}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void salonStaffCreate_thenStaffPasswordLogin_ok() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String ownerEmail = "owner-staff-login-" + suffix + "@test.com";
		String staffEmail = "staff-login-" + suffix + "@test.com";
		String slug = "slug-staff-" + suffix;
		StudioGroup g = studioGroupRepository.save(new StudioGroup("Salone Staff Login", ownerEmail, "BASE"));
		locationRepository.save(new Location(g, slug, "Sede", "MI"));
		ConsumerProfile owner = saveOwner("sub-staff-" + suffix, ownerEmail);

		String staffPassword = "staffpass123";
		String createBody = """
				{"firstName":"Lu","lastName":"Na","role":"Barber","photoDataUrl":null,"email":"%s","password":"%s"}
				""".formatted(staffEmail, staffPassword).trim();

		mockMvc.perform(post("/api/v1/me/salon/staff")
						.header("Authorization", bearer(owner))
						.contentType(MediaType.APPLICATION_JSON)
						.content(createBody))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.loginEnabled").value(true));

		String loginBody = """
				{"email":"%s","password":"%s"}
				""".formatted(staffEmail, staffPassword);

		mockMvc.perform(post("/api/v1/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(loginBody))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.accessToken").isNotEmpty());
	}
}
