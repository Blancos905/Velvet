package it.luxury.publicapi.seo;

import it.luxury.publicapi.dto.PublicDtos.OrganizationDetailDto;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.SalonBusinessType;

import java.util.List;
import java.util.Set;

/**
 * Dati denormalizzati per il rendering SSR della pagina salone {@code /saloni/{slug}}.
 */
public record SalonSeoPageModel(
		String slug,
		String salonName,
		String city,
		String addressLine,
		String postalCode,
		String phoneE164,
		String description,
		String schemaOrgType,
		String canonicalUrl,
		String spaPath,
		Double latitude,
		Double longitude,
		Double averageRating,
		Long reviewCount) {

	public String pageTitle() {
		if (city != null && !city.isBlank()) {
			return salonName + " — " + city.trim() + " | Saloni Luxury";
		}
		return salonName + " | Saloni Luxury";
	}

	public String metaDescription() {
		if (description != null && !description.isBlank()) {
			String trimmed = description.trim();
			return trimmed.length() <= 160 ? trimmed : trimmed.substring(0, 157) + "…";
		}
		if (city != null && !city.isBlank()) {
			return "Prenota online da " + salonName + " a " + city.trim()
					+ ". Orari, servizi e recensioni verificate su Saloni Luxury.";
		}
		return "Prenota online da " + salonName + ". Servizi, recensioni e disponibilità su Saloni Luxury.";
	}

	public static SalonSeoPageModel from(
			Location location,
			OrganizationDetailDto detail,
			String siteBaseUrl,
			Double averageRating,
			Long reviewCount) {
		String base = SalonSeoSiteContext.normalizeSiteBaseUrl(siteBaseUrl);
		String slug = detail.slug();
		String canonical = base + "/saloni/" + slug;
		String phone = firstNonBlank(detail.phoneE164(), detail.contactPhone(), detail.whatsappE164());
		String description = firstNonBlank(location.getWelcomeMessage(), detail.welcomeMessage());
		return new SalonSeoPageModel(
				slug,
				detail.name(),
				detail.city(),
				detail.addressLine(),
				location.getPostalCode(),
				phone,
				description,
				resolveSchemaOrgType(location),
				canonical,
				"/s/" + slug,
				location.getLatitude(),
				location.getLongitude(),
				averageRating,
				reviewCount);
	}

	private static String resolveSchemaOrgType(Location location) {
		Set<SalonBusinessType> types = SalonBusinessType.parseCsv(location.getSalonBusinessTypes());
		List<SalonBusinessType> ordered = types.stream().sorted().toList();
		for (SalonBusinessType type : ordered) {
			return switch (type) {
				case HAIR -> "HairSalon";
				case BEAUTY -> "BeautySalon";
				case MASSAGE -> "HealthAndBeautyBusiness";
			};
		}
		return "HairSalon";
	}

	private static String normalizeSiteBaseUrl(String siteBaseUrl) {
		if (siteBaseUrl == null || siteBaseUrl.isBlank()) {
			return "http://localhost:5173";
		}
		String trimmed = siteBaseUrl.trim();
		while (trimmed.endsWith("/")) {
			trimmed = trimmed.substring(0, trimmed.length() - 1);
		}
		return trimmed;
	}

	private static String firstNonBlank(String... values) {
		if (values == null) {
			return null;
		}
		for (String value : values) {
			if (value != null && !value.isBlank()) {
				return value.trim();
			}
		}
		return null;
	}
}
