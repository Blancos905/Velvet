package it.luxury.consumer.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.service.ConsumerProfileService;
import it.luxury.security.auth.LuxuryUserPrincipal;
import jakarta.validation.constraints.Email;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/profile")
@Tag(name = "Account consumatore (/me)")
@SecurityRequirement(name = "bearer-jwt")
public class MeProfileController {

	private final ConsumerProfileService consumerProfileService;

	public MeProfileController(ConsumerProfileService consumerProfileService) {
		this.consumerProfileService = consumerProfileService;
	}

	@GetMapping
	@Operation(summary = "Profilo consumatore")
	@PreAuthorize("hasAnyAuthority('ROLE_CLIENT','ROLE_OWNER','ROLE_STAFF','ROLE_ADMIN')")
	public ProfileDto get(@AuthenticationPrincipal LuxuryUserPrincipal principal) {
		ConsumerProfile p = consumerProfileService.requireActiveProfile(principal);
		return ProfileDto.from(p);
	}

	@PatchMapping
	@Operation(summary = "Aggiorna campi consentiti")
	@PreAuthorize("hasAnyAuthority('ROLE_CLIENT','ROLE_OWNER','ROLE_STAFF','ROLE_ADMIN')")
	public ProfileDto patch(@AuthenticationPrincipal LuxuryUserPrincipal principal, @RequestBody @Valid ProfilePatchBody body) {
			ConsumerProfile p = consumerProfileService.updateProfile(
					principal,
					body.email(),
					body.displayName(),
					body.phone(),
					body.country(),
					body.preferredLocale(),
					body.currentPassword());
		return ProfileDto.from(p);
	}

	@PatchMapping("/photo")
	@Operation(summary = "Imposta o rimuove l'immagine profilo (stringa vuota = rimuovi)")
	@PreAuthorize("hasAnyAuthority('ROLE_CLIENT','ROLE_OWNER','ROLE_STAFF','ROLE_ADMIN')")
	public ProfileDto updatePhoto(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@RequestBody @Valid ProfilePhotoBody body) {
		ConsumerProfile p = consumerProfileService.updateProfilePhoto(principal, body.photoDataUrl());
		return ProfileDto.from(p);
	}

	@PostMapping("/password")
	@Operation(summary = "Aggiorna password account")
	@PreAuthorize("hasAnyAuthority('ROLE_CLIENT','ROLE_OWNER','ROLE_STAFF','ROLE_ADMIN')")
	public void changePassword(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@RequestBody @Valid PasswordChangeBody body) {
		if (body.newPassword() == null || !body.newPassword().equals(body.confirmPassword())) {
			throw new it.luxury.common.api.BusinessException(
					org.springframework.http.HttpStatus.BAD_REQUEST,
					"VALIDATION_ERROR",
					"Conferma password non coerente.");
		}
		consumerProfileService.changePassword(principal, body.currentPassword(), body.newPassword());
	}

		public record ProfileDto(
				java.util.UUID id,
				String email,
				String displayName,
				String phone,
				String country,
				String preferredLocale,
				String photoDataUrl,
				boolean emailVerified) {
			public static ProfileDto from(ConsumerProfile p) {
				return new ProfileDto(
						p.getId(),
						p.getEmail(),
						p.getDisplayName(),
						p.getPhone(),
						p.getCountry(),
						p.getPreferredLocale(),
						p.getPhotoDataUrl(),
						p.getEmailVerifiedAt() != null);
			}
		}

	/** Stringa vuota rimuove la foto. {@code null} non è accettato. */
	public record ProfilePhotoBody(@Size(max = 1_500_000) String photoDataUrl) {
	}

	public record ProfilePatchBody(
			@Email @Size(max = 320) String email,
			@Size(max = 200) String displayName,
			@Size(max = 40) String phone,
				@Pattern(regexp = "^[A-Z]{2}$", message = "Paese: usa codice ISO a 2 lettere (es. IT)") String country,
				@Pattern(regexp = "^(it|en|fr|de|es|pt)$", message = "Lingua UI non supportata") String preferredLocale,
				@Size(max = 200) String currentPassword) {
		}

	public record PasswordChangeBody(
			@Size(min = 1, max = 200) String currentPassword,
			@Size(min = 8, max = 200) String newPassword,
			@Size(min = 8, max = 200) String confirmPassword) {
	}
}
