package it.luxury.staff.service;

import it.luxury.catalog.domain.StaffOperatorRepository;
import it.luxury.common.api.BusinessException;
import it.luxury.security.auth.LuxuryUserPrincipal;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.LocationRepository;
import it.luxury.studio.service.StudioGroupOwnerResolver;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Verifica che l'utente autenticato (JWT) sia titolare o operatore della sede indicata.
 */
@Service
public class SalonLocationAccessService {

	private final LocationRepository locationRepository;
	private final StudioGroupOwnerResolver studioGroupOwnerResolver;
	private final StaffOperatorRepository staffOperatorRepository;

	public SalonLocationAccessService(
			LocationRepository locationRepository,
			StudioGroupOwnerResolver studioGroupOwnerResolver,
			StaffOperatorRepository staffOperatorRepository) {
		this.locationRepository = locationRepository;
		this.studioGroupOwnerResolver = studioGroupOwnerResolver;
		this.staffOperatorRepository = staffOperatorRepository;
	}

	@Transactional(readOnly = true)
	public Location requireAccessibleLocation(LuxuryUserPrincipal principal, UUID locationId) {
		Location location = locationRepository.findById(locationId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Sede non trovata."));
		resolveCatalogAccess(principal, location);
		return location;
	}

	/**
	 * Titolare dello studio della sede: catalogo completo. Operatore collegato alla stessa sede: accesso filtrato.
	 */
	@Transactional(readOnly = true)
	public CatalogAccess resolveCatalogAccess(LuxuryUserPrincipal principal, Location location) {
		if (principal == null || principal.getSubject() == null || principal.getSubject().isBlank()) {
			throw new BusinessException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Autenticazione richiesta.");
		}
		UUID locationStudioGroupId = location.getStudioGroup().getId();
		var ownerGroup = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal);
		if (ownerGroup.isPresent() && ownerGroup.get().getId().equals(locationStudioGroupId)) {
			return CatalogAccess.ownerFull();
		}
		String sub = principal.getSubject();
		var operator = staffOperatorRepository.resolveLinkedOperatorId(principal.getProfileId(), sub);
		if (operator.isPresent() && operator.get().getLocation().getId().equals(location.getId())) {
			return CatalogAccess.staffFiltered(operator.get().getId());
		}
		throw new BusinessException(
				HttpStatus.FORBIDDEN,
				"FORBIDDEN",
				"Permessi insufficienti per accedere a questa sede.");
	}

	public record CatalogAccess(boolean fullCatalog, UUID staffOperatorId) {
		public static CatalogAccess ownerFull() {
			return new CatalogAccess(true, null);
		}

		public static CatalogAccess staffFiltered(UUID operatorId) {
			return new CatalogAccess(false, operatorId);
		}
	}
}
