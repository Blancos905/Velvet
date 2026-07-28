package it.luxury.publicapi.api;

import it.luxury.testsupport.SalonSeoDemoSalonFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SalonSeoPageControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private SalonSeoDemoSalonFixture salonSeoDemoSalonFixture;

	@BeforeEach
	void ensureDemoSalon() {
		salonSeoDemoSalonFixture.ensureDemoPremiumSalon();
	}

	@Test
	void salonSeoPage_demoSalon_returnsHtmlWithJsonLd() throws Exception {
		mockMvc.perform(get("/saloni/demo-salone").accept(MediaType.TEXT_HTML))
				.andExpect(status().isOk())
				.andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
				.andExpect(content().string(containsString("application/ld+json")))
				.andExpect(content().string(containsString("\"@type\":\"HairSalon\"")))
				.andExpect(content().string(containsString("Luxury Demo Salon")))
				.andExpect(content().string(containsString("rel=\"canonical\"")))
				.andExpect(content().string(containsString("/saloni/demo-salone")))
				.andExpect(content().string(containsString("window.history.replaceState")))
				.andExpect(content().string(containsString("'/s/demo-salone'")));
	}

	@Test
	void salonSeoPage_unknownSlug_returns404WithNoindex() throws Exception {
		mockMvc.perform(get("/saloni/slug-che-non-esiste-xyz").accept(MediaType.TEXT_HTML))
				.andExpect(status().isNotFound())
				.andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
				.andExpect(content().string(containsString("noindex,nofollow")))
				.andExpect(content().string(not(containsString("application/ld+json"))));
	}

	@Test
	void salonSeoPage_setsShortCache() throws Exception {
		mockMvc.perform(get("/saloni/demo-salone"))
				.andExpect(status().isOk())
				.andExpect(header().string("Cache-Control", containsString("max-age=300")));
	}
}
