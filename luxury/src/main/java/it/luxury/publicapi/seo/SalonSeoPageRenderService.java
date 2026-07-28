package it.luxury.publicapi.seo;

import it.luxury.config.LuxurySeoProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class SalonSeoPageRenderService {

	private static final Logger log = LoggerFactory.getLogger(SalonSeoPageRenderService.class);
	private static final String CLASSPATH_SHELL = "seo/spa-shell.html";

	private final LuxurySeoProperties seoProperties;
	private final SalonSeoHeadRenderer headRenderer;

	public SalonSeoPageRenderService(LuxurySeoProperties seoProperties, SalonSeoHeadRenderer headRenderer) {
		this.seoProperties = seoProperties;
		this.headRenderer = headRenderer;
	}

	public String render(SalonSeoPageModel model) {
		String template = loadBaseTemplate();
		String seoHead = headRenderer.render(model);
		String withoutDefaultTitle = template.replaceFirst("(?s)<title>.*?</title>\\s*", "");
		String withSeoHead = withoutDefaultTitle.replace("</head>", seoHead + System.lineSeparator() + "  </head>");
		String spaBootstrap = """
				    <script>
				      window.history.replaceState(null, '', '%s');
				    </script>
				""".formatted(SalonSeoHtmlSupport.escapeHtml(model.spaPath()));
		return withSeoHead.replace("</body>", spaBootstrap + System.lineSeparator() + "  </body>");
	}

	private String loadBaseTemplate() {
		String root = seoProperties.webStaticRoot();
		if (root != null && !root.isBlank()) {
			Path index = Path.of(root.trim(), "index.html");
			if (Files.isRegularFile(index)) {
				try {
					return Files.readString(index, StandardCharsets.UTF_8);
				}
				catch (IOException ex) {
					log.warn("Impossibile leggere {}: uso template classpath.", index, ex);
				}
			}
			else {
				log.warn("Template SPA assente in {}: uso template classpath.", index);
			}
		}
		return loadClasspathShell();
	}

	private static String loadClasspathShell() {
		try {
			ClassPathResource resource = new ClassPathResource(CLASSPATH_SHELL);
			return StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);
		}
		catch (IOException ex) {
			throw new IllegalStateException("Template SEO classpath mancante: " + CLASSPATH_SHELL, ex);
		}
	}
}
