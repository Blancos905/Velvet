package it.luxury.studio.service;

import it.luxury.billing.service.SalonPremiumEntitlementService;
import it.luxury.catalog.domain.SalonServiceRepository;
import it.luxury.catalog.domain.StaffOperatorRepository;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.review.domain.ReviewRepository;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.LocationRepository;
import it.luxury.studio.domain.StudioGroup;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublicOrganizationServiceSponsoredPlacementTest {

	@Mock
	private LocationRepository locationRepository;
	@Mock
	private SalonServiceRepository salonServiceRepository;
	@Mock
	private StaffOperatorRepository staffOperatorRepository;
	@Mock
	private ConsumerProfileRepository consumerProfileRepository;
	@Mock
	private ReviewRepository reviewRepository;
	@Mock
	private SalonLocationGeocodingService salonLocationGeocodingService;
	@Mock
	private SalonPremiumEntitlementService salonPremiumEntitlementService;
	@Mock
	private PlatformTransactionManager transactionManager;

	private PublicOrganizationService service;

	@BeforeEach
	void setUp() {
		service = new PublicOrganizationService(
				locationRepository,
				salonServiceRepository,
				staffOperatorRepository,
				consumerProfileRepository,
				reviewRepository,
				salonLocationGeocodingService,
				salonPremiumEntitlementService,
				transactionManager);
		lenient().when(salonPremiumEntitlementService.hasActivePremium(any()))
				.thenAnswer(inv -> {
					StudioGroup group = inv.getArgument(0);
					return group != null && "PREMIUM".equalsIgnoreCase(group.getPlanTier());
				});
	}

	@Test
	void sponsoredPlacementSummaries_keepsPremiumVisibleOrderAndCapsTheList() {
		Location base = location(UUID.randomUUID(), "base-salon", "BASE");
		Location first = location(UUID.randomUUID(), "alfa", "PREMIUM");
		Location second = location(UUID.randomUUID(), "beta", "PREMIUM");
		when(locationRepository.findSponsoredVisibleLocations()).thenReturn(List.of(base, first, second));
		when(reviewRepository.summarizeRatingsByLocationIds(anyList())).thenReturn(List.of());

		var results = service.sponsoredPlacementSummaries(1);

		assertThat(results).extracting("slug").containsExactly("alfa");
		@SuppressWarnings("unchecked")
		ArgumentCaptor<List<UUID>> ids = ArgumentCaptor.forClass(List.class);
		verify(reviewRepository).summarizeRatingsByLocationIds(ids.capture());
		assertThat(ids.getValue()).containsExactly(first.getId());
	}

	@Test
	void sponsoredPlacementSummaries_emptyWhenNoneAreMarked() {
		when(locationRepository.findSponsoredVisibleLocations()).thenReturn(List.of());

		assertThat(service.sponsoredPlacementSummaries(20)).isEmpty();
		verify(reviewRepository, never()).summarizeRatingsByLocationIds(anyList());
	}

	private static Location location(UUID id, String slug, String planTier) {
		StudioGroup group = new StudioGroup("Gruppo", "owner@example.com", planTier, "sub");
		Location loc = new Location(group, slug, "Salone " + slug, "Roma");
		ReflectionTestUtils.setField(loc, "id", id);
		loc.setSponsoredPlacement(true);
		return loc;
	}
}
