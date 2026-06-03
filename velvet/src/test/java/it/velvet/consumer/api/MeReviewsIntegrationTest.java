package it.velvet.consumer.api;

import it.velvet.appointment.domain.Appointment;
import it.velvet.appointment.domain.AppointmentRepository;
import it.velvet.appointment.domain.AppointmentStatus;
import it.velvet.catalog.domain.SalonClient;
import it.velvet.catalog.domain.SalonClientRepository;
import it.velvet.catalog.domain.SalonService;
import it.velvet.catalog.domain.SalonServiceRepository;
import it.velvet.catalog.domain.StaffOperator;
import it.velvet.catalog.domain.StaffOperatorRepository;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.security.auth.VelvetTokenService;
import it.velvet.studio.domain.Location;
import it.velvet.studio.domain.LocationRepository;
import it.velvet.studio.domain.StudioGroup;
import it.velvet.studio.domain.StudioGroupRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integrazione JWT + DB H2: dopo almeno 2 h dalla fine appuntamento il cliente invia voti distinti
 * per salone e operatore; titolare e storico riflettono entrambi.
 */
@SpringBootTest
@AutoConfigureMockMvc
class MeReviewsIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private StudioGroupRepository studioGroupRepository;

	@Autowired
	private LocationRepository locationRepository;

	@Autowired
	private SalonServiceRepository salonServiceRepository;

	@Autowired
	private StaffOperatorRepository staffOperatorRepository;

	@Autowired
	private SalonClientRepository salonClientRepository;

	@Autowired
	private ConsumerProfileRepository consumerProfileRepository;

	@Autowired
	private AppointmentRepository appointmentRepository;

	@Autowired
	private VelvetTokenService velvetTokenService;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Test
	void client_afterTwoHoursFromVisitEnd_canSubmitSalonAndStaffRatings() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String ownerEmail = "owner-rev-int-" + suffix + "@test.com";
		String clientEmail = "client-rev-int-" + suffix + "@test.com";

		StudioGroup group = studioGroupRepository.save(new StudioGroup("Salone Rev Int", ownerEmail, "PREMIUM"));
		Location location = locationRepository.save(new Location(group, "slug-rev-int-" + suffix, "Sede", "MI"));
		SalonService service = salonServiceRepository.save(new SalonService(location, "Servizio Rev", 30, 3500));
		StaffOperator operator = staffOperatorRepository.save(new StaffOperator(location, "Operatore"));

		ConsumerProfile owner = new ConsumerProfile("sub-owner-rev-" + suffix, ownerEmail, "Titolare");
		owner.setPasswordHash(passwordEncoder.encode("x"));
		owner.setSecurityRoles("OWNER");
		owner = consumerProfileRepository.save(owner);

		ConsumerProfile client = new ConsumerProfile("sub-client-rev-" + suffix, clientEmail, "Cliente");
		client.setPasswordHash(passwordEncoder.encode("x"));
		client.setSecurityRoles("CLIENT");
		client = consumerProfileRepository.save(client);

		SalonClient salonClient = new SalonClient(location, "Cliente Display");
		salonClient.setConsumerProfile(client);
		salonClient = salonClientRepository.save(salonClient);

		Instant endsAt = Instant.now().minusSeconds(3 * 3600);
		Instant startsAt = endsAt.minusSeconds(3600);
		Appointment appointment = new Appointment(location, service, operator, salonClient, startsAt, endsAt);
		appointment.setConsumerProfile(client);
		appointment.setStatus(AppointmentStatus.CONFIRMED);
		appointment = appointmentRepository.save(appointment);

		String clientBearer = "Bearer " + velvetTokenService.createAccessToken(client);
		String ownerBearer = "Bearer " + velvetTokenService.createAccessToken(owner);

		mockMvc.perform(get("/api/v1/me/reviews/pending").header("Authorization", clientBearer))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].appointmentId").value(appointment.getId().toString()));

		mockMvc.perform(
						post("/api/v1/me/reviews")
								.header("Authorization", clientBearer)
								.contentType(MediaType.APPLICATION_JSON)
								.content(
										"{\"appointmentId\":\""
												+ appointment.getId()
												+ "\",\"rating\":4,\"staffRating\":5,\"comment\":\"Integration ok\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.rating").value(4))
				.andExpect(jsonPath("$.staffRating").value(5))
				.andExpect(jsonPath("$.comment").value("Integration ok"));

		mockMvc.perform(get("/api/v1/me/reviews/pending").header("Authorization", clientBearer))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isEmpty());

		mockMvc.perform(get("/api/v1/me/reviews").header("Authorization", clientBearer))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].rating").value(4))
				.andExpect(jsonPath("$[0].staffRating").value(5))
				.andExpect(jsonPath("$[0].appointmentId").value(appointment.getId().toString()));

		mockMvc.perform(get("/api/v1/me/salon/reviews").header("Authorization", ownerBearer))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].rating").value(4))
				.andExpect(jsonPath("$[0].staffRating").value(5))
				.andExpect(jsonPath("$[0].operatorName").value("Operatore"))
				.andExpect(jsonPath("$[0].comment").value("Integration ok"))
				.andExpect(jsonPath("$[0].reviewerName").value("Cliente Display"))
				.andExpect(jsonPath("$[0].serviceName").value("Servizio Rev"))
				.andExpect(jsonPath("$[0].locationName").value("Sede"));
	}

	@Test
	void client_cannotReview_nonCompletedAppointment() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String ownerEmail = "owner-bad-" + suffix + "@test.com";
		String clientEmail = "client-bad-" + suffix + "@test.com";

		StudioGroup group = studioGroupRepository.save(new StudioGroup("Salone Bad", ownerEmail, "PREMIUM"));
		Location location = locationRepository.save(new Location(group, "slug-bad-" + suffix, "Sede", "MI"));
		SalonService service = salonServiceRepository.save(new SalonService(location, "Svc", 20, 2000));
		StaffOperator operator = staffOperatorRepository.save(new StaffOperator(location, "Op"));

		ConsumerProfile owner = new ConsumerProfile("sub-own-bad-" + suffix, ownerEmail, "O");
		owner.setPasswordHash(passwordEncoder.encode("x"));
		owner.setSecurityRoles("OWNER");
		consumerProfileRepository.save(owner);

		ConsumerProfile client = new ConsumerProfile("sub-cli-bad-" + suffix, clientEmail, "C");
		client.setPasswordHash(passwordEncoder.encode("x"));
		client.setSecurityRoles("CLIENT");
		client = consumerProfileRepository.save(client);

		SalonClient salonClient = new SalonClient(location, "Cli");
		salonClient.setConsumerProfile(client);
		salonClient = salonClientRepository.save(salonClient);

		Instant endsAt = Instant.now().plusSeconds(3600);
		Instant startsAt = endsAt.minusSeconds(3600);
		Appointment appointment = new Appointment(location, service, operator, salonClient, startsAt, endsAt);
		appointment.setConsumerProfile(client);
		appointment.setStatus(AppointmentStatus.CONFIRMED);
		appointment = appointmentRepository.save(appointment);

		String clientBearer = "Bearer " + velvetTokenService.createAccessToken(client);

		mockMvc.perform(
						post("/api/v1/me/reviews")
								.header("Authorization", clientBearer)
								.contentType(MediaType.APPLICATION_JSON)
								.content(
										"{\"appointmentId\":\""
												+ appointment.getId()
												+ "\",\"rating\":5,\"staffRating\":5,\"comment\":null}"))
				.andExpect(status().isBadRequest());
	}
}
