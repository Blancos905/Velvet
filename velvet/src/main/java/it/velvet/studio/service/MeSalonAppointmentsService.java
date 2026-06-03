package it.velvet.studio.service;

import it.velvet.appointment.domain.Appointment;
import it.velvet.appointment.service.AppointmentBookingService;
import it.velvet.appointment.service.AvailabilityService;
import it.velvet.common.api.BusinessException;
import it.velvet.publicapi.dto.AppointmentResponses.AppointmentDto;
import it.velvet.studio.domain.Location;
import it.velvet.studio.domain.LocationRepository;
import it.velvet.studio.domain.StudioGroup;
import org.springframework.http.HttpStatus;
import it.velvet.security.auth.VelvetUserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class MeSalonAppointmentsService {

	/** Limite giorni inclusi (from→to). L’agenda settimanale ~7g; la dashboard Statistiche chiede fino a ~6 mesi. */
	private static final int MAX_AGENDA_DAYS = 200;

	private final StudioGroupOwnerResolver studioGroupOwnerResolver;
	private final LocationRepository locationRepository;
	private final AppointmentBookingService appointmentBookingService;
	private final AvailabilityService availabilityService;
	private final MeSalonOwnerOrphanRepairService meSalonOwnerOrphanRepairService;

	public MeSalonAppointmentsService(
			StudioGroupOwnerResolver studioGroupOwnerResolver,
			LocationRepository locationRepository,
			AppointmentBookingService appointmentBookingService,
			AvailabilityService availabilityService,
			MeSalonOwnerOrphanRepairService meSalonOwnerOrphanRepairService) {
		this.studioGroupOwnerResolver = studioGroupOwnerResolver;
		this.locationRepository = locationRepository;
		this.appointmentBookingService = appointmentBookingService;
		this.availabilityService = availabilityService;
		this.meSalonOwnerOrphanRepairService = meSalonOwnerOrphanRepairService;
	}

	@Transactional(readOnly = true)
	public List<AppointmentDto> listAgenda(VelvetUserPrincipal principal, LocalDate from, LocalDate toInclusive) {
		if (from.isAfter(toInclusive)) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Intervallo date non valido.");
		}
		long days = ChronoUnit.DAYS.between(from, toInclusive) + 1;
		if (days > MAX_AGENDA_DAYS) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"VALIDATION_ERROR",
					"Intervallo massimo consentito: " + MAX_AGENDA_DAYS + " giorni.");
		}
		Optional<StudioGroup> group = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal);
		if (group.isPresent()) {
			List<Location> locs = locationRepository.findByStudioGroup_IdOrderByNameAsc(group.get().getId());
			if (!locs.isEmpty()) {
				return listMergedForAllLocations(locs, from, toInclusive);
			}
		}
		meSalonOwnerOrphanRepairService.tryRepairIfOwnerWithNoStudio(principal);
		return studioGroupOwnerResolver.resolveStudioGroupForOwner(principal)
				.map(g -> locationRepository.findByStudioGroup_IdOrderByNameAsc(g.getId()))
				.filter(locs -> !locs.isEmpty())
				.map(locs -> listMergedForAllLocations(locs, from, toInclusive))
				.orElse(List.of());
	}

	/**
	 * Intervallo {@code from}–{@code toInclusive} è interpretato nel fuso di ogni sede; unisce le prenotazioni
	 * di tutte le sedi dello studio (prima l’agenda considerava solo la prima sede per nome).
	 */
	private List<AppointmentDto> listMergedForAllLocations(List<Location> locs, LocalDate from, LocalDate toInclusive) {
		List<Appointment> merged = new ArrayList<>();
		for (Location loc : locs) {
			ZoneId zone = safeZone(loc.getTimeZone());
			Instant rangeStart = from.atStartOfDay(zone).toInstant();
			Instant rangeEnd = toInclusive.plusDays(1).atStartOfDay(zone).toInstant();
			merged.addAll(appointmentBookingService.listForLocationInRange(loc.getId(), rangeStart, rangeEnd));
		}
		merged.sort(Comparator.comparing(Appointment::getStart));
		return merged.stream().map(AppointmentDto::from).toList();
	}

	@Transactional(readOnly = true)
	public AppointmentDto getForOwner(VelvetUserPrincipal principal, UUID appointmentId) {
		return AppointmentDto.from(requireOwnerAppointment(principal, appointmentId));
	}

	@Transactional
	public void cancelForOwner(VelvetUserPrincipal principal, UUID appointmentId) {
		Appointment a = requireOwnerAppointment(principal, appointmentId);
		appointmentBookingService.cancelAsSalon(a);
	}

	@Transactional(readOnly = true)
	public List<String> rescheduleSlotsForOwner(VelvetUserPrincipal principal, UUID appointmentId, LocalDate from, LocalDate to) {
		Appointment a = requireOwnerAppointment(principal, appointmentId);
		return availabilityService.computeSlotsForReschedule(a, from, to).stream()
				.map(Instant::toString)
				.toList();
	}

	@Transactional
	public AppointmentDto rescheduleForOwner(VelvetUserPrincipal principal, UUID appointmentId, Instant newStart) {
		Appointment a = requireOwnerAppointment(principal, appointmentId);
		appointmentBookingService.rescheduleAsSalon(a, newStart);
		return AppointmentDto.from(appointmentBookingService.requireAppointment(appointmentId));
	}

	@Transactional
	public AppointmentDto createForOwner(
			VelvetUserPrincipal principal,
			UUID salonClientId,
			UUID serviceId,
			UUID operatorId,
			Instant start) {
		Location loc = requirePrimaryLocation(principal);
		Appointment created = appointmentBookingService.createForStaff(
				loc.getId(), salonClientId, serviceId, operatorId, start);
		return AppointmentDto.from(created);
	}

	private Location requirePrimaryLocation(VelvetUserPrincipal principal) {
		Optional<StudioGroup> groupOpt = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal);
		if (groupOpt.isEmpty()) {
			meSalonOwnerOrphanRepairService.tryRepairIfOwnerWithNoStudio(principal);
			groupOpt = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal);
		}
		StudioGroup group = groupOpt.orElseThrow(
				() -> new BusinessException(
						HttpStatus.NOT_FOUND,
						"SALON_NOT_PROVISIONED",
						"Nessun salone collegato a questo account. Completa la registrazione titolare."));
		List<Location> locs = locationRepository.findByStudioGroup_IdOrderByNameAsc(group.getId());
		if (locs.isEmpty()) {
			throw new BusinessException(
					HttpStatus.CONFLICT,
					"SALON_NO_LOCATION",
					"Organizzazione senza sede: contatta l’assistenza Velvet.");
		}
		return locs.get(0);
	}

	private static ZoneId safeZone(String tz) {
		if (tz == null || tz.isBlank()) {
			return ZoneId.of("Europe/Rome");
		}
		try {
			return ZoneId.of(tz.trim());
		}
		catch (RuntimeException ignored) {
			return ZoneId.of("Europe/Rome");
		}
	}

	private Appointment requireOwnerAppointment(VelvetUserPrincipal principal, UUID appointmentId) {
		Optional<StudioGroup> gOpt = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal);
		if (gOpt.isEmpty()) {
			meSalonOwnerOrphanRepairService.tryRepairIfOwnerWithNoStudio(principal);
			gOpt = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal);
		}
		StudioGroup g = gOpt.orElseThrow(
				() -> new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Salone non disponibile."));
		Appointment a = appointmentBookingService.requireAppointment(appointmentId);
		if (!a.getLocation().getStudioGroup().getId().equals(g.getId())) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Appuntamento non trovato.");
		}
		return a;
	}
}
