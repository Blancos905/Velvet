package it.luxury.publicapi.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.luxury.consumer.service.LuxuryAccountRegistrationService;
import it.luxury.publicapi.dto.ClientRegistrationRequest;
import it.luxury.publicapi.dto.RegistrationCreatedResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/client-registration")
@Tag(name = "Pubblico — registrazione cliente (consumatore)")
public class PublicClientRegistrationController {

	private final LuxuryAccountRegistrationService luxuryAccountRegistrationService;

	public PublicClientRegistrationController(LuxuryAccountRegistrationService luxuryAccountRegistrationService) {
		this.luxuryAccountRegistrationService = luxuryAccountRegistrationService;
	}

	@PostMapping
	@Operation(summary = "Crea account cliente (form /registrati: ruolo CLIENT)")
		public ResponseEntity<RegistrationCreatedResponse> register(@Valid @RequestBody ClientRegistrationRequest body) {
			String pollSecret = luxuryAccountRegistrationService.registerBookingClient(
					body.email(),
					body.password(),
					body.firstName(),
					body.lastName(),
					body.country(),
					body.preferredLocale(),
					body.phone() != null ? body.phone() : "",
					Boolean.TRUE.equals(body.bootstrapSuperAdmin()),
					body.legalDocumentVersion());
			return ResponseEntity.status(HttpStatus.CREATED)
					.body(
							new RegistrationCreatedResponse(
									"Abbiamo inviato un'email di conferma. Clicca il link per attivare l'account, poi accedi.",
									true,
									null,
									pollSecret));
		}
}
