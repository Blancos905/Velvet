package it.luxury.publicapi.dto;

import it.luxury.billing.service.SalonMultiLocationPricing;
import java.util.ArrayList;
import java.util.List;

/** Nomi pubblici delle sedi create in registrazione (slug distinti in directory). */
public final class SalonRegistrationLocations {

	private SalonRegistrationLocations() {
	}

	public static List<RegistrationSalonLocation> withDisplayNames(String salonName, List<RegistrationSalonLocation> locations) {
		if (locations == null || locations.isEmpty()) {
			return List.of();
		}
		if (locations.size() > SalonMultiLocationPricing.MAX_LOCATIONS) {
			throw new IllegalArgumentException("Troppe sedi");
		}
		List<RegistrationSalonLocation> named = new ArrayList<>(locations.size());
		for (int i = 0; i < locations.size(); i++) {
			named.add(withDisplayName(salonName, locations.get(i), i + 1, locations.size()));
		}
		return List.copyOf(named);
	}

	public static RegistrationSalonLocation withDisplayName(
			String salonName, RegistrationSalonLocation location, int index, int total) {
		String explicit = location.displayName();
		if (explicit != null && !explicit.isBlank()) {
			return location;
		}
		String base = salonName == null || salonName.isBlank() ? "Salone" : salonName.trim();
		if (total <= 1) {
			return location.withDisplayName(base);
		}
		String city = location.city() == null ? "" : location.city().trim();
		String label = city.isEmpty() ? base + " — Sede " + index : base + " — " + city;
		return location.withDisplayName(label);
	}
}
