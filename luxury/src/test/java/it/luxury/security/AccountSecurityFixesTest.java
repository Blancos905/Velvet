package it.luxury.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import it.luxury.admin.domain.PlatformSuperAdminCredential;
import it.luxury.admin.domain.PlatformSuperAdminCredentialRepository;
import it.luxury.appointment.domain.Appointment;
import it.luxury.appointment.domain.AppointmentRepository;
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
import it.luxury.security.auth.LuxuryRefreshTokenService;
import it.luxury.security.auth.LuxuryTokenService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.nullValue;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AccountSecurityFixesTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Autowired
	private ConsumerProfileRepository consumerProfileRepository;

	@Autowired
	private PlatformSuperAdminCredentialRepository credentialRepository;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private LuxuryTokenService luxuryTokenService;

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
	private AppointmentRepository appointmentRepository;

	@Test
	void clientRegistrationRejectsMissingAndFalseTerms() throws Exception {
		String email = "terms-" + UUID.randomUUID() + "@example.com";
		Map<String, Object> body = new java.util.LinkedHashMap<>();
		body.put("email", email);
		body.put("password", "Password1!");
		body.put("firstName", "Ada");
		body.put("lastName", "Lovelace");
		body.put("country", "IT");
		mockMvc.perform(post("/api/v1/public/client-registration")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(body)))
				.andExpect(status().isBadRequest());
		body.put("acceptedTermsAndPrivacy", false);
		mockMvc.perform(post("/api/v1/public/client-registration")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(body)))
				.andExpect(status().isBadRequest());
		assertThat(consumerProfileRepository.findByEmailIgnoreCase(email)).isEmpty();
	}

	@Test
	void bootstrapSuperAdminOnNormalEmailStaysClient() throws Exception {
		if (credentialRepository.findById(PlatformSuperAdminCredential.SINGLETON_ID).isEmpty()) {
			credentialRepository.save(new PlatformSuperAdminCredential("existing-admin@example.com", passwordEncoder.encode("Password1!")));
		}
		String email = "bootstrap-" + UUID.randomUUID() + "@example.com";
		mockMvc.perform(post("/api/v1/public/client-registration")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of(
								"email", email,
								"password", "Password1!",
								"firstName", "Norma",
								"lastName", "Client",
								"country", "IT",
								"acceptedTermsAndPrivacy", true,
								"bootstrapSuperAdmin", true))))
				.andExpect(status().isCreated());
		ConsumerProfile profile = consumerProfileRepository.findByEmailIgnoreCase(email).orElseThrow();
		assertThat(profile.getSecurityRoles()).doesNotContain("ADMIN");
		assertThat(profile.getSecurityRoles()).contains("CLIENT");
	}

	@Test
	void emailChangeRequiresPasswordAndStaysUnverified() throws Exception {
		String email = "mail-" + UUID.randomUUID() + "@example.com";
		ConsumerProfile profile = client(email, "Password1!");
		String token = luxuryTokenService.createAccessToken(profile);
		String next = "next-" + UUID.randomUUID() + "@example.com";

		mockMvc.perform(patch("/api/v1/me/profile")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of("email", next, "displayName", "<script>alert(1)</script>Ada"))))
				.andExpect(status().isBadRequest());

		mockMvc.perform(patch("/api/v1/me/profile")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of(
								"email", next,
								"displayName", "<b>Ada</b>",
								"currentPassword", "wrong-password"))))
				.andExpect(status().isUnauthorized());

		mockMvc.perform(patch("/api/v1/me/profile")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of(
								"email", next,
								"displayName", "<b>Ada</b>",
								"currentPassword", "Password1!",
								"preferredLocale", "<script>"))))
				.andExpect(status().isBadRequest());

		mockMvc.perform(patch("/api/v1/me/profile")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of(
								"email", next,
								"displayName", "<b>Ada</b>",
								"currentPassword", "Password1!",
								"preferredLocale", "it"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.email").value(next))
				.andExpect(jsonPath("$.emailVerified").value(false))
				.andExpect(jsonPath("$.displayName").value("Ada"))
				.andExpect(jsonPath("$.preferredLocale").value("it"));
	}

	@Test
	void passwordChangeAndAccountDeleteRevokeRefresh() throws Exception {
		String email = "pwd-" + UUID.randomUUID() + "@example.com";
		client(email, "Password1!");
		String refresh = loginRefreshCookie(email, "Password1!");

		String access = loginAccess(email, "Password1!");
		mockMvc.perform(post("/api/v1/me/profile/password")
						.header("Authorization", "Bearer " + access)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of(
								"currentPassword", "Password1!",
								"newPassword", "Password2!",
								"confirmPassword", "Password2!"))))
				.andExpect(status().isOk());

		mockMvc.perform(post("/api/v1/auth/refresh")
						.cookie(new jakarta.servlet.http.Cookie(LuxuryRefreshTokenService.REFRESH_COOKIE_NAME, refresh))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(status().isUnauthorized());

		String nextRefresh = loginRefreshCookie(email, "Password2!");
		String nextAccess = loginAccess(email, "Password2!");
		mockMvc.perform(delete("/api/v1/me/account")
						.header("Authorization", "Bearer " + nextAccess)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(status().isBadRequest());
		mockMvc.perform(delete("/api/v1/me/account")
						.header("Authorization", "Bearer " + nextAccess)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of("currentPassword", "nope"))))
				.andExpect(status().isUnauthorized());
		mockMvc.perform(get("/api/v1/me/profile").header("Authorization", "Bearer " + nextAccess))
				.andExpect(status().isOk());

		mockMvc.perform(delete("/api/v1/me/account")
						.header("Authorization", "Bearer " + nextAccess)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of("currentPassword", "Password2!"))))
				.andExpect(status().isNoContent());
		mockMvc.perform(get("/api/v1/me/profile").header("Authorization", "Bearer " + nextAccess))
				.andExpect(status().isGone());
		mockMvc.perform(post("/api/v1/auth/refresh")
						.cookie(new jakarta.servlet.http.Cookie(LuxuryRefreshTokenService.REFRESH_COOKIE_NAME, nextRefresh))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void loginRefreshUsesCookieAndOmitsRefreshFromJson() throws Exception {
		String email = "cookie-" + UUID.randomUUID() + "@example.com";
		client(email, "Password1!");
		MvcResult login = mockMvc.perform(post("/api/v1/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of("email", email, "password", "Password1!"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.accessToken").isNotEmpty())
				.andExpect(jsonPath("$.refreshToken").value(nullValue()))
				.andReturn();
		String refresh = login.getResponse().getCookie(LuxuryRefreshTokenService.REFRESH_COOKIE_NAME).getValue();
		assertThat(refresh).isNotBlank();
		mockMvc.perform(post("/api/v1/auth/refresh")
						.cookie(new jakarta.servlet.http.Cookie(LuxuryRefreshTokenService.REFRESH_COOKIE_NAME, refresh))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.accessToken").isNotEmpty())
				.andExpect(jsonPath("$.refreshToken").value(nullValue()));
	}

	@Test
	void anonymousMeEndpointsAreUnauthorizedAndForeignIdsAreNotReadable() throws Exception {
		for (String path : new String[] {
				"/api/v1/me/appointments",
				"/api/v1/me/salon-clients/chat/inbox-summaries",
				"/api/v1/me/notifications",
				"/api/v1/me/profile",
				"/api/v1/me/favorites",
				"/api/v1/me/reviews",
				"/api/v1/me/data-export",
				"/api/v1/me/support"
		}) {
			mockMvc.perform(get(path)).andExpect(status().isUnauthorized());
		}
		mockMvc.perform(post("/api/v1/me/support/requests").contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isUnauthorized());
		mockMvc.perform(delete("/api/v1/me/account")).andExpect(status().isUnauthorized());
		String token = luxuryTokenService.createAccessToken(client("anon-" + UUID.randomUUID() + "@example.com", "Password1!"));
		UUID random = UUID.randomUUID();
		mockMvc.perform(get("/api/v1/me/appointments/" + random).header("Authorization", "Bearer " + token))
				.andExpect(status().isNotFound());
		mockMvc.perform(get("/api/v1/me/salon").header("Authorization", "Bearer " + token))
				.andExpect(status().isForbidden());
	}

	@Test
	void hiddenLocationCannotBeFavoritedAndLongReviewIsRejected() throws Exception {
		ConsumerProfile profile = client("fav-" + UUID.randomUUID() + "@example.com", "Password1!");
		String token = luxuryTokenService.createAccessToken(profile);
		StudioGroup group = studioGroupRepository.save(new StudioGroup("Nascosto " + UUID.randomUUID()));
		Location hidden = new Location(group, "hidden-" + UUID.randomUUID(), "Nascosto", "Roma");
		hidden.setVisibleToClients(false);
		hidden = locationRepository.save(hidden);
		mockMvc.perform(put("/api/v1/me/favorites/" + hidden.getId()).header("Authorization", "Bearer " + token))
				.andExpect(status().isNotFound());

		Location visible = new Location(group, "vis-" + UUID.randomUUID(), "Visibile", "Roma");
		visible.setVisibleToClients(true);
		visible = locationRepository.save(visible);
		SalonService service = salonServiceRepository.save(new SalonService(visible, "Taglio", 30, 1000));
		StaffOperator operator = staffOperatorRepository.save(new StaffOperator(visible, "Lea"));
		SalonClient salonClient = new SalonClient(visible, "Ada");
		salonClient.setConsumerProfile(profile);
		salonClient = salonClientRepository.save(salonClient);
		java.time.Instant end = java.time.Instant.now().minusSeconds(36_000);
		Appointment appointment = new Appointment(visible, service, operator, salonClient, end.minusSeconds(1800), end);
		appointment.setConsumerProfile(profile);
		appointment = appointmentRepository.save(appointment);

		String longComment = "a".repeat(4001);
		mockMvc.perform(post("/api/v1/me/reviews")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(java.util.Map.of(
								"appointmentId", appointment.getId(),
								"rating", 5,
								"staffRating", 5,
								"comment", longComment))))
				.andExpect(status().isBadRequest());
		mockMvc.perform(post("/api/v1/me/reviews")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(java.util.Map.of(
								"appointmentId", appointment.getId(),
								"rating", 5,
								"staffRating", 5,
								"comment", "Bene"))))
				.andExpect(status().isOk());
		mockMvc.perform(post("/api/v1/me/reviews")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(java.util.Map.of(
								"appointmentId", appointment.getId(),
								"rating", 4,
								"staffRating", 4,
								"comment", "Seconda"))))
				.andExpect(status().isConflict());
	}

	@Test
	void unsignedJwtIsRejected() throws Exception {
		String header = Base64.getUrlEncoder().withoutPadding()
				.encodeToString("{\"alg\":\"none\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
		String payload = Base64.getUrlEncoder().withoutPadding()
				.encodeToString("{\"sub\":\"x\",\"roles\":[\"ADMIN\"]}".getBytes(StandardCharsets.UTF_8));
		mockMvc.perform(get("/api/v1/me/profile").header("Authorization", "Bearer " + header + "." + payload + "."))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void actuatorHidesEnvAndAdminStatusHidesRuntime() throws Exception {
		mockMvc.perform(get("/api/v1/public/health")).andExpect(status().isOk());
		mockMvc.perform(get("/actuator/health")).andExpect(status().isOk());
		mockMvc.perform(get("/actuator/env")).andExpect(status().isUnauthorized());
		mockMvc.perform(get("/actuator/heapdump")).andExpect(status().isUnauthorized());
		MvcResult status = mockMvc.perform(get("/api/v1/admin/status")).andExpect(status().isOk()).andReturn();
		JsonNode json = objectMapper.readTree(status.getResponse().getContentAsString());
		assertThat(json.has("javaRuntimeVersion")).isFalse();
		assertThat(json.has("javaVersionProperty")).isFalse();
		assertThat(json.toString().toLowerCase()).doesNotContain("runtime");
	}

	private ConsumerProfile client(String email, String password) {
		ConsumerProfile profile = new ConsumerProfile("sub-" + UUID.randomUUID(), email, "Ada");
		profile.setPasswordHash(passwordEncoder.encode(password));
		profile.setSecurityRoles("CLIENT");
		profile.setEmailVerifiedAt(java.time.Instant.now());
		return consumerProfileRepository.save(profile);
	}

	private String loginRefreshCookie(String email, String password) throws Exception {
		MvcResult login = mockMvc.perform(post("/api/v1/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of("email", email, "password", password))))
				.andExpect(status().isOk())
				.andReturn();
		return login.getResponse().getCookie(LuxuryRefreshTokenService.REFRESH_COOKIE_NAME).getValue();
	}

	private String loginAccess(String email, String password) throws Exception {
		MvcResult login = mockMvc.perform(post("/api/v1/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of("email", email, "password", password))))
				.andExpect(status().isOk())
				.andReturn();
		return objectMapper.readTree(login.getResponse().getContentAsString()).get("accessToken").asText();
	}
}
