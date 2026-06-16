package it.velvet.publicapi.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PublicClientRegistrationControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Autowired
	private ConsumerProfileRepository consumerProfileRepository;

	@Test
	void postValid_returnsCreated() throws Exception {
		String email = "client-" + UUID.randomUUID() + "@example.com";
		mockMvc.perform(post("/api/v1/public/client-registration")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of(
								"email", email,
								"password", "Password1!",
								"firstName", "Ann",
								"lastName", "Bee",
								"country", "IT",
								"acceptedTermsAndPrivacy", true))))
				.andExpect(status().isCreated());

		assertThat(consumerProfileRepository.findByEmailIgnoreCase(email)).isPresent();
	}

	@Test
	void postInvalidEmail_returnsBadRequest() throws Exception {
		mockMvc.perform(post("/api/v1/public/client-registration")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of(
								"email", "not-an-email",
								"password", "Password1!",
								"firstName", "Ann",
								"lastName", "Bee",
								"country", "IT",
								"acceptedTermsAndPrivacy", true))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
	}

	@Test
	void postShortPassword_returnsBadRequest() throws Exception {
		mockMvc.perform(post("/api/v1/public/client-registration")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of(
								"email", "x@example.com",
								"password", "short",
								"firstName", "Ann",
								"lastName", "Bee",
								"country", "IT",
								"acceptedTermsAndPrivacy", true))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
	}
}
