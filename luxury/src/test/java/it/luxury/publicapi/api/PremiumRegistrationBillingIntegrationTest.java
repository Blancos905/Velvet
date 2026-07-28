package it.luxury.publicapi.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import it.luxury.billing.domain.SalonBillingProfileRepository;
import it.luxury.studio.domain.StudioGroupRepository;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PremiumRegistrationBillingIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Autowired
	private SalonBillingProfileRepository billingProfileRepository;

	@Autowired
	private StudioGroupRepository studioGroupRepository;

	@Test
	void premiumRegistrationRequiresBillingFields() throws Exception {
		Map<String, Object> payload = basePayload("PREMIUM");
		mockMvc.perform(post("/api/v1/public/consumer-registration")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(payload)))
				.andExpect(status().isBadRequest());
	}

	@Test
	void premiumRegistrationDefersProvisioningUntilPayment() throws Exception {
		String email = "premium-bill-" + UUID.randomUUID() + "@example.com";
		Map<String, Object> payload = basePayload("PREMIUM");
		payload.put("email", email);
		addBilling(payload);

		mockMvc.perform(post("/api/v1/public/consumer-registration")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(payload)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.premiumCheckoutToken").isNotEmpty());

		assertThat(studioGroupRepository.findByOwnerEmailIgnoreCase(email)).isEmpty();
		assertThat(billingProfileRepository.findAll()).noneMatch(profile -> email.equalsIgnoreCase(profile.getBillingEmail()));
	}

	private static Map<String, Object> basePayload(String planTier) {
		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("email", "owner-" + UUID.randomUUID() + "@example.com");
		payload.put("password", "Password1!");
		payload.put("firstName", "Luigi");
		payload.put("lastName", "Verdi");
		payload.put("salonName", "Salone Billing QA");
		payload.put("planTier", planTier);
		payload.put("salonAddressLine1", "Via QA 1");
		payload.put("salonPostalCode", "20121");
		payload.put("salonCity", "Milano");
		payload.put("salonProvince", "MI");
		payload.put("salonCountry", "IT");
		payload.put("salonBusinessTypes", List.of("HAIR"));
		payload.put("salonClientGenders", List.of("FEMALE"));
		payload.put("acceptedTermsAndPrivacy", true);
		payload.put("acceptedDataProcessingAgreement", true);
		payload.put("dpaDocumentVersion", "2026-06-25");
		return payload;
	}

	private static void addBilling(Map<String, Object> payload) {
		payload.put("billingLegalName", "Salone Billing S.r.l.");
		payload.put("billingEmail", payload.get("email"));
		payload.put("billingVatNumber", "12345678901");
		payload.put("billingAddressLine1", "Via Fattura 2");
		payload.put("billingPostalCode", "20121");
		payload.put("billingCity", "Milano");
		payload.put("billingProvince", "MI");
		payload.put("billingCountry", "IT");
		payload.put("billingSdiCode", "ABCDEFG");
	}
}
