package it.luxury.studio.service;

import it.luxury.appointment.service.SalonOpenDays;
import it.luxury.common.api.BusinessException;
import it.luxury.security.auth.LuxuryUserPrincipal;
import it.luxury.publicapi.validation.ConsumerRegistrationValidator;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.LocationRepository;
import it.luxury.studio.domain.SalonBusinessType;
import it.luxury.studio.domain.SalonClientGender;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.studio.domain.StudioGroupRepository;
import it.luxury.studio.dto.MeSalonSummaryDto;
import it.luxury.studio.dto.MeSalonUpdateRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
public class MeSalonSummaryService {

	private final StudioGroupOwnerResolver studioGroupOwnerResolver;
	private final StudioGroupRepository studioGroupRepository;
	private final LocationRepository locationRepository;
	private final MeSalonOwnerOrphanRepairService meSalonOwnerOrphanRepairService;
	private final SalonLocationGeocodingAsyncService salonLocationGeocodingAsyncService;

	public MeSalonSummaryService(
			StudioGroupOwnerResolver studioGroupOwnerResolver,
			StudioGroupRepository studioGroupRepository,
			LocationRepository locationRepository,
			MeSalonOwnerOrphanRepairService meSalonOwnerOrphanRepairService,
			SalonLocationGeocodingAsyncService salonLocationGeocodingAsyncService) {
		this.studioGroupOwnerResolver = studioGroupOwnerResolver;
		this.studioGroupRepository = studioGroupRepository;
		this.locationRepository = locationRepository;
		this.meSalonOwnerOrphanRepairService = meSalonOwnerOrphanRepairService;
		this.salonLocationGeocodingAsyncService = salonLocationGeocodingAsyncService;
	}

	public MeSalonSummaryDto resolve(LuxuryUserPrincipal principal) {
		if (principal == null || principal.getSubject() == null || principal.getSubject().isBlank()) {
			return MeSalonSummaryDto.notProvisioned();
		}
		return studioGroupOwnerResolver.resolveStudioGroupForOwner(principal)
				.map(g -> toDto(g, principal))
				.orElseGet(() -> resolveAfterOrphanRepair(principal));
	}

	private MeSalonSummaryDto resolveAfterOrphanRepair(LuxuryUserPrincipal principal) {
		meSalonOwnerOrphanRepairService.tryRepairIfOwnerWithNoStudio(principal);
		return studioGroupOwnerResolver.resolveStudioGroupForOwner(principal)
				.map(g -> toDto(g, principal))
				.orElseGet(MeSalonSummaryDto::notProvisioned);
	}

	private MeSalonSummaryDto toDto(StudioGroup g, LuxuryUserPrincipal principal) {
		meSalonOwnerOrphanRepairService.tryRepairIfOwnerWithNoLocation(principal);
		List<Location> locs = locationRepository.findByStudioGroup_IdOrderByNameAsc(g.getId());
		Location loc = locs.isEmpty() ? null : locs.get(0);
		String salonLabel = firstNonBlank(
				g.getName(),
				loc != null ? loc.getName() : null,
				loc != null ? humanizeSlug(loc.getSlug()) : null,
				"Salone");
		return new MeSalonSummaryDto(
				true,
				StudioGroup.canonicalPlanTier(g.getPlanTier()),
				salonLabel,
				loc != null ? loc.getSlug() : null,
				loc != null ? loc.getId() : null,
				loc != null ? loc.getCity() : null,
				loc != null ? loc.getPostalCode() : null,
				loc != null ? loc.getAddressLine() : null,
				loc != null ? trimToNull(loc.getProvince()) : null,
				salonBusinessTypesFromLocation(loc),
				salonClientGendersFromLocation(loc),
				loc != null ? loc.getWorkStartMinuteOfDay() : null,
				loc != null ? loc.getWorkEndMinuteOfDay() : null,
				loc != null ? loc.getWorkMorningEndMinuteOfDay() : null,
				loc != null ? loc.getWorkAfternoonStartMinuteOfDay() : null,
				loc != null ? SalonOpenDays.toApiList(loc.getWorkOpenDaysMask()) : null,
				statisticsPinRequired(g));
	}

	private static boolean statisticsPinRequired(StudioGroup g) {
		if (g == null || !"PREMIUM".equals(StudioGroup.canonicalPlanTier(g.getPlanTier()))) {
			return false;
		}
		String hash = g.getStatisticsPinHash();
		return hash != null && !hash.isBlank();
	}

