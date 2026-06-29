package it.velvet.consumer.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.consumer.domain.PendingRegistration;
import it.velvet.consumer.domain.PendingRegistrationKind;
import it.velvet.consumer.domain.PendingRegistrationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "velvet.registration.email-verification-required=true")
class VelvetEmailVerificationIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Autowired
	private ConsumerProfileRepository consumerProfileRepository;

	@Autowired
	private PendingRegistrationRepository pendingRegistrationRepository;

	@Test
	void confirmVerification_materializesPendingClient() throws Exception {
		String email = "verify-" + UUID.randomUUID() + "@example.com";
		byte[] raw = new byte[32];
		for (int i = 0; i < raw.length; i++) {
			raw[i] = (byte) i;
		}
		String plainToken = toHex(raw);
		String tokenHash = VelvetPasswordResetService.sha256Hex(plainToken);

		PendingRegistration pending = new PendingRegistration(
				email,
				"hash",
				PendingRegistrationKind.CLIENT,
				"{\"firstName\":\"Ann\",\"lastName\":\"Bee\",\"country\":\"IT\",\"phone\":\"\",\"bootstrapSuperAdmin\":false}",
				"Ann Bee");
		pending.setVerificationTokenHash(tokenHash);
		pending.setVerificationExpiresAt(Instant.now().plusSeconds(3600));
		pendingRegistrationRepository.save(pending);

		mockMvc.perform(
						post("/api/v1/auth/email-verification/confirm")
								.contentType(MediaType.APPLICATION_JSON)
								.content(objectMapper.writeValueAsString(Map.of("token", plainToken))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").isNotEmpty());

		assertThat(pendingRegistrationRepository.findByEmailIgnoreCase(email)).isEmpty();
		assertThat(consumerProfileRepository.findByEmailIgnoreCase(email)).isPresent();
		assertThat(consumerProfileRepository.findByEmailIgnoreCase(email).orElseThrow().getEmailVerifiedAt()).isNotNull();
	}

	@Test
	void clientRegistrationBeforeConfirm_doesNotPersistProfile() throws Exception {
		String email = "unverified-" + UUID.randomUUID() + "@example.com";
		String password = "Password1!";
		mockMvc.perform(post("/api/v1/public/client-registration")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of(
								"email", email,
								"password", password,
								"firstName", "Ann",
								"lastName", "Bee",
								"country", "IT",
								"acceptedTermsAndPrivacy", true))))
				.andExpect(status().isCreated());

		assertThat(consumerProfileRepository.findByEmailIgnoreCase(email)).isEmpty();
		assertThat(pendingRegistrationRepository.findByEmailIgnoreCase(email)).isPresent();

		mockMvc.perform(
						post("/api/v1/auth/login")
								.contentType(MediaType.APPLICATION_JSON)
								.content(objectMapper.writeValueAsString(Map.of("email", email, "password", password))))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
	}

	private static String toHex(byte[] bytes) {
		StringBuilder sb = new StringBuilder(bytes.length * 2);
		for (byte b : bytes) {
			sb.append(Character.forDigit((b >> 4) & 0xF, 16));
			sb.append(Character.forDigit(b & 0xF, 16));
		}
		return sb.toString();
	}
}
