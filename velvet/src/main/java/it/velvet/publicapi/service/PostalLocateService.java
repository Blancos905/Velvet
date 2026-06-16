package it.velvet.publicapi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import it.velvet.publicapi.dto.PlaceLocateSuggestionResponse;
import it.velvet.publicapi.dto.PostalLocateResponse;
import it.velvet.publicapi.dto.ReverseLocateResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * Risolve CAP + paese in un nome di luogo tramite Nominatim (OpenStreetMap).
 * Rispetta la policy OSM: User-Agent identificabile.
 */
@Service
public class PostalLocateService {

	private static final Logger log = LoggerFactory.getLogger(PostalLocateService.class);

	private static final String USER_AGENT = "SaloniLuxury/1.0 (https://www.saloniluxury.it; geocoding)";
	/** Evita thread Tomcat bloccati indefinitamente se Nominatim non risponde. */
	private static final Duration NOMINATIM_CONNECT_TIMEOUT = Duration.ofSeconds(3);
	private static final Duration NOMINATIM_READ_TIMEOUT = Duration.ofSeconds(5);

	private final RestClient restClient;
	private final ObjectMapper objectMapper;

	public PostalLocateService(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
		var httpClient = HttpClient.newBuilder()
				.connectTimeout(NOMINATIM_CONNECT_TIMEOUT)
				.build();
		var requestFactory = new JdkClientHttpRequestFactory(httpClient);
		requestFactory.setReadTimeout(NOMINATIM_READ_TIMEOUT);
		this.restClient = RestClient.builder()
				.requestFactory(requestFactory)
				.defaultHeader(HttpHeaders.USER_AGENT, USER_AGENT)
				.defaultHeader(HttpHeaders.ACCEPT_LANGUAGE, "it")
				.build();
	}

	public Optional<PostalLocateResponse> locate(String postalCodeRaw, String countryCodeRaw) {
		String country = countryCodeRaw != null ? countryCodeRaw.trim().toUpperCase(Locale.ROOT) : "";
		String digits = postalCodeRaw != null ? postalCodeRaw.replaceAll("\\D", "") : "";
		if (!country.matches("IT|CH|SM")) {
			return Optional.empty();
		}
		int expected = switch (country) {
			case "CH" -> 4;
			case "IT", "SM" -> 5;
			default -> 0;
		};
		if (digits.length() != expected) {
			return Optional.empty();
		}

		String nominatimCc = country.toLowerCase(Locale.ROOT);
		URI uri = UriComponentsBuilder.newInstance()
				.scheme("https")
				.host("nominatim.openstreetmap.org")
				.path("/search")
				.queryParam("postalcode", digits)
				.queryParam("countrycodes", nominatimCc)
				.queryParam("format", "json")
				.queryParam("addressdetails", "1")
				.queryParam("limit", "1")
				.build()
				.toUri();

		try {
			String body = restClient.get().uri(uri).retrieve().body(String.class);
			if (body == null || body.isBlank()) {
				return Optional.empty();
			}
			JsonNode root = objectMapper.readTree(body);
			if (!root.isArray() || root.isEmpty()) {
				return Optional.empty();
			}
			return parseHit(root.get(0));
		}
		catch (Exception e) {
			log.warn("Nominatim lookup failed for postal={} country={}: {}", digits, country, e.getMessage());
			return Optional.empty();
		}
	}

	public List<PlaceLocateSuggestionResponse> suggestPlacesByPostal(String postalCodeRaw, String countryCodeRaw, int limitRaw) {
		String country = countryCodeRaw != null ? countryCodeRaw.trim().toUpperCase(Locale.ROOT) : "";
		String digits = postalCodeRaw != null ? postalCodeRaw.replaceAll("\\D", "") : "";
		if (!country.matches("^[A-Z]{2}$")) {
			return List.of();
		}
		if (digits.length() < 2) {
			return List.of();
		}
		int limit = Math.max(1, Math.min(limitRaw, 100));
		URI uri = UriComponentsBuilder.newInstance()
				.scheme("https")
				.host("nominatim.openstreetmap.org")
				.path("/search")
				.queryParam("postalcode", digits)
				.queryParam("countrycodes", country.toLowerCase(Locale.ROOT))
				.queryParam("format", "json")
				.queryParam("addressdetails", "1")
				.queryParam("limit", Integer.toString(limit))
				.build()
				.toUri();
		try {
			String body = restClient.get().uri(uri).retrieve().body(String.class);
			if (body == null || body.isBlank()) {
				return List.of();
			}
			JsonNode root = objectMapper.readTree(body);
			if (!root.isArray() || root.isEmpty()) {
				return List.of();
			}
			List<PlaceLocateSuggestionResponse> out = new ArrayList<>();
			Set<String> dedupe = new LinkedHashSet<>();
			for (JsonNode hit : root) {
				Optional<PlaceLocateSuggestionResponse> parsed = parseSuggestionHit(hit);
				if (parsed.isEmpty()) continue;
				PlaceLocateSuggestionResponse item = parsed.get();
				String key = item.name().trim().toLowerCase(Locale.ROOT);
				if (!dedupe.add(key)) continue;
				out.add(item);
				if (out.size() >= limit) break;
			}
			return out;
		}
		catch (Exception e) {
			log.warn("Nominatim postal suggest failed for postal={} country={}: {}", digits, country, e.getMessage());
			return List.of();
		}
	}

