package it.velvet.studio.dto;

import it.velvet.catalog.domain.StaffOperator;

import java.util.UUID;

/** Profilo operatore collegato all'account staff ({@code GET/PATCH /api/v1/me/staff/operator-profile}). */
public record MeStaffOperatorSelfDto(UUID id, String firstName, String lastName, String role, String photoDataUrl) {

	public static MeStaffOperatorSelfDto from(StaffOperator o) {
		String firstName = nz(o.getFirstName());
		String lastName = nz(o.getLastName());
		String role = nz(o.getRole());
		return new MeStaffOperatorSelfDto(
				o.getId(),
				firstName,
				lastName,
				role.isBlank() ? "Staff" : role,
				blankToNull(o.getPhotoDataUrl()));
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
