package it.velvet.admin.dto;

import java.time.Instant;
import java.util.UUID;

public record SuperAdminConsumerRow(
		UUID id,
		String email,
		String displayName,
		String securityRoles,
		String planTier,
		Instant deletedAt) {
}
