package it.luxury.studio.domain;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * Verticali allineate alle card «Idee» sulla home: filtriamo i saloni premium guardando parole nel listino servizi,
 * così i parrucchieri non compaiono tra gli estetisti e viceversa.
 */
public enum SalonIdeaVertical {

	ESTETISTI(
			"estetisti",
			List.of(
					"viso",
					"estetista",
					"estetica",
					"manicure",
					"unghie",
					"nail",
					"trucco",
					"make-up",
					"makeup",
					"ciglia",
					"extension",
					"depilazione",
					"epilazione",
					"laser",
					"scrub",
					"solarium",
					"sopracciglia",
					"microblading",
					"peeling",
					"dermapen",
					"pulizia",
					"massaggio viso",
					"massaggio corpo")),

	PARRUCCHIERI(
			"parrucchieri",
			List.of(
					"taglio",
					"piega",
					"barbiere",
					"barba",
					"colore",
					"mèche",
					"meche",
					"shatush",
					"balayage",
					"keratina",
					"permanente",
					"acconciatura",
					"capelli",
					"parrucchiere",
					"brushing",
					"lisciante",
					"tissage")),

	MASSAGGI(
			"massaggi",
			List.of(
					"massaggio relax",
					"massaggio decontratturante",
					"massaggio rilassante",
					"massaggio sportivo",
					"massaggio terapeutico",
					"massaggio linfatico",
					"relax",
					"spa",
					"benessere",
					"decontratturante",
					"linfodrenaggio",
					"fisioterapia",
					"osteopatia",
					"riflessologia",
					"shiatsu",
					"ayurveda",
					"terme",
					"hammam",
					"sauna",
					"riabilitazione"));

	private final String queryParamValue;
	private final List<String> serviceKeywords;

	SalonIdeaVertical(String queryParamValue, List<String> serviceKeywords) {
		this.queryParamValue = queryParamValue;
		this.serviceKeywords = serviceKeywords;
	}

	public String queryParamValue() {
		return queryParamValue;
	}

	/** Tipologia salone da registrazione /piani, allineata a {@link SalonBusinessType}. */
	public SalonBusinessType linkedSalonBusinessType() {
		return switch (this) {
			case ESTETISTI -> SalonBusinessType.BEAUTY;
			case PARRUCCHIERI -> SalonBusinessType.HAIR;
			case MASSAGGI -> SalonBusinessType.MASSAGE;
		};
	}

	/** Parole cercate nel nome o nella descrizione dei servizi in listino (una basta per classificare la sede). */
	public List<String> serviceKeywords() {
		return serviceKeywords;
	}

	/**
	 * Deduce i {@link SalonBusinessType} da una query utente (ricerca home / ricerca libera), usando le stesse parole
	 * chiave dei verticali «idee» così parrucchiere/estetica/massaggio restano coerenti con i pulsanti in registrazione.
	 */
	public static Set<SalonBusinessType> inferSalonBusinessTypesFromUserQuery(String raw) {
		if (raw == null || raw.isBlank()) {
			return Set.of();
		}
		String q = raw.toLowerCase(Locale.ROOT);
		EnumSet<SalonBusinessType> acc = EnumSet.noneOf(SalonBusinessType.class);
		for (SalonIdeaVertical v : values()) {
			for (String kw : v.serviceKeywords()) {
				if (kw != null && !kw.isBlank() && q.contains(kw.toLowerCase(Locale.ROOT))) {
					acc.add(v.linkedSalonBusinessType());
					break;
				}
			}
		}
		for (SalonBusinessType t : SalonBusinessType.values()) {
			if (q.contains(t.name().toLowerCase(Locale.ROOT))) {
				acc.add(t);
			}
		}
		return acc;
	}

	public static Optional<SalonIdeaVertical> fromQueryParam(String raw) {
		if (raw == null || raw.isBlank()) {
			return Optional.empty();
		}
		String t = raw.trim().toLowerCase(Locale.ROOT);
		if ("massaggi-fisio".equals(t) || "massaggi_fisio".equals(t)) {
			return Optional.of(MASSAGGI);
		}
		return Arrays.stream(values()).filter(v -> v.queryParamValue.equals(t)).findFirst();
	}
}
