package it.luxury.studio.dto;

import jakarta.validation.constraints.Size;

/**
 * Aggiornamento foto operatore da account staff. {@code photoDataUrl} vuota o assente azzera la foto.
 */
public record MeStaffOperatorPhotoPatchRequest(@Size(max = 12_000_000) String photoDataUrl) {
}
