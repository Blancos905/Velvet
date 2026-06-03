package it.velvet.consumer.api;

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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class MeDataExportControllerTest {

	private static final String SUB = "kc-sub-export-1";

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
	void export_withClientJwt_returnsProfilePayload() throws Exception {
		ConsumerProfile profile = new ConsumerProfile(SUB, "export@example.com", "Export User");
		profile.setPasswordHash(passwordEncoder.encode("Password1!"));
		profile.setSecurityRoles("CLIENT");
		consumerProfileRepository.save(profile);

		String token = velvetTokenService.createAccessToken(profile);

		mockMvc.perform(get("/api/v1/me/data-export").header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.profile.email").value("export@example.com"))
				.andExpect(jsonPath("$.favorites").isArray());
	}
}
