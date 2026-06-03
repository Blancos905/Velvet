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
	void adminOverview_requiresAuth() throws Exception {
		mockMvc.perform(get("/api/v1/admin/overview")).andExpect(status().isUnauthorized());
	}
}
