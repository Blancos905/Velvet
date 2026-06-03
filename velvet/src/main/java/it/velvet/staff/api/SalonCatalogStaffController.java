package it.velvet.staff.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.velvet.catalog.domain.SalonService;
import it.velvet.catalog.domain.SalonServiceRepository;
import it.velvet.catalog.domain.StaffOperator;
import it.velvet.catalog.domain.StaffOperatorRepository;
import it.velvet.common.api.BusinessException;
import it.velvet.studio.domain.LocationRepository;
import org.springframework.http.HttpStatus;
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

	private final LocationRepository locationRepository;
	private final SalonServiceRepository salonServiceRepository;
	private final StaffOperatorRepository staffOperatorRepository;

	public SalonCatalogStaffController(
			LocationRepository locationRepository,
			SalonServiceRepository salonServiceRepository,
			StaffOperatorRepository staffOperatorRepository) {
		this.locationRepository = locationRepository;
		this.salonServiceRepository = salonServiceRepository;
		this.staffOperatorRepository = staffOperatorRepository;
	}

	@GetMapping("/services")
	@Operation(summary = "Servizi della sede")
	public List<ServiceDto> services(@RequestHeader("X-Location-Id") UUID locationId) {
		assertLocation(locationId);
		return salonServiceRepository.findByLocation_IdOrderByName(locationId).stream()
				.map(ServiceDto::from)
				.toList();
	}

	@GetMapping("/operators")
	@Operation(summary = "Operatori della sede")
	public List<OperatorDto> operators(@RequestHeader("X-Location-Id") UUID locationId) {
		assertLocation(locationId);
		return staffOperatorRepository.findByLocation_IdOrderByDisplayName(locationId).stream()
				.map(OperatorDto::from)
				.toList();
	}

	private void assertLocation(UUID locationId) {
		if (!locationRepository.existsById(locationId)) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Sede non trovata.");
		}
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
