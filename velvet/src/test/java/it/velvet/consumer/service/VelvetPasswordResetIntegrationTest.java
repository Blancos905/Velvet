package it.velvet.consumer.service;

import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class VelvetPasswordResetIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ConsumerProfileRepository consumerProfileRepository;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Test
	void requestReset_accepted_evenIfUnknownEmail() throws Exception {
		mockMvc.perform(
						post("/api/v1/auth/password-reset/request")
								.contentType(MediaType.APPLICATION_JSON)
								.content("{\"email\":\"missing@example.com\"}"))
				.andExpect(status().isAccepted())
				.andExpect(jsonPath("$.message").isString());
	}

	@Test
	void confirmReset_okThenInvalidatesToken() throws Exception {
		String plainToken = "a".repeat(64);
		String sub = "kc-sub-reset-" + UUID.randomUUID();
		String mail = "reset-" + UUID.randomUUID() + "@example.com";
		ConsumerProfile p = new ConsumerProfile(sub, mail, "User");
		p.setPasswordHash(passwordEncoder.encode("oldpass123"));
		p.setPasswordResetTokenHash(VelvetPasswordResetService.sha256Hex(plainToken));
		p.setPasswordResetExpiresAt(Instant.now().plusSeconds(3600));
		consumerProfileRepository.save(p);

		mockMvc.perform(
						post("/api/v1/auth/password-reset/confirm")
								.contentType(MediaType.APPLICATION_JSON)
								.content(
										"""
										{"token":"%s","newPassword":"newpass999","confirmPassword":"newpass999"}
										"""
												.formatted(plainToken)))
				.andExpect(status().isNoContent());

		ConsumerProfile reloaded = consumerProfileRepository.findById(p.getId()).orElseThrow();
		assertThat(reloaded.getPasswordResetTokenHash()).isNull();
		assertThat(reloaded.getPasswordResetExpiresAt()).isNull();
		assertThat(passwordEncoder.matches("newpass999", reloaded.getPasswordHash())).isTrue();

		mockMvc.perform(
						post("/api/v1/auth/password-reset/confirm")
								.contentType(MediaType.APPLICATION_JSON)
								.content(
										"""
										{"token":"%s","newPassword":"other88888","confirmPassword":"other88888"}
										"""
												.formatted(plainToken)))
				.andExpect(status().isBadRequest());
	}

	@Test
	void confirmReset_wrongToken() throws Exception {
		mockMvc.perform(
						post("/api/v1/auth/password-reset/confirm")
								.contentType(MediaType.APPLICATION_JSON)
								.content(
										"""
										{"token":"%s","newPassword":"newpass999","confirmPassword":"newpass999"}
										"""
												.formatted("b".repeat(64))))
				.andExpect(status().isBadRequest());
	}
}
