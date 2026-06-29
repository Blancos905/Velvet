package it.velvet.staff.api;

import it.velvet.studio.domain.Location;
import it.velvet.studio.domain.LocationRepository;
import it.velvet.studio.domain.StudioGroup;
import it.velvet.studio.domain.StudioGroupRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SalonCatalogStaffControllerSecurityTest {

	private static final String SLUG = "staff-catalog-security";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private StudioGroupRepository studioGroupRepository;

	@Autowired
	private LocationRepository locationRepository;

	private UUID locationId;

	@BeforeEach
	void seedLocation() {
		Location existing = locationRepository.findBySlug(SLUG).orElse(null);
		if (existing != null) {
			locationId = existing.getId();
			return;
		}
		StudioGroup group = studioGroupRepository.save(
				new StudioGroup("Staff catalog security", "owner-staff-catalog@test.com", "PREMIUM"));
		locationId = locationRepository.save(new Location(group, SLUG, "Sede test", "MI")).getId();
	}

	@Test
	void services_requiresAuthentication() throws Exception {
		mockMvc.perform(get("/api/v1/services").header("X-Location-Id", locationId))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void operators_requiresAuthentication() throws Exception {
		mockMvc.perform(get("/api/v1/operators").header("X-Location-Id", locationId))
				.andExpect(status().isUnauthorized());
	}
}
