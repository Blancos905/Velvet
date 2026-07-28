package it.luxury.studio.service;

import it.luxury.billing.service.SalonPremiumEntitlementService;
import it.luxury.catalog.domain.SalonService;
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
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublicOrganizationServiceGeoSearchTest {

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
		lenient().when(salonPremiumEntitlementService.hasActivePremium(org.mockito.ArgumentMatchers.any()))
				.thenAnswer(inv -> {
					StudioGroup group = inv.getArgument(0);
					return group != null && "PREMIUM".equalsIgnoreCase(group.getPlanTier());
				});
		lenient()
				.when(salonServiceRepository.findPremiumCatalogRowsMatchingAnyKeyword(anyList()))
				.thenReturn(List.of());
	}

	@Test
	void searchWithReviewSummaries_nearOnly_usesAllGeocodedPremiumLocationsInRadius() {
		Location near = premiumLocation("near", 45.4642, 9.19);
		Location far = premiumLocation("far", 41.9028, 12.4964);
		when(locationRepository.findPremiumLocationsWithCoordinates()).thenReturn(List.of(near, far));
		when(reviewRepository.summarizeRatingsByLocationIds(anyList())).thenReturn(List.of());

		var results = service.searchWithReviewSummaries(null, null, 45.4642, 9.19, 40.0, null);

		assertThat(results).hasSize(1);
		assertThat(results.get(0).slug()).isEqualTo("near");
	}

	@Test
	void searchWithReviewSummaries_barbiereQuery_matchesBarbaServiceInCatalog() {
		Location near = premiumLocation("barber", 45.4642, 9.19);
		near.setSalonClientGenders("MALE");
		SalonService beard = new SalonService(near, "Rasatura barba", 30, 2500);
		when(salonServiceRepository.findCatalogRowsMatchingText(eq("barbiere"))).thenReturn(List.of());
		when(salonServiceRepository.findPremiumCatalogRowsMatchingAnyKeyword(anyList())).thenReturn(List.of(beard));
		when(reviewRepository.summarizeRatingsByLocationIds(anyList())).thenReturn(List.of());

		var results = service.searchWithReviewSummaries("barbiere", null, 45.4642, 9.19, 40.0, null);

		assertThat(results).hasSize(1);
		assertThat(results.get(0).slug()).isEqualTo("barber");
	}

	@Test
	void searchWithReviewSummaries_barbiereQuery_ignoresSalonNameWithoutMatchingService() {
		Location near = premiumLocation("barber-name-only", 45.4642, 9.19);
		near.setName("Barbiere Mario");
		when(salonServiceRepository.findCatalogRowsMatchingText(eq("barbiere"))).thenReturn(List.of());
		when(salonServiceRepository.findPremiumCatalogRowsMatchingAnyKeyword(anyList())).thenReturn(List.of());

		var results = service.searchWithReviewSummaries("barbiere", null, 45.4642, 9.19, 40.0, null);

		assertThat(results).isEmpty();
	}

	@Test
	void searchWithReviewSummaries_taglioDonna_excludesMaleOnlySalon() {
		Location maleOnly = premiumLocation("male-only", 45.4642, 9.19);
		maleOnly.setSalonClientGenders("MALE");
		SalonService cut = new SalonService(maleOnly, "Taglio donna", 45, 3500);
		when(salonServiceRepository.findCatalogRowsMatchingText(eq("taglio donna"))).thenReturn(List.of(cut));

		var results = service.searchWithReviewSummaries("taglio donna", null, 45.4642, 9.19, 40.0, List.of("FEMALE"));

		assertThat(results).isEmpty();
	}

	@Test
	void searchWithReviewSummaries_taglioDonna_infersFemaleWhenParamMissing() {
		Location maleOnly = premiumLocation("male-only", 45.4642, 9.19);
		maleOnly.setSalonClientGenders("MALE");
		SalonService cut = new SalonService(maleOnly, "Taglio donna", 45, 3500);
		when(salonServiceRepository.findCatalogRowsMatchingText(eq("taglio donna"))).thenReturn(List.of(cut));

		var results = service.searchWithReviewSummaries("taglio donna", null, 45.4642, 9.19, 40.0, null);

		assertThat(results).isEmpty();
	}

	@Test
	void searchWithReviewSummaries_taglioDonna_excludesSalonWithoutDeclaredClientGender() {
		Location undeclared = premiumLocation("undeclared", 45.4642, 9.19);
		SalonService cut = new SalonService(undeclared, "Taglio donna", 45, 3500);
		when(salonServiceRepository.findCatalogRowsMatchingText(eq("taglio donna"))).thenReturn(List.of(cut));

		var results = service.searchWithReviewSummaries("taglio donna", null, 45.4642, 9.19, 40.0, null);

		assertThat(results).isEmpty();
	}

	@Test
	void searchWithReviewSummaries_taglioDonna_includesFemaleSalonWithMatchingService() {
		Location female = premiumLocation("female-salon", 45.4642, 9.19);
		female.setSalonClientGenders("FEMALE");
		SalonService cut = new SalonService(female, "Taglio donna", 45, 3500);
		when(salonServiceRepository.findCatalogRowsMatchingText(eq("taglio donna"))).thenReturn(List.of(cut));
		when(reviewRepository.summarizeRatingsByLocationIds(anyList())).thenReturn(List.of());

		var results = service.searchWithReviewSummaries("taglio donna", null, 45.4642, 9.19, 40.0, null);

		assertThat(results).hasSize(1);
		assertThat(results.get(0).slug()).isEqualTo("female-salon");
	}

	@Test
	void searchWithReviewSummaries_taglioDonna_includesMixedGenderSalonWithMatchingService() {
		Location mixed = premiumLocation("mixed-salon", 45.4642, 9.19);
		mixed.setSalonClientGenders("FEMALE,MALE");
		SalonService cut = new SalonService(mixed, "Taglio donna", 45, 3500);
		when(salonServiceRepository.findCatalogRowsMatchingText(eq("taglio donna"))).thenReturn(List.of(cut));
		when(reviewRepository.summarizeRatingsByLocationIds(anyList())).thenReturn(List.of());

		var results = service.searchWithReviewSummaries("taglio donna", null, 45.4642, 9.19, 40.0, null);

		assertThat(results).hasSize(1);
		assertThat(results.get(0).slug()).isEqualTo("mixed-salon");
	}

	@Test
	void searchWithReviewSummaries_taglioUomo_excludesFemaleOnlySalon() {
		Location femaleOnly = premiumLocation("female-only", 45.4642, 9.19);
		femaleOnly.setSalonClientGenders("FEMALE");
		SalonService cut = new SalonService(femaleOnly, "Taglio uomo", 30, 2500);
		when(salonServiceRepository.findCatalogRowsMatchingText(eq("taglio uomo"))).thenReturn(List.of(cut));

		var results = service.searchWithReviewSummaries("taglio uomo", null, 45.4642, 9.19, 40.0, null);

		assertThat(results).isEmpty();
	}

	@Test
	void searchWithReviewSummaries_taglioUomo_includesMixedGenderSalonWithGenericTaglioService() {
		Location mixed = premiumLocation("mixed-salon", 45.4642, 9.19);
		mixed.setSalonClientGenders("FEMALE,MALE");
		SalonService cut = new SalonService(mixed, "Taglio", 30, 2500);
		Location barberOnly = premiumLocation("barber-only", 45.4642, 9.191);
		barberOnly.setSalonClientGenders("MALE");
		SalonService beard = new SalonService(barberOnly, "Barba", 20, 1500);
		when(salonServiceRepository.findCatalogRowsMatchingText(eq("taglio uomo"))).thenReturn(List.of());
		when(salonServiceRepository.findCatalogRowsMatchingText(eq("taglio"))).thenReturn(List.of(cut));
		when(salonServiceRepository.findCatalogRowsMatchingText(eq("uomo"))).thenReturn(List.of());
		when(salonServiceRepository.findPremiumCatalogRowsMatchingAnyKeyword(anyList())).thenReturn(List.of(cut, beard));
		when(reviewRepository.summarizeRatingsByLocationIds(anyList())).thenReturn(List.of());

		var results = service.searchWithReviewSummaries("taglio uomo", null, 45.4642, 9.19, 40.0, null);

		assertThat(results).extracting("slug").contains("mixed-salon");
	}

	@Test
	void searchWithReviewSummaries_businessTypeFilter_mixedSalonAppearsForEitherType() {
		Location mixed = premiumLocation("mixed-types", 45.4642, 9.19);
		mixed.setSalonBusinessTypes("BEAUTY,HAIR");
		when(locationRepository.findPremiumLocationsWithCoordinates()).thenReturn(List.of(mixed));
		when(reviewRepository.summarizeRatingsByLocationIds(anyList())).thenReturn(List.of());

		var asHair = service.searchWithReviewSummaries(null, null, 45.4642, 9.19, 40.0, null, List.of("HAIR"));
		assertThat(asHair).extracting("slug").containsExactly("mixed-types");

		var asBeauty = service.searchWithReviewSummaries(null, null, 45.4642, 9.19, 40.0, null, List.of("BEAUTY"));
		assertThat(asBeauty).extracting("slug").containsExactly("mixed-types");
	}

	@Test
	void searchWithReviewSummaries_businessTypeFilter_excludesSalonWithoutRequestedType() {
		Location hairOnly = premiumLocation("hair-only", 45.4642, 9.19);
		hairOnly.setSalonBusinessTypes("HAIR");
		when(locationRepository.findPremiumLocationsWithCoordinates()).thenReturn(List.of(hairOnly));

		var results = service.searchWithReviewSummaries(null, null, 45.4642, 9.19, 40.0, null, List.of("BEAUTY"));

		assertThat(results).isEmpty();
	}

	@Test
	void searchWithReviewSummaries_businessTypeFilter_untypedSalonMatchesHairFilterOnly() {
		Location untyped = premiumLocation("legacy-hair", 45.4642, 9.19);
		when(locationRepository.findPremiumLocationsWithCoordinates()).thenReturn(List.of(untyped));
		when(reviewRepository.summarizeRatingsByLocationIds(anyList())).thenReturn(List.of());

		var asHair = service.searchWithReviewSummaries(null, null, 45.4642, 9.19, 40.0, null, List.of("HAIR"));
		assertThat(asHair).extracting("slug").containsExactly("legacy-hair");

		var asBeauty = service.searchWithReviewSummaries(null, null, 45.4642, 9.19, 40.0, null, List.of("BEAUTY"));
		assertThat(asBeauty).isEmpty();
	}

	@Test
	void searchWithReviewSummaries_businessTypeFilter_orSemanticsAcrossMultipleTypes() {
		Location hairOnly = premiumLocation("hair-only", 45.4642, 9.19);
		hairOnly.setSalonBusinessTypes("HAIR");
		when(locationRepository.findPremiumLocationsWithCoordinates()).thenReturn(List.of(hairOnly));
		when(reviewRepository.summarizeRatingsByLocationIds(anyList())).thenReturn(List.of());

		var results = service.searchWithReviewSummaries(
				null, null, 45.4642, 9.19, 40.0, null, List.of("HAIR", "BEAUTY"));

		assertThat(results).extracting("slug").containsExactly("hair-only");
	}

	private static Location premiumLocation(String slug, double lat, double lng) {
		StudioGroup group = new StudioGroup("Gruppo", "owner@example.com", "PREMIUM", "sub");
		Location loc = new Location(group, slug, "Salone " + slug, "Citta");
		loc.setLatitude(lat);
		loc.setLongitude(lng);
		return loc;
	}
}
