package it.velvet.admin.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.velvet.admin.service.SuperAdminSelfRegistrationService;
import it.velvet.admin.service.VelvetSuperAdminAuthService;
import it.velvet.consumer.service.VelvetAccountRegistrationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/status")
@Tag(name = "Super admin — stato")
public class SuperAdminStatusController {

	private final VelvetSuperAdminAuthService superAdminAuthService;
	private final VelvetAccountRegistrationService accountRegistrationService;
	private final SuperAdminSelfRegistrationService selfRegistrationService;

	public SuperAdminStatusController(
			VelvetSuperAdminAuthService superAdminAuthService,
			VelvetAccountRegistrationService accountRegistrationService,
			SuperAdminSelfRegistrationService selfRegistrationService) {
		this.superAdminAuthService = superAdminAuthService;
		this.accountRegistrationService = accountRegistrationService;
		this.selfRegistrationService = selfRegistrationService;
	}

	@GetMapping
	@Operation(summary = "Versione runtime e flag configurazione super admin")
	public SuperAdminStatusResponse status() {
		return new SuperAdminStatusResponse(
				"velvet",
				Runtime.version().toString(),
				System.getProperty("java.version", ""),
				superAdminAuthService.isConfigured(),
				accountRegistrationService.isClientSuperAdminBootstrapAvailable(),
				selfRegistrationService.registrationAvailable());
	}

	public record SuperAdminStatusResponse(
			String application,
			String javaRuntimeVersion,
			String javaVersionProperty,
			boolean superAdminConfigured,
			boolean clientSuperAdminBootstrapAvailable,
			boolean setupTokenRegisterAvailable) {
	}
}
