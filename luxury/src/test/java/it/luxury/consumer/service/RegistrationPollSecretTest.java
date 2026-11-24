package it.luxury.consumer.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import it.luxury.consumer.domain.PendingRegistrationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.hamcrest.Matchers.nullValue;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ExtendWith(OutputCaptureExtension.class)
@TestPropertySource(properties = "luxury.registration.email-verification-required=true")
class RegistrationPollSecretTest {

	private static final Pattern TOKEN_IN_LINK = Pattern.compile("[?&]token=([a-f0-9]{64})");

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Autowired
	private PendingRegistrationRepository pendingRegistrationRepository;

	@Test
	void pollRequiresRegistrationSecretAndPlainTokenIsNotStored(CapturedOutput output) throws Exception {
		String email = "poll-" + UUID.randomUUID() + "@example.com";
		MvcResult created = mockMvc.perform(post("/api/v1/public/client-registration")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of(
								"email", email,
								"password", "Password1!",
								"firstName", "Poll",
								"lastName", "Secret",
								"country", "IT",
								"acceptedTermsAndPrivacy", true))))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.pollSecret").isNotEmpty())
				.andReturn();
		JsonNode body = objectMapper.readTree(created.getResponse().getContentAsString());
		String pollSecret = body.get("pollSecret").asText();
		var pending = pendingRegistrationRepository.findByEmailIgnoreCase(email).orElseThrow();
		assertThat(pending.getVerificationTokenPlain()).isNull();

		String issued = tokenFromLog(output, email);
		mockMvc.perform(post("/api/v1/auth/email-verification/confirm")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of("token", "a".repeat(64)))))
				.andExpect(status().isBadRequest());
		mockMvc.perform(post("/api/v1/auth/email-verification/confirm")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of("token", issued))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.accessToken").isNotEmpty())
				.andExpect(jsonPath("$.refreshToken").value(nullValue()));

		assertPollEmpty(email, null, 1);
		assertPollEmpty(email, null, System.currentTimeMillis());
		assertPollEmpty(email, null, System.currentTimeMillis() + 86_400_000L);
		assertPollEmpty("other-" + UUID.randomUUID() + "@example.com", pollSecret, 1);
		assertPollEmpty(email, "b".repeat(64), System.currentTimeMillis());

		mockMvc.perform(post("/api/v1/auth/email-verification/poll")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of(
								"email", email,
								"registrationAt", 1,
								"pollSecret", pollSecret))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.accessToken").isNotEmpty());

		assertPollEmpty(email, pollSecret, System.currentTimeMillis());
	}

	private void assertPollEmpty(String email, String secret, long registrationAt) throws Exception {
		var request = post("/api/v1/auth/email-verification/poll")
				.contentType(MediaType.APPLICATION_JSON);
		Map<String, Object> payload = new java.util.LinkedHashMap<>();
		payload.put("email", email);
		payload.put("registrationAt", registrationAt);
		if (secret != null) {
			payload.put("pollSecret", secret);
		}
		mockMvc.perform(request.content(objectMapper.writeValueAsString(payload)))
				.andExpect(status().isNoContent());
	}

	private static String tokenFromLog(CapturedOutput output, String email) {
		String text = output.getOut() + "\n" + output.getErr();
		for (String line : text.split("\n")) {
			if (!line.contains(email) || !line.contains("token=")) {
				continue;
			}
			Matcher matcher = TOKEN_IN_LINK.matcher(line);
			if (matcher.find()) {
				return matcher.group(1);
			}
		}
		throw new AssertionError("token di conferma assente nel log per " + email);
	}
}
