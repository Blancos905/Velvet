package it.luxury.consumer.service;

import it.luxury.common.api.BusinessException;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.FavoriteLocation;
import it.luxury.consumer.domain.FavoriteLocationRepository;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.LocationRepository;
import org.springframework.http.HttpStatus;
import it.luxury.security.auth.LuxuryUserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class FavoriteLocationService {

	private final FavoriteLocationRepository favoriteLocationRepository;
	private final LocationRepository locationRepository;
	private final ConsumerProfileService consumerProfileService;

	public FavoriteLocationService(
			FavoriteLocationRepository favoriteLocationRepository,
			LocationRepository locationRepository,
			ConsumerProfileService consumerProfileService) {
		this.favoriteLocationRepository = favoriteLocationRepository;
		this.locationRepository = locationRepository;
		this.consumerProfileService = consumerProfileService;
	}

	@Transactional(readOnly = true)
	public List<FavoriteLocation> list(LuxuryUserPrincipal principal) {
		ConsumerProfile p = consumerProfileService.requireActiveProfile(principal);
		return favoriteLocationRepository.findByConsumerProfile_IdOrderByCreatedAtDesc(p.getId());
	}

	@Transactional
	public void add(LuxuryUserPrincipal principal, UUID locationId) {
		ConsumerProfile p = consumerProfileService.requireActiveProfile(principal);
		Location loc = locationRepository.findById(locationId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Sede non trovata."));
		if (favoriteLocationRepository.findByConsumerProfile_IdAndLocation_Id(p.getId(), loc.getId()).isPresent()) {
			return;
		}
		favoriteLocationRepository.save(new FavoriteLocation(p, loc));
	}

	@Transactional
	public void remove(LuxuryUserPrincipal principal, UUID locationId) {
		ConsumerProfile p = consumerProfileService.requireActiveProfile(principal);
		favoriteLocationRepository.deleteByConsumerProfile_IdAndLocation_Id(p.getId(), locationId);
	}
}
