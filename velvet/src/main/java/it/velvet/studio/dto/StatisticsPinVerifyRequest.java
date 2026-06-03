package it.velvet.studio.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record StatisticsPinVerifyRequest(
		@NotBlank @Size(min = 4, max = 12) @Pattern(regexp = "\\d+") String pin) {
}
