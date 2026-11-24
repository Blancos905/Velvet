package it.luxury.consumer.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.luxury.security.auth.LuxuryUserPrincipal;
import it.luxury.studio.domain.SalonSiteContent;
import it.luxury.studio.domain.SalonSiteContentKind;
import it.luxury.studio.dto.SalonSiteContentDto;
import it.luxury.studio.dto.SalonSiteContentUpsertRequest;
import it.luxury.studio.service.SalonSiteContentService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Salvataggio vetrina/sito salone lato server (titolare). La lettura pubblica vive in
 * {@code GET /api/v1/public/organizations/{slug}/site-content/{kind}}.
 */
@RestController
@RequestMapping("/api/v1/me/salon/site-content")
@Tag(name = "Account titolare (/me)")
@SecurityRequirement(name = "bearer-jwt")
public class MeSalonSiteContentController {

	private final SalonSiteContentService salonSiteContentService;

	public MeSalonSiteContentController(SalonSiteContentService salonSiteContentService) {
		this.salonSiteContentService = salonSiteContentService;
	}

	@GetMapping("/{slug}/{kind}")
	@Operation(summary = "Legge vetrina/sito della sede (titolare), anche se non è ancora pubblica")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public SalonSiteContentDto read(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@PathVariable String slug,
			@PathVariable String kind) {
		SalonSiteContentKind parsedKind = SalonSiteContentKind.fromToken(kind);
		return salonSiteContentService.readForOwner(principal, slug, parsedKind)
				.map(SalonSiteContentDto::from)
				.orElseGet(() -> new SalonSiteContentDto(parsedKind.token(), null, null));
	}

	@PutMapping("/{slug}/{kind}")
	@Operation(summary = "Salva vetrina/sito della sede (titolare)")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public SalonSiteContentDto upsert(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@PathVariable String slug,
			@PathVariable String kind,
			@RequestBody SalonSiteContentUpsertRequest body) {
		SalonSiteContentKind parsedKind = SalonSiteContentKind.fromToken(kind);
		String payload = body == null ? null : body.payload();
		SalonSiteContent saved = salonSiteContentService.upsertForOwner(principal, slug, parsedKind, payload);
		return SalonSiteContentDto.from(saved);
	}
}
