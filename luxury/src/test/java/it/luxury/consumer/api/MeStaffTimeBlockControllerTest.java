package it.luxury.consumer.api;

import it.luxury.catalog.domain.StaffOperator;
import it.luxury.catalog.domain.StaffOperatorRepository;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.security.auth.LuxuryTokenService;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.LocationRepository;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.studio.domain.StudioGroupRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class MeStaffTimeBlockControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private StudioGroupRepository studioGroupRepository;

	@Autowired
	private LocationRepository locationRepository;

	@Autowired
	private StaffOperatorRepository staffOperatorRepository;

	@Autowired
	private ConsumerProfileRepository consumerProfileRepository;

	@Autowired
	private LuxuryTokenService luxuryTokenService;

	@Autowired
	private PasswordEncoder passwordEncoder;

	private ConsumerProfile saveStaff(String sub, String email) {
		ConsumerProfile p = new ConsumerProfile(sub, email, "Staff");
		p.setPasswordHash(passwordEncoder.encode("x"));
		p.setSecurityRoles("STAFF");
		return consumerProfileRepository.save(p);
	}

	private String bearer(ConsumerProfile p) {
		return "Bearer " + luxuryTokenService.createAccessToken(p);
	}

	private StaffFixture saveStaffFixture() {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String slug = "slug-staff-block-" + suffix;
		StudioGroup group = studioGroupRepository.save(new StudioGroup("Studio Block", "owner-" + suffix + "@test.com", "BASE"));
		Location location = locationRepository.save(new Location(group, slug, "Sede", "MI"));
		StaffOperator operator = staffOperatorRepository.save(new StaffOperator(location, "Op"));
		ConsumerProfile staff = saveStaff("sub-staff-block-" + suffix, "staff-block-" + suffix + "@test.com");
		operator.setConsumerProfile(staff);
		staffOperatorRepository.save(operator);
		return new StaffFixture(staff, location, operator);
	}

	private static String futureBlockJson(Location location, LocalDate day, int startHour, int endHour) {
		ZoneId zone = ZoneId.of(location.getTimeZone());
		Instant start = day.atTime(startHour, 0).atZone(zone).toInstant();
		Instant end = day.atTime(endHour, 0).atZone(zone).toInstant();
		return """
				{"start":"%s","end":"%s","note":"Visita medica"}
				""".formatted(start.toString(), end.toString());
	}

	@Test
	void timeBlocks_createThenListForDay_returnsBlock() throws Exception {
		StaffFixture fx = saveStaffFixture();
		LocalDate day = LocalDate.now(fx.location().getTimeZone() != null
				? ZoneId.of(fx.location().getTimeZone())
				: ZoneId.of("Europe/Rome")).plusDays(1);
		String body = futureBlockJson(fx.location(), day, 10, 12);

		mockMvc.perform(post("/api/v1/me/staff/time-blocks")
						.header("Authorization", bearer(fx.staff()))
						.contentType(MediaType.APPLICATION_JSON)
						.content(body))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").exists())
				.andExpect(jsonPath("$.note").value("Visita medica"));

		mockMvc.perform(get("/api/v1/me/staff/time-blocks")
						.param("from", day.toString())
						.param("to", day.toString())
						.header("Authorization", bearer(fx.staff())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(1)))
				.andExpect(jsonPath("$[0].note").value("Visita medica"));

		mockMvc.perform(get("/api/v1/me/staff/time-blocks")
						.param("from", day.minusDays(7).toString())
						.param("to", day.plusDays(7).toString())
						.header("Authorization", bearer(fx.staff())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(1)));
	}

	@Test
	void timeBlocks_patchThenList_returnsUpdatedBlock() throws Exception {
		StaffFixture fx = saveStaffFixture();
		LocalDate day = LocalDate.now(ZoneId.of("Europe/Rome")).plusDays(2);
		String createBody = futureBlockJson(fx.location(), day, 9, 11);

		String createResponse = mockMvc.perform(post("/api/v1/me/staff/time-blocks")
						.header("Authorization", bearer(fx.staff()))
						.contentType(MediaType.APPLICATION_JSON)
						.content(createBody))
				.andExpect(status().isOk())
				.andReturn()
				.getResponse()
				.getContentAsString();

		String blockId = createResponse.replaceAll("(?s).*\"id\"\\s*:\\s*\"([^\"]+)\".*", "$1");
		String patchBody = futureBlockJson(fx.location(), day, 14, 16).replace("Visita medica", "Permesso");

		mockMvc.perform(patch("/api/v1/me/staff/time-blocks/" + blockId)
						.header("Authorization", bearer(fx.staff()))
						.contentType(MediaType.APPLICATION_JSON)
						.content(patchBody))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.note").value("Permesso"));

		mockMvc.perform(get("/api/v1/me/staff/time-blocks")
						.param("from", day.toString())
						.param("to", day.toString())
						.header("Authorization", bearer(fx.staff())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(1)))
				.andExpect(jsonPath("$[0].note").value("Permesso"));
	}

	@Test
	void timeBlocks_deleteThenList_returnsEmpty() throws Exception {
		StaffFixture fx = saveStaffFixture();
		LocalDate day = LocalDate.now(ZoneId.of("Europe/Rome")).plusDays(3);
		String createBody = futureBlockJson(fx.location(), day, 10, 12);

		String createResponse = mockMvc.perform(post("/api/v1/me/staff/time-blocks")
						.header("Authorization", bearer(fx.staff()))
						.contentType(MediaType.APPLICATION_JSON)
						.content(createBody))
				.andExpect(status().isOk())
				.andReturn()
				.getResponse()
				.getContentAsString();

		String blockId = createResponse.replaceAll("(?s).*\"id\"\\s*:\\s*\"([^\"]+)\".*", "$1");

		mockMvc.perform(delete("/api/v1/me/staff/time-blocks/" + blockId)
						.header("Authorization", bearer(fx.staff())))
				.andExpect(status().isNoContent());

		mockMvc.perform(get("/api/v1/me/staff/time-blocks")
						.param("from", day.toString())
						.param("to", day.toString())
						.header("Authorization", bearer(fx.staff())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(0)));
	}

	private record StaffFixture(ConsumerProfile staff, Location location, StaffOperator operator) {
	}
}
