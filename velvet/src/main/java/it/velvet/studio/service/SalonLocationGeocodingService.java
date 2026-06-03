package it.velvet.studio.service;

import it.velvet.publicapi.service.PostalLocateService;
import it.velvet.studio.domain.Location;
import it.velvet.studio.domain.LocationRepository;
import it.velvet.studio.domain.StudioGroup;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;

/**
 * Geocodifica indirizzo sede (Nominatim) in coordinate WGS84 per ricerca «vicino a me».
 */
@Service
public class SalonLocationGeocodingService {

	private static final Logger log = LoggerFactory.getLogger(SalonLocationGeocodingService.class);
	private static final long NOMINATIM_PAUSE_MS = 1_100L;

	private final PostalLocateService postalLocateService;
	private final LocationRepository locationRepository;

	public SalonLocationGeocodingService(
			PostalLocateService postalLocateService,
			LocationRepository locationRepository) {
		this.postalLocateService = postalLocateService;
		this.locationRepository = locationRepository;
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

	public void tryApplyCoordinates(Location loc) {
		try {
			if (!applyCoordinates(loc)) {
				log.debug("Geocoding sede non riuscito per slug={}", loc != null ? loc.getSlug() : null);
			}
		}
		catch (Exception e) {
			log.warn(
					"Geocoding sede fallito per slug={}: {}",
					loc != null ? loc.getSlug() : null,
					e.getMessage());
		}
	}

	@Transactional
	public int backfillMissingPremiumCoordinates(int maxLocations) throws InterruptedException {
		int cap = Math.max(1, maxLocations);
		List<Location> candidates = locationRepository.findAll().stream()
				.filter(SalonLocationGeocodingService::isPremiumLocation)
				.filter(loc -> loc.getLatitude() == null || loc.getLongitude() == null)
				.limit(cap)
				.toList();
		if (candidates.isEmpty()) {
			return 0;
		}
		int updated = 0;
		for (Location loc : candidates) {
			if (applyCoordinates(loc)) {
				locationRepository.save(loc);
				updated++;
			}
			Thread.sleep(NOMINATIM_PAUSE_MS);
		}
		return updated;
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

	public static boolean isPremiumLocation(Location loc) {
		if (loc == null || loc.getStudioGroup() == null) {
			return false;
		}
		String plan = StudioGroup.canonicalPlanTier(loc.getStudioGroup().getPlanTier());
		return "PREMIUM".equals(plan);
	}
}
