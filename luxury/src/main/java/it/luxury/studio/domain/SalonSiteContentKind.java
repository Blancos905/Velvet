package it.luxury.studio.domain;

import it.luxury.common.api.BusinessException;
import org.springframework.http.HttpStatus;

/**
 * Tipologia di contenuto vetrina/sito salvato lato server per una sede (slug).
 */
public enum SalonSiteContentKind {

	/** Blocco vetrina brand (logo, carosello, foto servizi, gallery "Esplora", layout pubblico). */
	SHOWCASE,

	/** Pagina personale del salone (hero, gallery, testi). */
	PERSONAL_PAGE;

	/** Token usato nelle URL pubbliche/owner: {@code showcase} oppure {@code personal-page}. */
	public String token() {
		return name().toLowerCase().replace('_', '-');
	}

	public static SalonSiteContentKind fromToken(String raw) {
		String normalized = raw == null ? "" : raw.trim().toLowerCase().replace('-', '_');
		for (SalonSiteContentKind kind : values()) {
			if (kind.name().toLowerCase().equals(normalized)) {
				return kind;
			}
		}
		throw new BusinessException(
				HttpStatus.BAD_REQUEST,
				"VALIDATION_ERROR",
				"Tipo di contenuto vetrina non valido: usa 'showcase' o 'personal-page'.");
	}
}
