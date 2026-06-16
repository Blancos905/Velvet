package it.velvet.studio.service;

import it.velvet.catalog.domain.SalonService;
import it.velvet.catalog.domain.SalonServiceRepository;
import it.velvet.catalog.domain.StaffOperator;
import it.velvet.catalog.domain.StaffOperatorRepository;
import it.velvet.common.api.BusinessException;
import it.velvet.studio.domain.Location;
import it.velvet.studio.domain.LocationRepository;
import it.velvet.studio.domain.StudioGroup;
import it.velvet.studio.dto.MeSalonServiceCreateRequest;
import it.velvet.studio.dto.MeSalonServiceDto;
import org.springframework.http.HttpStatus;
import it.velvet.security.auth.VelvetUserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class MeSalonCatalogService {

	private final StudioGroupOwnerResolver studioGroupOwnerResolver;
	private final LocationRepository locationRepository;
	private final SalonServiceRepository salonServiceRepository;
	private final StaffOperatorRepository staffOperatorRepository;
	private final MeSalonOwnerOrphanRepairService meSalonOwnerOrphanRepairService;

	public MeSalonCatalogService(
			StudioGroupOwnerResolver studioGroupOwnerResolver,
			LocationRepository locationRepository,
			SalonServiceRepository salonServiceRepository,
			StaffOperatorRepository staffOperatorRepository,
			MeSalonOwnerOrphanRepairService meSalonOwnerOrphanRepairService) {
		this.studioGroupOwnerResolver = studioGroupOwnerResolver;
		this.locationRepository = locationRepository;
		this.salonServiceRepository = salonServiceRepository;
		this.staffOperatorRepository = staffOperatorRepository;
		this.meSalonOwnerOrphanRepairService = meSalonOwnerOrphanRepairService;
	}

	public List<MeSalonServiceDto> list(VelvetUserPrincipal principal) {
		Location loc = requirePrimaryLocation(principal);
		return salonServiceRepository.findByLocation_IdOrderByName(loc.getId()).stream()
				.map(MeSalonServiceDto::from)
				.toList();
	}

	public MeSalonServiceDto create(VelvetUserPrincipal principal, MeSalonServiceCreateRequest body) {
		Location loc = requirePrimaryLocation(principal);
		String name = body.name().trim();
		if (name.isEmpty()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Il nome del servizio non può essere vuoto.");
		}
		SalonService service = new SalonService(loc, name, body.durationMinutes(), body.priceCents(), body.description());
		syncOperators(service, loc, body.operatorIds());
		SalonService saved = salonServiceRepository.save(service);
		return MeSalonServiceDto.from(salonServiceRepository.findByIdWithOperators(saved.getId()).orElse(saved));
	}

	@Transactional
	public MeSalonServiceDto update(VelvetUserPrincipal principal, UUID serviceId, MeSalonServiceCreateRequest body) {
		Location loc = requirePrimaryLocation(principal);
		SalonService service = salonServiceRepository.findByIdAndLocation_Id(serviceId, loc.getId())
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Servizio non trovato."));
		String name = body.name().trim();
		if (name.isEmpty()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Il nome del servizio non può essere vuoto.");
		}
		service.updateCatalog(name, body.durationMinutes(), body.priceCents(), body.description());
		syncOperators(service, loc, body.operatorIds());
		SalonService saved = salonServiceRepository.save(service);
		return MeSalonServiceDto.from(salonServiceRepository.findByIdWithOperators(saved.getId()).orElse(saved));
	}

	private Location requirePrimaryLocation(VelvetUserPrincipal principal) {
		java.util.Optional<StudioGroup> groupOpt = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal);
		if (groupOpt.isEmpty()) {
			meSalonOwnerOrphanRepairService.tryRepairIfOwnerWithNoStudio(principal);
			groupOpt = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal);
		}
		StudioGroup group = groupOpt.orElseThrow(() -> new BusinessException(
				HttpStatus.NOT_FOUND,
				"SALON_NOT_PROVISIONED",
				"Nessun salone collegato a questo account. Completa la registrazione titolare."));
		List<Location> locs = locationRepository.findByStudioGroup_IdOrderByNameAsc(group.getId());
		if (locs.isEmpty()) {
			meSalonOwnerOrphanRepairService.tryRepairIfOwnerWithNoLocation(principal);
			locs = locationRepository.findByStudioGroup_IdOrderByNameAsc(group.getId());
		}
		if (locs.isEmpty()) {
			throw new BusinessException(
					HttpStatus.CONFLICT,
					"SALON_NO_LOCATION",
					"Organizzazione senza sede: contatta l’assistenza Velvet.");
		}
		return locs.get(0);
	}

	private void syncOperators(SalonService service, Location loc, List<UUID> operatorIds) {
		List<UUID> distinct = operatorIds.stream().distinct().toList();
		List<StaffOperator> resolved = new ArrayList<>();
		for (UUID id : distinct) {
			StaffOperator op = staffOperatorRepository.findByIdAndLocation_Id(id, loc.getId())
					.orElseThrow(() -> new BusinessException(
							HttpStatus.BAD_REQUEST,
							"VALIDATION_ERROR",
							"Operatore non trovato o non appartiene a questa sede."));
			resolved.add(op);
		}
		service.replaceOperators(resolved);
	}
}
