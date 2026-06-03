package it.velvet.consumer.api;

import it.velvet.admin.service.VelvetSuperAdminAuthService;
import it.velvet.bootstrap.SuperAdminConsumerBootstrap;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.security.auth.VelvetTokenService;
import it.velvet.testsupport.VelvetConsumerTestCleanup;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class MeProfileControllerTest {

	private static final String SUB = "kc-sub-profile-1";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ConsumerProfileRepository consumerProfileRepository;

	@Autowired
	private VelvetTokenService velvetTokenService;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private VelvetConsumerTestCleanup velvetConsumerTestCleanup;

	@BeforeEach
	void clean() {
		velvetConsumerTestCleanup.deleteAllConsumerProfiles();
	}

	@Test
	void getProfile_returnsBasicFields() throws Exception {
		ConsumerProfile p = new ConsumerProfile(SUB, "owner@example.com", "Titolare");
		p.setPasswordHash(passwordEncoder.encode("x"));
		p.setSecurityRoles("OWNER");
		consumerProfileRepository.save(p);
		String token = velvetTokenService.createAccessToken(p);

		mockMvc.perform(get("/api/v1/me/profile").header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.email").value("owner@example.com"))
				.andExpect(jsonPath("$.displayName").value("Titolare"));
	}

	@Test
	void getProfile_superAdminJwtSubject_resolvesCanonicalConsumerRow() throws Exception {
		ConsumerProfile p = new ConsumerProfile(
				SuperAdminConsumerBootstrap.SUPER_ADMIN_KEYCLOAK_SUB,
				"superadmin-profile-test@example.com",
				"Super admin");
		p.setPasswordHash(passwordEncoder.encode("secretpass12"));
		p.setSecurityRoles("ADMIN,CLIENT");
		consumerProfileRepository.save(p);
		String token = velvetTokenService.createAccessToken(
				null,
				VelvetSuperAdminAuthService.SUPER_ADMIN_JWT_SUBJECT,
				"superadmin-profile-test@example.com",
				List.of("ADMIN"),
				null);
		mockMvc.perform(get("/api/v1/me/profile").header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.email").value("superadmin-profile-test@example.com"))
				.andExpect(jsonPath("$.displayName").value("Super admin"));
	}
}
