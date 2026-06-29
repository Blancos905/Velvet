package it.velvet.staff.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.velvet.appointment.domain.AppointmentRepository;
import it.velvet.catalog.domain.SalonClient;
import it.velvet.catalog.domain.SalonClientRepository;
import it.velvet.common.api.BusinessException;
import it.velvet.security.auth.VelvetUserPrincipal;
import it.velvet.staff.service.SalonLocationAccessService;
import it.velvet.staff.service.SalonLocationAccessService.CatalogAccess;
import it.velvet.studio.domain.Location;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/clients")
@Tag(name = "Staff — clienti salone")
public class SalonClientStaffController {

	private final SalonClientRepository salonClientRepository;
	private final SalonLocationAccessService salonLocationAccessService;
	private final AppointmentRepository appointmentRepository;

	public SalonClientStaffController(
			SalonClientRepository salonClientRepository,
			SalonLocationAccessService salonLocationAccessService,
			AppointmentRepository appointmentRepository) {
		this.salonClientRepository = salonClientRepository;
		this.salonLocationAccessService = salonLocationAccessService;
		this.appointmentRepository = appointmentRepository;
	}

	@GetMapping
	@PreAuthorize("isAuthenticated()")
	@Operation(summary = "Elenco clienti per sede")
	@Transactional(readOnly = true)
	public List<ClientDto> list(
			@RequestHeader("X-Location-Id") UUID locationId,
			@AuthenticationPrincipal VelvetUserPrincipal principal) {
		Location loc = salonLocationAccessService.requireAccessibleLocation(principal, locationId);
		CatalogAccess access = salonLocationAccessService.resolveCatalogAccess(principal, loc);
		if (access.fullCatalog()) {
			return salonClientRepository.findByLocation_IdOrderByDisplayName(locationId).stream()
					.map(ClientDto::from)
					.toList();
		}
		List<UUID> ids = appointmentRepository.findDistinctSalonClientIdsByLocationIdAndOperatorId(
				locationId, access.staffOperatorId());
		if (ids.isEmpty()) {
			return List.of();
		}
		return salonClientRepository.findByLocation_IdAndIdInOrderByDisplayName(locationId, ids).stream()
				.map(ClientDto::from)
				.toList();
	}

	@GetMapping("/{id}")
	@PreAuthorize("isAuthenticated()")
	@Operation(summary = "Dettaglio cliente")
	@Transactional(readOnly = true)
	public ClientDto get(
			@RequestHeader("X-Location-Id") UUID locationId,
			@PathVariable UUID id,
			@AuthenticationPrincipal VelvetUserPrincipal principal) {
		Location loc = salonLocationAccessService.requireAccessibleLocation(principal, locationId);
		SalonClient c = salonClientRepository.findById(id)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Cliente non trovato."));
		if (!c.getLocation().getId().equals(locationId)) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Cliente non trovato.");
		}
		CatalogAccess access = salonLocationAccessService.resolveCatalogAccess(principal, loc);
		if (!access.fullCatalog()
				&& !appointmentRepository.existsByLocation_IdAndOperator_IdAndSalonClient_Id(
						locationId, access.staffOperatorId(), c.getId())) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Cliente non trovato.");
		}
		return ClientDto.from(c);
	}

	@PostMapping
	@PreAuthorize("isAuthenticated()")
	@ResponseStatus(HttpStatus.CREATED)
	@Operation(summary = "Crea cliente")
	@Transactional
	public ClientDto create(
			@RequestHeader("X-Location-Id") UUID locationId,
			@RequestBody @Valid CreateClientBody body,
			@AuthenticationPrincipal VelvetUserPrincipal principal) {
		Location loc = salonLocationAccessService.requireAccessibleLocation(principal, locationId);
		salonLocationAccessService.resolveCatalogAccess(principal, loc);
		SalonClient c = new SalonClient(loc, body.displayName());
		c.setEmail(blankToNull(body.email()));
		c.setPhone(blankToNull(body.phone()));
		return ClientDto.from(salonClientRepository.save(c));
	}

	private static String blankToNull(String value) {
		if (value == null) {
			return null;
		}
		String t = value.trim();
		return t.isEmpty() ? null : t;
	}

	public record ClientDto(UUID id, String displayName, String email, String phone, boolean luxuryConsumerLinked) {
		public static ClientDto from(SalonClient c) {
			return new ClientDto(
					c.getId(),
					c.getDisplayName(),
					c.getEmail(),
					c.getPhone(),
					c.getConsumerProfile() != null);
		}
	}

	public record CreateClientBody(
			@NotBlank @Size(max = 200) String displayName,
			@Size(max = 320) String email,
			@Size(max = 40) String phone) {
	}
}
