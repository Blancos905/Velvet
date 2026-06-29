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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ClientRegistrationIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Autowired
	private ConsumerProfileRepository consumerProfileRepository;

	@Test
	void postClientRegistration_persistsProfile() throws Exception {
		String email = "nobody-" + UUID.randomUUID() + "@example.com";
		mockMvc.perform(post("/api/v1/public/client-registration")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(Map.of(
								"email", email,
								"password", "Password1!",
								"firstName", "Test",
								"lastName", "User",
								"country", "FR",
								"phone", "+33612345678",
								"acceptedTermsAndPrivacy", true))))
				.andExpect(status().isCreated());

		var profile = consumerProfileRepository.findByEmailIgnoreCase(email);
		assertThat(profile).isPresent();
		assertThat(profile.get().getCountry()).isEqualTo("FR");
		assertThat(profile.get().getPhone()).isEqualTo("+33612345678");
	}
}
