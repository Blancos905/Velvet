package it.luxury.publicapi.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Posizione approssimata della connessione (PC senza GPS o pagina non HTTPS)")
public record NetworkLocateResponse(
		@Schema(description = "Latitudine WGS84")
		double lat,
		@Schema(description = "Longitudine WGS84")
		double lng) {
}
