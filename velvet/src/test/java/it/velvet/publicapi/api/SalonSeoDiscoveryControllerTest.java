package it.velvet.publicapi.api;

import it.velvet.testsupport.SalonSeoDemoSalonFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SalonSeoDiscoveryControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private SalonSeoDemoSalonFixture salonSeoDemoSalonFixture;

	@BeforeEach
	void ensureDemoSalon() {
		salonSeoDemoSalonFixture.ensureDemoPremiumSalon();
	}

	@Test
	void sitemap_listsPremiumSalonsAndStaticPages() throws Exception {
		mockMvc.perform(get("/sitemap.xml").accept(MediaType.APPLICATION_XML))
				.andExpect(status().isOk())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_XML))
				.andExpect(content().string(containsString("http://www.sitemaps.org/schemas/sitemap/0.9")))
				.andExpect(content().string(containsString("/saloni/demo-salone")))
				.andExpect(content().string(containsString("<lastmod>")))
				.andExpect(content().string(containsString("/search")));
	}

	@Test
	void robots_blocksApiAndPointsToSitemap() throws Exception {
		mockMvc.perform(get("/robots.txt"))
				.andExpect(status().isOk())
				.andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_PLAIN))
				.andExpect(content().string(containsString("Disallow: /api/")))
				.andExpect(content().string(containsString("Disallow: /account/")))
				.andExpect(content().string(containsString("Sitemap:")))
				.andExpect(content().string(containsString("/sitemap.xml")));
	}

	@Test
	void discoveryEndpoints_setCacheHeaders() throws Exception {
		mockMvc.perform(get("/sitemap.xml"))
				.andExpect(status().isOk())
				.andExpect(header().string("Cache-Control", containsString("max-age=3600")));
		mockMvc.perform(get("/robots.txt"))
				.andExpect(status().isOk())
				.andExpect(header().string("Cache-Control", containsString("max-age=3600")));
	}
}
