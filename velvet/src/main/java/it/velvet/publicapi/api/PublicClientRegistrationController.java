package it.velvet.publicapi.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.velvet.consumer.service.VelvetAccountRegistrationService;
import it.velvet.publicapi.dto.ClientRegistrationRequest;
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

	private final VelvetAccountRegistrationService velvetAccountRegistrationService;

	public PublicClientRegistrationController(VelvetAccountRegistrationService velvetAccountRegistrationService) {
		this.velvetAccountRegistrationService = velvetAccountRegistrationService;
	}

	@PostMapping
	@Operation(summary = "Crea account cliente (form /registrati: ruolo CLIENT)")
	public ResponseEntity<Void> register(@Valid @RequestBody ClientRegistrationRequest body) {
		velvetAccountRegistrationService.registerBookingClient(
				body.email(),
				body.password(),
				body.firstName(),
				body.lastName(),
				body.country(),
				body.phone() != null ? body.phone() : "",
				Boolean.TRUE.equals(body.bootstrapSuperAdmin()),
				body.legalDocumentVersion());
		return ResponseEntity.status(HttpStatus.CREATED).build();
	}
}
