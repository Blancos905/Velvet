package it.luxury.studio.dto;

import it.luxury.catalog.domain.StaffOperator;

import java.util.UUID;

/** Profilo operatore collegato all'account staff ({@code GET/PATCH /api/v1/me/staff/operator-profile}). */
public record MeStaffOperatorSelfDto(
		UUID id,
		String firstName,
		String lastName,
		String role,
		String photoDataUrl,
		boolean requireBookingConfirmation,
		/** Media voti verso l'operatore (1–5); {@code null} se nessuna recensione con {@code staff_rating}. */
		Double averageStaffRating,
		/** Numero di recensioni con voto operatore; {@code null} se zero. */
		Long staffReviewCount) {

	public static MeStaffOperatorSelfDto from(StaffOperator o) {
		return from(o, null, null);
	}

	public static MeStaffOperatorSelfDto from(StaffOperator o, Double averageStaffRating, Long staffReviewCount) {
		String firstName = nz(o.getFirstName());
		String lastName = nz(o.getLastName());
		String role = nz(o.getRole());
		Long count = staffReviewCount != null && staffReviewCount > 0 ? staffReviewCount : null;
		Double avg = count != null ? averageStaffRating : null;
		return new MeStaffOperatorSelfDto(
				o.getId(),
				firstName,
				lastName,
				role.isBlank() ? "Staff" : role,
				blankToNull(o.getPhotoDataUrl()),
				o.isRequireBookingConfirmation(),
				avg,
				count);
	}

	private static String nz(String v) {
		return v == null ? "" : v.trim();
	}

	private static String blankToNull(String v) {
		if (v == null) return null;
		String t = v.trim();
		return t.isEmpty() ? null : t;
	}
}
