package it.luxury.publicapi.api;

import io.swagger.v3.oas.annotations.Hidden;
import it.luxury.publicapi.seo.SalonSeoRobotsService;
import it.luxury.publicapi.seo.SalonSeoSitemapService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
@Hidden
public class SalonSeoDiscoveryController {

	private final SalonSeoSitemapService sitemapService;
	private final SalonSeoRobotsService robotsService;

	public SalonSeoDiscoveryController(SalonSeoSitemapService sitemapService, SalonSeoRobotsService robotsService) {
		this.sitemapService = sitemapService;
		this.robotsService = robotsService;
	}

	@GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
	public ResponseEntity<String> sitemap() {
		return ResponseEntity.ok()
				.header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
				.contentType(MediaType.APPLICATION_XML)
				.body(sitemapService.renderXml());
	}

	@GetMapping(value = "/robots.txt", produces = MediaType.TEXT_PLAIN_VALUE)
	public ResponseEntity<String> robots() {
		return ResponseEntity.ok()
				.header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
				.contentType(MediaType.TEXT_PLAIN)
				.body(robotsService.renderText());
	}
}
