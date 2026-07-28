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

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class MeAccountControllerTest {

	private static final String SUB = "auth-sub-test-1";

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
	void deleteAccount_withoutJwt_returns401() throws Exception {
		mockMvc.perform(delete("/api/v1/me/account"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void deleteAccount_withTokenWithoutAppRole_returns403() throws Exception {
		ConsumerProfile p = new ConsumerProfile(SUB, "a@b.c", "Nome");
		p.setPasswordHash(passwordEncoder.encode("x"));
		p.setSecurityRoles("STAFF");
		consumerProfileRepository.save(p);
		String token = luxuryTokenService.createAccessToken(p);

		mockMvc.perform(delete("/api/v1/me/account").header("Authorization", "Bearer " + token))
				.andExpect(status().isForbidden());
	}

	@Test
	void deleteAccount_withClientRole_softDeletes() throws Exception {
		ConsumerProfile p = new ConsumerProfile(SUB, "a@b.c", "Nome");
		p.setPasswordHash(passwordEncoder.encode("x"));
		p.setSecurityRoles("CLIENT");
		consumerProfileRepository.save(p);
		String token = luxuryTokenService.createAccessToken(p);

		mockMvc.perform(delete("/api/v1/me/account").header("Authorization", "Bearer " + token))
				.andExpect(status().isNoContent());

		ConsumerProfile updated = consumerProfileRepository.findByAuthSub(SUB).orElseThrow();
		assertThat(updated.getDeletedAt()).isNotNull();
		assertThat(updated.getEmail()).isNull();
		assertThat(updated.getDisplayName()).isNull();
	}

	@Test
	void deleteAccount_withOwnerRole_softDeletes() throws Exception {
		ConsumerProfile p = new ConsumerProfile(SUB, "owner@b.c", "Titolare");
		p.setPasswordHash(passwordEncoder.encode("x"));
		p.setSecurityRoles("OWNER");
		consumerProfileRepository.save(p);
		String token = luxuryTokenService.createAccessToken(p);

		mockMvc.perform(delete("/api/v1/me/account").header("Authorization", "Bearer " + token))
				.andExpect(status().isNoContent());

		ConsumerProfile updated = consumerProfileRepository.findByAuthSub(SUB).orElseThrow();
		assertThat(updated.getDeletedAt()).isNotNull();
	}

	@Test
	void deleteAccount_secondCall_idempotent() throws Exception {
		ConsumerProfile p = new ConsumerProfile(SUB, "a@b.c", "Nome");
		p.setDeletedAt(Instant.now());
		p.setEmail(null);
		p.setDisplayName(null);
		consumerProfileRepository.save(p);
		String token = luxuryTokenService.createAccessToken(
				p.getId(),
				SUB,
				"",
				List.of("CLIENT"),
				null);

		mockMvc.perform(delete("/api/v1/me/account").header("Authorization", "Bearer " + token))
				.andExpect(status().isNoContent());
	}
}
