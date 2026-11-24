package it.luxury.admin.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.luxury.admin.service.SuperAdminSelfRegistrationService;
import it.luxury.admin.service.LuxurySuperAdminAuthService;
import it.luxury.consumer.service.LuxuryAccountRegistrationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/status")
@Tag(name = "Super admin — stato")
public class SuperAdminStatusController {

	private final LuxurySuperAdminAuthService superAdminAuthService;
	private final LuxuryAccountRegistrationService accountRegistrationService;
	private final SuperAdminSelfRegistrationService selfRegistrationService;

	public SuperAdminStatusController(
			LuxurySuperAdminAuthService superAdminAuthService,
			LuxuryAccountRegistrationService accountRegistrationService,
			SuperAdminSelfRegistrationService selfRegistrationService) {
		this.superAdminAuthService = superAdminAuthService;
		this.accountRegistrationService = accountRegistrationService;
		this.selfRegistrationService = selfRegistrationService;
	}

	@GetMapping
	@Operation(summary = "Versione runtime e flag configurazione super admin")
		public SuperAdminStatusResponse status() {
			return new SuperAdminStatusResponse(
					"luxury",
					superAdminAuthService.isConfigured(),
					accountRegistrationService.isClientSuperAdminBootstrapAvailable(),
					selfRegistrationService.registrationAvailable());
		}

		public record SuperAdminStatusResponse(
				String application,
				boolean superAdminConfigured,
				boolean clientSuperAdminBootstrapAvailable,
				boolean setupTokenRegisterAvailable) {
		}
}
