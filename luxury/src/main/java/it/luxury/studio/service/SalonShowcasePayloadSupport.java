package it.luxury.studio.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import it.luxury.studio.domain.SalonSiteContent;
import it.luxury.studio.domain.SalonSiteContentKind;
import it.luxury.studio.domain.SalonSiteContentRepository;

import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;

/**
 * Estrae logo/immagine hit dalla payload JSON della vetrina (stesso criterio del frontend
 * {@code SearchHitLogoAvatar}).
 */
public final class SalonShowcasePayloadSupport {

	private static final ObjectMapper MAPPER = new ObjectMapper();

	private SalonShowcasePayloadSupport() {
	}

	public static String resolveHitVisualDataUrl(String payloadJson) {
		if (payloadJson == null || payloadJson.isBlank()) {
			return null;
		}
		try {
			JsonNode root = MAPPER.readTree(payloadJson);
			String logo = nonBlankText(root.get("logoDataUrl"));
			if (logo != null) {
				return logo;
			}
			String fromSite = firstNonBlankInArray(root.get("siteImageDataUrls"));
			if (fromSite != null) {
				return fromSite;
			}
			String fromExplore = firstNonBlankInArray(root.get("exploreGalleryImageDataUrls"));
			if (fromExplore != null) {
				return fromExplore;
			}
			return firstNonBlankInObjectValues(root.get("servicePhotoDataUrls"));
		} catch (Exception ignored) {
			return null;
		}
	}

	public static Map<String, String> resolveVisualsBySlugs(
			SalonSiteContentRepository repository, Collection<String> slugs) {
		if (slugs == null || slugs.isEmpty()) {
			return Map.of();
		}
		Map<String, String> visualsBySlug = new HashMap<>();
		for (SalonSiteContent content : repository.findBySlugInAndKind(slugs, SalonSiteContentKind.SHOWCASE)) {
			String visual = resolveHitVisualDataUrl(content.getPayload());
			if (visual != null) {
				visualsBySlug.put(content.getSlug().toLowerCase(Locale.ROOT), visual);
			}
		}
		return visualsBySlug;
	}

	private static String firstNonBlankInArray(JsonNode array) {
		if (array == null || !array.isArray()) {
			return null;
		}
		for (JsonNode node : array) {
			String value = nonBlankText(node);
			if (value != null) {
				return value;
			}
		}
		return null;
	}

	private static String firstNonBlankInObjectValues(JsonNode object) {
		if (object == null || !object.isObject()) {
			return null;
		}
		Iterator<Map.Entry<String, JsonNode>> fields = object.fields();
		while (fields.hasNext()) {
			String value = nonBlankText(fields.next().getValue());
			if (value != null) {
				return value;
			}
		}
		return null;
	}

	private static String nonBlankText(JsonNode node) {
		if (node == null || node.isNull()) {
			return null;
		}
		String value = node.asText(null);
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}
}
