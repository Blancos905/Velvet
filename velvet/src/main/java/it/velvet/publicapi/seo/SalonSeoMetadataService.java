package it.velvet.publicapi.seo;

import it.velvet.publicapi.dto.PublicDtos.OrganizationDetailDto;
import it.velvet.review.domain.ReviewRepository;
import it.velvet.studio.domain.Location;
import it.velvet.studio.domain.LocationRepository;
import it.velvet.studio.domain.StudioGroup;
import it.velvet.studio.service.PublicOrganizationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class SalonSeoMetadataService {

	private final LocationRepository locationRepository;
	private final PublicOrganizationService publicOrganizationService;
	private final ReviewRepository reviewRepository;
	private final SalonSeoSiteContext siteContext;

	public SalonSeoMetadataService(
			LocationRepository locationRepository,
			PublicOrganizationService publicOrganizationService,
			ReviewRepository reviewRepository,
			SalonSeoSiteContext siteContext) {
		this.locationRepository = locationRepository;
		this.publicOrganizationService = publicOrganizationService;
		this.reviewRepository = reviewRepository;
		this.siteContext = siteContext;
	}

	@Transactional(readOnly = true)
	public Optional<SalonSeoPageModel> resolve(String rawSlug) {
		String slug = normalizeSlug(rawSlug);
		if (slug.isEmpty()) {
			return Optional.empty();
		}
		Optional<Location> locationOpt = locationRepository.findBySlug(slug).filter(SalonSeoMetadataService::isPremiumLocation);
		if (locationOpt.isEmpty()) {
			return Optional.empty();
		}
		Location location = locationOpt.get();
		OrganizationDetailDto detail = publicOrganizationService.organizationDetail(slug);
		RatingSummary ratings = loadRatings(location.getId());
		return Optional.of(SalonSeoPageModel.from(
				location,
				detail,
				siteContext.siteBaseUrl(),
				ratings.average(),
				ratings.count()));
	}

	private RatingSummary loadRatings(UUID locationId) {
		List<Object[]> rows = reviewRepository.summarizeRatingsByLocationIds(List.of(locationId));
		if (rows == null || rows.isEmpty()) {
			return RatingSummary.empty();
		}
		Object[] row = rows.get(0);
		if (row == null || row.length < 3 || !(row[1] instanceof Number avgNum) || !(row[2] instanceof Number cntNum)) {
			return RatingSummary.empty();
		}
		long count = cntNum.longValue();
		if (count <= 0) {
			return RatingSummary.empty();
		}
		double average = Math.round(avgNum.doubleValue() * 10.0) / 10.0;
		return new RatingSummary(average, count);
	}

	private static String normalizeSlug(String rawSlug) {
		if (rawSlug == null) {
			return "";
		}
		return rawSlug.trim().toLowerCase(Locale.ROOT);
	}

	private static boolean isPremiumLocation(Location location) {
		if (location == null || location.getStudioGroup() == null) {
			return false;
		}
		return "PREMIUM".equals(StudioGroup.canonicalPlanTier(location.getStudioGroup().getPlanTier()));
	}

	private record RatingSummary(Double average, Long count) {
		static RatingSummary empty() {
			return new RatingSummary(null, null);
		}
	}
}