	public record GeoPoint(double lat, double lng) {
	}

	/** Geocoding inverso (coordinate WGS84 → comune/CAP) tramite Nominatim. */
	public Optional<ReverseLocateResponse> reverseLocate(double lat, double lng) {
		if (lat < -90.0 || lat > 90.0 || lng < -180.0 || lng > 180.0) {
			return Optional.empty();
		}
		URI uri = UriComponentsBuilder.newInstance()
				.scheme("https")
				.host("nominatim.openstreetmap.org")
				.path("/reverse")
				.queryParam("lat", Double.toString(lat))
				.queryParam("lon", Double.toString(lng))
				.queryParam("format", "json")
				.queryParam("addressdetails", "1")
				.queryParam("zoom", "18")
				.build()
				.toUri();
		try {
			String body = restClient.get().uri(uri).retrieve().body(String.class);
			if (body == null || body.isBlank()) {
				return Optional.empty();
			}
			JsonNode hit = objectMapper.readTree(body);
			return parseReverseHit(hit);
		}
		catch (Exception e) {
			log.warn("Nominatim reverse failed for lat={} lng={}: {}", lat, lng, e.getMessage());
			return Optional.empty();
		}
	}

	/**
	 * Geocoding diretto (indirizzo → coordinate WGS84) tramite Nominatim.
	 */
	public Optional<GeoPoint> geocode(String queryRaw, String countryCodeRaw) {
		String query = queryRaw != null ? queryRaw.trim() : "";
		String country = countryCodeRaw != null ? countryCodeRaw.trim().toUpperCase(Locale.ROOT) : "";
		if (query.length() < 3) {
			return Optional.empty();
		}
		if (!country.matches("^[A-Z]{2}$")) {
			return Optional.empty();
		}
		URI uri = UriComponentsBuilder.newInstance()
				.scheme("https")
				.host("nominatim.openstreetmap.org")
				.path("/search")
				.queryParam("q", query)
				.queryParam("countrycodes", country.toLowerCase(Locale.ROOT))
				.queryParam("format", "json")
				.queryParam("addressdetails", "0")
				.queryParam("limit", "1")
				.build()
				.toUri();
		try {
			String body = restClient.get().uri(uri).retrieve().body(String.class);
			if (body == null || body.isBlank()) {
				return Optional.empty();
			}
			JsonNode root = objectMapper.readTree(body);
			if (!root.isArray() || root.isEmpty()) {
				return Optional.empty();
			}
			return parseGeoPoint(root.get(0));
		}
		catch (Exception e) {
			log.warn("Nominatim geocode failed for query='{}' country={}: {}", query, country, e.getMessage());
			return Optional.empty();
		}
	}

	private Optional<GeoPoint> parseGeoPoint(JsonNode hit) {
		if (hit == null || hit.isNull()) {
			return Optional.empty();
		}
		JsonNode latNode = hit.get("lat");
		JsonNode lonNode = hit.get("lon");
		if (latNode == null || lonNode == null) {
			return Optional.empty();
		}
		double lat;
		double lng;
		try {
			lat = latNode.isNumber() ? latNode.doubleValue() : Double.parseDouble(latNode.asText());
			lng = lonNode.isNumber() ? lonNode.doubleValue() : Double.parseDouble(lonNode.asText());
		}
		catch (NumberFormatException e) {
			return Optional.empty();
		}
		if (lat < -90.0 || lat > 90.0 || lng < -180.0 || lng > 180.0) {
			return Optional.empty();
		}
		return Optional.of(new GeoPoint(lat, lng));
	}

	public List<PlaceLocateSuggestionResponse> suggestPlaces(String queryRaw, String countryCodeRaw, int limitRaw) {
		String query = queryRaw != null ? queryRaw.trim() : "";
		String country = countryCodeRaw != null ? countryCodeRaw.trim().toUpperCase(Locale.ROOT) : "";
		if (query.length() < 2) {
			return List.of();
		}
		if (!country.matches("^[A-Z]{2}$")) {
			return List.of();
		}
		int limit = Math.max(1, Math.min(limitRaw, 100));

		URI uri = UriComponentsBuilder.newInstance()
				.scheme("https")
				.host("nominatim.openstreetmap.org")
				.path("/search")
				.queryParam("q", query)
				.queryParam("countrycodes", country.toLowerCase(Locale.ROOT))
				.queryParam("format", "json")
				.queryParam("addressdetails", "1")
				.queryParam("limit", Integer.toString(limit))
				.build()
				.toUri();

		try {
			String body = restClient.get().uri(uri).retrieve().body(String.class);
			if (body == null || body.isBlank()) {
				return List.of();
			}
			JsonNode root = objectMapper.readTree(body);
			if (!root.isArray() || root.isEmpty()) {
				return List.of();
			}
			List<PlaceLocateSuggestionResponse> out = new ArrayList<>();
			Set<String> dedupe = new LinkedHashSet<>();
			for (JsonNode hit : root) {
				Optional<PlaceLocateSuggestionResponse> parsed = parseSuggestionHit(hit);
				if (parsed.isEmpty()) {
					continue;
				}
				PlaceLocateSuggestionResponse item = parsed.get();
				String key = item.name().trim().toLowerCase(Locale.ROOT);
				if (dedupe.add(key)) {
					out.add(item);
				}
				if (out.size() >= limit) {
					break;
				}
			}
			return out;
		}
		catch (Exception e) {
			log.warn("Nominatim suggest failed for query='{}' country={}: {}", query, country, e.getMessage());
			return List.of();
		}
	}

