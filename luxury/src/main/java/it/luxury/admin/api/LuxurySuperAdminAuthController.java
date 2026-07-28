package it.luxury.admin.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.luxury.admin.service.SuperAdminSelfRegistrationService;
import it.luxury.admin.service.LuxurySuperAdminAuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/auth")
@Tag(name = "Super admin — autenticazione")
public class LuxurySuperAdminAuthController {

	private final LuxurySuperAdminAuthService superAdminAuthService;
	private final SuperAdminSelfRegistrationService selfRegistrationService;

	public LuxurySuperAdminAuthController(
			LuxurySuperAdminAuthService superAdminAuthService,
			SuperAdminSelfRegistrationService selfRegistrationService) {
		this.superAdminAuthService = superAdminAuthService;
		this.selfRegistrationService = selfRegistrationService;
	}

	@GetMapping("/register-available")
	@Operation(summary = "Indica se la registrazione super admin (prima installazione) è consentita")
	public SuperAdminRegisterAvailabilityResponse registerAvailable() {
		return new SuperAdminRegisterAvailabilityResponse(selfRegistrationService.registrationAvailable());
	}

	@PostMapping("/register")
	@Operation(summary = "Crea credenziali super admin (richiede luxury.super-admin.setup-token e nessuna config via proprietà)")
	public ResponseEntity<Void> register(@RequestBody @Valid SuperAdminRegisterRequest body) {
		selfRegistrationService.register(body.setupToken(), body.username(), body.password());
		return ResponseEntity.status(HttpStatus.CREATED).build();
	}

	@PostMapping("/login")
	@Operation(summary = "Login super admin (JWT con ROLE_ADMIN)")
	public SuperAdminAuthLoginResponse login(@RequestBody @Valid SuperAdminLoginRequest body) {
		var r = superAdminAuthService.login(body.username(), body.password());
		return new SuperAdminAuthLoginResponse(r.accessToken(), "Bearer", r.expiresInSeconds());
	}

	public record SuperAdminRegisterAvailabilityResponse(boolean available) {
	}

	public record SuperAdminRegisterRequest(
			@NotBlank @Size(min = 8, max = 512) String setupToken,
			@NotBlank @Email @Size(max = 320) String username,
			@NotBlank @Size(min = 8, max = 200) String password) {
	}

	public record SuperAdminLoginRequest(
			@NotBlank @Size(max = 320) String username,
			@NotBlank @Size(max = 256) String password) {
	}

	public record SuperAdminAuthLoginResponse(String accessToken, String tokenType, long expiresInSeconds) {
	}
}
