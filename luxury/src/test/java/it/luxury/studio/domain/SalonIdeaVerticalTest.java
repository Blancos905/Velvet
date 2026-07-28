package it.luxury.studio.domain;

import org.junit.jupiter.api.Test;

import java.util.EnumSet;

import static org.assertj.core.api.Assertions.assertThat;

class SalonIdeaVerticalTest {

	@Test
	void fromQueryParam_acceptsMassaggiFisioAlias() {
		assertThat(SalonIdeaVertical.fromQueryParam("massaggi-fisio")).contains(SalonIdeaVertical.MASSAGGI);
		assertThat(SalonIdeaVertical.fromQueryParam("massaggi")).contains(SalonIdeaVertical.MASSAGGI);
	}

	@Test
	void linkedSalonBusinessType_alignsWithRegistrationCodes() {
		assertThat(SalonIdeaVertical.PARRUCCHIERI.linkedSalonBusinessType()).isEqualTo(SalonBusinessType.HAIR);
		assertThat(SalonIdeaVertical.ESTETISTI.linkedSalonBusinessType()).isEqualTo(SalonBusinessType.BEAUTY);
		assertThat(SalonIdeaVertical.MASSAGGI.linkedSalonBusinessType()).isEqualTo(SalonBusinessType.MASSAGE);
	}

	@Test
	void inferSalonBusinessTypesFromUserQuery_matchesVerticalKeywords() {
		assertThat(SalonIdeaVertical.inferSalonBusinessTypesFromUserQuery("taglio uomo a Milano"))
				.isEqualTo(EnumSet.of(SalonBusinessType.HAIR));
		assertThat(SalonIdeaVertical.inferSalonBusinessTypesFromUserQuery("trattamento viso"))
				.isEqualTo(EnumSet.of(SalonBusinessType.BEAUTY));
		assertThat(SalonIdeaVertical.inferSalonBusinessTypesFromUserQuery("fisioterapia spalla"))
				.isEqualTo(EnumSet.of(SalonBusinessType.MASSAGE));
	}
}
