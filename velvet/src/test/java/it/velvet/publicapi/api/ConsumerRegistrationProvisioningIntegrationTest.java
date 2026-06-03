package it.velvet.publicapi.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import it.velvet.studio.domain.LocationRepository;
import it.velvet.studio.domain.StudioGroupRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ConsumerRegistrationProvisioningIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Autowired
	private LocationRepository locationRepository;

	@Autowired
	private StudioGroupRepository studioGroupRepository;

	@Test
	void partnerRegistrationCreatesLocationSearchableByName() throws Exception {
		long before = locationRepository.count();
		String email = "owner-" + UUID.randomUUID() + "@example.com";
		String salonName = "Salone Provisioning QA " + UUID.randomUUID().toString().substring(0, 8);

		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("email", email);
		payload.put("password", "Password1!");
		payload.put("firstName", "Luigi");
		payload.put("lastName", "Verdi");
		payload.put("phone", "");
		payload.put("salonName", salonName);
		payload.put("planTier", "BASE");
		payload.put("salonAddressLine1", "Via QA 1");
		payload.put("salonPostalCode", "20121");
		payload.put("salonCity", "Milano");
		payload.put("salonProvince", "MI");
		payload.put("salonCountry", "IT");
		payload.put("salonBusinessTypes", List.of("HAIR", "BEAUTY"));
		payload.put("salonClientGenders", List.of("MALE", "FEMALE"));
		payload.put("acceptedTermsAndPrivacy", true);

		mockMvc.perform(post("/api/v1/public/consumer-registration")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(payload)))
				.andExpect(status().isCreated());

		assertThat(locationRepository.count()).isEqualTo(before + 1);
		var hits = locationRepository.findByNameContainingIgnoreCaseOrCityContainingIgnoreCase("Provisioning QA", "Provisioning QA");
		assertThat(hits.stream().anyMatch(l -> l.getName().equals(salonName))).isTrue();
		assertThat(hits.stream().filter(l -> l.getName().equals(salonName)).findFirst())
				.hasValueSatisfying(l -> assertThat(l.getSalonBusinessTypes()).isEqualTo("BEAUTY,HAIR"));
		assertThat(studioGroupRepository.findByOwnerEmailIgnoreCase(email))
				.hasValueSatisfying(g -> assertThat(g.getOwnerKeycloakSub()).isNotNull().isNotBlank());
	}
}
