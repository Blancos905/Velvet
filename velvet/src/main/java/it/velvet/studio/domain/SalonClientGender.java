package it.velvet.studio.domain;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Pubblico di riferimento del salone (registrazione /piani). Persistenza: CSV ordinato su {@link Location}.
 */
public enum SalonClientGender {
	MALE,
	FEMALE;

	public static List<SalonClientGender> parseList(List<String> raw) {
		if (raw == null || raw.isEmpty()) {
			return List.of();
		}
		EnumSet<SalonClientGender> acc = EnumSet.noneOf(SalonClientGender.class);
		for (String s : raw) {
			if (s == null) {
				continue;
			}
			String u = s.trim().toUpperCase(Locale.ROOT);
			if (u.isEmpty()) {
				continue;
			}
			try {
				acc.add(SalonClientGender.valueOf(u));
			}
			catch (IllegalArgumentException ex) {
				throw new IllegalArgumentException("Pubblico non valido: " + s.trim());
			}
		}
		return acc.stream().sorted(Comparator.comparing(Enum::name)).toList();
	}

	public static Set<SalonClientGender> parseCsv(String raw) {
		if (raw == null || raw.isBlank()) {
			return Set.of();
		}
		EnumSet<SalonClientGender> acc = EnumSet.noneOf(SalonClientGender.class);
		for (String part : raw.split(",")) {
			if (part == null) {
				continue;
			}
			String u = part.trim().toUpperCase(Locale.ROOT);
			if (u.isEmpty()) {
				continue;
			}
			try {
				acc.add(SalonClientGender.valueOf(u));
			}
			catch (IllegalArgumentException ignored) {
				// ignora codici legacy o corrotti
			}
		}
		return acc;
	}

	public static String toCsv(List<SalonClientGender> genders) {
		if (genders == null || genders.isEmpty()) {
			return null;
		}
		List<SalonClientGender> copy = new ArrayList<>(genders);
		copy.sort(Comparator.comparing(Enum::name));
		return copy.stream().map(Enum::name).collect(Collectors.joining(","));
	}
}
