package it.luxury.studio.domain;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Espande le query dei tasti rapidi home («Oppure un tocco») in parole cercate nel listino servizi (nome o
 * descrizione) e nel pubblico di riferimento del salone. Allineato a {@code QUICK_SUGGEST_GROUPS} nel frontend.
 */
public final class SalonQuickSearchCatalogHints {

	private static final Map<String, List<String>> BY_NORMALIZED_QUERY = buildCatalogNeedles();
	private static final Map<String, List<String>> CLIENT_GENDERS_BY_QUERY = buildClientGenders();

	private SalonQuickSearchCatalogHints() {
	}

	public static List<String> catalogNeedlesForQuery(String raw) {
		if (raw == null || raw.isBlank()) {
			return List.of();
		}
		String key = normalize(raw);
		List<String> mapped = BY_NORMALIZED_QUERY.get(key);
		if (mapped != null && !mapped.isEmpty()) {
			return List.copyOf(mapped);
		}
		return List.of(raw.trim());
	}

	/** Codici {@link SalonClientGender} per query rapide con pubblico implicito (es. taglio donna → FEMALE). */
	public static List<String> clientGendersForQuery(String raw) {
		if (raw == null || raw.isBlank()) {
			return List.of();
		}
		List<String> mapped = CLIENT_GENDERS_BY_QUERY.get(normalize(raw));
		if (mapped == null || mapped.isEmpty()) {
			return List.of();
		}
		return List.copyOf(mapped);
	}

	/** Query dei tasti rapidi home: la ricerca deve basarsi sul listino servizi, non su nome/città/tipologia. */
	public static boolean hasQuickTapCatalogIntent(String raw) {
		if (raw == null || raw.isBlank()) {
			return false;
		}
		return BY_NORMALIZED_QUERY.containsKey(normalize(raw));
	}

	/**
	 * True se il nome servizio è già coperto da un tasto curato «Oppure un tocco» (query o needle ≥ 4 caratteri).
	 * I servizi non coperti possono comparire come tag dinamici vicino all'utente.
	 */
	public static boolean isCoveredByCuratedQuickSuggest(String serviceName) {
		if (serviceName == null || serviceName.isBlank()) {
			return true;
		}
		String ns = normalize(serviceName);
		if (BY_NORMALIZED_QUERY.containsKey(ns)) {
			return true;
		}
		for (Map.Entry<String, List<String>> entry : BY_NORMALIZED_QUERY.entrySet()) {
			String curatedQ = entry.getKey();
			if (ns.contains(curatedQ) || curatedQ.contains(ns)) {
				return true;
			}
			for (String needle : entry.getValue()) {
				String nn = normalize(needle);
				if (nn.length() < 4) {
					continue;
				}
				if (ns.contains(nn) || nn.contains(ns)) {
					return true;
				}
			}
		}
		return false;
	}

	private static String normalize(String raw) {
		return raw.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
	}

	private static Map<String, List<String>> buildCatalogNeedles() {
		Map<String, List<String>> map = new LinkedHashMap<>();
		map.put("taglio donna", List.of("taglio donna", "piega", "donna"));
		map.put("taglio uomo", List.of("taglio uomo", "taglio", "uomo", "barbiere", "barba"));
		map.put("barbiere", List.of("barbiere", "barba", "rasatura", "baffi"));
		map.put("colore capelli", List.of("colore capelli", "colore", "mèche", "meche", "balayage", "shatush", "riflessi"));
		map.put("piega", List.of("piega", "brushing", "taglio e piega"));
		map.put("keratina", List.of("keratina", "liscio", "lisciante", "tissage"));
		map.put("acconciatura sposa", List.of("acconciatura sposa", "acconciatura", "sposa", "chignon"));
		map.put("massaggio relax", List.of("massaggio relax", "massaggio rilassante", "relax"));
		map.put("massaggio decontratturante", List.of("massaggio decontratturante", "decontratturante"));
		map.put("massaggio sportivo", List.of("massaggio sportivo", "sportivo"));
		map.put("fisioterapia", List.of("fisioterapia"));
		map.put("osteopatia", List.of("osteopatia"));
		map.put("linfodrenaggio", List.of("linfodrenaggio", "massaggio linfatico"));
		map.put("riflessologia plantare", List.of("riflessologia plantare", "riflessologia", "plantare"));
		map.put("riabilitazione", List.of("riabilitazione"));
		map.put("trattamento viso", List.of("trattamento viso", "viso"));
		map.put("pulizia viso", List.of("pulizia viso", "pulizia", "peeling"));
		map.put("unghie", List.of("unghie", "manicure", "semipermanente", "nail"));
		map.put("depilazione", List.of("depilazione"));
		map.put("epilazione laser", List.of("epilazione laser", "epilazione", "laser"));
		map.put("trucco", List.of("trucco", "make-up", "makeup"));
		map.put("extension ciglia", List.of("extension ciglia", "ciglia", "extension"));
		map.put("solarium", List.of("solarium"));
		map.put("trattamento corpo", List.of("trattamento corpo", "scrub", "massaggio corpo"));
		return Map.copyOf(map);
	}

	private static Map<String, List<String>> buildClientGenders() {
		Map<String, List<String>> map = new LinkedHashMap<>();
		map.put("taglio donna", List.of(SalonClientGender.FEMALE.name()));
		map.put("taglio uomo", List.of(SalonClientGender.MALE.name()));
		map.put("barbiere", List.of(SalonClientGender.MALE.name()));
		map.put("acconciatura sposa", List.of(SalonClientGender.FEMALE.name()));
		for (String q : List.of(
				"trattamento viso",
				"pulizia viso",
				"unghie",
				"depilazione",
				"epilazione laser",
				"trucco",
				"extension ciglia",
				"solarium",
				"trattamento corpo")) {
			map.put(q, List.of(SalonClientGender.FEMALE.name()));
		}
		return Map.copyOf(map);
	}

	public static List<String> registeredQuickSearchQueries() {
		return new ArrayList<>(BY_NORMALIZED_QUERY.keySet());
	}
}
