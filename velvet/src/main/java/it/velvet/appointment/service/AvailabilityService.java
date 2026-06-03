package it.velvet.appointment.service;

import it.velvet.appointment.domain.Appointment;
import it.velvet.appointment.domain.AppointmentRepository;
import it.velvet.catalog.domain.SalonService;
import it.velvet.catalog.domain.SalonServiceOperators;
import it.velvet.catalog.domain.SalonServiceRepository;
import it.velvet.catalog.domain.StaffOperator;
import it.velvet.catalog.domain.StaffOperatorRepository;
import it.velvet.common.api.BusinessException;
import it.velvet.studio.domain.Location;
import it.velvet.studio.domain.LocationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AvailabilityService {

	private static final int PUBLIC_SLOT_STEP_MINUTES = 15;

	private final LocationRepository locationRepository;
	private final SalonServiceRepository salonServiceRepository;
	private final StaffOperatorRepository staffOperatorRepository;
	private final AppointmentRepository appointmentRepository;

	public AvailabilityService(
			LocationRepository locationRepository,
			SalonServiceRepository salonServiceRepository,
			StaffOperatorRepository staffOperatorRepository,
			AppointmentRepository appointmentRepository) {
		this.locationRepository = locationRepository;
		this.salonServiceRepository = salonServiceRepository;
		this.staffOperatorRepository = staffOperatorRepository;
		this.appointmentRepository = appointmentRepository;
	}

	public List<DaySlots> computeSlots(String slug, UUID serviceId, UUID operatorId, LocalDate from, LocalDate to) {
		if (to.isBefore(from)) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Intervallo date non valido.");
		}
		if (from.plusDays(60).isBefore(to)) {
			to = from.plusDays(60);
		}

		Location location = locationRepository.findBySlug(slug)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Sede non trovata."));
		SalonService service = salonServiceRepository.findByIdWithOperators(serviceId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Servizio non trovato."));
		if (!service.getLocation().getId().equals(location.getId())) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Servizio non appartiene alla sede.");
		}
		ZoneId zone = ZoneId.of(location.getTimeZone());
		Instant rangeStart = from.atStartOfDay(zone).toInstant();
		Instant rangeEnd = to.plusDays(1).atStartOfDay(zone).toInstant();

		/* Agenda pubblica a quarti d'ora fissi: la durata servizio determina quante finestre consecutive restano occupate. */
		int step = PUBLIC_SLOT_STEP_MINUTES;
		int duration = service.getDurationMinutes();
		List<DaySlots> days = new ArrayList<>();
		List<StaffOperator> operators;
		Map<UUID, List<Appointment>> blockingByOperator = new HashMap<>();
		if (operatorId != null) {
			StaffOperator operator = staffOperatorRepository.findById(operatorId)
					.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Operatore non trovato."));
			if (!operator.getLocation().getId().equals(location.getId())) {
				throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Operatore non appartiene alla sede.");
			}
			SalonServiceOperators.assertCanPerform(service, operator);
			operators = List.of(operator);
		}
		else {
			operators = SalonServiceOperators.filterForBooking(
					service,
					staffOperatorRepository.findByLocation_IdOrderByDisplayName(location.getId()));
		}
		for (StaffOperator op : operators) {
			List<Appointment> blocking = appointmentRepository.findBlockingInRangeForOperator(
					location.getId(),
					op.getId(),
					rangeStart,
					rangeEnd);
			blockingByOperator.put(op.getId(), blocking);
		}

		Instant earliestBookable = Instant.now();
		for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
			ZonedDateTime open = d.atStartOfDay(zone).plusMinutes(location.getWorkStartMinuteOfDay());
			ZonedDateTime close = d.atStartOfDay(zone).plusMinutes(location.getWorkEndMinuteOfDay());
			if (!open.isBefore(close)) {
				continue;
			}
			List<Instant> slots = new ArrayList<>();
			int totalSlots = 0;
			for (ZonedDateTime cursor = open; !cursor.plusMinutes(duration).isAfter(close); cursor = cursor.plusMinutes(step)) {
				Instant start = cursor.toInstant();
				if (!start.isAfter(earliestBookable)) {
					continue;
				}
				totalSlots++;
				Instant end = start.plus(Duration.ofMinutes(duration));
				if (operators.isEmpty() || anyOperatorFits(operators, blockingByOperator, start, end)) {
					slots.add(start);
				}
			}
			if (totalSlots > 0) {
				days.add(new DaySlots(d.toString(), slots, totalSlots));
			}
		}
		return days;
	}

	private static boolean anyOperatorFits(
			List<StaffOperator> operators,
			Map<UUID, List<Appointment>> blockingByOperator,
			Instant start,
			Instant end) {
		for (StaffOperator op : operators) {
			List<Appointment> blocking = blockingByOperator.getOrDefault(op.getId(), List.of());
			if (fits(blocking, start, end)) {
				return true;
			}
		}
		return false;
	}

	private static boolean fits(List<Appointment> blocking, Instant start, Instant end) {
		for (Appointment a : blocking) {
			if (start.isBefore(a.getEnd()) && end.isAfter(a.getStart())) {
				return false;
			}
		}
		return true;
	}

	public List<Instant> computeSlotsForReschedule(Appointment appointment, LocalDate from, LocalDate to) {
		Location loc = appointment.getLocation();
		return computeSlots(
				loc.getSlug(),
				appointment.getService().getId(),
				appointment.getOperator().getId(),
				from,
				to).stream()
				.flatMap(d -> d.slots().stream())
				.filter(s -> !s.equals(appointment.getStart()))
				.sorted(Comparator.naturalOrder())
				.toList();
	}

	public record DaySlots(String date, List<Instant> slots, int totalSlots) {
	}
}
