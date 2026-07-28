package it.luxury.catalog.domain;

import java.util.Collection;
import java.util.List;

public interface SalonServiceRepositoryCustom {

	/**
	 * Servizi di sedi premium il cui nome o descrizione contiene almeno una delle parole chiave (OR).
	 * Una sola query al posto di N chiamate a {@link SalonServiceRepository#findCatalogRowsMatchingText}.
	 */
	List<SalonService> findPremiumCatalogRowsMatchingAnyKeyword(Collection<String> keywords);
}
