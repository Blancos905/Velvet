package it.luxury.publicapi.seo;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.util.HtmlUtils;

import java.util.LinkedHashMap;
import java.util.Map;

final class SalonSeoHtmlSupport {

	private SalonSeoHtmlSupport() {
	}

	static String escapeHtml(String value) {
		if (value == null) {
			return "";
		}
		return HtmlUtils.htmlEscape(value);
	}

	static String jsonLd(SalonSeoPageModel model, ObjectMapper objectMapper) {
		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("@context", "https://schema.org");
		payload.put("@type", model.schemaOrgType());
		payload.put("name", model.salonName());
		payload.put("url", model.canonicalUrl());
		if (model.phoneE164() != null && !model.phoneE164().isBlank()) {
			payload.put("telephone", model.phoneE164());
		}
		if (model.description() != null && !model.description().isBlank()) {
			payload.put("description", model.description().trim());
		}
		Map<String, Object> address = postalAddress(model);
		if (!address.isEmpty()) {
			payload.put("address", address);
		}
		if (model.latitude() != null && model.longitude() != null) {
			payload.put("geo", Map.of(
					"@type", "GeoCoordinates",
					"latitude", model.latitude(),
					"longitude", model.longitude()));
		}
		if (model.averageRating() != null && model.reviewCount() != null && model.reviewCount() > 0) {
			payload.put("aggregateRating", Map.of(
					"@type", "AggregateRating",
					"ratingValue", model.averageRating(),
					"reviewCount", model.reviewCount(),
					"bestRating", 5,
					"worstRating", 1));
		}
		try {
			return objectMapper.writeValueAsString(payload);
		}
		catch (JsonProcessingException ex) {
			throw new IllegalStateException("Impossibile serializzare JSON-LD.", ex);
		}
	}

	private static Map<String, Object> postalAddress(SalonSeoPageModel model) {
		Map<String, Object> address = new LinkedHashMap<>();
		address.put("@type", "PostalAddress");
		if (model.addressLine() != null && !model.addressLine().isBlank()) {
			address.put("streetAddress", model.addressLine().trim());
		}
		if (model.city() != null && !model.city().isBlank()) {
			address.put("addressLocality", model.city().trim());
		}
		if (model.postalCode() != null && !model.postalCode().isBlank()) {
			address.put("postalCode", model.postalCode().trim());
		}
		address.put("addressCountry", "IT");
		if (address.size() <= 2) {
			return Map.of();
		}
		return address;
	}
}
