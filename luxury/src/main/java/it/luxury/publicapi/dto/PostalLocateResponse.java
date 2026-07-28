package it.luxury.publicapi.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Risultato risoluzione CAP → luogo (per filtro ricerca sedi)")
public record PostalLocateResponse(
		@Schema(description = "Nome comune/città da usare come parametro `city` nella ricerca saloni")
		String city,
		@Schema(description = "Codice paese ISO (es. IT)")
		String countryCode,
		@Schema(description = "Nome paese in italiano quando disponibile")
		String countryName,
		@Schema(description = "Etichetta completa dal geocoder")
		String displayName) {
}
