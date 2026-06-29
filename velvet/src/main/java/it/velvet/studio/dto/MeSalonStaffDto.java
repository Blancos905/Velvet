package it.velvet.studio.dto;

import it.velvet.catalog.domain.StaffOperator;

import java.util.UUID;

public record MeSalonStaffDto(
		UUID id,
		String firstName,
		String lastName,
		String displayName,
		String role,
		String photoDataUrl,
		boolean loginEnabled,
		Integer workMorningStartMinuteOfDay,
		Integer workMorningEndMinuteOfDay,
		Integer workAfternoonStartMinuteOfDay,
		Integer workAfternoonEndMinuteOfDay) {

	public static MeSalonStaffDto from(StaffOperator o) {
		String firstName = normalize(o.getFirstName());
		String lastName = normalize(o.getLastName());
		String role = normalize(o.getRole());
		String displayName = normalize(o.getDisplayName());
		return new MeSalonStaffDto(
				o.getId(),
				firstName,
				lastName,
				displayName,
				role.isBlank() ? "Staff" : role,
				normalizeNullable(o.getPhotoDataUrl()),
				o.getConsumerProfile() != null,
				o.getWorkMorningStartMinuteOfDay(),
				o.getWorkMorningEndMinuteOfDay(),
				o.getWorkAfternoonStartMinuteOfDay(),
				o.getWorkAfternoonEndMinuteOfDay());
	}

	private static String normalize(String v) {
		return v == null ? "" : v.trim();
	}

	private static String normalizeNullable(String v) {
		if (v == null) return null;
		String t = v.trim();
		return t.isEmpty() ? null : t;
	}
}
