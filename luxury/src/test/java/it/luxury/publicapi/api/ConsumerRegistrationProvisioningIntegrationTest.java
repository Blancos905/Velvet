package it.luxury.publicapi.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.security.auth.LuxuryUserPrincipal;
import it.luxury.studio.domain.LocationRepository;
import it.luxury.studio.domain.StudioGroupRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "luxury.billing.enabled=false")
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

	@Autowired
	private ConsumerProfileRepository consumerProfileRepository;

	@Test
	void basePlanRegistrationIsRejected() throws Exception {
		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("email", "owner-base-" + UUID.randomUUID() + "@example.com");
		payload.put("password", "Password1!");
		payload.put("firstName", "Luigi");
		payload.put("lastName", "Verdi");
		payload.put("salonName", "Salone Rifiutato");
		payload.put("planTier", "BASE");
		payload.put("salonAddressLine1", "Via QA 1");
		payload.put("salonPostalCode", "20121");
		payload.put("salonCity", "Milano");
		payload.put("salonProvince", "MI");
		payload.put("salonCountry", "IT");
		payload.put("salonBusinessTypes", List.of("HAIR"));
		payload.put("salonClientGenders", List.of("FEMALE"));
		payload.put("acceptedTermsAndPrivacy", true);
		payload.put("acceptedDataProcessingAgreement", true);

		mockMvc.perform(post("/api/v1/public/consumer-registration")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(payload)))
				.andExpect(status().isBadRequest());
	}

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
		payload.put("planTier", "PREMIUM");
		payload.put("salonAddressLine1", "Via QA 1");
		payload.put("salonPostalCode", "20121");
		payload.put("salonCity", "Milano");
		payload.put("salonProvince", "MI");
		payload.put("salonCountry", "IT");
		payload.put("salonBusinessTypes", List.of("HAIR", "BEAUTY"));
		payload.put("salonClientGenders", List.of("MALE", "FEMALE"));
		payload.put("acceptedTermsAndPrivacy", true);
		payload.put("acceptedDataProcessingAgreement", true);
		payload.put("dpaDocumentVersion", "2026-06-25");

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
				.hasValueSatisfying(g -> {
					assertThat(g.getOwnerAuthSub()).isNotNull().isNotBlank();
					assertThat(g.getPlanTier()).isEqualTo("PREMIUM");
				});
		assertThat(consumerProfileRepository.findByEmailIgnoreCase(email))
				.hasValueSatisfying(p -> assertThat(p.getDisplayName()).isEqualTo("Luigi Verdi"));
	}

	@Test
	void partnerRegistrationCreatesOneLocationPerSeat() throws Exception {
		long before = locationRepository.count();
		String email = "owner-multi-" + UUID.randomUUID() + "@example.com";
		String salonName = "Salone Multisede QA " + UUID.randomUUID().toString().substring(0, 8);

		Map<String, Object> milano = new LinkedHashMap<>();
		milano.put("addressLine1", "Via Roma 1");
		milano.put("postalCode", "20121");
		milano.put("city", "Milano");
		milano.put("province", "MI");
		milano.put("country", "IT");
		Map<String, Object> roma = new LinkedHashMap<>();
		roma.put("addressLine1", "Via del Corso 2");
		roma.put("postalCode", "00186");
		roma.put("city", "Roma");
		roma.put("province", "RM");
		roma.put("country", "IT");

		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("email", email);
		payload.put("password", "Password1!");
		payload.put("firstName", "Chiara");
		payload.put("lastName", "Neri");
		payload.put("salonName", salonName);
		payload.put("planTier", "PREMIUM");
		payload.put("salonAddressLine1", "Via Roma 1");
		payload.put("salonPostalCode", "20121");
		payload.put("salonCity", "Milano");
		payload.put("salonProvince", "MI");
		payload.put("salonCountry", "IT");
		payload.put("salonLocations", List.of(milano, roma));
		payload.put("salonBusinessTypes", List.of("HAIR"));
		payload.put("salonClientGenders", List.of("FEMALE"));
		payload.put("acceptedTermsAndPrivacy", true);
		payload.put("acceptedDataProcessingAgreement", true);

		mockMvc.perform(post("/api/v1/public/consumer-registration")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(payload)))
				.andExpect(status().isCreated());

		assertThat(locationRepository.count()).isEqualTo(before + 2);
		assertThat(studioGroupRepository.findByOwnerEmailIgnoreCase(email)).hasValueSatisfying(group -> {
			var locations = locationRepository.findByStudioGroup_IdOrderByNameAsc(group.getId());
			assertThat(locations).hasSize(2);
			assertThat(locations).anyMatch(l -> "Milano".equals(l.getCity()));
			assertThat(locations).anyMatch(l -> "Roma".equals(l.getCity()));
		});
	}

	@Test
	void verifiedClientCanUpgradeToSalonOwnerOnSameEmail() throws Exception {
		String email = "client-upgrade-" + UUID.randomUUID() + "@example.com";
		String salonName = "Salone Upgrade QA " + UUID.randomUUID().toString().substring(0, 8);
		ConsumerProfile client = new ConsumerProfile(UUID.randomUUID().toString(), email, "Anna Cliente");
		client.setPasswordHash("{noop}Password1!");
		client.setSecurityRoles("CLIENT");
		client.setEmailVerifiedAt(Instant.now());
		consumerProfileRepository.save(client);

		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("email", email);
		payload.put("password", "Password1!");
		payload.put("firstName", "Anna");
		payload.put("lastName", "Cliente");
		payload.put("salonName", salonName);
		payload.put("planTier", "PREMIUM");
		payload.put("salonAddressLine1", "Via Upgrade 1");
		payload.put("salonPostalCode", "20121");
		payload.put("salonCity", "Milano");
		payload.put("salonProvince", "MI");
		payload.put("salonCountry", "IT");
		payload.put("salonBusinessTypes", List.of("HAIR"));
		payload.put("salonClientGenders", List.of("FEMALE"));
		payload.put("acceptedTermsAndPrivacy", true);
		payload.put("acceptedDataProcessingAgreement", true);
		payload.put("dpaDocumentVersion", "2026-06-25");

		mockMvc.perform(post("/api/v1/public/consumer-registration")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(payload)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.emailVerificationRequired").value(false));

		ConsumerProfile upgraded = consumerProfileRepository.findByEmailIgnoreCase(email).orElseThrow();
		assertThat(LuxuryUserPrincipal.parseRoleStrings(upgraded.getSecurityRoles())).contains("OWNER");
		assertThat(LuxuryUserPrincipal.parseRoleStrings(upgraded.getSecurityRoles())).doesNotContain("CLIENT");
		assertThat(studioGroupRepository.findByOwnerEmailIgnoreCase(email)).isPresent();
		assertThat(upgraded.getAuthSub()).isEqualTo(client.getAuthSub());
		assertThat(upgraded.getDisplayName()).isEqualTo("Anna Cliente");
	}
}
