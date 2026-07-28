package it.luxury.billing.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.luxury.billing.dto.BillingStatusDto;
import it.luxury.billing.service.BillingStatusService;
import it.luxury.security.auth.LuxuryUserPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/billing")
@Tag(name = "Account titolare — fatturazione")
@SecurityRequirement(name = "bearer-jwt")
public class MeBillingStatusController {

	private final BillingStatusService billingStatusService;

	public MeBillingStatusController(BillingStatusService billingStatusService) {
		this.billingStatusService = billingStatusService;
	}

	@GetMapping("/status")
	@Operation(summary = "Stato mirror abbonamento e flag billing")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public BillingStatusDto status(@AuthenticationPrincipal LuxuryUserPrincipal principal) {
		return billingStatusService.resolve(principal);
	}
}
