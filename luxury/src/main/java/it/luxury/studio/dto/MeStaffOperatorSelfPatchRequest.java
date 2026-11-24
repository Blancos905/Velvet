package it.luxury.studio.dto;

import jakarta.validation.constraints.Size;

/**
 * Aggiornamento profilo operatore da account staff.
 * <ul>
 *   <li>{@code photoDataUrl} assente ({@code null}): non modifica la foto; stringa vuota: azzera la foto.</li>
 *   <li>{@code requireBookingConfirmation} assente ({@code null}): non modifica la preferenza.</li>
 * </ul>
 */
public record MeStaffOperatorSelfPatchRequest(
		@Size(max = 12_000_000) String photoDataUrl,
		Boolean requireBookingConfirmation) {
}
