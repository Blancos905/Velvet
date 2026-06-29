package it.velvet.staff.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.velvet.catalog.domain.SalonService;
import it.velvet.catalog.domain.SalonServiceRepository;
import it.velvet.catalog.domain.StaffOperator;
import it.velvet.catalog.domain.StaffOperatorRepository;
import it.velvet.security.auth.VelvetUserPrincipal;
import it.velvet.staff.service.SalonLocationAccessService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Staff — catalogo sede")
public class SalonCatalogStaffController {

	private final SalonServiceRepository salonServiceRepository;
	private final StaffOperatorRepository staffOperatorRepository;
	private final SalonLocationAccessService salonLocationAccessService;

	public SalonCatalogStaffController(
			SalonServiceRepository salonServiceRepository,
			StaffOperatorRepository staffOperatorRepository,
			SalonLocationAccessService salonLocationAccessService) {
		this.salonServiceRepository = salonServiceRepository;
		this.staffOperatorRepository = staffOperatorRepository;
		this.salonLocationAccessService = salonLocationAccessService;
	}

	@GetMapping("/services")
	@PreAuthorize("isAuthenticated()")
	@Operation(summary = "Servizi della sede")
	@Transactional(readOnly = true)
	public List<ServiceDto> services(
			@RequestHeader("X-Location-Id") UUID locationId,
			@AuthenticationPrincipal VelvetUserPrincipal principal) {
		salonLocationAccessService.requireAccessibleLocation(principal, locationId);
		return salonServiceRepository.findByLocation_IdOrderByName(locationId).stream()
				.map(ServiceDto::from)
				.toList();
	}

	@GetMapping("/operators")
	@PreAuthorize("isAuthenticated()")
	@Operation(summary = "Operatori della sede")
	@Transactional(readOnly = true)
	public List<OperatorDto> operators(
			@RequestHeader("X-Location-Id") UUID locationId,
			@AuthenticationPrincipal VelvetUserPrincipal principal) {
		salonLocationAccessService.requireAccessibleLocation(principal, locationId);
		return staffOperatorRepository.findByLocation_IdOrderByDisplayName(locationId).stream()
				.map(OperatorDto::from)
				.toList();
	}

	public record ServiceDto(UUID id, String name, int durationMinutes, int priceCents, String description) {
		public static ServiceDto from(SalonService s) {
			return new ServiceDto(s.getId(), s.getName(), s.getDurationMinutes(), s.getPriceCents(), s.getDescription());
		}
	}

	public record OperatorDto(UUID id, String displayName) {
		public static OperatorDto from(StaffOperator o) {
			return new OperatorDto(o.getId(), o.getDisplayName());
		}
	}
}
