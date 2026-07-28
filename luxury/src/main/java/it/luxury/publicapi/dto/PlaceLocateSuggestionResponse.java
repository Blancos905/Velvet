package it.luxury.publicapi.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Suggerimento luogo per input città/comune")
public record PlaceLocateSuggestionResponse(
		@Schema(description = "Nome sintetico (città/comune/paese)")
		String name,
		@Schema(description = "Etichetta completa dal geocoder")
		String displayName,
		@Schema(description = "Codice paese ISO (es. IT)")
		String countryCode,
		@Schema(description = "Nome paese in italiano quando disponibile")
		String countryName) {
}
