package it.luxury.consumer.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.consumer.domain.PendingRegistration;
import it.luxury.consumer.domain.PendingRegistrationKind;
import it.luxury.consumer.domain.PendingRegistrationRepository;
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
@TestPropertySource(properties = "luxury.registration.email-verification-required=true")
class LuxuryEmailVerificationIntegrationTest {

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
		String tokenHash = LuxuryPasswordResetService.sha256Hex(plainToken);

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
				.andExpect(jsonPath("$.message").isNotEmpty())
				.andExpect(jsonPath("$.accessToken").isNotEmpty())
				.andExpect(jsonPath("$.nextPath").value("/"));

		assertThat(pendingRegistrationRepository.findByEmailIgnoreCase(email)).isEmpty();
		assertThat(consumerProfileRepository.findByEmailIgnoreCase(email)).isPresent();
		assertThat(consumerProfileRepository.findByEmailIgnoreCase(email).orElseThrow().getEmailVerifiedAt()).isNotNull();
	}

	@Test
	void confirmVerification_idempotentForPremiumAwaitingCheckout() throws Exception {
		String email = "premium-idem-" + UUID.randomUUID() + "@example.com";
		byte[] raw = new byte[32];
		for (int i = 0; i < raw.length; i++) {
			raw[i] = (byte) (i + 3);
		}
		String plainToken = toHex(raw);
		String tokenHash = LuxuryPasswordResetService.sha256Hex(plainToken);
		String payload =
				"{\"firstName\":\"A\",\"lastName\":\"B\",\"provisionPlanTier\":\"PREMIUM\",\"salonName\":\"Test\"}";

		PendingRegistration pending = new PendingRegistration(
				email, "hash", PendingRegistrationKind.SALON_OWNER, payload, "A B");
		pending.setVerificationTokenHash(tokenHash);
		pending.setVerificationTokenPlain(plainToken);
		pending.setVerificationExpiresAt(Instant.now().plusSeconds(3600));
		pendingRegistrationRepository.save(pending);

		mockMvc.perform(
						post("/api/v1/auth/email-verification/confirm")
								.contentType(MediaType.APPLICATION_JSON)
								.content(objectMapper.writeValueAsString(Map.of("token", plainToken))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.premiumCheckoutToken").isNotEmpty());

		mockMvc.perform(
						post("/api/v1/auth/email-verification/confirm")
								.contentType(MediaType.APPLICATION_JSON)
								.content(objectMapper.writeValueAsString(Map.of("token", plainToken))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.premiumCheckoutToken").isNotEmpty());

		PendingRegistration after = pendingRegistrationRepository.findByEmailIgnoreCase(email).orElseThrow();
		assertThat(after.getVerificationTokenHash()).isEqualTo(tokenHash);
		assertThat(after.getEmailVerifiedAt()).isNotNull();
		assertThat(consumerProfileRepository.findByEmailIgnoreCase(email)).isEmpty();
	}

	@Test
	void resendVerification_rotatesTokenOnResend() throws Exception {
		String email = "resend-valid-" + UUID.randomUUID() + "@example.com";
		byte[] raw = new byte[32];
		for (int i = 0; i < raw.length; i++) {
			raw[i] = (byte) (i + 1);
		}
		String plainToken = toHex(raw);
		String tokenHash = LuxuryPasswordResetService.sha256Hex(plainToken);

		PendingRegistration pending = new PendingRegistration(
				email, "hash", PendingRegistrationKind.CLIENT, "{\"firstName\":\"A\",\"lastName\":\"B\"}", "A B");
		pending.setVerificationTokenHash(tokenHash);
		pending.setVerificationTokenPlain(plainToken);
		pending.setVerificationExpiresAt(Instant.now().plusSeconds(3600));
		pendingRegistrationRepository.save(pending);

		mockMvc.perform(
						post("/api/v1/auth/email-verification/resend")
								.contentType(MediaType.APPLICATION_JSON)
								.content(objectMapper.writeValueAsString(Map.of("email", email))))
				.andExpect(status().isAccepted());

		PendingRegistration after = pendingRegistrationRepository.findByEmailIgnoreCase(email).orElseThrow();
		assertThat(after.getVerificationTokenHash()).isNotEqualTo(tokenHash);
		assertThat(after.getVerificationTokenPlain()).isNotEqualTo(plainToken);
	}

	@Test
	void resendVerification_rotatesExpiredToken() throws Exception {
		String email = "resend-expired-" + UUID.randomUUID() + "@example.com";
		byte[] raw = new byte[32];
		for (int i = 0; i < raw.length; i++) {
			raw[i] = (byte) i;
		}
		String plainToken = toHex(raw);
		String tokenHash = LuxuryPasswordResetService.sha256Hex(plainToken);

		PendingRegistration pending = new PendingRegistration(
				email, "hash", PendingRegistrationKind.CLIENT, "{\"firstName\":\"A\",\"lastName\":\"B\"}", "A B");
		pending.setVerificationTokenHash(tokenHash);
		pending.setVerificationTokenPlain(plainToken);
		pending.setVerificationExpiresAt(Instant.now().minusSeconds(60));
		pendingRegistrationRepository.save(pending);

		mockMvc.perform(
						post("/api/v1/auth/email-verification/resend")
								.contentType(MediaType.APPLICATION_JSON)
								.content(objectMapper.writeValueAsString(Map.of("email", email))))
				.andExpect(status().isAccepted());

		PendingRegistration after = pendingRegistrationRepository.findByEmailIgnoreCase(email).orElseThrow();
		assertThat(after.getVerificationTokenHash()).isNotEqualTo(tokenHash);
		assertThat(after.getVerificationTokenPlain()).isNotEqualTo(plainToken);
		assertThat(after.getVerificationExpiresAt()).isAfter(Instant.now());
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
