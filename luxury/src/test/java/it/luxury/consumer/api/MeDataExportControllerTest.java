package it.luxury.consumer.api;

import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.security.auth.LuxuryTokenService;
import it.luxury.testsupport.LuxuryConsumerTestCleanup;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class MeDataExportControllerTest {

	private static final String SUB = "auth-sub-export-1";

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
	void export_withClientJwt_returnsProfilePayload() throws Exception {
		ConsumerProfile profile = new ConsumerProfile(SUB, "export@example.com", "Export User");
		profile.setPasswordHash(passwordEncoder.encode("Password1!"));
		profile.setSecurityRoles("CLIENT");
		consumerProfileRepository.save(profile);

		String token = luxuryTokenService.createAccessToken(profile);

		mockMvc.perform(get("/api/v1/me/data-export").header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.profile.email").value("export@example.com"))
				.andExpect(jsonPath("$.favorites").isArray())
				.andExpect(jsonPath("$.pushDevices").isArray())
				.andExpect(jsonPath("$.platformNotifications").isArray());
	}
}
