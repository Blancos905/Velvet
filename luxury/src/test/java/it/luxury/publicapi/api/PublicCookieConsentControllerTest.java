package it.luxury.publicapi.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PublicCookieConsentControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void recordCookieConsent_returnsCreated() throws Exception {
		UUID visitorId = UUID.randomUUID();
		Map<String, Object> body = Map.of(
				"visitorId", visitorId.toString(),
				"version", 2,
				"decidedAt", "2026-06-25T10:00:00.000Z",
				"action", "accept_all",
				"maps", true,
				"editorial", true,
				"policyVersion", "2026-06-25");

		mockMvc.perform(post("/api/v1/public/cookie-consent")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(body)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.recorded").value(true))
				.andExpect(jsonPath("$.id").isNotEmpty());
	}

	@Test
	void recordCookieConsent_missingVisitorId_returnsBadRequest() throws Exception {
		Map<String, Object> body = Map.of(
				"version", 2,
				"decidedAt", "2026-06-25T10:00:00.000Z",
				"action", "reject_non_essential",
				"maps", false,
				"editorial", false);

		mockMvc.perform(post("/api/v1/public/cookie-consent")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(body)))
				.andExpect(status().isBadRequest());
	}
}
