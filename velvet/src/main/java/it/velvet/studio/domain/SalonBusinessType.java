package it.velvet.studio.domain;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Tipologia attività salone (registrazione /piani). Persistenza: CSV ordinato su {@link Location}.
 * Tre macro-aree: parrucchiere, estetica, massaggio/fisioterapia.
 */
public enum SalonBusinessType {
	HAIR,
	BEAUTY,
	MASSAGE;

	/** Normalizza, deduplica, ordina lessicograficamente per CSV stabile. */
	public static List<SalonBusinessType> parseList(List<String> raw) {
		if (raw == null || raw.isEmpty()) {
			return List.of();
		}
		EnumSet<SalonBusinessType> acc = EnumSet.noneOf(SalonBusinessType.class);
		for (String s : raw) {
			if (s == null) {
				continue;
			}
			String u = s.trim().toUpperCase(Locale.ROOT);
			if (u.isEmpty()) {
				continue;
			}
			try {
				acc.add(SalonBusinessType.valueOf(u));
			} catch (IllegalArgumentException ex) {
				throw new IllegalArgumentException("Tipologia non valida: " + s.trim());
			}
		}
		return acc.stream().sorted(Comparator.comparing(Enum::name)).toList();
	}

	/** Parsing tollerante del CSV persistito su {@link Location} (ignora codici legacy o corrotti). */
	public static Set<SalonBusinessType> parseCsv(String raw) {
		if (raw == null || raw.isBlank()) {
			return Set.of();
		}
		EnumSet<SalonBusinessType> acc = EnumSet.noneOf(SalonBusinessType.class);
		for (String part : raw.split(",")) {
			if (part == null) {
				continue;
			}
			String u = part.trim().toUpperCase(Locale.ROOT);
			if (u.isEmpty()) {
				continue;
			}
			try {
				acc.add(SalonBusinessType.valueOf(u));
			}
			catch (IllegalArgumentException ignored) {
				// ignora codici legacy o corrotti
			}
		}
		return acc;
	}

	public static String toCsv(List<SalonBusinessType> types) {
		if (types == null || types.isEmpty()) {
			return null;
		}
		List<SalonBusinessType> copy = new ArrayList<>(types);
		copy.sort(Comparator.comparing(Enum::name));
		return copy.stream().map(Enum::name).collect(Collectors.joining(","));
	}
}
