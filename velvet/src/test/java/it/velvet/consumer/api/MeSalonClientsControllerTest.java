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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class MeSalonClientsControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private StudioGroupRepository studioGroupRepository;

	@Autowired
	private LocationRepository locationRepository;

	@Autowired
	private ConsumerProfileRepository consumerProfileRepository;

	@Autowired
	private SalonClientRepository salonClientRepository;

	@Autowired
	private SalonServiceRepository salonServiceRepository;

	@Autowired
	private StaffOperatorRepository staffOperatorRepository;

	@Autowired
	private AppointmentRepository appointmentRepository;

	@Autowired
	private VelvetTokenService velvetTokenService;

	@Autowired
	private PasswordEncoder passwordEncoder;

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

	private String bearer(ConsumerProfile p) {
		return "Bearer " + velvetTokenService.createAccessToken(p);
	}

	@Test
	void becomeClient_tracksMembershipAndIsIdempotent() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String email = "client-membership-" + suffix + "@test.com";
		String slug = "slug-membership-" + suffix;
		StudioGroup group = studioGroupRepository.save(new StudioGroup("Salone Membership " + suffix));
		Location location = locationRepository.save(new Location(group, slug, "Salone Membership", "MI"));
		ConsumerProfile profile = new ConsumerProfile("sub-membership-" + suffix, email, "Michele");
		profile.setPasswordHash(passwordEncoder.encode("x"));
		profile.setSecurityRoles("CLIENT");
		profile = consumerProfileRepository.save(profile);
		String token = velvetTokenService.createAccessToken(profile);

		mockMvc.perform(put("/api/v1/me/salon-clients/" + location.getId()).header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.organizationId").value(location.getId().toString()))
				.andExpect(jsonPath("$.slug").value(slug))
				.andExpect(jsonPath("$.name").value("Salone Membership"));

		mockMvc.perform(put("/api/v1/me/salon-clients/" + location.getId()).header("Authorization", "Bearer " + token))
				.andExpect(status().isOk());

		assertThat(salonClientRepository.findByLocation_IdAndConsumerProfile_Id(location.getId(), profile.getId())).isPresent();
		assertThat(salonClientRepository.findByConsumerProfile_IdOrderByCreatedAtDesc(profile.getId())).hasSize(1);

		mockMvc.perform(get("/api/v1/me/salon-clients").header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].organizationId").value(location.getId().toString()))
				.andExpect(jsonPath("$[0].slug").value(slug));
	}

	@Test
	void listWithoutJwt_returnsUnauthorized() throws Exception {
		mockMvc.perform(get("/api/v1/me/salon-clients"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void leaveClient_removesRowWhenNoAppointments() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String email = "client-leave-" + suffix + "@test.com";
		String slug = "slug-leave-" + suffix;
		StudioGroup group = studioGroupRepository.save(new StudioGroup("Salone Leave " + suffix));
		Location location = locationRepository.save(new Location(group, slug, "Salone Leave", "MI"));
		ConsumerProfile profile = new ConsumerProfile("sub-leave-" + suffix, email, "Michele");
		profile.setPasswordHash(passwordEncoder.encode("x"));
		profile.setSecurityRoles("CLIENT");
		profile = consumerProfileRepository.save(profile);
		String token = velvetTokenService.createAccessToken(profile);

		mockMvc.perform(put("/api/v1/me/salon-clients/" + location.getId()).header("Authorization", "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(post("/api/v1/me/salon-clients/" + location.getId() + "/leave").header("Authorization", "Bearer " + token))
				.andExpect(status().isNoContent());

		mockMvc.perform(get("/api/v1/me/salon-clients").header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isEmpty());

		assertThat(salonClientRepository.findByLocation_IdAndConsumerProfile_Id(location.getId(), profile.getId()))
				.isEmpty();
	}

	@Test
	void leaveClient_unlinksWhenAppointmentExists_thenBecomeClientReusesSameSalonClient() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String email = "client-unlink-" + suffix + "@test.com";
		String slug = "slug-unlink-" + suffix;
		StudioGroup group = studioGroupRepository.save(new StudioGroup("Salone Unlink " + suffix));
		Location location = locationRepository.save(new Location(group, slug, "Salone Unlink", "MI"));
		SalonService service = salonServiceRepository.save(new SalonService(location, "Taglio", 30, 3000));
		StaffOperator operator = staffOperatorRepository.save(new StaffOperator(location, "Op"));
		ConsumerProfile profile = new ConsumerProfile("sub-unlink-" + suffix, email, "Michele");
		profile.setPasswordHash(passwordEncoder.encode("x"));
		profile.setSecurityRoles("CLIENT");
		profile = consumerProfileRepository.save(profile);
		String token = velvetTokenService.createAccessToken(profile);

		mockMvc.perform(put("/api/v1/me/salon-clients/" + location.getId()).header("Authorization", "Bearer " + token))
				.andExpect(status().isOk());

		UUID salonClientId = salonClientRepository
				.findByLocation_IdAndConsumerProfile_Id(location.getId(), profile.getId())
				.map(SalonClient::getId)
				.orElseThrow();

		SalonClient sc = salonClientRepository.findById(salonClientId).orElseThrow();
		Instant endsAt = Instant.now().minusSeconds(3600);
		Instant startsAt = endsAt.minusSeconds(3600);
		Appointment appointment = new Appointment(location, service, operator, sc, startsAt, endsAt);
		appointment.setConsumerProfile(profile);
		appointment.setStatus(AppointmentStatus.COMPLETED);
		appointmentRepository.save(appointment);

		mockMvc.perform(delete("/api/v1/me/salon-clients/" + location.getId()).header("Authorization", "Bearer " + token))
				.andExpect(status().isNoContent());

		mockMvc.perform(get("/api/v1/me/salon-clients").header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isEmpty());

		assertThat(salonClientRepository.findById(salonClientId)).hasValueSatisfying(row -> assertThat(row.getConsumerProfile())
				.isNull());

		mockMvc.perform(put("/api/v1/me/salon-clients/" + location.getId()).header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(salonClientId.toString()));

		UUID consumerId = profile.getId();
		assertThat(salonClientRepository.findById(salonClientId))
				.hasValueSatisfying(row -> assertThat(row.getConsumerProfile().getId()).isEqualTo(consumerId));
	}

	@Test
	void chat_clientCanPostAndListMessages() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String email = "client-chat-" + suffix + "@test.com";
		String slug = "slug-chat-" + suffix;
		StudioGroup group = studioGroupRepository.save(new StudioGroup("Salone Chat Client " + suffix));
		Location location = locationRepository.save(new Location(group, slug, "Sede", "MI"));
		ConsumerProfile profile = new ConsumerProfile("sub-chat-" + suffix, email, "Michele");
		profile.setPasswordHash(passwordEncoder.encode("x"));
		profile.setSecurityRoles("CLIENT");
		profile = consumerProfileRepository.save(profile);
		String token = velvetTokenService.createAccessToken(profile);

		mockMvc.perform(put("/api/v1/me/salon-clients/" + location.getId()).header("Authorization", "Bearer " + token))
				.andExpect(status().isOk());

		UUID salonClientId = salonClientRepository
				.findByLocation_IdAndConsumerProfile_Id(location.getId(), profile.getId())
				.map(SalonClient::getId)
				.orElseThrow();

		String bodyJson = "{\"salonClientId\":\"" + salonClientId + "\",\"body\":\"Ciao dal cliente\"}";
		mockMvc.perform(post("/api/v1/me/salon-clients/chat/messages")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content(bodyJson))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.sender").value("CLIENT"))
				.andExpect(jsonPath("$.body").value("Ciao dal cliente"));

		mockMvc.perform(get("/api/v1/me/salon-clients/chat/messages").param("salonClientId", salonClientId.toString())
						.header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].sender").value("CLIENT"))
				.andExpect(jsonPath("$[0].body").value("Ciao dal cliente"));
	}

	@Test
	void chat_ownerPremium_canReadReplyAndUnreadCountsMove() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String ownerEmail = "owner-chat-prem-" + suffix + "@test.com";
		String slug = "slug-chat-prem-" + suffix;
		StudioGroup group = studioGroupRepository.save(new StudioGroup("Salone Chat Prem " + suffix, ownerEmail, "PREMIUM"));
		Location location = locationRepository.save(new Location(group, slug, "Sede", "MI"));
		ConsumerProfile client = new ConsumerProfile("sub-chat-prem-c-" + suffix, "client-chat-prem-" + suffix + "@test.com", "Anna");
		client.setPasswordHash(passwordEncoder.encode("x"));
		client.setSecurityRoles("CLIENT");
		client = consumerProfileRepository.save(client);
		String clientToken = velvetTokenService.createAccessToken(client);
		ConsumerProfile owner = saveOwner("sub-chat-prem-o-" + suffix, ownerEmail);

		mockMvc.perform(put("/api/v1/me/salon-clients/" + location.getId()).header("Authorization", "Bearer " + clientToken))
				.andExpect(status().isOk());
		UUID salonClientId = salonClientRepository
				.findByLocation_IdAndConsumerProfile_Id(location.getId(), client.getId())
				.map(SalonClient::getId)
				.orElseThrow();

		mockMvc.perform(post("/api/v1/me/salon-clients/chat/messages")
						.header("Authorization", "Bearer " + clientToken)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"salonClientId\":\"" + salonClientId + "\",\"body\":\"Messaggio cliente\"}"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/v1/me/salon-clients/chat/unread-count").header("Authorization", bearer(owner)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.ownerUnread").value(1))
				.andExpect(jsonPath("$.clientUnread").value(0));

		mockMvc.perform(get("/api/v1/me/salon-clients/chat/inbox-summaries").header("Authorization", bearer(owner)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].salonClientId").value(salonClientId.toString()))
				.andExpect(jsonPath("$[0].unreadCount").value(1))
				.andExpect(jsonPath("$[0].lastPreview").value("Messaggio cliente"))
				.andExpect(jsonPath("$[0].lastSender").value("CLIENT"));

		mockMvc.perform(get("/api/v1/me/salon-clients/chat/messages").param("salonClientId", salonClientId.toString())
						.header("Authorization", bearer(owner)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].sender").value("CLIENT"));

		mockMvc.perform(get("/api/v1/me/salon-clients/chat/unread-count").header("Authorization", bearer(owner)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.ownerUnread").value(0));

		mockMvc.perform(post("/api/v1/me/salon-clients/chat/messages")
						.header("Authorization", bearer(owner))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"salonClientId\":\"" + salonClientId + "\",\"body\":\"Risposta salone\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.sender").value("OWNER"));

		mockMvc.perform(get("/api/v1/me/salon-clients/chat/unread-count").header("Authorization", "Bearer " + clientToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.clientUnread").value(1));

		mockMvc.perform(get("/api/v1/me/salon-clients/chat/messages").param("salonClientId", salonClientId.toString())
						.header("Authorization", "Bearer " + clientToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[1].sender").value("OWNER"))
				.andExpect(jsonPath("$[1].body").value("Risposta salone"));

		mockMvc.perform(get("/api/v1/me/salon-clients/chat/unread-count").header("Authorization", "Bearer " + clientToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.clientUnread").value(0));
	}

	@Test
	void chat_basePlanOwner_cannotPostMessage() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String ownerEmail = "owner-base-chat-" + suffix + "@test.com";
		String slug = "slug-base-chat-" + suffix;
		StudioGroup group = studioGroupRepository.save(new StudioGroup("Salone Base Chat " + suffix, ownerEmail, "BASE"));
		Location location = locationRepository.save(new Location(group, slug, "Sede", "MI"));
		ConsumerProfile client = new ConsumerProfile("sub-base-chat-" + suffix, "client-base-chat-" + suffix + "@test.com", "Anna");
		client.setPasswordHash(passwordEncoder.encode("x"));
		client.setSecurityRoles("CLIENT");
		client = consumerProfileRepository.save(client);
		String clientToken = velvetTokenService.createAccessToken(client);
		ConsumerProfile owner = saveOwner("sub-owner-base-chat-" + suffix, ownerEmail);

		mockMvc.perform(put("/api/v1/me/salon-clients/" + location.getId()).header("Authorization", "Bearer " + clientToken))
				.andExpect(status().isOk());
		UUID salonClientId = salonClientRepository
				.findByLocation_IdAndConsumerProfile_Id(location.getId(), client.getId())
				.map(SalonClient::getId)
				.orElseThrow();

		mockMvc.perform(post("/api/v1/me/salon-clients/chat/messages")
						.header("Authorization", bearer(owner))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"salonClientId\":\"" + salonClientId + "\",\"body\":\"Hi\"}"))
				.andExpect(status().isForbidden());
	}

	@Test
	void chat_staffPremium_hasSeparateThreadFromOwner() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String ownerEmail = "owner-chat-staff-" + suffix + "@test.com";
		String slug = "slug-chat-staff-" + suffix;
		StudioGroup group = studioGroupRepository.save(new StudioGroup("Salone Staff Chat " + suffix, ownerEmail, "PREMIUM"));
		Location location = locationRepository.save(new Location(group, slug, "Sede", "MI"));
		SalonService service = salonServiceRepository.save(new SalonService(location, "Taglio", 30, 3000));
		ConsumerProfile client = new ConsumerProfile("sub-chat-staff-c-" + suffix, "client-chat-staff-" + suffix + "@test.com", "Anna");
		client.setPasswordHash(passwordEncoder.encode("x"));
		client.setSecurityRoles("CLIENT");
		client = consumerProfileRepository.save(client);
		String clientToken = velvetTokenService.createAccessToken(client);
		ConsumerProfile owner = saveOwner("sub-chat-staff-o-" + suffix, ownerEmail);
		ConsumerProfile staff = saveStaff("sub-chat-staff-s-" + suffix, "staff-chat-" + suffix + "@test.com");
		StaffOperator operator = staffOperatorRepository.save(new StaffOperator(location, "Op"));
		operator.setConsumerProfile(staff);
		staffOperatorRepository.save(operator);
		String staffBearer = bearer(staff);
		String ownerBearer = bearer(owner);

		mockMvc.perform(put("/api/v1/me/salon-clients/" + location.getId()).header("Authorization", "Bearer " + clientToken))
				.andExpect(status().isOk());
		UUID salonClientId = salonClientRepository
				.findByLocation_IdAndConsumerProfile_Id(location.getId(), client.getId())
				.map(SalonClient::getId)
				.orElseThrow();
		SalonClient sc = salonClientRepository.findById(salonClientId).orElseThrow();
		Instant endsAt = Instant.now().plusSeconds(3600);
		Instant startsAt = endsAt.minusSeconds(3600);
		Appointment appointment = new Appointment(location, service, operator, sc, startsAt, endsAt);
		appointment.setConsumerProfile(client);
		appointment.setStatus(AppointmentStatus.CONFIRMED);
		appointmentRepository.save(appointment);

		mockMvc.perform(post("/api/v1/me/salon-clients/chat/messages")
						.header("Authorization", "Bearer " + clientToken)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"salonClientId\":\"" + salonClientId + "\",\"body\":\"Dal cliente al titolare\"}"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/v1/me/salon-clients/chat/unread-count").header("Authorization", ownerBearer))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.ownerUnread").value(1));
		mockMvc.perform(get("/api/v1/me/salon-clients/chat/unread-count").header("Authorization", staffBearer))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.ownerUnread").value(0));

		mockMvc.perform(post("/api/v1/me/salon-clients/chat/messages")
						.header("Authorization", staffBearer)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"salonClientId\":\"" + salonClientId + "\",\"body\":\"Risposta operatore\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.sender").value("OWNER"));

		mockMvc.perform(get("/api/v1/me/salon-clients/chat/messages").param("salonClientId", salonClientId.toString())
						.header("Authorization", ownerBearer))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(1))
				.andExpect(jsonPath("$[0].body").value("Dal cliente al titolare"));

		mockMvc.perform(get("/api/v1/me/salon-clients/chat/messages")
						.param("salonClientId", salonClientId.toString())
						.param("staffOperatorId", operator.getId().toString())
						.header("Authorization", staffBearer))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(1))
				.andExpect(jsonPath("$[0].body").value("Risposta operatore"));

		mockMvc.perform(get("/api/v1/me/salon-clients/chat/messages")
						.param("salonClientId", salonClientId.toString())
						.param("staffOperatorId", operator.getId().toString())
						.header("Authorization", "Bearer " + clientToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].body").value("Risposta operatore"));
	}

	@Test
	void chat_staffBasePlan_cannotPostMessage() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String ownerEmail = "owner-base-staff-chat-" + suffix + "@test.com";
		String slug = "slug-base-staff-chat-" + suffix;
		StudioGroup group = studioGroupRepository.save(new StudioGroup("Salone Base Staff Chat " + suffix, ownerEmail, "BASE"));
		Location location = locationRepository.save(new Location(group, slug, "Sede", "MI"));
		ConsumerProfile client = new ConsumerProfile("sub-bsc-c-" + suffix, "client-bsc-" + suffix + "@test.com", "Anna");
		client.setPasswordHash(passwordEncoder.encode("x"));
		client.setSecurityRoles("CLIENT");
		client = consumerProfileRepository.save(client);
		String clientToken = velvetTokenService.createAccessToken(client);
		ConsumerProfile staff = saveStaff("sub-bsc-s-" + suffix, "staff-bsc-" + suffix + "@test.com");
		StaffOperator operator = staffOperatorRepository.save(new StaffOperator(location, "Op"));
		operator.setConsumerProfile(staff);
		staffOperatorRepository.save(operator);

		mockMvc.perform(put("/api/v1/me/salon-clients/" + location.getId()).header("Authorization", "Bearer " + clientToken))
				.andExpect(status().isOk());
		UUID salonClientId = salonClientRepository
				.findByLocation_IdAndConsumerProfile_Id(location.getId(), client.getId())
				.map(SalonClient::getId)
				.orElseThrow();

		mockMvc.perform(post("/api/v1/me/salon-clients/chat/messages")
						.header("Authorization", bearer(staff))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"salonClientId\":\"" + salonClientId + "\",\"body\":\"Hi\"}"))
				.andExpect(status().isForbidden());
	}
}
