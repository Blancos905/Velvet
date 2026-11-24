package it.luxury.studio.dto;

import it.luxury.publicapi.dto.RegistrationSalonLocation;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Aggiorna la sede principale e aggiunge sedi durante l’attivazione Premium di un titolare già registrato.
 */
public record SalonRegistrationLocationsUpdateRequest(
		@NotNull RegistrationSalonLocation primaryLocation,
		@Size(max = 19) List<RegistrationSalonLocation> additionalLocations,
		List<String> salonBusinessTypes,
		List<String> salonClientGenders) {
}