	private Optional<ReverseLocateResponse> parseReverseHit(JsonNode hit) {
		if (hit == null || hit.isNull()) {
			return Optional.empty();
		}
		JsonNode addr = hit.get("address");
		if (addr == null || !addr.isObject()) {
			return Optional.empty();
		}
		String city = firstNonBlank(
				text(addr, "city"),
				text(addr, "town"),
				text(addr, "village"),
				text(addr, "municipality"),
				text(addr, "hamlet"),
				text(addr, "suburb"),
				text(addr, "county"),
				text(addr, "state"));
		if (city == null && hit.hasNonNull("display_name")) {
			String dn = hit.get("display_name").asText();
			if (dn != null && !dn.isBlank()) {
				int comma = dn.indexOf(',');
				city = (comma > 0 ? dn.substring(0, comma) : dn).trim();
			}
		}
		if (city == null || city.isBlank()) {
			return Optional.empty();
		}
		String postalCode = text(addr, "postcode");
		String ccRaw = text(addr, "country_code");
		String cc = ccRaw != null ? ccRaw.toUpperCase(Locale.ROOT) : "";
		String display = hit.hasNonNull("display_name") ? hit.get("display_name").asText() : city;
		return Optional.of(new ReverseLocateResponse(city.trim(), postalCode, cc, display));
	}

	private Optional<PostalLocateResponse> parseHit(JsonNode hit) {
		JsonNode addr = hit.get("address");
		if (addr == null || !addr.isObject()) {
			return Optional.empty();
		}
		String place = firstNonBlank(
				text(addr, "city"),
				text(addr, "town"),
				text(addr, "village"),
				text(addr, "municipality"),
				text(addr, "hamlet"),
				text(addr, "suburb"),
				text(addr, "county"));
		if (place == null) {
			return Optional.empty();
		}
		String ccRaw = text(addr, "country_code");
		String cc = ccRaw != null ? ccRaw.toUpperCase(Locale.ROOT) : "";
		String countryName = text(addr, "country");
		String display = hit.hasNonNull("display_name") ? hit.get("display_name").asText() : place;
		return Optional.of(new PostalLocateResponse(place.trim(), cc, countryName, display));
	}

	private Optional<PlaceLocateSuggestionResponse> parseSuggestionHit(JsonNode hit) {
		JsonNode addr = hit.get("address");
		String name = null;
		String ccRaw = null;
		String countryName = null;
		if (addr != null && addr.isObject()) {
			name = firstNonBlank(
					text(addr, "city"),
					text(addr, "town"),
					text(addr, "village"),
					text(addr, "municipality"),
					text(addr, "hamlet"),
					text(addr, "suburb"),
					text(addr, "county"),
					text(addr, "state"),
					text(addr, "country"));
			ccRaw = text(addr, "country_code");
			countryName = text(addr, "country");
		}
		if (name == null && hit.hasNonNull("name") && hit.get("name").isTextual()) {
			String n = hit.get("name").asText();
			if (n != null && !n.isBlank()) {
				name = n.trim();
			}
		}
		if (name == null && hit.hasNonNull("display_name")) {
			String dn = hit.get("display_name").asText();
			if (dn != null && !dn.isBlank()) {
				int comma = dn.indexOf(',');
				name = (comma > 0 ? dn.substring(0, comma) : dn).trim();
			}
		}
		if (name == null || name.isBlank()) {
			return Optional.empty();
		}
		String cc = ccRaw != null ? ccRaw.toUpperCase(Locale.ROOT) : "";
		String display = hit.hasNonNull("display_name") ? hit.get("display_name").asText() : name;
		return Optional.of(new PlaceLocateSuggestionResponse(name.trim(), display, cc, countryName));
	}

	private static String text(JsonNode node, String field) {
		JsonNode v = node.get(field);
		if (v == null || !v.isTextual()) {
			return null;
		}
		String s = v.asText();
		return s != null && !s.isBlank() ? s : null;
	}

	private static String firstNonBlank(String... values) {
		if (values == null) {
			return null;
		}
		for (String v : values) {
			if (v != null && !v.isBlank()) {
				return v;
			}
		}
		return null;
	}
}
