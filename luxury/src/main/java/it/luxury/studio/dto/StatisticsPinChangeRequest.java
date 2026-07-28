package it.luxury.studio.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record StatisticsPinChangeRequest(
		@Size(min = 4, max = 12) @Pattern(regexp = "\\d+") String currentPin,
		@NotBlank @Size(min = 4, max = 12) @Pattern(regexp = "\\d+") String newPin,
		@NotBlank @Size(min = 4, max = 12) @Pattern(regexp = "\\d+") String confirmNewPin) {
}
