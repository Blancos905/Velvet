package it.luxury.publicapi.seo;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

@Component
public class SalonSeoHeadRenderer {

	private final ObjectMapper objectMapper;

	public SalonSeoHeadRenderer(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	public String render(SalonSeoPageModel model) {
		String title = SalonSeoHtmlSupport.escapeHtml(model.pageTitle());
		String description = SalonSeoHtmlSupport.escapeHtml(model.metaDescription());
		String canonical = SalonSeoHtmlSupport.escapeHtml(model.canonicalUrl());
		String jsonLd = SalonSeoHtmlSupport.jsonLd(model, objectMapper);
		return """
				    <title>%s</title>
				    <meta name="description" content="%s" />
				    <link rel="canonical" href="%s" />
				    <meta property="og:type" content="website" />
				    <meta property="og:title" content="%s" />
				    <meta property="og:description" content="%s" />
				    <meta property="og:url" content="%s" />
				    <meta name="twitter:card" content="summary" />
				    <meta name="twitter:title" content="%s" />
				    <meta name="twitter:description" content="%s" />
				    <meta name="robots" content="index,follow" />
				    <script type="application/ld+json">%s</script>
				""".formatted(
				title,
				description,
				canonical,
				title,
				description,
				canonical,
				title,
				description,
				jsonLd);
	}
}
