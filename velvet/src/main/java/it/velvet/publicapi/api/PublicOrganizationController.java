package it.velvet.publicapi.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.velvet.appointment.service.AvailabilityService;
import it.velvet.appointment.service.AvailabilityService.DaySlots;
import it.velvet.publicapi.dto.PublicDtos.DayAvailabilityDto;
import it.velvet.publicapi.dto.PublicDtos.OperatorPublicDto;
import it.velvet.publicapi.dto.PublicDtos.OrganizationDetailDto;
import it.velvet.publicapi.dto.PublicDtos.PublicSalonReviewDto;
import it.velvet.publicapi.dto.PublicDtos.OrganizationSummaryDto;
import it.velvet.publicapi.dto.PublicDtos.ServicePublicDto;
import it.velvet.studio.domain.SalonSiteContentKind;
import it.velvet.studio.dto.SalonSiteContentDto;
import it.velvet.studio.service.PublicOrganizationService;
import it.velvet.studio.service.SalonSiteContentService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/public/organizations")
@Tag(name = "Pubblico — ricerca e vetrina")
public class PublicOrganizationController {

	private final PublicOrganizationService publicOrganizationService;
	private final AvailabilityService availabilityService;
	private final SalonSiteContentService salonSiteContentService;

	public PublicOrganizationController(
			PublicOrganizationService publicOrganizationService,
			AvailabilityService availabilityService,
			SalonSiteContentService salonSiteContentService) {
		this.publicOrganizationService = publicOrganizationService;
		this.availabilityService = availabilityService;
		this.salonSiteContentService = salonSiteContentService;
	}

	@GetMapping("/quick-suggest-availability")
	@Operation(summary = "Query rapide home con almeno un salone nel raggio (listino servizi)")
	public List<String> quickSuggestAvailability(
			@RequestParam Double nearLat,
			@RequestParam Double nearLng,
			@RequestParam(required = false) Double nearKm) {
		if (nearLat == null || nearLng == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "nearLat e nearLng sono obbligatori");
		}
		return publicOrganizationService.availableQuickSuggestQueries(nearLat, nearLng, nearKm);
	}

	@GetMapping
	@Operation(summary = "Ricerca sedi / saloni")
	public List<OrganizationSummaryDto> search(
			@RequestParam(required = false) String query,
			@RequestParam(required = false) String city,
			@RequestParam(required = false) Double nearLat,
			@RequestParam(required = false) Double nearLng,
			@RequestParam(required = false) Double nearKm,
			@RequestParam(required = false) List<String> salonClientGenders,
			@RequestParam(required = false) List<String> salonClientGender,
			@RequestParam(required = false) List<String> salonBusinessTypes,
			@RequestParam(required = false) List<String> salonBusinessType,
			@RequestParam(required = false) Boolean topRated,
			@RequestParam(required = false) Integer topRatedLimit,
			@RequestParam(required = false) String monthlyIdea,
			@RequestParam(required = false) Integer monthlyIdeaLimit,
			@RequestParam(required = false) String monthlyIdeaSalonKind) {
		if (Boolean.TRUE.equals(topRated)) {
			int lim = topRatedLimit != null ? topRatedLimit : 5;
			return publicOrganizationService.topRatedPremiumSummaries(lim);
		}
		if (monthlyIdea != null && !monthlyIdea.isBlank()) {
			int lim = monthlyIdeaLimit != null ? monthlyIdeaLimit : 5;
			return publicOrganizationService.monthlyIdeaSummaries(
					monthlyIdea.trim(),
					monthlyIdeaSalonKind != null ? monthlyIdeaSalonKind.trim() : null,
					lim);
		}
		return publicOrganizationService.searchWithReviewSummaries(
				query,
				city,
				nearLat,
				nearLng,
				nearKm,
				mergeSalonClientGenderParams(salonClientGenders, salonClientGender),
				mergeSalonClientGenderParams(salonBusinessTypes, salonBusinessType));
	}

	private static List<String> mergeSalonClientGenderParams(List<String> primary, List<String> alias) {
		List<String> out = new ArrayList<>();
		if (primary != null) {
			for (String raw : primary) {
				if (raw != null && !raw.isBlank()) {
					out.add(raw.trim());
				}
			}
		}
		if (out.isEmpty() && alias != null) {
			for (String raw : alias) {
				if (raw != null && !raw.isBlank()) {
					out.add(raw.trim());
				}
			}
		}
		return out.isEmpty() ? null : out;
	}

	@GetMapping("/{slug}")
	@Operation(summary = "Vetrina sede (mini-sito)")
	public OrganizationDetailDto detail(@PathVariable String slug) {
		return publicOrganizationService.organizationDetail(slug);
	}

	@GetMapping("/{slug}/site-content/{kind}")
	@Operation(summary = "Vetrina/sito salvato dalla sede (immagini incluse) per la pagina pubblica")
	public SalonSiteContentDto siteContent(@PathVariable String slug, @PathVariable String kind) {
		SalonSiteContentKind parsedKind = SalonSiteContentKind.fromToken(kind);
		return salonSiteContentService.readPublic(slug, parsedKind)
				.map(SalonSiteContentDto::from)
				.orElseGet(() -> new SalonSiteContentDto(parsedKind.token(), null, null));
	}

	@GetMapping("/{slug}/services")
	@Operation(summary = "Listino servizi prenotabili")
	public List<ServicePublicDto> services(@PathVariable String slug) {
		return publicOrganizationService.listServices(slug).stream()
				.map(ServicePublicDto::from)
				.toList();
	}

	@GetMapping("/{slug}/operators")
	@Operation(summary = "Operatori della sede (per wizard prenotazione pubblico; include media recensioni operatore se disponibili)")
	public List<OperatorPublicDto> operators(
			@PathVariable String slug,
			@RequestParam(required = false) UUID serviceId) {
		return publicOrganizationService.listOperators(slug, serviceId);
	}

	@GetMapping("/{slug}/reviews")
	@Operation(summary = "Recensioni ricevute dal salone")
	public List<PublicSalonReviewDto> reviews(@PathVariable String slug) {
		return publicOrganizationService.listPublicReviews(slug);
	}

	@GetMapping("/{slug}/availability")
	@Operation(summary = "Slot disponibili per servizio e operatore")
	public List<DayAvailabilityDto> availability(
			@PathVariable String slug,
			@RequestParam UUID serviceId,
			@RequestParam(required = false) UUID operatorId,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		publicOrganizationService.requireBySlug(slug);
		List<DaySlots> days = availabilityService.computeSlots(slug, serviceId, operatorId, from, to);
		return days.stream()
				.map(d -> new DayAvailabilityDto(
						d.date(),
						d.slots().stream().map(Object::toString).toList(),
						d.totalSlots()))
				.toList();
	}
}
