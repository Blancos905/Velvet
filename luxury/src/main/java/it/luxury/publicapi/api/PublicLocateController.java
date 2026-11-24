package it.luxury.publicapi.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.luxury.publicapi.dto.NetworkLocateResponse;
import it.luxury.publicapi.dto.PlaceLocateSuggestionResponse;
import it.luxury.publicapi.dto.PostalLocateResponse;
import it.luxury.publicapi.dto.ReverseLocateResponse;
import it.luxury.publicapi.service.NetworkLocateService;
import it.luxury.publicapi.service.PostalLocateService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/public")
@Tag(name = "Pubblico — geocoding")
public class PublicLocateController {

	private final PostalLocateService postalLocateService;
	private final NetworkLocateService networkLocateService;

	public PublicLocateController(
			PostalLocateService postalLocateService,
			NetworkLocateService networkLocateService) {
		this.postalLocateService = postalLocateService;
		this.networkLocateService = networkLocateService;
	}

	@GetMapping("/locate-by-postal")
	@Operation(summary = "Risolve CAP/postcode in città/comune per qualsiasi paese ISO (Nominatim)")
	public ResponseEntity<PostalLocateResponse> locateByPostal(
			@RequestParam String postalCode,
			@RequestParam String countryCode) {
		return postalLocateService.locate(postalCode, countryCode)
				.map(ResponseEntity::ok)
				.orElse(ResponseEntity.notFound().build());
	}

	@GetMapping("/locate-by-place")
	@Operation(summary = "Suggerisce città/comuni/paesi per input testuale")
	public List<PlaceLocateSuggestionResponse> locateByPlace(
			@RequestParam String query,
			@RequestParam String countryCode,
			@RequestParam(defaultValue = "8") int limit) {
		return postalLocateService.suggestPlaces(query, countryCode, limit);
	}

	@GetMapping("/locate-by-postal-suggestions")
	@Operation(summary = "Suggerisce più città/comuni a partire dal CAP")
	public List<PlaceLocateSuggestionResponse> locateByPostalSuggestions(
			@RequestParam String postalCode,
			@RequestParam String countryCode,
			@RequestParam(defaultValue = "8") int limit) {
		return postalLocateService.suggestPlacesByPostal(postalCode, countryCode, limit);
	}

	@GetMapping("/locate-by-network")
	@Operation(summary = "Posizione approssimata della connessione (PC senza GPS o pagina HTTP non sicura)")
	public ResponseEntity<NetworkLocateResponse> locateByNetwork(HttpServletRequest request) {
		return networkLocateService.locate(request.getRemoteAddr(), request.getHeader("X-Forwarded-For"))
				.map(ResponseEntity::ok)
				.orElse(ResponseEntity.notFound().build());
	}

	@GetMapping("/locate-by-coordinates")
	@Operation(summary = "Geocoding inverso: coordinate GPS → comune/CAP (per ricerca saloni)")
	public ResponseEntity<ReverseLocateResponse> locateByCoordinates(
			@RequestParam double lat,
			@RequestParam double lon) {
		return postalLocateService.reverseLocate(lat, lon)
				.map(ResponseEntity::ok)
				.orElse(ResponseEntity.notFound().build());
	}
}
