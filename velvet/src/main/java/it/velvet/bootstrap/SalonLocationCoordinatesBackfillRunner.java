package it.velvet.bootstrap;

import it.velvet.studio.service.SalonLocationGeocodingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
@ConditionalOnProperty(name = "velvet.salon.geocode-missing-on-startup", havingValue = "true")
public class SalonLocationCoordinatesBackfillRunner implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(SalonLocationCoordinatesBackfillRunner.class);

	private static final int MAX_LOCATIONS = 40;

	private final SalonLocationGeocodingService salonLocationGeocodingService;

	public SalonLocationCoordinatesBackfillRunner(SalonLocationGeocodingService salonLocationGeocodingService) {
		this.salonLocationGeocodingService = salonLocationGeocodingService;
	}

	@Override
	public void run(ApplicationArguments args) throws Exception {
		int updated = salonLocationGeocodingService.backfillMissingPremiumCoordinates(MAX_LOCATIONS);
		if (updated > 0) {
			log.info("Geocoding sedi premium: {} sedi aggiornate", updated);
		}
	}
}
