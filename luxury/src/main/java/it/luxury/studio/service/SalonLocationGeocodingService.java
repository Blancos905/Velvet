package it.luxury.studio.service;

import it.luxury.billing.service.SalonPremiumEntitlementService;
import it.luxury.publicapi.service.PostalLocateService;
import it.luxury.studio.domain.Location;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;

/**
 * Geocodifica indirizzo sede (Nominatim) in coordinate WGS84 per ricerca «vicino a me».
 */
@Service
public class SalonLocationGeocodingService {

	private final PostalLocateService postalLocateService;
	private final SalonPremiumEntitlementService salonPremiumEntitlementService;

	public SalonLocationGeocodingService(
			PostalLocateService postalLocateService,
			SalonPremiumEntitlementService salonPremiumEntitlementService) {
		this.postalLocateService = postalLocateService;
		this.salonPremiumEntitlementService = salonPremiumEntitlementService;
	}

	/**
	 * Aggiorna {@link Location#setLatitude(Double)} / {@link Location#setLongitude(Double)} se il geocoder risponde.
	 *
	 * @return {@code true} se le coordinate sono state valorizzate
	 */
	public boolean applyCoordinates(Location loc) {
		if (loc == null) {
			return false;
		}
		for (String query : buildGeocodeQueries(loc)) {
			Optional<PostalLocateService.GeoPoint> point = postalLocateService.geocode(query, "IT");
			if (point.isEmpty()) {
				continue;
			}
			PostalLocateService.GeoPoint coords = point.get();
			loc.setLatitude(coords.lat());
			loc.setLongitude(coords.lng());
			return true;
		}
		return false;
	}

	static String buildGeocodeQuery(Location loc) {
		List<String> queries = buildGeocodeQueries(loc);
		return queries.isEmpty() ? "" : queries.get(0);
	}

	static List<String> buildGeocodeQueries(Location loc) {
		if (loc == null) {
			return List.of();
		}
		String address = trim(loc.getAddressLine());
		String postal = trim(loc.getPostalCode());
		String city = trim(loc.getCity());
		if (address.isEmpty() && postal.isEmpty() && city.isEmpty()) {
			return List.of();
		}
		LinkedHashSet<String> queries = new LinkedHashSet<>();
		if (!address.isEmpty() && !city.isEmpty()) {
			if (!postal.isEmpty()) {
				queries.add(String.join(", ", address, postal, city, "Italia"));
			}
			queries.add(String.join(", ", address, city, "Italia"));
		}
		if (!postal.isEmpty() && !city.isEmpty()) {
			queries.add(String.join(", ", postal, city, "Italia"));
		}
		if (!city.isEmpty()) {
			queries.add(String.join(", ", city, "Italia"));
		}
		if (!address.isEmpty() && city.isEmpty()) {
			queries.add(String.join(", ", address, "Italia"));
		}
		return List.copyOf(queries);
	}

	private static String trim(String raw) {
		return raw != null ? raw.trim() : "";
	}

	public boolean isPremiumLocation(Location loc) {
		if (loc == null || loc.getStudioGroup() == null) {
			return false;
		}
		return salonPremiumEntitlementService.hasActivePremium(loc.getStudioGroup());
	}
}
