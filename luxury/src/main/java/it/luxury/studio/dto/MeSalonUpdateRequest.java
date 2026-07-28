package it.luxury.studio.dto;

import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Aggiornamento dati principali salone da area profilo titolare.
 */
public record MeSalonUpdateRequest(
		@Size(max = 200) String primaryLocationName,
		@Size(max = 120) String primaryLocationSlug,
		@Size(max = 120) String primaryLocationCity,
		@Size(max = 20) String primaryLocationPostalCode,
		@Size(max = 500) String primaryLocationAddressLine,
		List<String> primaryLocationSalonClientGenders,
		Integer primaryLocationOpeningMinuteOfDay,
		Integer primaryLocationClosingMinuteOfDay,
		/** Fine fascia mattutina (pausa pranzo); opzionale. */
		Integer primaryLocationMorningEndMinuteOfDay,
		/** Inizio fascia pomeridiana (pausa pranzo); opzionale. */
		Integer primaryLocationAfternoonStartMinuteOfDay,
		/** Giorni di apertura (`MONDAY` … `SUNDAY`). */
		List<String> primaryLocationOpenDays) {
}
