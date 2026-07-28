package it.luxury.studio.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record MeSalonServiceCreateRequest(
		@NotBlank @Size(max = 200) String name,
		@Min(5) @Max(24 * 60) int durationMinutes,
		@Min(0) int priceCents,
		@Size(max = 2000) String description,
		List<UUID> operatorIds) {
	public MeSalonServiceCreateRequest {
		operatorIds = operatorIds == null ? List.of() : List.copyOf(operatorIds);
	}
}
