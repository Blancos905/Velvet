package it.luxury.publicapi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import it.luxury.publicapi.dto.NetworkLocateResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Optional;

/**
 * Posizione approssimata della connessione (ipwho.is), per il browser desktop
 * quando il GPS non è disponibile: PC senza modulo GPS, oppure pagina aperta in HTTP non locale.
 */
@Service
public class NetworkLocateService {

	private static final Logger log = LoggerFactory.getLogger(NetworkLocateService.class);

	private static final String USER_AGENT = "SaloniLuxury/1.0 (https://www.saloniluxury.it; network-locate)";
	private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(3);
	private static final Duration READ_TIMEOUT = Duration.ofSeconds(5);

	private final RestClient restClient;
	private final ObjectMapper objectMapper;

	public NetworkLocateService(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
		var httpClient = HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build();
		var requestFactory = new JdkClientHttpRequestFactory(httpClient);
		requestFactory.setReadTimeout(READ_TIMEOUT);
		this.restClient = RestClient.builder()
				.requestFactory(requestFactory)
				.defaultHeader(HttpHeaders.USER_AGENT, USER_AGENT)
				.defaultHeader(HttpHeaders.ACCEPT, "application/json")
				.build();
	}

	public Optional<NetworkLocateResponse> locate(String remoteAddr, String forwardedFor) {
		Optional<String> publicIp = ClientNetworkAddress.publicClientIp(remoteAddr, forwardedFor);
		URI uri = publicIp.map(NetworkLocateService::uriForIp).orElseGet(() -> URI.create("https://ipwho.is/"));
		try {
			String body = restClient.get().uri(uri).retrieve().body(String.class);
			if (body == null || body.isBlank()) {
				return Optional.empty();
			}
			return parse(objectMapper.readTree(body));
		}
		catch (Exception e) {
			log.warn("Network locate failed: {}", e.getMessage());
			return Optional.empty();
		}
	}

	static Optional<NetworkLocateResponse> parse(JsonNode root) {
		if (root == null || root.isNull() || !root.path("success").asBoolean(false)) {
			return Optional.empty();
		}
		Double lat = readCoord(root.get("latitude"));
		Double lng = readCoord(root.get("longitude"));
		if (lat == null || lng == null) {
			return Optional.empty();
		}
		if (lat < -90.0 || lat > 90.0 || lng < -180.0 || lng > 180.0) {
			return Optional.empty();
		}
		if (lat == 0.0 && lng == 0.0) {
			return Optional.empty();
		}
		return Optional.of(new NetworkLocateResponse(lat, lng));
	}

	private static Double readCoord(JsonNode node) {
		if (node == null || node.isNull()) {
			return null;
		}
		try {
			return node.isNumber() ? node.doubleValue() : Double.parseDouble(node.asText().trim());
		}
		catch (NumberFormatException e) {
			return null;
		}
	}

	private static URI uriForIp(String ip) {
		return UriComponentsBuilder.newInstance()
				.scheme("https")
				.host("ipwho.is")
				.pathSegment(ip)
				.build()
				.toUri();
	}
}
