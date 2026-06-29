package it.velvet.publicapi.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.velvet.publicapi.dto.PlaceLocateSuggestionResponse;
import it.velvet.publicapi.dto.PostalLocateResponse;
import it.velvet.publicapi.dto.ReverseLocateResponse;
import it.velvet.publicapi.service.PostalLocateService;
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

	public PublicLocateController(PostalLocateService postalLocateService) {
		this.postalLocateService = postalLocateService;
	}

	@GetMapping("/locate-by-postal")
	@Operation(summary = "Risolve CAP in città/comune (per ricerca saloni)")
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