	@Transactional
	public MeSalonSummaryDto update(LuxuryUserPrincipal principal, MeSalonUpdateRequest body) {
		if (body == null) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "Dati salone mancanti.");
		}
		StudioGroup group = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Salone non trovato."));
		List<Location> locs = locationRepository.findByStudioGroup_IdOrderByNameAsc(group.getId());
		if (locs.isEmpty()) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Sede principale non trovata.");
		}
		Location loc = locs.get(0);

		String name = trimToNull(body.primaryLocationName());
		String city = trimToNull(body.primaryLocationCity());
		String postalCode = trimToNull(body.primaryLocationPostalCode());
		String address = trimToNull(body.primaryLocationAddressLine());
		String slugInput = trimToNull(body.primaryLocationSlug());

		if (name == null) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Nome salone obbligatorio.");
		}
		String slug = slugInput != null ? toSlug(slugInput) : loc.getSlug();
		if (slug == null || slug.isBlank()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Slug salone non valido.");
		}
		if (!slug.equalsIgnoreCase(loc.getSlug()) && locationRepository.existsBySlug(slug)) {
			throw new BusinessException(HttpStatus.CONFLICT, "SLUG_ALREADY_EXISTS", "Slug già in uso da un altro salone.");
		}

		group.setName(name);
		loc.setName(name);
		loc.setSlug(slug);
		loc.setCity(city);
		loc.setPostalCode(postalCode);
		loc.setAddressLine(address);

		if (body.primaryLocationSalonClientGenders() != null) {
			List<SalonClientGender> clientGenders = ConsumerRegistrationValidator
					.normalizeSalonClientGendersOrThrow(body.primaryLocationSalonClientGenders());
			ConsumerRegistrationValidator.requireSalonClientGendersForPartnerPlans(
					StudioGroup.canonicalPlanTier(group.getPlanTier()),
					clientGenders);
			loc.setSalonClientGenders(SalonClientGender.toCsv(clientGenders));
		}

		if (body.primaryLocationOpeningMinuteOfDay() != null || body.primaryLocationClosingMinuteOfDay() != null) {
			int open = body.primaryLocationOpeningMinuteOfDay() != null
					? validateMinuteOfDay(body.primaryLocationOpeningMinuteOfDay(), "apertura")
					: loc.getWorkStartMinuteOfDay();
			int close = body.primaryLocationClosingMinuteOfDay() != null
					? validateMinuteOfDay(body.primaryLocationClosingMinuteOfDay(), "chiusura")
					: loc.getWorkEndMinuteOfDay();
			if (open >= close) {
				throw new BusinessException(
						HttpStatus.BAD_REQUEST,
						"VALIDATION_ERROR",
						"L'orario di chiusura deve essere successivo all'apertura.");
			}
			loc.setWorkStartMinuteOfDay(open);
			loc.setWorkEndMinuteOfDay(close);
		}
		if (body.primaryLocationMorningEndMinuteOfDay() != null && body.primaryLocationAfternoonStartMinuteOfDay() != null) {
			int morningEnd = validateMinuteOfDay(body.primaryLocationMorningEndMinuteOfDay(), "chiusura mattina");
			int afternoonStart = validateMinuteOfDay(body.primaryLocationAfternoonStartMinuteOfDay(), "apertura pomeriggio");
			int open = loc.getWorkStartMinuteOfDay();
			int close = loc.getWorkEndMinuteOfDay();
			if (morningEnd <= open || afternoonStart >= close || morningEnd >= afternoonStart) {
				throw new BusinessException(
						HttpStatus.BAD_REQUEST,
						"VALIDATION_ERROR",
						"Gli orari mattina/pomeriggio devono essere: apertura < chiusura mattina < apertura pomeriggio < chiusura.");
			}
			loc.setWorkMorningEndMinuteOfDay(morningEnd);
			loc.setWorkAfternoonStartMinuteOfDay(afternoonStart);
		}
		else if (body.primaryLocationMorningEndMinuteOfDay() == null && body.primaryLocationAfternoonStartMinuteOfDay() == null
				&& (body.primaryLocationOpeningMinuteOfDay() != null || body.primaryLocationClosingMinuteOfDay() != null)) {
			loc.setWorkMorningEndMinuteOfDay(null);
			loc.setWorkAfternoonStartMinuteOfDay(null);
		}

		if (body.primaryLocationOpenDays() != null) {
			loc.setWorkOpenDaysMask(SalonOpenDays.fromApiList(body.primaryLocationOpenDays()));
		}

		studioGroupRepository.save(group);
		Location saved = locationRepository.save(loc);
		salonLocationGeocodingAsyncService.scheduleGeocode(saved.getId());
		return toDto(group, principal);
	}

	private static String firstNonBlank(String... parts) {
		if (parts == null) {
			return "Salone";
		}
		for (String p : parts) {
			if (p != null && !p.isBlank()) {
				return p.trim();
			}
		}
		return "Salone";
	}

	private static String humanizeSlug(String slug) {
		if (slug == null || slug.isBlank()) {
			return null;
		}
		String s = slug.replace('-', ' ').trim();
		return s.isEmpty() ? null : s;
	}

	private static String trimToNull(String raw) {
		if (raw == null) {
			return null;
		}
		String v = raw.trim();
		return v.isEmpty() ? null : v;
	}

	private static List<String> salonBusinessTypesFromLocation(Location loc) {
		if (loc == null) {
			return List.of();
		}
		return SalonBusinessType.parseCsv(loc.getSalonBusinessTypes()).stream()
				.sorted(Comparator.comparing(Enum::name))
				.map(Enum::name)
				.toList();
	}

	private static List<String> salonClientGendersFromLocation(Location loc) {
		if (loc == null) {
			return List.of();
		}
		return SalonClientGender.parseCsv(loc.getSalonClientGenders()).stream()
				.sorted(Comparator.comparing(Enum::name))
				.map(Enum::name)
				.toList();
	}

	private static int validateMinuteOfDay(int minuteOfDay, String label) {
		if (minuteOfDay < 0 || minuteOfDay > 1439) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"VALIDATION_ERROR",
					"Orario di " + label + " non valido.");
		}
		return minuteOfDay;
	}

	private static String toSlug(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		String norm = raw.trim().toLowerCase(Locale.ROOT)
				.replaceAll("[^a-z0-9]+", "-")
				.replaceAll("^-+|-+$", "")
				.replaceAll("-{2,}", "-");
		return norm.isBlank() ? null : norm;
	}
}
