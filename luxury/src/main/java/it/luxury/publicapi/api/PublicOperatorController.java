package it.luxury.publicapi.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.luxury.publicapi.dto.PublicDtos.TopOperatorSummaryDto;
import it.luxury.studio.service.PublicOrganizationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/public/operators")
@Tag(name = "Pubblico — operatori")
public class PublicOperatorController {

	private final PublicOrganizationService publicOrganizationService;

	public PublicOperatorController(PublicOrganizationService publicOrganizationService) {
		this.publicOrganizationService = publicOrganizationService;
	}

	@GetMapping("/top-rated")
	@Operation(summary = "Classifica nazionale operatori per recensioni (voto verso l'operatore)")
	public List<TopOperatorSummaryDto> topRated(
			@RequestParam String salonKind,
			@RequestParam(required = false) Integer limit) {
		if (salonKind == null || salonKind.isBlank()) {
			throw new org.springframework.web.server.ResponseStatusException(
					org.springframework.http.HttpStatus.BAD_REQUEST, "salonKind è obbligatorio");
		}
		int lim = limit != null ? limit : 10;
		return publicOrganizationService.topRatedOperatorSummaries(salonKind.trim(), lim);
	}
}
