package it.velvet.studio.service;

import it.velvet.studio.domain.Location;
import it.velvet.studio.domain.LocationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static it.velvet.config.VelvetAsyncConfiguration.GEOCODING_EXECUTOR;

/**
 * Geocoding Nominatim fuori dal thread HTTP: salva coordinate dopo persist indirizzo.
 */
@Service
public class SalonLocationGeocodingAsyncService {

	private static final Logger log = LoggerFactory.getLogger(SalonLocationGeocodingAsyncService.class);
	private static final long NOMINATIM_PAUSE_MS = 1_100L;

	private final LocationRepository locationRepository;
	private final SalonLocationGeocodingService salonLocationGeocodingService;
	private final SalonLocationGeocodingAsyncService self;

	public SalonLocationGeocodingAsyncService(
			LocationRepository locationRepository,
			SalonLocationGeocodingService salonLocationGeocodingService,
			@Lazy SalonLocationGeocodingAsyncService self) {
		this.locationRepository = locationRepository;
		this.salonLocationGeocodingService = salonLocationGeocodingService;
		this.self = self;
	}

	/** Avvia geocoding dopo {@code locationRepository.save} — non blocca la risposta HTTP. */
	public void scheduleGeocode(UUID locationId) {
		if (locationId == null) {
			return;
		}
		self.geocodeLocationAsync(locationId);
	}

	@Async(GEOCODING_EXECUTOR)
	@Transactional
	public CompletableFuture<Void> geocodeLocationAsync(UUID locationId) {
		try {
			locationRepository.findById(locationId).ifPresent(loc -> {
				if (salonLocationGeocodingService.applyCoordinates(loc)) {
					locationRepository.save(loc);
					log.debug("Geocoding async completato per locationId={}", locationId);
				}
			});
		}
		catch (Exception e) {
			log.warn("Geocoding async fallito per locationId={}: {}", locationId, e.getMessage());
		}
		return CompletableFuture.completedFuture(null);
	}

	/** Backfill opzionale all'avvio — eseguito sul pool geocoding, non sul main thread Spring. */
	@Async(GEOCODING_EXECUTOR)
	@Transactional
	public CompletableFuture<Integer> backfillMissingPremiumCoordinatesAsync(int maxLocations) {
		int cap = Math.max(1, maxLocations);
		List<Location> candidates = locationRepository.findAll().stream()
				.filter(SalonLocationGeocodingService::isPremiumLocation)
				.filter(loc -> loc.getLatitude() == null || loc.getLongitude() == null)
				.limit(cap)
				.toList();
		if (candidates.isEmpty()) {
			return CompletableFuture.completedFuture(0);
		}
		int updated = 0;
		for (Location loc : candidates) {
			try {
				if (salonLocationGeocodingService.applyCoordinates(loc)) {
					locationRepository.save(loc);
					updated++;
				}
				Thread.sleep(NOMINATIM_PAUSE_MS);
			}
			catch (InterruptedException e) {
				Thread.currentThread().interrupt();
				break;
			}
			catch (Exception e) {
				log.warn("Backfill geocoding fallito per slug={}: {}", loc.getSlug(), e.getMessage());
			}
		}
		if (updated > 0) {
			log.info("Geocoding sedi premium (async backfill): {} sedi aggiornate", updated);
		}
		return CompletableFuture.completedFuture(updated);
	}
}
