package it.luxury.publicapi.dto;

import it.luxury.publicapi.dto.PublicDtos.SiblingLocationDto;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Sedi sorelle di un salone multisede: stesso studio, esclusa la sede aperta.
 * Vale per qualsiasi numero di sedi (2, 3, …), non per un salone specifico.
 */
public final class SalonSiblingLocations {

	private SalonSiblingLocations() {
	}

	public record Candidate(UUID id, String slug, String name, String city, String addressLine) {
	}

	public static List<SiblingLocationDto> others(UUID currentId, List<Candidate> locations) {
		if (currentId == null || locations == null || locations.isEmpty()) {
			return List.of();
		}
		return locations.stream()
				.filter(candidate -> candidate != null && candidate.id() != null && !currentId.equals(candidate.id()))
				.filter(candidate -> !blank(candidate.slug()))
				.sorted(Comparator
						.comparing((Candidate candidate) -> sortKey(candidate.city()))
						.thenComparing(candidate -> sortKey(candidate.addressLine()))
						.thenComparing(candidate -> sortKey(candidate.name()))
						.thenComparing(candidate -> candidate.slug().trim().toLowerCase(Locale.ROOT)))
				.map(candidate -> new SiblingLocationDto(
						candidate.slug().trim(),
						emptyToNull(candidate.name()),
						emptyToNull(candidate.city()),
						emptyToNull(candidate.addressLine())))
				.toList();
	}

	private static String sortKey(String value) {
		String trimmed = emptyToNull(value);
		return trimmed == null ? "" : trimmed.toLowerCase(Locale.ROOT);
	}

	private static boolean blank(String value) {
		return value == null || value.isBlank();
	}

	private static String emptyToNull(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim().replaceAll("\\s+", " ");
		return trimmed.isEmpty() ? null : trimmed;
	}
}
