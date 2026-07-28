package it.luxury.studio.service;

import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.StudioGroup;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SalonLocationGeocodingServiceTest {

	@Test
	void buildGeocodeQuery_joinsAddressPostalCityAndCountry() {
		StudioGroup group = new StudioGroup("Gruppo", "owner@example.com", "PREMIUM", "sub");
		Location loc = new Location(group, "slug", "Salone", "Milano");
		loc.setAddressLine("Via Roma 1");
		loc.setPostalCode("20100");

		assertThat(SalonLocationGeocodingService.buildGeocodeQuery(loc))
				.isEqualTo("Via Roma 1, 20100, Milano, Italia");
	}

	@Test
	void buildGeocodeQueries_fallsBackToCityWhenAddressIsPresent() {
		StudioGroup group = new StudioGroup("Gruppo", "owner@example.com", "PREMIUM", "sub");
		Location loc = new Location(group, "hair-jassa", "Hair Jassa", "Belsito");
		loc.setAddressLine("Contrada Jassa n4");

		assertThat(SalonLocationGeocodingService.buildGeocodeQueries(loc)).containsExactly(
				"Contrada Jassa n4, Belsito, Italia",
				"Belsito, Italia");
	}
}
