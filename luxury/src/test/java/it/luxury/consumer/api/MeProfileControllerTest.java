package it.luxury.consumer.api;

import it.luxury.admin.service.LuxurySuperAdminAuthService;
import it.luxury.bootstrap.SuperAdminConsumerBootstrap;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.security.auth.LuxuryTokenService;
import it.luxury.testsupport.LuxuryConsumerTestCleanup;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class MeProfileControllerTest {

	private static final String SUB = "auth-sub-profile-1";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ConsumerProfileRepository consumerProfileRepository;

	@Autowired
	private LuxuryTokenService luxuryTokenService;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private LuxuryConsumerTestCleanup luxuryConsumerTestCleanup;

	@BeforeEach
	void clean() {
		luxuryConsumerTestCleanup.deleteAllConsumerProfiles();
	}

	@Test
	void getProfile_returnsBasicFields() throws Exception {
		ConsumerProfile p = new ConsumerProfile(SUB, "owner@example.com", "Titolare");
		p.setPasswordHash(passwordEncoder.encode("x"));
		p.setSecurityRoles("OWNER");
		consumerProfileRepository.save(p);
		String token = luxuryTokenService.createAccessToken(p);

		mockMvc.perform(get("/api/v1/me/profile").header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.email").value("owner@example.com"))
				.andExpect(jsonPath("$.displayName").value("Titolare"))
				.andExpect(jsonPath("$.photoDataUrl").value(nullValue()));
	}

	@Test
	void patchProfilePhoto_setsClearsAndSurvivesProfilePatch() throws Exception {
		ConsumerProfile p = new ConsumerProfile(SUB + "-photo", "client-photo@example.com", "Mario Rossi");
		p.setPasswordHash(passwordEncoder.encode("x"));
		p.setSecurityRoles("CLIENT");
		consumerProfileRepository.save(p);
		String token = luxuryTokenService.createAccessToken(p);
		String photo = "data:image/png;base64,iVBORw0KGgo=";

		mockMvc.perform(patch("/api/v1/me/profile/photo")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"photoDataUrl\":\"" + photo + "\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.photoDataUrl").value(photo));

		mockMvc.perform(patch("/api/v1/me/profile")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"displayName\":\"Mario\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.displayName").value("Mario"))
				.andExpect(jsonPath("$.photoDataUrl").value(photo));

		mockMvc.perform(patch("/api/v1/me/profile/photo")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"photoDataUrl\":\"\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.photoDataUrl").value(nullValue()));
	}

	@Test
	void patchProfilePhoto_rejectsNonImage() throws Exception {
		ConsumerProfile p = new ConsumerProfile(SUB + "-photo-bad", "client-photo-bad@example.com", "Lucia");
		p.setPasswordHash(passwordEncoder.encode("x"));
		p.setSecurityRoles("CLIENT");
		consumerProfileRepository.save(p);
		String token = luxuryTokenService.createAccessToken(p);

		mockMvc.perform(patch("/api/v1/me/profile/photo")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"photoDataUrl\":\"data:image/svg+xml;base64,PHN2Zy8+\"}"))
				.andExpect(status().isBadRequest());

		mockMvc.perform(get("/api/v1/me/profile").header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.photoDataUrl").value(nullValue()));
	}

	@Test
	void getProfile_superAdminJwtSubject_resolvesCanonicalConsumerRow() throws Exception {
		ConsumerProfile p = new ConsumerProfile(
				SuperAdminConsumerBootstrap.SUPER_ADMIN_AUTH_SUB,
				"superadmin-profile-test@example.com",
				"Super admin");
		p.setPasswordHash(passwordEncoder.encode("secretpass12"));
		p.setSecurityRoles("ADMIN,CLIENT");
		consumerProfileRepository.save(p);
		String token = luxuryTokenService.createAccessToken(
				null,
				LuxurySuperAdminAuthService.SUPER_ADMIN_JWT_SUBJECT,
				"superadmin-profile-test@example.com",
				List.of("ADMIN"),
				null);
		mockMvc.perform(get("/api/v1/me/profile").header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.email").value("superadmin-profile-test@example.com"))
				.andExpect(jsonPath("$.displayName").value("Super admin"));
	}

	@Test
	void getProfile_legacyRolePrefixInJwt_isAccepted() throws Exception {
		ConsumerProfile p = new ConsumerProfile(SUB + "-legacy", "legacy@example.com", "Legacy");
		p.setPasswordHash(passwordEncoder.encode("x"));
		p.setSecurityRoles("OWNER");
		consumerProfileRepository.save(p);
		String token = luxuryTokenService.createAccessToken(
				p.getId(),
				SUB + "-legacy",
				"legacy@example.com",
				List.of("ROLE_OWNER"),
				null);

		mockMvc.perform(get("/api/v1/me/profile").header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.email").value("legacy@example.com"));
	}
}
