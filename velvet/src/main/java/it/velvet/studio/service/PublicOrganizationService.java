package it.velvet.studio.service;

import it.velvet.catalog.domain.SalonService;
import it.velvet.catalog.domain.SalonServiceRepository;
import it.velvet.catalog.domain.StaffOperator;
import it.velvet.catalog.domain.StaffOperatorRepository;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.publicapi.dto.PublicDtos.OperatorPublicDto;
import it.velvet.publicapi.dto.PublicDtos.OrganizationSummaryDto;
import it.velvet.publicapi.dto.PublicDtos.PublicSalonReviewDto;
import it.velvet.publicapi.dto.PublicDtos.OrganizationDetailDto;
import it.velvet.review.ReviewPrivacySupport;
import it.velvet.review.domain.ReviewRepository;
import it.velvet.studio.domain.Location;
import it.velvet.studio.domain.LocationRepository;
import it.velvet.studio.domain.SalonBusinessType;
import it.velvet.studio.domain.SalonClientGender;
import it.velvet.studio.domain.SalonIdeaVertical;
import it.velvet.studio.domain.SalonQuickSearchCatalogHints;
import it.velvet.studio.domain.StudioGroup;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PublicOrganizationService {

	private static final int MAX_ON_SEARCH_GEOCODE_ATTEMPTS = 100;

	private final LocationRepository locationRepository;
	private final SalonServiceRepository salonServiceRepository;
	private final StaffOperatorRepository staffOperatorRepository;
	private final ConsumerProfileRepository consumerProfileRepository;
	private final ReviewRepository reviewRepository;
	private final SalonLocationGeocodingService salonLocationGeocodingService;

	public PublicOrganizationService(
			LocationRepository locationRepository,
			SalonServiceRepository salonServiceRepository,
			StaffOperatorRepository staffOperatorRepository,
			ConsumerProfileRepository consumerProfileRepository,
			ReviewRepository reviewRepository,
			SalonLocationGeocodingService salonLocationGeocodingService) {
		this.locationRepository = locationRepository;
		this.salonServiceRepository = salonServiceRepository;
		this.staffOperatorRepository = staffOperatorRepository;
		this.consumerProfileRepository = consumerProfileRepository;
		this.reviewRepository = reviewRepository;
		this.salonLocationGeocodingService = salonLocationGeocodingService;
	}

	@Transactional(readOnly = true)
	public OrganizationDetailDto organizationDetail(String slug) {
		Location loc = requireBySlug(slug);
		String contactEmail = null;
		String contactPhone = null;
		StudioGroup sg = loc.getStudioGroup();
		Optional<ConsumerProfile> owner = resolveOwnerProfile(sg);
		if (owner.isPresent()) {
			ConsumerProfile p = owner.get();
			if (p.getEmail() != null && !p.getEmail().isBlank()) {
				contactEmail = p.getEmail().trim();
			}
			if (p.getPhone() != null && !p.getPhone().isBlank()) {
				contactPhone = p.getPhone().trim();
			}
		}
		return OrganizationDetailDto.from(loc, contactEmail, contactPhone);
	}

	/**
	 * Allineato a {@link StudioGroupOwnerResolver}: prima {@code owner_keycloak_sub} → {@code consumer_profiles.keycloak_sub},
	 * poi fallback su {@code studio_groups.owner_email} (stesso criterio del titolare autenticato).
	 */
	private Optional<ConsumerProfile> resolveOwnerProfile(StudioGroup sg) {
		if (sg == null) {
			return Optional.empty();
		}
		String sub = sg.getOwnerKeycloakSub();
		if (sub != null && !sub.isBlank()) {
			Optional<ConsumerProfile> bySub = consumerProfileRepository.findByKeycloakSub(sub.trim());
			if (bySub.isPresent() && bySub.get().getDeletedAt() == null) {
				return bySub;
			}
		}
		String ownerEmail = sg.getOwnerEmail();
		if (ownerEmail != null && !ownerEmail.isBlank()) {
			return consumerProfileRepository
					.findByEmailIgnoreCase(ownerEmail.trim().toLowerCase(Locale.ROOT))
					.filter(p -> p.getDeletedAt() == null);
		}
		return Optional.empty();
	}

	@Transactional(readOnly = true)
	public List<Location> search(String query, String city) {
		String q = query != null ? query.trim() : "";
		String c = city != null ? city.trim() : "";
		List<Location> raw;
		if (!c.isEmpty() && !q.isEmpty()) {
			Set<UUID> catalogMatchIds = locationsMatchingServiceCatalogIdea(q).stream()
					.map(Location::getId)
					.collect(Collectors.toCollection(LinkedHashSet::new));
			if (SalonQuickSearchCatalogHints.hasQuickTapCatalogIntent(q)) {
				raw = locationsMatchingCity(c).stream()
						.filter(loc -> catalogMatchIds.contains(loc.getId()))
						.toList();
			}
			else {
				for (Location loc : locationsMatchingDeclaredTypesFromUserQuery(q)) {
					catalogMatchIds.add(loc.getId());
				}
				raw = locationsMatchingCity(c).stream()
						.filter(loc -> locationMatchesTextQuery(loc, q) || catalogMatchIds.contains(loc.getId()))
						.toList();
			}
		}
		else if (!c.isEmpty()) {
			raw = locationsMatchingCity(c);
		}
		else if (!q.isEmpty()) {
			raw = SalonQuickSearchCatalogHints.hasQuickTapCatalogIntent(q)
					? locationsMatchingServiceCatalogIdea(q)
					: locationsMatchingFreeTextOrServiceCatalog(q);
		}
		else {
			raw = locationRepository.findTop50ByOrderByNameAsc();
		}
		return raw.stream()
				.filter(PublicOrganizationService::isPremiumLocation)
				.toList();
	}

	/**
	 * Ricerca pubblica con media e conteggio recensioni per sede (stesse sedi di {@link #search(String, String)}),
	 * con filtro opzionale per distanza (Haversine) se {@code nearLat}/{@code nearLng} sono valorizzati e la sede ha coordinate.
	 */
	/**
	 * Query rapide home («Oppure un tocco») con almeno un salone premium nel raggio che offre il servizio in listino
	 * (stessa logica di {@link #searchWithReviewSummaries} per testo + geolocalizzazione).
	 */
	@Transactional(readOnly = true)
	public List<String> availableQuickSuggestQueries(double nearLat, double nearLng, Double nearKm) {
		if (!isFiniteLatLng(nearLat, nearLng)) {
			return List.of();
		}
		double radiusKm = (nearKm != null && nearKm > 0) ? Math.min(nearKm, 200.0) : 25.0;
		List<String> out = new ArrayList<>();
		for (String q : SalonQuickSearchCatalogHints.registeredQuickSearchQueries()) {
			if (hasQuickSuggestMatchesNear(q, nearLat, nearLng, radiusKm)) {
				out.add(q);
			}
		}
		return out;
	}

	@Transactional
	public List<OrganizationSummaryDto> searchWithReviewSummaries(
			String query,
			String city,
			Double nearLat,
			Double nearLng,
			Double nearKm,
			List<String> salonClientGenders) {
		return searchWithReviewSummaries(query, city, nearLat, nearLng, nearKm, salonClientGenders, null);
	}

	@Transactional
	public List<OrganizationSummaryDto> searchWithReviewSummaries(
			String query,
			String city,
			Double nearLat,
			Double nearLng,
			Double nearKm,
			List<String> salonClientGenders,
			List<String> salonBusinessTypes) {
		String q = query != null ? query.trim() : "";
		String c = city != null ? city.trim() : "";
		boolean nearSearch = nearLat != null && nearLng != null && isFiniteLatLng(nearLat, nearLng);
		double radiusKm = (nearKm != null && nearKm > 0) ? Math.min(nearKm, 200.0) : 25.0;
		List<Location> locs;
		if (nearSearch && q.isEmpty() && c.isEmpty()) {
			locs = filterPremiumWithinRadius(locationRepository.findAll(), nearLat, nearLng, radiusKm, false);
		}
		else {
			List<Location> candidates = nearSearch && !q.isEmpty()
					? locationsMatchingFreeTextOrServiceCatalogForNearSearch(q)
					: search(query, city);
			if (nearSearch) {
				locs = filterPremiumWithinRadius(candidates, nearLat, nearLng, radiusKm, false);
			}
			else {
				locs = candidates;
			}
		}
		locs = filterBySalonClientGenders(locs, resolveSalonClientGenderFilter(q, salonClientGenders));
		locs = filterBySalonBusinessTypes(locs, salonBusinessTypes);
		if (locs.isEmpty()) {
			return List.of();
		}
		List<UUID> ids = locs.stream().map(Location::getId).toList();
		Map<UUID, RatingAgg> byLocation = reviewAggregatesByLocationIds(ids);
		return locs.stream()
				.map(loc -> {
					RatingAgg agg = byLocation.get(loc.getId());
					if (agg == null) {
						return OrganizationSummaryDto.from(loc, null, null);
					}
					return OrganizationSummaryDto.from(loc, agg.average(), agg.count());
				})
				.toList();
	}

	/**
	 * Saloni premium con recensioni, ordinati per media voti (poi numero recensioni) su tutto il catalogo —
	 * per la home «in evidenza in Italia» (nessun filtro geografico).
	 */
	@Transactional(readOnly = true)
	public List<OrganizationSummaryDto> topRatedPremiumSummaries(int limit) {
		int cap = Math.min(Math.max(limit, 1), 20);
		List<Location> all = locationRepository.findAll().stream()
				.filter(PublicOrganizationService::isPremiumLocation)
				.toList();
		if (all.isEmpty()) {
			return List.of();
		}
		List<UUID> ids = all.stream().map(Location::getId).toList();
		Map<UUID, RatingAgg> byLocation = reviewAggregatesByLocationIds(ids);
		List<Location> sorted = all.stream()
				.sorted(topRatedLocationComparator(byLocation))
				.limit(cap)
				.toList();
		return sorted.stream()
				.map(loc -> {
					RatingAgg agg = byLocation.get(loc.getId());
					if (agg == null) {
						return OrganizationSummaryDto.from(loc, null, null);
					}
					return OrganizationSummaryDto.from(loc, agg.average(), agg.count());
				})
				.toList();
	}

	/**
	 * Saloni premium ordinati per recensioni (mese corrente {@code Europe/Rome}, poi fallback su tutte le recensioni).
	 * <ul>
	 *   <li>Con {@code salonKind} (es. {@code parrucchieri}, {@code estetisti}, {@code massaggi}): pool = saloni nel
	 *       verticale (listino <strong>oppure</strong> tipologie dichiarate in registrazione); se {@code ideaQuery} è
	 *       valorizzata si restringe ai saloni che matchano anche la query sul listino <strong>oppure</strong> sulle
	 *       tipologie dedotte dalla stessa query; se l'intersezione è vuota si torna al solo verticale.</li>
	 *   <li>Senza {@code salonKind}: match sul listino <strong>oppure</strong> sulle tipologie dichiarate coerenti con
	 *       {@code ideaQuery} (stessi segnali delle parole chiave verticali).</li>
	 * </ul>
	 */
	@Transactional(readOnly = true)
	public List<OrganizationSummaryDto> monthlyIdeaSummaries(String ideaQuery, String salonKindParam, int limit) {
		String q = ideaQuery != null ? ideaQuery.trim() : "";
		Optional<SalonIdeaVertical> vertical = SalonIdeaVertical.fromQueryParam(salonKindParam);
		if (q.isEmpty() && vertical.isEmpty()) {
			return List.of();
		}
		int cap = Math.min(Math.max(limit, 1), 30);
		List<Location> candidates;
		if (vertical.isPresent()) {
			List<Location> inVertical = locationsMatchingSalonVertical(vertical.get());
			if (inVertical.isEmpty()) {
				return List.of();
			}
			if (!q.isEmpty()) {
				List<Location> byService = locationsMatchingServiceCatalogIdea(q);
				List<Location> byDeclaredQuery = locationsMatchingDeclaredTypesFromUserQuery(q);
				List<Location> byIdea = mergeDistinctLocationLists(byService, byDeclaredQuery);
				List<Location> narrowed = intersectLocationsPreserveOrder(inVertical, byIdea);
				candidates = narrowed.isEmpty() ? inVertical : narrowed;
			}
			else {
				candidates = inVertical;
			}
		}
		else {
			if (q.isEmpty()) {
				return List.of();
			}
			candidates = locationsMatchingServiceCatalogIdea(q);
		}
		if (candidates.isEmpty()) {
			return List.of();
		}
		List<UUID> ids = candidates.stream().map(Location::getId).toList();
		ZoneId rome = ZoneId.of("Europe/Rome");
		YearMonth ym = YearMonth.now(rome);
		Instant from = ym.atDay(1).atStartOfDay(rome).toInstant();
		Instant to = ym.plusMonths(1).atDay(1).atStartOfDay(rome).toInstant();
		Map<UUID, RatingAgg> monthly = parseReviewAggregates(
				reviewRepository.summarizeRatingsByLocationIdsAndCreatedAtRange(ids, from, to));
		List<Location> ordered;
		Map<UUID, RatingAgg> displayAgg;
		List<Location> monthlyRanked = candidates.stream()
				.filter(loc -> {
					RatingAgg a = monthly.get(loc.getId());
					return a != null && a.count() > 0;
				})
				.sorted(topRatedLocationComparator(monthly))
				.limit(cap)
				.toList();
		if (!monthlyRanked.isEmpty()) {
			ordered = monthlyRanked;
			displayAgg = monthly;
		}
		else {
			Map<UUID, RatingAgg> allTime = reviewAggregatesByLocationIds(ids);
			ordered = candidates.stream()
					.sorted(topRatedLocationComparator(allTime))
					.limit(cap)
					.toList();
			displayAgg = allTime;
		}
		return ordered.stream()
				.map(loc -> {
					RatingAgg agg = displayAgg.get(loc.getId());
					if (agg == null) {
						return OrganizationSummaryDto.from(loc, null, null);
					}
					return OrganizationSummaryDto.from(loc, agg.average(), agg.count());
				})
				.toList();
	}

	private static Comparator<Location> topRatedLocationComparator(Map<UUID, RatingAgg> byLocation) {
		return (a, b) -> {
			RatingAgg ra = byLocation.get(a.getId());
			RatingAgg rb = byLocation.get(b.getId());
			boolean ha = ra != null && ra.count() > 0;
			boolean hb = rb != null && rb.count() > 0;
			if (ha && hb) {
				int d = Double.compare(rb.average(), ra.average());
				if (d != 0) {
					return d;
				}
				return Long.compare(rb.count(), ra.count());
			}
			if (ha) {
				return -1;
			}
			if (hb) {
				return 1;
			}
			String na = a.getName() != null ? a.getName() : "";
			String nb = b.getName() != null ? b.getName() : "";
			return na.compareToIgnoreCase(nb);
		};
	}

	private static boolean isFiniteLatLng(double lat, double lng) {
		return lat >= -90.0 && lat <= 90.0 && lng >= -180.0 && lng <= 180.0;
	}

	private List<Location> filterPremiumWithinRadius(
			List<Location> candidates,
			double userLat,
			double userLng,
			double radiusKm,
			boolean attemptGeocode) {
		if (candidates == null || candidates.isEmpty()) {
			return List.of();
		}
		int attemptsLeft = attemptGeocode ? MAX_ON_SEARCH_GEOCODE_ATTEMPTS : 0;
		List<Location> out = new ArrayList<>();
		for (Location loc : candidates) {
			if (!isPremiumLocation(loc)) {
				continue;
			}
			if (!hasCoordinates(loc) && attemptsLeft > 0) {
				if (salonLocationGeocodingService.applyCoordinates(loc)) {
					locationRepository.save(loc);
					attemptsLeft--;
				}
			}
			if (withinRadiusKm(loc, userLat, userLng, radiusKm)) {
				out.add(loc);
			}
		}
		return out;
	}

	private static boolean hasCoordinates(Location loc) {
		return loc != null && loc.getLatitude() != null && loc.getLongitude() != null;
	}

	private static List<String> resolveSalonClientGenderFilter(String query, List<String> explicit) {
		List<String> out = new ArrayList<>();
		if (explicit != null) {
			for (String raw : explicit) {
				if (raw == null || raw.isBlank()) {
					continue;
				}
				out.add(raw.trim());
			}
		}
		if (!out.isEmpty()) {
			return out;
		}
		return SalonQuickSearchCatalogHints.clientGendersForQuery(query);
	}

	private static List<Location> filterBySalonClientGenders(List<Location> locs, List<String> salonClientGenders) {
		if (locs == null || locs.isEmpty()) {
			return List.of();
		}
		List<SalonClientGender> filter;
		try {
			filter = SalonClientGender.parseList(salonClientGenders);
		}
		catch (IllegalArgumentException ex) {
			return locs;
		}
		if (filter.isEmpty()) {
			return locs;
		}
		Set<SalonClientGender> wanted = EnumSet.copyOf(filter);
		return locs.stream().filter(loc -> locationMatchesSalonClientGenders(loc, wanted)).toList();
	}

	private static boolean locationMatchesSalonClientGenders(Location loc, Set<SalonClientGender> wanted) {
		if (wanted == null || wanted.isEmpty()) {
			return true;
		}
		Set<SalonClientGender> declared = SalonClientGender.parseCsv(loc.getSalonClientGenders());
		if (declared.isEmpty()) {
			return false;
		}
		for (SalonClientGender g : wanted) {
			if (declared.contains(g)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Filtro esplicito per tipologia attività (registrazione /piani): logica OR — il salone resta nei risultati se
	 * dichiara <strong>almeno una</strong> delle tipologie richieste. Così un salone parrucchiere + estetista compare sia
	 * filtrando «Parrucchiere» sia filtrando «Estetista». Codici non validi o vuoti lasciano i risultati inalterati.
	 */
	private static List<Location> filterBySalonBusinessTypes(List<Location> locs, List<String> salonBusinessTypes) {
		if (locs == null || locs.isEmpty()) {
			return List.of();
		}
		List<SalonBusinessType> filter;
		try {
			filter = SalonBusinessType.parseList(salonBusinessTypes);
		}
		catch (IllegalArgumentException ex) {
			return locs;
		}
		if (filter.isEmpty()) {
			return locs;
		}
		Set<SalonBusinessType> wanted = EnumSet.copyOf(filter);
		return locs.stream().filter(loc -> locationMatchesSalonBusinessTypes(loc, wanted)).toList();
	}

	private static boolean locationMatchesSalonBusinessTypes(Location loc, Set<SalonBusinessType> wanted) {
		if (wanted == null || wanted.isEmpty()) {
			return true;
		}
		Set<SalonBusinessType> declared = SalonBusinessType.parseCsv(loc.getSalonBusinessTypes());
		// Sedi legacy senza tipologia in anagrafica: trattate come parrucchiere (filtro «Parrucchiere» / OR con HAIR).
		if (declared.isEmpty()) {
			return wanted.contains(SalonBusinessType.HAIR);
		}
		for (SalonBusinessType t : wanted) {
			if (declared.contains(t)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Distanza Haversine in km; richiede coordinate salvate sulla sede.
	 */
	private static boolean withinRadiusKm(Location loc, double userLat, double userLng, double radiusKm) {
		Double lat = loc.getLatitude();
		Double lng = loc.getLongitude();
		if (lat == null || lng == null) {
			return false;
		}
		return haversineKm(userLat, userLng, lat, lng) <= radiusKm;
	}

	private static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
		final double earthKm = 6371.0;
		double dLat = Math.toRadians(lat2 - lat1);
		double dLon = Math.toRadians(lon2 - lon1);
		double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
				+ Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
		double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
		return earthKm * c;
	}

	private record RatingAgg(double average, long count) {
	}

	private Map<UUID, RatingAgg> reviewAggregatesByLocationIds(List<UUID> locationIds) {
		if (locationIds.isEmpty()) {
			return Map.of();
		}
		return parseReviewAggregates(reviewRepository.summarizeRatingsByLocationIds(locationIds));
	}

	private static Map<UUID, RatingAgg> parseReviewAggregates(List<Object[]> rows) {
		Map<UUID, RatingAgg> out = new HashMap<>();
		if (rows == null) {
			return out;
		}
		for (Object[] row : rows) {
			if (row == null || row.length < 3) {
				continue;
			}
			UUID locId = (UUID) row[0];
			if (!(row[1] instanceof Number avgNum) || !(row[2] instanceof Number cntNum)) {
				continue;
			}
			long cnt = cntNum.longValue();
			if (cnt <= 0 || locId == null) {
				continue;
			}
			double rounded = Math.round(avgNum.doubleValue() * 10.0) / 10.0;
			out.put(locId, new RatingAgg(rounded, cnt));
		}
		return out;
	}

	/** Unisce match «comune contiene filtro» e «filtro contiene comune» (CAP / etichette lunghe). */
	private List<Location> locationsMatchingCity(String cityFilter) {
		Set<UUID> seen = new LinkedHashSet<>();
		List<Location> out = new ArrayList<>();
		for (Location l : locationRepository.findByCityContainingIgnoreCase(cityFilter)) {
			if (seen.add(l.getId())) {
				out.add(l);
			}
		}
		for (Location l : locationRepository.findWhereSearchCityContainsLocationCity(cityFilter)) {
			if (seen.add(l.getId())) {
				out.add(l);
			}
		}
		for (Location l : locationRepository.findByPostalCodeContainingIgnoreCase(cityFilter)) {
			if (seen.add(l.getId())) {
				out.add(l);
			}
		}
		return out;
	}

	private List<Location> locationsMatchingFreeTextQuery(String query) {
		return mergeDistinct(
				locationRepository.findByNameContainingIgnoreCaseOrCityContainingIgnoreCase(query, query),
				locationRepository.findByAddressLineContainingIgnoreCase(query),
				locationRepository.findByPostalCodeContainingIgnoreCase(query),
				locationRepository.findBySlugContainingIgnoreCase(query));
	}

	/**
	 * Stessi criteri delle «idee del mese»: anche i servizi in listino (nome o descrizione) portano la sede nei
	 * risultati — così «taglio uomo» trova saloni che offrono quel servizio anche se nome/città non contengono la frase.
	 */
	private List<Location> locationsMatchingFreeTextOrServiceCatalog(String query) {
		String t = query != null ? query.trim() : "";
		if (t.isEmpty()) {
			return List.of();
		}
		List<Location> byMetadata = locationsMatchingFreeTextQuery(t);
		List<Location> byCatalog = locationsMatchingServiceCatalogIdea(t);
		List<Location> byDeclaredTypes = locationsMatchingDeclaredTypesFromUserQuery(t);
		Set<UUID> seen = new LinkedHashSet<>();
		List<Location> out = new ArrayList<>();
		for (Location l : byMetadata) {
			if (seen.add(l.getId())) {
				out.add(l);
			}
		}
		for (Location l : byCatalog) {
			if (seen.add(l.getId())) {
				out.add(l);
			}
		}
		for (Location l : byDeclaredTypes) {
			if (seen.add(l.getId())) {
				out.add(l);
			}
		}
		return out;
	}

	/**
	 * Match per ricerca geolocalizzata con testo: evita di espandere a tutte le sedi premium per tipologia dichiarata
	 * (es. tutti i parrucchieri d'Italia) prima del filtro raggio.
	 */
	private List<Location> locationsMatchingFreeTextOrServiceCatalogForNearSearch(String query) {
		String t = query != null ? query.trim() : "";
		if (t.isEmpty()) {
			return List.of();
		}
		return locationsMatchingServiceCatalogIdea(t);
	}

	private boolean hasQuickSuggestMatchesNear(String query, double nearLat, double nearLng, double radiusKm) {
		List<Location> candidates = locationsMatchingFreeTextOrServiceCatalogForNearSearch(query);
		List<Location> locs = filterPremiumWithinRadius(candidates, nearLat, nearLng, radiusKm, true);
		locs = filterBySalonClientGenders(locs, SalonQuickSearchCatalogHints.clientGendersForQuery(query));
		return !locs.isEmpty();
	}

	private static List<Location> mergeDistinctLocationLists(List<Location> a, List<Location> b) {
		Set<UUID> seen = new LinkedHashSet<>();
		List<Location> out = new ArrayList<>();
		for (Location l : a) {
			if (l != null && seen.add(l.getId())) {
				out.add(l);
			}
		}
		for (Location l : b) {
			if (l != null && seen.add(l.getId())) {
				out.add(l);
			}
		}
		return out;
	}

	private static List<Location> mergeDistinct(List<Location> a, List<Location> b, List<Location> c, List<Location> d) {
		Set<UUID> seen = new LinkedHashSet<>();
		List<Location> out = new ArrayList<>();
		for (List<Location> list : List.of(a, b, c, d)) {
			for (Location l : list) {
				if (seen.add(l.getId())) {
					out.add(l);
				}
			}
		}
		return out;
	}

	/** Nome, indirizzo pubblico o slug (mini-sito). */
	private static boolean locationMatchesTextQuery(Location loc, String query) {
		if (nameMatchesQuery(loc.getName(), query)) {
			return true;
		}
		String addr = loc.getAddressLine();
		if (addr != null && nameMatchesQuery(addr, query)) {
			return true;
		}
		String postalCode = loc.getPostalCode();
		if (postalCode != null && nameMatchesQuery(postalCode, query)) {
			return true;
		}
		String slug = loc.getSlug();
		if (slug == null || slug.isBlank()) {
			return false;
		}
		String s = slug.toLowerCase(Locale.ROOT);
		String q = query.toLowerCase(Locale.ROOT).trim();
		return s.contains(q);
	}

	/** Sottostringa intera oppure tutte le parole della query presenti nel testo (ordine libero). */
	private static boolean nameMatchesQuery(String haystack, String query) {
		if (haystack == null || haystack.isBlank()) {
			return false;
		}
		String n = haystack.toLowerCase(Locale.ROOT);
		String q = query.toLowerCase(Locale.ROOT).trim();
		if (q.isEmpty()) {
			return true;
		}
		if (n.contains(q)) {
			return true;
		}
		for (String token : q.split("\\s+")) {
			if (!token.isEmpty() && !n.contains(token)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Sedi premium con almeno un {@link SalonService} il cui nome o descrizione contiene la frase intera; se nessuno,
	 * intersezione delle sedi che per ogni parola della frase hanno almeno un servizio che contiene quella parola
	 * (es. taglio + piega anche se in listino è scritto "Taglio e piega").
	 */
	/** Sedi premium con tipologie dichiarate in registrazione che «risuonano» con la query (stessi segnali dei verticali idee). */
	private List<Location> locationsMatchingDeclaredTypesFromUserQuery(String ideaQuery) {
		Set<SalonBusinessType> inferred = SalonIdeaVertical.inferSalonBusinessTypesFromUserQuery(ideaQuery);
		if (inferred.isEmpty()) {
			return List.of();
		}
		Set<UUID> seen = new LinkedHashSet<>();
		List<Location> out = new ArrayList<>();
		for (SalonBusinessType bt : inferred) {
			for (Location loc : locationsDeclaringBusinessType(bt)) {
				if (seen.add(loc.getId())) {
					out.add(loc);
				}
			}
		}
		return out;
	}

	private List<Location> locationsDeclaringBusinessType(SalonBusinessType type) {
		if (type == null) {
			return List.of();
		}
		return locationRepository.findPremiumLocationsDeclaringBusinessTypeCode(type.name()).stream()
				.filter(PublicOrganizationService::isPremiumLocation)
				.toList();
	}

	private List<Location> locationsMatchingServiceCatalogIdea(String ideaQuery) {
		String q = ideaQuery.trim();
		if (q.isEmpty()) {
			return List.of();
		}
		List<Location> fromNeedles = distinctPremiumLocationsFromCatalogNeedles(
				SalonQuickSearchCatalogHints.catalogNeedlesForQuery(q));
		List<Location> phrase = distinctPremiumLocationsFromServiceRows(
				salonServiceRepository.findCatalogRowsMatchingText(q));
		List<String> tokens = Arrays.stream(q.toLowerCase(Locale.ROOT).split("\\s+"))
				.map(String::trim)
				.filter(t -> !t.isEmpty())
				.distinct()
				.toList();
		List<Location> fromTokens = tokens.size() <= 1 ? List.of() : locationsMatchingServiceCatalogIdeaFromTokens(tokens);
		return mergeDistinctLocationLists(mergeDistinctLocationLists(fromNeedles, phrase), fromTokens);
	}

	private List<Location> locationsMatchingServiceCatalogIdeaFromTokens(List<String> tokens) {
		Set<UUID> intersection = null;
		for (String token : tokens) {
			Set<UUID> ids = distinctPremiumLocationIdsFromServiceRows(
					salonServiceRepository.findCatalogRowsMatchingText(token));
			intersection = intersection == null
					? new LinkedHashSet<>(ids)
					: intersection.stream().filter(ids::contains).collect(Collectors.toCollection(LinkedHashSet::new));
			if (intersection.isEmpty()) {
				return locationsMatchingServiceCatalogIdeaUnion(tokens);
			}
		}
		List<SalonService> firstTokenRows = salonServiceRepository.findCatalogRowsMatchingText(tokens.get(0));
		Map<UUID, Location> locById = new HashMap<>();
		for (SalonService ss : firstTokenRows) {
			Location loc = ss.getLocation();
			if (!isPremiumLocation(loc)) {
				continue;
			}
			UUID id = loc.getId();
			if (intersection.contains(id)) {
				locById.putIfAbsent(id, loc);
			}
		}
		return intersection.stream().map(locById::get).filter(Objects::nonNull).toList();
	}

	private List<Location> distinctPremiumLocationsFromCatalogNeedles(List<String> needles) {
		if (needles == null || needles.isEmpty()) {
			return List.of();
		}
		Set<UUID> seen = new LinkedHashSet<>();
		List<Location> out = new ArrayList<>();
		for (String needle : needles) {
			if (needle == null || needle.isBlank()) {
				continue;
			}
			for (Location loc : distinctPremiumLocationsFromServiceRows(
					salonServiceRepository.findCatalogRowsMatchingText(needle.trim()))) {
				if (seen.add(loc.getId())) {
					out.add(loc);
				}
			}
		}
		return out;
	}

	private List<Location> locationsMatchingServiceCatalogIdeaUnion(List<String> tokens) {
		Set<UUID> union = new LinkedHashSet<>();
		Map<UUID, Location> locById = new HashMap<>();
		for (String token : tokens) {
			for (SalonService ss : salonServiceRepository.findCatalogRowsMatchingText(token)) {
				Location loc = ss.getLocation();
				if (!isPremiumLocation(loc)) {
					continue;
				}
				UUID id = loc.getId();
				if (union.add(id)) {
					locById.putIfAbsent(id, loc);
				}
			}
		}
		return union.stream().map(locById::get).filter(Objects::nonNull).toList();
	}

	private static List<Location> distinctPremiumLocationsFromServiceRows(List<SalonService> rows) {
		if (rows == null || rows.isEmpty()) {
			return List.of();
		}
		Set<UUID> seen = new LinkedHashSet<>();
		List<Location> out = new ArrayList<>();
		for (SalonService ss : rows) {
			Location loc = ss.getLocation();
			if (!isPremiumLocation(loc)) {
				continue;
			}
			if (seen.add(loc.getId())) {
				out.add(loc);
			}
		}
		return out;
	}

	private static Set<UUID> distinctPremiumLocationIdsFromServiceRows(List<SalonService> rows) {
		if (rows == null || rows.isEmpty()) {
			return Set.of();
		}
		return rows.stream()
				.map(SalonService::getLocation)
				.filter(PublicOrganizationService::isPremiumLocation)
				.map(Location::getId)
				.filter(Objects::nonNull)
				.collect(Collectors.toCollection(LinkedHashSet::new));
	}

	/**
	 * Sede premium se: (1) ha dichiarato in registrazione la tipologia collegata al verticale, oppure (2) almeno un
	 * servizio nel listino contiene una delle parole chiave del verticale (nome o descrizione).
	 */
	private List<Location> locationsMatchingSalonVertical(SalonIdeaVertical vertical) {
		Set<UUID> seen = new LinkedHashSet<>();
		List<Location> out = new ArrayList<>();
		for (Location loc : locationsDeclaringBusinessType(vertical.linkedSalonBusinessType())) {
			if (seen.add(loc.getId())) {
				out.add(loc);
			}
		}
		for (String kw : vertical.serviceKeywords()) {
			if (kw == null || kw.isBlank()) {
				continue;
			}
			for (SalonService ss : salonServiceRepository.findCatalogRowsMatchingText(kw.trim())) {
				Location loc = ss.getLocation();
				if (!isPremiumLocation(loc)) {
					continue;
				}
				if (seen.add(loc.getId())) {
					out.add(loc);
				}
			}
		}
		return out;
	}

	private static List<Location> intersectLocationsPreserveOrder(List<Location> primary, List<Location> filter) {
		if (filter == null || filter.isEmpty()) {
			return List.of();
		}
		Set<UUID> filterIds = filter.stream().map(Location::getId).collect(Collectors.toSet());
		return primary.stream().filter(l -> filterIds.contains(l.getId())).toList();
	}

	@Transactional(readOnly = true)
	public Location requireBySlug(String slug) {
		Location loc = locationRepository.findBySlug(slug)
				.orElseThrow(() -> new it.velvet.common.api.BusinessException(
						org.springframework.http.HttpStatus.NOT_FOUND,
						"NOT_FOUND",
						"Sede non trovata."));
		if (!isPremiumLocation(loc)) {
			throw new it.velvet.common.api.BusinessException(
					org.springframework.http.HttpStatus.NOT_FOUND,
					"NOT_FOUND",
					"Sede non trovata.");
		}
		return loc;
	}

	@Transactional(readOnly = true)
	public List<SalonService> listServices(String slug) {
		Location loc = requireBySlug(slug);
		return salonServiceRepository.findByLocation_IdOrderByName(loc.getId());
	}

	@Transactional(readOnly = true)
	public List<PublicSalonReviewDto> listPublicReviews(String slug) {
		Location loc = requireBySlug(slug);
		return reviewRepository.findByAppointment_Location_IdOrderByCreatedAtDesc(loc.getId()).stream()
				.filter(r -> r.isPubliclyVisible())
				.limit(30)
				.map(r -> {
					var a = r.getAppointment();
					var salonClient = a != null ? a.getSalonClient() : null;
					var consumer = a != null ? a.getConsumerProfile() : null;
					String reviewerName;
					if (r.isReviewerIdentityDetached()) {
						reviewerName = ReviewPrivacySupport.ANONYMOUS_REVIEWER_LABEL;
					} else if (salonClient != null
							&& salonClient.getDisplayName() != null
							&& !salonClient.getDisplayName().isBlank()) {
						reviewerName = salonClient.getDisplayName().trim();
					} else if (consumer != null
							&& consumer.getDisplayName() != null
							&& !consumer.getDisplayName().isBlank()) {
						reviewerName = consumer.getDisplayName().trim();
					} else {
						reviewerName = "Cliente";
					}
					String serviceName = a != null && a.getService() != null ? a.getService().getName() : null;
					var operator = a != null ? a.getOperator() : null;
					String staffDisplayName = operator != null
							&& operator.getDisplayName() != null
							&& !operator.getDisplayName().isBlank()
									? operator.getDisplayName().trim()
									: null;
					return new PublicSalonReviewDto(
							r.getId(),
							r.getRating(),
							r.getStaffRating(),
							r.getComment(),
							reviewerName,
							serviceName,
							staffDisplayName,
							r.getCreatedAt());
				})
				.toList();
	}

	/**
	 * Operatori pubblici per il wizard prenotazione.
	 * Se la sede non ne ha ancora configurati, crea un operatore predefinito così
	 * {@code GET .../availability} (che su versioni precedenti richiedeva {@code operatorId})
	 * e la UI possono sempre mostrare l'agenda.
	 */
	@Transactional
	public List<OperatorPublicDto> listOperators(String slug, UUID serviceId) {
		Location loc = requireBySlug(slug);
		List<StaffOperator> ops = staffOperatorRepository.findByLocation_IdOrderByDisplayName(loc.getId());
		if (ops.isEmpty()) {
			StaffOperator created = staffOperatorRepository.save(new StaffOperator(loc, "Team salone"));
			ops = List.of(created);
		}
		if (serviceId != null) {
			SalonService service = salonServiceRepository.findByIdWithOperators(serviceId)
					.orElseThrow(() -> new it.velvet.common.api.BusinessException(
							org.springframework.http.HttpStatus.NOT_FOUND, "NOT_FOUND", "Servizio non trovato."));
			if (!service.getLocation().getId().equals(loc.getId())) {
				throw new it.velvet.common.api.BusinessException(
						org.springframework.http.HttpStatus.BAD_REQUEST,
						"VALIDATION_ERROR",
						"Servizio non appartiene alla sede.");
			}
			ops = it.velvet.catalog.domain.SalonServiceOperators.filterForBooking(service, ops);
		}
		Map<UUID, StaffReviewAgg> reviewAggByOperator = new HashMap<>();
		for (Object[] row : reviewRepository.summarizeStaffRatingsByOperatorForLocation(loc.getId())) {
			if (row == null || row.length < 3 || row[0] == null) {
				continue;
			}
			UUID operatorId = (UUID) row[0];
			double rawAvg = row[1] instanceof Number n ? n.doubleValue() : 0d;
			long count = row[2] instanceof Number n ? n.longValue() : 0L;
			if (count <= 0) {
				continue;
			}
			reviewAggByOperator.put(operatorId, new StaffReviewAgg(Math.round(rawAvg * 10.0) / 10.0, count));
		}
		return ops.stream()
				.map(o -> {
					String r = o.getRole();
					String role = (r == null || r.isBlank()) ? null : r.trim();
					StaffReviewAgg agg = reviewAggByOperator.get(o.getId());
					Double averageStaffRating = agg != null ? agg.average() : null;
					Long staffReviewCount = agg != null ? agg.count() : null;
					return new OperatorPublicDto(o.getId(), o.getDisplayName(), role, averageStaffRating, staffReviewCount);
				})
				.toList();
	}

	private record StaffReviewAgg(double average, long count) {
	}

	public UUID locationIdForSlug(String slug) {
		return requireBySlug(slug).getId();
	}

	private static boolean isPremiumLocation(Location loc) {
		if (loc == null || loc.getStudioGroup() == null) {
			return false;
		}
		String plan = StudioGroup.canonicalPlanTier(loc.getStudioGroup().getPlanTier());
		return "PREMIUM".equals(plan);
	}
}
