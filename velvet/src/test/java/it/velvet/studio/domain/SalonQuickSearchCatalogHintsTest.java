package it.velvet.studio.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SalonQuickSearchCatalogHintsTest {

	@Test
	void barbiere_expandsToBarbaAndRelatedCatalogNeedles() {
		assertThat(SalonQuickSearchCatalogHints.catalogNeedlesForQuery("Barbiere"))
				.contains("barbiere", "barba", "rasatura", "baffi");
	}

	@Test
	void taglioDonna_infersFemaleClientGender() {
		assertThat(SalonQuickSearchCatalogHints.clientGendersForQuery("taglio donna"))
				.containsExactly(SalonClientGender.FEMALE.name());
	}

	@Test
	void taglioUomo_expandsToTaglioAndRelatedCatalogNeedles() {
		assertThat(SalonQuickSearchCatalogHints.catalogNeedlesForQuery("taglio uomo"))
				.contains("taglio uomo", "taglio", "uomo", "barbiere", "barba");
	}

	@Test
	void taglioUomo_infersMaleClientGender() {
		assertThat(SalonQuickSearchCatalogHints.clientGendersForQuery("taglio uomo"))
				.containsExactly(SalonClientGender.MALE.name());
	}

	@Test
	void trucco_infersFemaleClientGender() {
		assertThat(SalonQuickSearchCatalogHints.clientGendersForQuery("trucco"))
				.containsExactly(SalonClientGender.FEMALE.name());
	}

	@Test
	void piega_hasNoImplicitClientGender() {
		assertThat(SalonQuickSearchCatalogHints.clientGendersForQuery("piega")).isEmpty();
	}

	@Test
	void hasQuickTapCatalogIntent_recognizesQuickSuggestQueries() {
		assertThat(SalonQuickSearchCatalogHints.hasQuickTapCatalogIntent("barbiere")).isTrue();
		assertThat(SalonQuickSearchCatalogHints.hasQuickTapCatalogIntent("studio anna")).isFalse();
	}

	@Test
	void unmappedQuery_returnsSingleNeedle() {
		assertThat(SalonQuickSearchCatalogHints.catalogNeedlesForQuery("  servizio custom "))
				.containsExactly("servizio custom");
	}

	@Test
	void registeredQueries_coverQuickSuggestGroups() {
		assertThat(SalonQuickSearchCatalogHints.registeredQuickSearchQueries())
				.contains("taglio uomo", "barbiere", "trattamento viso", "massaggio relax");
	}
}
