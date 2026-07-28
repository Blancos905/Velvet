package it.luxury.consumer.api;

import it.luxury.catalog.domain.SalonService;
import it.luxury.catalog.domain.SalonServiceRepository;
import it.luxury.catalog.domain.StaffOperator;
import it.luxury.catalog.domain.StaffOperatorRepository;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.security.auth.LuxuryTokenService;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.LocationRepository;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.studio.domain.StudioGroupRepository;
import it.luxury.testsupport.PremiumEntitlementTestFixture;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class MeSalonServicesControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private StudioGroupRepository studioGroupRepository;

	@Autowired
	private LocationRepository locationRepository;

	@Autowired
	private ConsumerProfileRepository consumerProfileRepository;

	@Autowired
	private SalonServiceRepository salonServiceRepository;

	@Autowired
	private StaffOperatorRepository staffOperatorRepository;

	@Autowired
	private LuxuryTokenService luxuryTokenService;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private PremiumEntitlementTestFixture premiumEntitlementTestFixture;

	private ConsumerProfile saveOwner(String sub, String email) {
		ConsumerProfile p = new ConsumerProfile(sub, email, "Owner");
		p.setPasswordHash(passwordEncoder.encode("x"));
		p.setSecurityRoles("OWNER");
		return consumerProfileRepository.save(p);
	}

	private String bearer(ConsumerProfile p) {
		return "Bearer " + luxuryTokenService.createAccessToken(p);
	}

	@Test
	void list_anonymous_unauthorized() throws Exception {
		mockMvc.perform(get("/api/v1/me/salon/services"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void list_client_forbidden() throws Exception {
		String sub = "sub-svc-client-" + UUID.randomUUID();
		ConsumerProfile p = new ConsumerProfile(sub, "a@b.c", "C");
		p.setPasswordHash(passwordEncoder.encode("x"));
		p.setSecurityRoles("CLIENT");
		p = consumerProfileRepository.save(p);
		mockMvc.perform(get("/api/v1/me/salon/services").header("Authorization", bearer(p)))
				.andExpect(status().isForbidden());
	}

	@Test
	void list_ownerWithoutStudio_autoRepairsAndReturnsEmptyList() throws Exception {
		String email = "ghost-" + UUID.randomUUID() + "@b.c";
		ConsumerProfile p = saveOwner("ghost-" + UUID.randomUUID(), email);
		mockMvc.perform(get("/api/v1/me/salon/services").header("Authorization", bearer(p)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(0));
		assert studioGroupRepository.findByOwnerEmailIgnoreCase(email).isPresent();
	}

	@Test
	void list_owner_returnsServicesOrderedByName() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String email = "svc-owner-" + suffix + "@test.com";
		String slug = "slug-svc-" + suffix;
		StudioGroup g = studioGroupRepository.save(new StudioGroup("Salone Svc", email, "BASE"));
		Location loc = locationRepository.save(new Location(g, slug, "Loc", "MI"));
		ConsumerProfile p = saveOwner("sub-svc-" + suffix, email);
		salonServiceRepository.save(new SalonService(loc, "Taglio uomo", 30, 2500, "Taglio e piega"));
		salonServiceRepository.save(new SalonService(loc, "Colore", 90, 8000, null));

		mockMvc.perform(get("/api/v1/me/salon/services").header("Authorization", bearer(p)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(2))
				.andExpect(jsonPath("$[0].name").value("Colore"))
				.andExpect(jsonPath("$[1].name").value("Taglio uomo"))
				.andExpect(jsonPath("$[1].description").value("Taglio e piega"));
	}

	@Test
	void create_owner_repairsMissingLocationThenPersists() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String email = "svc-noloc-" + suffix + "@test.com";
		studioGroupRepository.save(new StudioGroup("Salone Senza Sede", email, "BASE"));
		ConsumerProfile p = saveOwner("sub-noloc-" + suffix, email);

		mockMvc.perform(post("/api/v1/me/salon/services")
						.header("Authorization", bearer(p))
						.contentType(MediaType.APPLICATION_JSON)
						.content(
								"{\"name\":\"Piega\",\"durationMinutes\":20,\"priceCents\":1800,\"description\":\"Piega con phon\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Piega"));
	}

	@Test
	void create_owner_persistsAndReturns() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String email = "svc-create-" + suffix + "@test.com";
		String slug = "slug-create-" + suffix;
		StudioGroup g = studioGroupRepository.save(new StudioGroup("Salone Create", email, "BASE"));
		locationRepository.save(new Location(g, slug, "Loc", "TO"));
		ConsumerProfile p = saveOwner("sub-cr-" + suffix, email);

		mockMvc.perform(post("/api/v1/me/salon/services")
						.header("Authorization", bearer(p))
						.contentType(MediaType.APPLICATION_JSON)
						.content(
								"{\"name\":\"Piega\",\"durationMinutes\":20,\"priceCents\":1800,\"description\":\"Piega con phon\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Piega"))
				.andExpect(jsonPath("$.durationMinutes").value(20))
				.andExpect(jsonPath("$.priceCents").value(1800))
				.andExpect(jsonPath("$.description").value("Piega con phon"));
	}

	@Test
	void update_owner_persistsAndReturns() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String email = "svc-update-" + suffix + "@test.com";
		String slug = "slug-update-" + suffix;
		StudioGroup g = studioGroupRepository.save(new StudioGroup("Salone Update", email, "PREMIUM"));
		Location loc = locationRepository.save(new Location(g, slug, "Loc", "RM"));
		ConsumerProfile p = saveOwner("sub-up-" + suffix, email);
		SalonService existing = salonServiceRepository.save(new SalonService(loc, "Piega", 20, 1800, "Vecchia"));

		mockMvc.perform(put("/api/v1/me/salon/services/{id}", existing.getId())
						.header("Authorization", bearer(p))
						.contentType(MediaType.APPLICATION_JSON)
						.content(
								"{\"name\":\"Piega lucida\",\"durationMinutes\":25,\"priceCents\":2200,\"description\":\"Piega con finish\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Piega lucida"))
				.andExpect(jsonPath("$.durationMinutes").value(25))
				.andExpect(jsonPath("$.priceCents").value(2200))
				.andExpect(jsonPath("$.description").value("Piega con finish"));
	}

	@Test
	void create_withOperators_publicListFilteredByService() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String email = "svc-op-" + suffix + "@test.com";
		String slug = "slug-op-" + suffix;
		StudioGroup g = studioGroupRepository.save(new StudioGroup("Salone Op", email, "PREMIUM"));
		premiumEntitlementTestFixture.ensureActivePremiumSubscription(g);
		Location loc = locationRepository.save(new Location(g, slug, "Loc", "MI"));
		ConsumerProfile p = saveOwner("sub-op-" + suffix, email);
		StaffOperator opA = staffOperatorRepository.save(new StaffOperator(loc, "Alice"));
		StaffOperator opB = staffOperatorRepository.save(new StaffOperator(loc, "Bob"));

		mockMvc.perform(post("/api/v1/me/salon/services")
						.header("Authorization", bearer(p))
						.contentType(MediaType.APPLICATION_JSON)
						.content(
								"""
								{
								  "name":"Colore",
								  "durationMinutes":60,
								  "priceCents":5000,
								  "description":null,
								  "operatorIds":["%s"]
								}
								"""
										.formatted(opA.getId())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.operatorIds.length()").value(1))
				.andExpect(jsonPath("$.operatorIds[0]").value(opA.getId().toString()));

		SalonService service = salonServiceRepository.findByLocation_IdOrderByName(loc.getId()).get(0);

		mockMvc.perform(get("/api/v1/public/organizations/" + slug + "/operators").param("serviceId", service.getId().toString()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(1))
				.andExpect(jsonPath("$[0].id").value(opA.getId().toString()));

		mockMvc.perform(get("/api/v1/public/organizations/" + slug + "/operators"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(2));
	}
}
