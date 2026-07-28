package it.luxury.publicapi.api;

import io.swagger.v3.oas.annotations.Hidden;
import it.luxury.publicapi.seo.SalonSeoMetadataService;
import it.luxury.publicapi.seo.SalonSeoPageRenderService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@Controller
@Hidden
public class SalonSeoPageController {

	private final SalonSeoMetadataService metadataService;
	private final SalonSeoPageRenderService renderService;

	public SalonSeoPageController(
			SalonSeoMetadataService metadataService,
			SalonSeoPageRenderService renderService) {
		this.metadataService = metadataService;
		this.renderService = renderService;
	}

	@GetMapping(value = "/saloni/{slug}", produces = MediaType.TEXT_HTML_VALUE)
	public ResponseEntity<String> salonSeoPage(@PathVariable String slug) {
		return metadataService.resolve(slug)
				.map(model -> ResponseEntity.ok()
						.header(HttpHeaders.CACHE_CONTROL, "public, max-age=300")
						.contentType(MediaType.TEXT_HTML)
						.body(renderService.render(model)))
				.orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
						.contentType(MediaType.TEXT_HTML)
						.body(notFoundHtml(slug)));
	}

	private static String notFoundHtml(String slug) {
		String safeSlug = slug == null ? "" : slug.replace("<", "").replace(">", "");
		return """
				<!doctype html>
				<html lang="it">
				  <head>
				    <meta charset="UTF-8" />
				    <meta name="robots" content="noindex,nofollow" />
				    <title>Salone non trovato | Saloni Luxury</title>
				  </head>
				  <body>
				    <h1>Salone non trovato</h1>
				    <p>La pagina richiesta (%s) non esiste o non è disponibile.</p>
				  </body>
				</html>
				""".formatted(safeSlug);
	}
}
