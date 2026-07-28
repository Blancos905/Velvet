package it.luxury.bootstrap;

import it.luxury.studio.service.SalonLocationGeocodingAsyncService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Geocodifica sedi premium senza coordinate (utile per saloni già presenti in DB prima del geocoding automatico).
 */
@Component
@Order(50)
@ConditionalOnProperty(name = "luxury.salon.geocode-missing-on-startup", havingValue = "true")
public class SalonLocationCoordinatesBackfillRunner implements ApplicationRunner {

	private static final int MAX_LOCATIONS = 40;

	private final SalonLocationGeocodingAsyncService salonLocationGeocodingAsyncService;

	public SalonLocationCoordinatesBackfillRunner(
			SalonLocationGeocodingAsyncService salonLocationGeocodingAsyncService) {
		this.salonLocationGeocodingAsyncService = salonLocationGeocodingAsyncService;
	}

	@Override
	public void run(ApplicationArguments args) {
		salonLocationGeocodingAsyncService.backfillMissingPremiumCoordinatesAsync(MAX_LOCATIONS);
	}
}
