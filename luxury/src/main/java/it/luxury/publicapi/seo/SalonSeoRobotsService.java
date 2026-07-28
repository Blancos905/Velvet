package it.luxury.publicapi.seo;

import org.springframework.stereotype.Service;

@Service
public class SalonSeoRobotsService {

	private final SalonSeoSiteContext siteContext;

	public SalonSeoRobotsService(SalonSeoSiteContext siteContext) {
		this.siteContext = siteContext;
	}

	public String renderText() {
		return """
				User-agent: *
				Allow: /
				Disallow: /api/
				Disallow: /account/
				Disallow: /admin/

				Sitemap: %s
				""".formatted(siteContext.absolutePath("/sitemap.xml"));
	}
}
