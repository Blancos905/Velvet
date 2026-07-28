package it.luxury.studio.dto;

import it.luxury.appointment.domain.OperatorTimeBlock;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.UUID;

public final class OperatorTimeBlockDtos {

	private OperatorTimeBlockDtos() {
	}

	public record OperatorTimeBlockDto(
			UUID id,
			Instant start,
			Instant end,
			String note) {

		public static OperatorTimeBlockDto from(OperatorTimeBlock block) {
			return new OperatorTimeBlockDto(
					block.getId(),
					block.getStartsAt(),
					block.getEndsAt(),
					block.getNote());
		}
	}

	public record CreateOperatorTimeBlockRequest(
			@NotNull Instant start,
			@NotNull Instant end,
			String note) {
	}

	public record UpdateOperatorTimeBlockRequest(
			@NotNull Instant start,
			@NotNull Instant end,
			String note) {
	}
}
