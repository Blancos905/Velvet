package it.luxury.publicapi.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PostalCodeFormatsTest {

	@Test
	void italyExactFiveDigits() {
		assertThat(PostalCodeFormats.exactDigitLength("IT")).isEqualTo(5);
		assertThat(PostalCodeFormats.normalizeForLookup("20121", "IT"))
				.hasValueSatisfying(p -> {
					assertThat(p.value()).isEqualTo("20121");
					assertThat(p.freeform()).isFalse();
				});
		assertThat(PostalCodeFormats.normalizeForLookup("2012", "IT")).isEmpty();
	}

	@Test
	void switzerlandFourDigits() {
		assertThat(PostalCodeFormats.normalizeForLookup("8001", "CH"))
				.hasValueSatisfying(p -> assertThat(p.value()).isEqualTo("8001"));
	}

	@Test
	void germanyFiveDigits() {
		assertThat(PostalCodeFormats.normalizeForLookup("10115", "DE"))
				.hasValueSatisfying(p -> assertThat(p.value()).isEqualTo("10115"));
	}

	@Test
	void franceStripsSpaces() {
		assertThat(PostalCodeFormats.normalizeForLookup("75 001", "FR"))
				.hasValueSatisfying(p -> assertThat(p.value()).isEqualTo("75001"));
	}

	@Test
	void portugalAcceptsFourOrSeven() {
		assertThat(PostalCodeFormats.normalizeForLookup("1000", "PT"))
				.hasValueSatisfying(p -> assertThat(p.value()).isEqualTo("1000"));
		assertThat(PostalCodeFormats.normalizeForLookup("1000-001", "PT"))
				.hasValueSatisfying(p -> assertThat(p.value()).isEqualTo("1000001"));
	}

	@Test
	void ukFreeformKeepsLetters() {
		assertThat(PostalCodeFormats.isFreeform("GB")).isTrue();
		assertThat(PostalCodeFormats.normalizeForLookup("sw1a 1aa", "GB"))
				.hasValueSatisfying(p -> {
					assertThat(p.value()).isEqualTo("SW1A 1AA");
					assertThat(p.freeform()).isTrue();
				});
		assertThat(PostalCodeFormats.normalizeForLookup("SW", "GB")).isEmpty();
	}

	@Test
	void netherlandsFreeform() {
		assertThat(PostalCodeFormats.normalizeForLookup("1012 AB", "NL"))
				.hasValueSatisfying(p -> assertThat(p.value()).isEqualTo("1012 AB"));
	}

	@Test
	void usZipPlus4UsesFirstFive() {
		assertThat(PostalCodeFormats.normalizeForLookup("10001-1234", "US"))
				.hasValueSatisfying(p -> assertThat(p.value()).isEqualTo("10001"));
	}

	@Test
	void suggestPrefixRequiresTwoChars() {
		assertThat(PostalCodeFormats.normalizeForSuggestPrefix("2", "IT")).isEmpty();
		assertThat(PostalCodeFormats.normalizeForSuggestPrefix("20", "IT")).contains("20");
		assertThat(PostalCodeFormats.normalizeForSuggestPrefix("sw", "GB")).contains("SW");
	}

	@Test
	void invalidCountryRejected() {
		assertThat(PostalCodeFormats.normalizeCountry("ITA")).isEmpty();
		assertThat(PostalCodeFormats.normalizeCountry("it")).contains("IT");
	}
}
