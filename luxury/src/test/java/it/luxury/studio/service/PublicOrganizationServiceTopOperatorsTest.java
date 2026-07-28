package it.luxury.studio.service;

import it.luxury.billing.service.SalonPremiumEntitlementService;
import it.luxury.catalog.domain.SalonServiceRepository;
import it.luxury.catalog.domain.StaffOperator;
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
class PublicOrganizationServiceTopOperatorsTest {

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
	void topRatedOperatorSummaries_ordersByCurrentMonthStaffReviewsForVertical() {
		UUID topId = UUID.randomUUID();
		UUID midId = UUID.randomUUID();
		Location hairLoc = premiumLocation(UUID.randomUUID(), "hair-salon");
		StaffOperator top = premiumOperator(topId, hairLoc, "Maria Rossi", "Parrucchiera");
		StaffOperator mid = premiumOperator(midId, hairLoc, "Luca Bianchi", "Barbiere");
		when(locationRepository.findPremiumLocationsDeclaringBusinessTypeCode("HAIR")).thenReturn(List.of(hairLoc));
		when(reviewRepository.summarizeStaffRatingsByOperatorForLocationIdsInDateRange(anyList(), any(), any()))
				.thenReturn(List.<Object[]>of(
						new Object[] { topId, 4.9d, 18L },
						new Object[] { midId, 4.7d, 25L }));
		when(staffOperatorRepository.findFetchedByIdIn(anyList())).thenReturn(List.of(top, mid));

		var results = service.topRatedOperatorSummaries("parrucchieri", 10);

		assertThat(results).extracting("displayName").containsExactly("Maria Rossi", "Luca Bianchi");
		assertThat(results.get(0).averageStaffRating()).isEqualTo(4.9);
		assertThat(results.get(0).staffReviewCount()).isEqualTo(18);
		assertThat(results.get(0).salonSlug()).isEqualTo("hair-salon");
	}

	@Test
	void topRatedOperatorSummaries_queriesEuropeRomeCalendarMonthForVerticalLocations() {
		UUID operatorId = UUID.randomUUID();
		Location loc = premiumLocation(UUID.randomUUID(), "salone-a");
		StaffOperator operator = premiumOperator(operatorId, loc, "Anna Verdi", "Parrucchiera");
		when(locationRepository.findPremiumLocationsDeclaringBusinessTypeCode("HAIR")).thenReturn(List.of(loc));
		when(reviewRepository.summarizeStaffRatingsByOperatorForLocationIdsInDateRange(anyList(), any(), any()))
				.thenReturn(List.<Object[]>of(new Object[] { operatorId, 5.0d, 3L }));
		when(staffOperatorRepository.findFetchedByIdIn(anyList())).thenReturn(List.of(operator));

		service.topRatedOperatorSummaries("parrucchieri", 10);

		ArgumentCaptor<Instant> fromCaptor = ArgumentCaptor.forClass(Instant.class);
		ArgumentCaptor<Instant> toCaptor = ArgumentCaptor.forClass(Instant.class);
		verify(reviewRepository)
				.summarizeStaffRatingsByOperatorForLocationIdsInDateRange(anyList(), fromCaptor.capture(), toCaptor.capture());

		YearMonth ym = YearMonth.now(ROME);
		Instant expectedFrom = ym.atDay(1).atStartOfDay(ROME).toInstant();
		Instant expectedTo = ym.plusMonths(1).atDay(1).atStartOfDay(ROME).toInstant();
		assertThat(fromCaptor.getValue()).isEqualTo(expectedFrom);
		assertThat(toCaptor.getValue()).isEqualTo(expectedTo);
	}

