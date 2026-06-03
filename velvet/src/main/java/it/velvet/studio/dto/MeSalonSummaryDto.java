package it.velvet.studio.dto;

import java.util.List;
import java.util.UUID;

/**
 * Risposta {@code GET /api/v1/me/salon}: piano e nome salone da registrazione ({@code studio_groups.name}),
 * più slug prima sede (ordinamento nome) per deep link.
 */
public record MeSalonSummaryDto(
		boolean provisioned,
		String planTier,
		/** Nome commerciale inserito in registrazione (campo JSON invariato: {@code primaryLocationName}). */
		String primaryLocationName,
		String primaryLocationSlug,
		/** Prima sede: stesso UUID usato in {@code X-Location-Id} per API catalogo clienti / staff. */
		UUID primaryLocationId,
		/** Città della prima sede (ordinamento nome), per mappa e vetrina. */
		String primaryLocationCity,
		/** CAP della prima sede, utile per ricerca localizzata e geocoding. */
		String primaryLocationPostalCode,
		/** Indirizzo della prima sede, se valorizzato in anagrafica sede. */
		String primaryLocationAddressLine,
		/** Pubblico di riferimento prima sede ({@code MALE} / {@code FEMALE}); vuoto se legacy non valorizzato. */
		List<String> primaryLocationSalonClientGenders,
		/** Apertura sede (minuti da mezzanotte locale); finestra agenda prenotazioni cliente. */
		Integer primaryLocationOpeningMinuteOfDay,
		/** Chiusura sede (minuti da mezzanotte locale). */
		Integer primaryLocationClosingMinuteOfDay,
		/** {@code true} se piano Premium e PIN statistiche configurato in registrazione. */
		boolean statisticsPinRequired) {

	public static MeSalonSummaryDto notProvisioned() {
		return new MeSalonSummaryDto(false, null, null, null, null, null, null, null, null, null, null, false);
	}
}
