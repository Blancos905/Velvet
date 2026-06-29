package it.velvet.publicapi.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.studio.domain.LocationRepository;
import it.velvet.studio.domain.StudioGroupRepository;
import it.velvet.testsupport.VelvetConsumerTestCleanup;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Profilo cliente già esistente per email: la registrazione titolare deve promuovere a OWNER e usare lo stesso subject.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ConsumerRegistrationConflictRepairIntegrationTest {

	private static final UUID FIXED_SUB = UUID.fromString("b0000000-0000-4000-8000-000000000002");

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

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private VelvetConsumerTestCleanup velvetConsumerTestCleanup;

	@BeforeEach
	void removeStaleFixedSubProfile() {
		if (consumerProfileRepository.findByKeycloakSub(FIXED_SUB.toString()).isPresent()) {
			velvetConsumerTestCleanup.deleteAllConsumerProfiles();
		}
	}

	@Test
	void partnerRegistration_existingProfile_repairsStudioWithStableSub() throws Exception {
		long before = locationRepository.count();
		String email = "owner-conflict-" + UUID.randomUUID() + "@example.com";
		String salonName = "Salone Conflict " + UUID.randomUUID().toString().substring(0, 8);
		ConsumerProfile pre = new ConsumerProfile(FIXED_SUB.toString(), email, "Pre");
		pre.setPasswordHash(passwordEncoder.encode("Password1!"));
		pre.setSecurityRoles("CLIENT");
		pre.setEmailVerifiedAt(Instant.now());
		consumerProfileRepository.save(pre);

		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("email", email);
		payload.put("password", "Password1!");
		payload.put("firstName", "Anna");
		payload.put("lastName", "Bianchi");
		payload.put("phone", "");
		payload.put("salonName", salonName);
		payload.put("planTier", "BASE");
		payload.put("salonAddressLine1", "Via Conflict 2");
		payload.put("salonPostalCode", "10121");
		payload.put("salonCity", "Torino");
		payload.put("salonProvince", "TO");
		payload.put("salonCountry", "IT");
		payload.put("salonBusinessTypes", List.of("BEAUTY"));
		payload.put("salonClientGenders", List.of("FEMALE"));
		payload.put("acceptedTermsAndPrivacy", true);

		mockMvc.perform(post("/api/v1/public/consumer-registration")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(payload)))
				.andExpect(status().isCreated());

		assertThat(locationRepository.count()).isEqualTo(before + 1);
		assertThat(studioGroupRepository.findByOwnerEmailIgnoreCase(email))
				.hasValueSatisfying(g -> assertThat(g.getOwnerKeycloakSub()).isEqualToIgnoringCase(FIXED_SUB.toString()));
	}
}
