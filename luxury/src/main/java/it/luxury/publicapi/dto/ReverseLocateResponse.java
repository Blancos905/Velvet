package it.luxury.publicapi.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Risultato geocoding inverso (coordinate → comune/CAP)")
public record ReverseLocateResponse(
		@Schema(description = "Comune o località da usare come filtro ricerca")
		String city,
		@Schema(description = "CAP quando disponibile dal geocoder")
		String postalCode,
		@Schema(description = "Codice paese ISO (es. IT)")
		String countryCode,
		@Schema(description = "Etichetta completa dal geocoder")
		String displayName) {
}
