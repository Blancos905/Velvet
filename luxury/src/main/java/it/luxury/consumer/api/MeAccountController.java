package it.luxury.consumer.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.luxury.consumer.service.ConsumerAccountService;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import it.luxury.security.auth.LuxuryUserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/account")
@Tag(name = "Account /me (cliente o titolare salone)")
public class MeAccountController {

	private final ConsumerAccountService consumerAccountService;

	public MeAccountController(ConsumerAccountService consumerAccountService) {
		this.consumerAccountService = consumerAccountService;
	}

	@DeleteMapping
	@Operation(
			summary = "Elimina account (profilo /me)",
			description = """
					Soft-delete del ConsumerProfile (anonimizzazione PII).
					Idempotente (204 anche se già eliminato). Consentito con **ROLE_CLIENT** (cliente) o **ROLE_OWNER** (titolare da /piani) fino a split dedicato su `/studio`.
					""",
			security = @SecurityRequirement(name = "bearer-jwt"))
	@ApiResponse(responseCode = "204", description = "Account chiuso o già chiuso")
	@ApiResponse(responseCode = "401", description = "Token non valido (resource server attivo)")
	@ApiResponse(responseCode = "403", description = "Utente anonimo o JWT senza ROLE_CLIENT / ROLE_OWNER")
	@PreAuthorize("hasAnyAuthority('ROLE_CLIENT','ROLE_OWNER')")
		public ResponseEntity<Void> deleteAccount(
				@AuthenticationPrincipal LuxuryUserPrincipal principal,
				@RequestBody(required = false) DeleteAccountBody body) {
			consumerAccountService.deleteOwnAccount(
					principal.getSubject(), body == null ? null : body.currentPassword());
			return ResponseEntity.noContent().build();
		}

		public record DeleteAccountBody(@Size(max = 200) String currentPassword) {
		}
	}
