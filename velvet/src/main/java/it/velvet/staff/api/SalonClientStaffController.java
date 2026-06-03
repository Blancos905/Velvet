package it.velvet.staff.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.velvet.appointment.domain.AppointmentRepository;
import it.velvet.catalog.domain.SalonClient;
import it.velvet.catalog.domain.SalonClientRepository;
import it.velvet.catalog.domain.StaffOperatorRepository;
import it.velvet.common.api.BusinessException;
import it.velvet.security.auth.VelvetUserPrincipal;
import it.velvet.studio.domain.Location;
import it.velvet.studio.domain.LocationRepository;
import it.velvet.studio.service.StudioGroupOwnerResolver;
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

	private final LocationRepository locationRepository;
	private final SalonClientRepository salonClientRepository;
	private final StudioGroupOwnerResolver studioGroupOwnerResolver;
	private final StaffOperatorRepository staffOperatorRepository;
	private final AppointmentRepository appointmentRepository;

	public SalonClientStaffController(
			LocationRepository locationRepository,
			SalonClientRepository salonClientRepository,
			StudioGroupOwnerResolver studioGroupOwnerResolver,
			StaffOperatorRepository staffOperatorRepository,
			AppointmentRepository appointmentRepository) {
		this.locationRepository = locationRepository;
		this.salonClientRepository = salonClientRepository;
		this.studioGroupOwnerResolver = studioGroupOwnerResolver;
		this.staffOperatorRepository = staffOperatorRepository;
		this.appointmentRepository = appointmentRepository;
	}

	@GetMapping
	@PreAuthorize("isAuthenticated()")
	@Operation(summary = "Elenco clienti per sede")
	@Transactional(readOnly = true)
	public List<ClientDto> list(
			@RequestHeader("X-Location-Id") UUID locationId,
			@AuthenticationPrincipal VelvetUserPrincipal principal) {
		Location loc = resolveLocation(locationId);
		CatalogAccess access = resolveCatalogAccess(principal, loc);
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
		Location loc = resolveLocation(locationId);
		SalonClient c = salonClientRepository.findById(id)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Cliente non trovato."));
		if (!c.getLocation().getId().equals(locationId)) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Cliente non trovato.");
		}
		CatalogAccess access = resolveCatalogAccess(principal, loc);
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
		Location loc = resolveLocation(locationId);
		resolveCatalogAccess(principal, loc);
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

	private Location resolveLocation(UUID locationId) {
		return locationRepository.findById(locationId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Sede non trovata."));
	}

	/**
	 * Titolare dello studio della sede: catalogo completo. Operatore collegato alla stessa sede: solo clienti con
	 * almeno un appuntamento assegnato a lui.
	 */
	private CatalogAccess resolveCatalogAccess(VelvetUserPrincipal principal, Location loc) {
		if (principal == null || principal.getSubject() == null || principal.getSubject().isBlank()) {
			throw new BusinessException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Autenticazione richiesta.");
		}
		UUID locationStudioGroupId = loc.getStudioGroup().getId();
		var ownerGroup = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal);
		if (ownerGroup.isPresent() && ownerGroup.get().getId().equals(locationStudioGroupId)) {
			return CatalogAccess.ownerFull();
		}
		String sub = principal.getSubject() != null ? principal.getSubject() : "";
		var op = staffOperatorRepository.resolveLinkedOperatorId(principal.getProfileId(), sub);
		if (op.isPresent() && op.get().getLocation().getId().equals(loc.getId())) {
			return CatalogAccess.staffFiltered(op.get().getId());
		}
		throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Permessi insufficienti per consultare i clienti di questa sede.");
	}

	private record CatalogAccess(boolean fullCatalog, UUID staffOperatorId) {
		static CatalogAccess ownerFull() {
			return new CatalogAccess(true, null);
		}

		static CatalogAccess staffFiltered(UUID operatorId) {
			return new CatalogAccess(false, operatorId);
		}
	}

	public record ClientDto(UUID id, String displayName, String email, String phone, boolean velvetConsumerLinked) {
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
