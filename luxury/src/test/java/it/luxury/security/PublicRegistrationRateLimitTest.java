package it.luxury.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "luxury.security.rate-limit-requests-per-minute=2")
class PublicRegistrationRateLimitTest {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void publicClientRegistrationIsRateLimited() throws Exception {
		String body = """
				{"email":"rate-limit@example.com","password":"Password1!","firstName":"A","lastName":"B","country":"IT"}
				""";
		mockMvc.perform(post("/api/v1/public/client-registration").contentType(MediaType.APPLICATION_JSON).content(body))
				.andExpect(status().isBadRequest());
		mockMvc.perform(post("/api/v1/public/client-registration").contentType(MediaType.APPLICATION_JSON).content(body))
				.andExpect(status().isBadRequest());
		mockMvc.perform(post("/api/v1/public/client-registration").contentType(MediaType.APPLICATION_JSON).content(body))
				.andExpect(status().isTooManyRequests());
	}
}
