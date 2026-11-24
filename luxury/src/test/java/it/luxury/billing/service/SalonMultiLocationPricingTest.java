package it.luxury.billing.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SalonMultiLocationPricingTest {

	@Test
	void unitPriceFollowsLocationBracket() {
		assertThat(SalonMultiLocationPricing.unitAmountCents(1)).isEqualTo(4_000);
		assertThat(SalonMultiLocationPricing.unitAmountCents(2)).isEqualTo(3_500);
		assertThat(SalonMultiLocationPricing.unitAmountCents(3)).isEqualTo(3_000);
		assertThat(SalonMultiLocationPricing.unitAmountCents(4)).isEqualTo(3_000);
	}

	@Test
	void monthlyTotalIsUnitTimesLocations() {
		assertThat(SalonMultiLocationPricing.monthlyTotalCents(1)).isEqualTo(4_000);
		assertThat(SalonMultiLocationPricing.monthlyTotalCents(2)).isEqualTo(7_000);
		assertThat(SalonMultiLocationPricing.monthlyTotalCents(3)).isEqualTo(9_000);
		assertThat(SalonMultiLocationPricing.monthlyTotalCents(5)).isEqualTo(15_000);
	}

	@Test
	void rejectsCountOutsideRange() {
		assertThatThrownBy(() -> SalonMultiLocationPricing.requireCount(0)).isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> SalonMultiLocationPricing.requireCount(21)).isInstanceOf(IllegalArgumentException.class);
	}
}
