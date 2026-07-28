package it.luxury.publicapi.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.luxury.config.LuxuryLoggingProperties;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/public/legal-meta")
@Tag(name = "Pubblico — metadati legali")
public class PublicLegalMetaController {

	private final LuxuryLoggingProperties loggingProperties;

	public PublicLegalMetaController(LuxuryLoggingProperties loggingProperties) {
		this.loggingProperties = loggingProperties;
	}

	@GetMapping
	@Operation(summary = "Metadati pubblici per informative (es. retention log)")
	public Map<String, Object> legalMeta() {
		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("logRetentionDays", loggingProperties.getRetentionDays());
		return payload;
	}
}