	@Test
	void topRatedOperatorSummaries_fillsFromAllTimeWhenMonthlyPoolIsSmallerThanCap() {
		UUID monthlyId = UUID.randomUUID();
		UUID legacyId = UUID.randomUUID();
		Location hairLoc = premiumLocation(UUID.randomUUID(), "hair-salon");
		StaffOperator monthly = premiumOperator(monthlyId, hairLoc, "Mario Nuovo", "Parrucchiere");
		StaffOperator legacy = premiumOperator(legacyId, hairLoc, "Luigi Storico", "Parrucchiere");
		when(locationRepository.findPremiumLocationsDeclaringBusinessTypeCode("HAIR")).thenReturn(List.of(hairLoc));
		when(reviewRepository.summarizeStaffRatingsByOperatorForLocationIdsInDateRange(anyList(), any(), any()))
				.thenReturn(List.<Object[]>of(new Object[] { monthlyId, 5.0d, 2L }));
		when(reviewRepository.summarizeStaffRatingsByOperatorForLocationIds(anyList()))
				.thenReturn(List.<Object[]>of(
						new Object[] { monthlyId, 4.8d, 12L },
						new Object[] { legacyId, 4.7d, 30L }));
		when(staffOperatorRepository.findFetchedByIdIn(anyList())).thenReturn(List.of(monthly, legacy));

		var results = service.topRatedOperatorSummaries("parrucchieri", 10);

		assertThat(results).extracting("displayName").containsExactly("Mario Nuovo", "Luigi Storico");
		assertThat(results.get(0).averageStaffRating()).isEqualTo(5.0);
		assertThat(results.get(1).averageStaffRating()).isEqualTo(4.7);
	}

	@Test
	void topRatedOperatorSummaries_fallsBackToAllTimeWhenNoMonthlyReviews() {
		UUID operatorId = UUID.randomUUID();
		Location loc = premiumLocation(UUID.randomUUID(), "legacy-salon");
		StaffOperator operator = premiumOperator(operatorId, loc, "Paolo Neri", "Massaggiatore");
		when(locationRepository.findPremiumLocationsDeclaringBusinessTypeCode("MASSAGE")).thenReturn(List.of(loc));
		when(reviewRepository.summarizeStaffRatingsByOperatorForLocationIdsInDateRange(anyList(), any(), any()))
				.thenReturn(List.of());
		when(reviewRepository.summarizeStaffRatingsByOperatorForLocationIds(anyList()))
				.thenReturn(List.<Object[]>of(new Object[] { operatorId, 4.8d, 40L }));
		when(staffOperatorRepository.findFetchedByIdIn(anyList())).thenReturn(List.of(operator));

		var results = service.topRatedOperatorSummaries("massaggi", 10);

		assertThat(results).hasSize(1);
		assertThat(results.get(0).displayName()).isEqualTo("Paolo Neri");
		assertThat(results.get(0).averageStaffRating()).isEqualTo(4.8);
		verify(reviewRepository).summarizeStaffRatingsByOperatorForLocationIds(anyList());
	}

	@Test
	void topRatedOperatorSummaries_skipsNonPremiumSalons() {
		UUID premiumId = UUID.randomUUID();
		Location premiumLoc = premiumLocation(UUID.randomUUID(), "premium-salon");
		StaffOperator premium = premiumOperator(premiumId, premiumLoc, "Sara Blu", "Parrucchiera");
		when(locationRepository.findPremiumLocationsDeclaringBusinessTypeCode("HAIR")).thenReturn(List.of(premiumLoc));
		when(reviewRepository.summarizeStaffRatingsByOperatorForLocationIdsInDateRange(anyList(), any(), any()))
				.thenReturn(List.<Object[]>of(new Object[] { premiumId, 4.5d, 10L }));
		when(staffOperatorRepository.findFetchedByIdIn(anyList())).thenReturn(List.of(premium));

		var results = service.topRatedOperatorSummaries("parrucchieri", 10);

		assertThat(results).extracting("displayName").containsExactly("Sara Blu");
	}

	@Test
	void topRatedOperatorSummaries_unknownSalonKind_returnsEmpty() {
		assertThat(service.topRatedOperatorSummaries("unknown", 10)).isEmpty();
	}

	private static StaffOperator premiumOperator(UUID id, Location loc, String displayName, String role) {
		StaffOperator operator = new StaffOperator(loc, displayName);
		ReflectionTestUtils.setField(operator, "id", id);
		ReflectionTestUtils.setField(operator, "role", role);
		return operator;
	}

	private static Location premiumLocation(UUID id, String slug) {
		StudioGroup group = new StudioGroup("Gruppo", "owner@example.com", "PREMIUM", "sub");
		Location loc = new Location(group, slug, "Salone " + slug, "Citta");
		ReflectionTestUtils.setField(loc, "id", id);
		return loc;
	}
}
