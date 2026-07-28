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

import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublicOrganizationServiceMonthlyIdeaTest {

	private static final ZoneId ROME = ZoneId.of("Europe/Rome");

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
		lenient()
				.when(salonServiceRepository.findPremiumCatalogRowsMatchingAnyKeyword(anyList()))
				.thenReturn(List.of());
	}

	@Test
	void monthlyIdeaSummaries_ordersByCurrentMonthReviews() {
		Location top = premiumLocation(UUID.randomUUID(), "top-estetica");
		Location mid = premiumLocation(UUID.randomUUID(), "mid-estetica");
		Location quiet = premiumLocation(UUID.randomUUID(), "quiet-estetica");
		when(locationRepository.findPremiumLocationsDeclaringBusinessTypeCode("BEAUTY"))
				.thenReturn(List.of(top, mid, quiet));
		when(reviewRepository.summarizeRatingsByLocationIdsAndCreatedAtRange(anyList(), any(), any()))
				.thenReturn(List.<Object[]>of(
						new Object[] { top.getId(), 4.9d, 12L },
						new Object[] { mid.getId(), 4.7d, 20L },
						new Object[] { quiet.getId(), 3.5d, 2L }));

		var results = service.monthlyIdeaSummaries("", "estetisti", 5);

		assertThat(results).extracting("slug").containsExactly("top-estetica", "mid-estetica", "quiet-estetica");
		assertThat(results.get(0).averageRating()).isEqualTo(4.9);
		assertThat(results.get(0).reviewCount()).isEqualTo(12);
	}

	@Test
	void monthlyIdeaSummaries_queriesEuropeRomeCalendarMonth() {
		Location loc = premiumLocation(UUID.randomUUID(), "estetica-roma");
		when(locationRepository.findPremiumLocationsDeclaringBusinessTypeCode("BEAUTY")).thenReturn(List.of(loc));
		when(reviewRepository.summarizeRatingsByLocationIdsAndCreatedAtRange(anyList(), any(), any()))
				.thenReturn(List.<Object[]>of(new Object[] { loc.getId(), 5.0d, 1L }));

		service.monthlyIdeaSummaries("", "estetisti", 5);

		ArgumentCaptor<Instant> fromCaptor = ArgumentCaptor.forClass(Instant.class);
		ArgumentCaptor<Instant> toCaptor = ArgumentCaptor.forClass(Instant.class);
		verify(reviewRepository)
				.summarizeRatingsByLocationIdsAndCreatedAtRange(anyList(), fromCaptor.capture(), toCaptor.capture());

		YearMonth ym = YearMonth.now(ROME);
		Instant expectedFrom = ym.atDay(1).atStartOfDay(ROME).toInstant();
		Instant expectedTo = ym.plusMonths(1).atDay(1).atStartOfDay(ROME).toInstant();
		assertThat(fromCaptor.getValue()).isEqualTo(expectedFrom);
		assertThat(toCaptor.getValue()).isEqualTo(expectedTo);
	}

	@Test
	void monthlyIdeaSummaries_fallsBackToAllTimeWhenNoMonthlyReviews() {
		Location legacy = premiumLocation(UUID.randomUUID(), "legacy-best");
		when(locationRepository.findPremiumLocationsDeclaringBusinessTypeCode("BEAUTY")).thenReturn(List.of(legacy));
		when(reviewRepository.summarizeRatingsByLocationIdsAndCreatedAtRange(anyList(), any(), any()))
				.thenReturn(List.of());
		when(reviewRepository.summarizeRatingsByLocationIds(anyList()))
				.thenReturn(List.<Object[]>of(new Object[] { legacy.getId(), 4.8d, 40L }));

		var results = service.monthlyIdeaSummaries("", "estetisti", 5);

		assertThat(results).hasSize(1);
		assertThat(results.get(0).slug()).isEqualTo("legacy-best");
		assertThat(results.get(0).averageRating()).isEqualTo(4.8);
		assertThat(results.get(0).reviewCount()).isEqualTo(40);
		verify(reviewRepository).summarizeRatingsByLocationIds(anyList());
	}

	private static Location premiumLocation(UUID id, String slug) {
		StudioGroup group = new StudioGroup("Gruppo", "owner@example.com", "PREMIUM", "sub");
		Location loc = new Location(group, slug, "Salone " + slug, "Citta");
		ReflectionTestUtils.setField(loc, "id", id);
		return loc;
	}
}
