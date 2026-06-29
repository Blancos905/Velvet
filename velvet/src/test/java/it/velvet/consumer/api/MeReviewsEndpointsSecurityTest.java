package it.velvet.consumer.api;

import it.velvet.studio.domain.Location;
import it.velvet.studio.domain.LocationRepository;
import it.velvet.studio.domain.StudioGroup;
import it.velvet.studio.domain.StudioGroupRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Smoke sicurezza recensioni: JWT obbligatorio per lista salone, pending cliente, submit cliente.
 */
@SpringBootTest
@AutoConfigureMockMvc
class MeReviewsEndpointsSecurityTest {

	private static final String PUBLIC_REVIEWS_SLUG = "public-reviews-smoke";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private StudioGroupRepository studioGroupRepository;

	@Autowired
	private LocationRepository locationRepository;

	@BeforeEach
	void ensurePublicPremiumSalon() {
		if (locationRepository.findBySlug(PUBLIC_REVIEWS_SLUG).isPresent()) {
			return;
		}
		StudioGroup group = studioGroupRepository.save(
				new StudioGroup("Salone recensioni pubbliche", "owner-public-reviews@test.com", "PREMIUM"));
		locationRepository.save(new Location(group, PUBLIC_REVIEWS_SLUG, "Sede demo recensioni", "MI"));
	}

	@Test
	void meSalonReviews_requiresBearer() throws Exception {
		mockMvc.perform(get("/api/v1/me/salon/reviews")).andExpect(status().isUnauthorized());
	}

	@Test
	void meReviewsPending_requiresBearer() throws Exception {
		mockMvc.perform(get("/api/v1/me/reviews/pending")).andExpect(status().isUnauthorized());
	}

	@Test
	void meReviewsSubmit_requiresBearer() throws Exception {
		mockMvc.perform(
				post("/api/v1/me/reviews")
						.contentType(MediaType.APPLICATION_JSON)
						.content(
								"{\"appointmentId\":\"00000000-0000-0000-0000-000000000001\",\"rating\":5,\"staffRating\":5,\"comment\":null}"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void publicOrganizationReviews_slug_okWithoutAuth() throws Exception {
		// pubblico: nessun JWT — risposta OK anche lista vuota per slug sconosciuto (404 org o [])
		mockMvc.perform(get("/api/v1/public/organizations/" + PUBLIC_REVIEWS_SLUG + "/reviews"))
				.andExpect(status().isOk());
	}
}
