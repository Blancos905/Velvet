package it.velvet.publicapi.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifica che endpoint pubblici e OpenAPI rispondano senza 500 (regressione su errori globali / JWT).
 */
@SpringBootTest
@AutoConfigureMockMvc
class VelvetPublicEndpointsSmokeTest {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void openApiDocs_returnsOk() throws Exception {
		mockMvc.perform(get("/v3/api-docs")).andExpect(status().isOk());
	}

	@Test
	void publicHealth_returnsOk() throws Exception {
		mockMvc.perform(get("/api/v1/public/health")).andExpect(status().isOk());
	}

	@Test
	void publicOrganizationsSearch_returnsOk() throws Exception {
		mockMvc.perform(get("/api/v1/public/organizations")).andExpect(status().isOk());
	}

	@Test
	void publicOrganizationsSearch_withNearParams_returnsOk() throws Exception {
		mockMvc.perform(get("/api/v1/public/organizations")
						.param("query", "taglio")
						.param("nearLat", "45.4642")
						.param("nearLng", "9.19")
						.param("nearKm", "25"))
				.andExpect(status().isOk());
	}

	@Test
	void publicOrganizationsTopRatedQuery_returnsOk() throws Exception {
		mockMvc.perform(get("/api/v1/public/organizations")
						.param("topRated", "true")
						.param("topRatedLimit", "5"))
				.andExpect(status().isOk());
	}

	@Test
	void publicOrganizationsMonthlyIdea_returnsOk() throws Exception {
		mockMvc.perform(get("/api/v1/public/organizations")
						.param("monthlyIdea", "trattamento viso")
						.param("monthlyIdeaSalonKind", "estetisti")
						.param("monthlyIdeaLimit", "5"))
				.andExpect(status().isOk());
	}

	@Test
	void publicReviewsShowcase_returnsOk() throws Exception {
		mockMvc.perform(get("/api/v1/public/reviews/showcase")).andExpect(status().isOk());
	}

	@Test
	void publicLocateByCoordinates_invalidCoords_returnsNotFound() throws Exception {
		mockMvc.perform(get("/api/v1/public/locate-by-coordinates")
						.param("lat", "999")
						.param("lon", "9.19"))
				.andExpect(status().isNotFound());
	}

	@Test
	void publicLocateByCoordinates_validCoords_returnsOkOrNotFound() throws Exception {
		mockMvc.perform(get("/api/v1/public/locate-by-coordinates")
						.param("lat", "45.4642")
						.param("lon", "9.19"))
				.andExpect(status().is2xxSuccessful());
	}

	@Test
	void publicLocateByPostalSuggestions_returnsOk() throws Exception {
		mockMvc.perform(get("/api/v1/public/locate-by-postal-suggestions")
						.param("postalCode", "20121")
						.param("countryCode", "IT")
						.param("limit", "5"))
				.andExpect(status().isOk());
	}

	@Test
	void publicCookieConsentRecord_returnsCreated() throws Exception {
		String body =
				"""
				{"visitorId":"550e8400-e29b-41d4-a716-446655440000","version":2,"decidedAt":"2026-06-25T10:00:00.000Z","action":"accept_all","maps":true,"editorial":true,"policyVersion":"2026-06-25"}
				""";
		mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/public/cookie-consent")
						.contentType(org.springframework.http.MediaType.APPLICATION_JSON)
						.content(body))
				.andExpect(status().isCreated());
	}

	@Test
	void adminOverview_requiresAuth() throws Exception {
		mockMvc.perform(get("/api/v1/admin/overview")).andExpect(status().isUnauthorized());
	}
}
