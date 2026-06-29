package it.velvet.billing.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.velvet.billing.dto.SalonBillingProfileDto;
import it.velvet.billing.dto.SalonBillingProfileUpsertRequest;
import it.velvet.billing.service.SalonBillingProfileService;
import it.velvet.security.auth.VelvetUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/billing")
@Tag(name = "Account titolare — dati fatturazione")
@SecurityRequirement(name = "bearer-jwt")
public class MeSalonBillingProfileController {

	private final SalonBillingProfileService salonBillingProfileService;

	public MeSalonBillingProfileController(SalonBillingProfileService salonBillingProfileService) {
		this.salonBillingProfileService = salonBillingProfileService;
	}

	@GetMapping("/profile")
	@Operation(summary = "Profilo fatturazione salone (prefill da sede se assente)")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public SalonBillingProfileDto getProfile(@AuthenticationPrincipal VelvetUserPrincipal principal) {
		return salonBillingProfileService.resolve(principal);
	}

	@PutMapping("/profile")
	@Operation(summary = "Salva profilo fatturazione salone")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public SalonBillingProfileDto upsertProfile(
			@AuthenticationPrincipal VelvetUserPrincipal principal,
			@RequestBody @Valid SalonBillingProfileUpsertRequest body) {
		return salonBillingProfileService.upsert(principal, body);
	}
}
