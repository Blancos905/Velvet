package it.luxury.admin.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.luxury.admin.dto.SuperAdminConsumerRow;
import it.luxury.admin.service.SuperAdminConsumerManagementService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/consumers")
@Tag(name = "Super admin — profili consumatore")
public class SuperAdminConsumerController {

	private final SuperAdminConsumerManagementService consumerManagementService;

	public SuperAdminConsumerController(SuperAdminConsumerManagementService consumerManagementService) {
		this.consumerManagementService = consumerManagementService;
	}

	@GetMapping
	@Operation(summary = "Elenco paginato profili (inclusi soft-deleted)")
	public Page<SuperAdminConsumerRow> list(@PageableDefault(size = 10, sort = "email") Pageable pageable) {
		return consumerManagementService.list(pageable);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@Operation(summary = "Soft-delete profilo (allineato a chiusura account)")
	@SecurityRequirement(name = "bearer-jwt")
	public void delete(@PathVariable UUID id) {
		consumerManagementService.softDelete(id);
	}

	@PostMapping("/{id}/session")
	@Operation(
			summary = "Sessione profilo consumatore (JWT Luxury)",
			description = "Emissione di un access token come per il login password, senza credenziali. Esclusi profili eliminati o con ruolo ADMIN. Solo super admin.")
	@SecurityRequirement(name = "bearer-jwt")
	public ConsumerSessionResponse issueConsumerSession(@PathVariable UUID id) {
		var r = consumerManagementService.issueConsumerLuxurySession(id);
		return new ConsumerSessionResponse(r.accessToken(), "Bearer", r.expiresInSeconds());
	}

	@PatchMapping("/{id}/plan")
	@Operation(summary = "Aggiorna piano consumatore e, se titolare, lo studio collegato")
	public SuperAdminConsumerRow patchPlan(@PathVariable UUID id, @RequestBody @Valid PlanTierPatch body) {
		return consumerManagementService.updatePlanTier(id, body.planTier());
	}

	public record PlanTierPatch(
			@NotBlank @Size(max = 32) String planTier) {
	}

	public record ConsumerSessionResponse(String accessToken, String tokenType, long expiresInSeconds) {
	}
}
