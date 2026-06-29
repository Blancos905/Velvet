package it.velvet.consumer.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.velvet.studio.dto.MeSalonServiceCreateRequest;
import it.velvet.studio.dto.MeSalonServiceDto;
import it.velvet.studio.service.MeSalonCatalogService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import it.velvet.security.auth.VelvetUserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/me/salon/services")
@Tag(name = "Account titolare (/me)")
@SecurityRequirement(name = "bearer-jwt")
public class MeSalonServicesController {

	private final MeSalonCatalogService meSalonCatalogService;

	public MeSalonServicesController(MeSalonCatalogService meSalonCatalogService) {
		this.meSalonCatalogService = meSalonCatalogService;
	}

	@GetMapping
	@Operation(summary = "Listino servizi (prima sede)")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public List<MeSalonServiceDto> list(@AuthenticationPrincipal VelvetUserPrincipal principal) {
		return meSalonCatalogService.list(principal);
	}

	@PostMapping
	@Operation(summary = "Aggiungi servizio al listino (prima sede)")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public MeSalonServiceDto create(@AuthenticationPrincipal VelvetUserPrincipal principal, @Valid @RequestBody MeSalonServiceCreateRequest body) {
		return meSalonCatalogService.create(principal, body);
	}

	@PutMapping("/{id}")
	@Operation(summary = "Modifica servizio del listino (prima sede)")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public MeSalonServiceDto update(
			@AuthenticationPrincipal VelvetUserPrincipal principal,
			@PathVariable UUID id,
			@Valid @RequestBody MeSalonServiceCreateRequest body) {
		return meSalonCatalogService.update(principal, id, body);
	}
}
