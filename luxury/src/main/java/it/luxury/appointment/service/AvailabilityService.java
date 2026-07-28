package it.luxury.appointment.service;

import it.luxury.appointment.domain.Appointment;
import it.luxury.appointment.domain.AppointmentRepository;
import it.luxury.appointment.domain.OperatorTimeBlock;
import it.luxury.appointment.domain.OperatorTimeBlockRepository;
import it.luxury.catalog.domain.SalonService;
import it.luxury.catalog.domain.SalonServiceOperators;
import it.luxury.catalog.domain.SalonServiceRepository;
import it.luxury.catalog.domain.StaffOperator;
import it.luxury.catalog.domain.StaffOperatorRepository;
import it.luxury.common.api.BusinessException;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.LocationRepository;
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
	private final OperatorTimeBlockRepository operatorTimeBlockRepository;

	public AvailabilityService(
			LocationRepository locationRepository,
			SalonServiceRepository salonServiceRepository,
			StaffOperatorRepository staffOperatorRepository,
			AppointmentRepository appointmentRepository,
			OperatorTimeBlockRepository operatorTimeBlockRepository) {
		this.locationRepository = locationRepository;
		this.salonServiceRepository = salonServiceRepository;
		this.staffOperatorRepository = staffOperatorRepository;
		this.appointmentRepository = appointmentRepository;
		this.operatorTimeBlockRepository = operatorTimeBlockRepository;
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
		Map<UUID, List<OperatorTimeBlock>> timeBlocksByOperator = new HashMap<>();
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
			timeBlocksByOperator.put(
					op.getId(),
					operatorTimeBlockRepository.findInRangeForOperator(op.getId(), rangeStart, rangeEnd));
		}

		List<WorkSchedule.MinuteWindow> locationWindows = WorkSchedule.windowsForLocation(location);
		Instant earliestBookable = Instant.now();
		for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
			if (!SalonOpenDays.isOpenOn(location, d)) {
				days.add(new DaySlots(d.toString(), List.of(), 0, true));
				continue;
			}
			List<Instant> slots = new ArrayList<>();
			int totalSlots = 0;
			for (WorkSchedule.MinuteWindow window : locationWindows) {
				ZonedDateTime open = d.atStartOfDay(zone).plusMinutes(window.startMinute());
				ZonedDateTime close = d.atStartOfDay(zone).plusMinutes(window.endMinute());
				if (!open.isBefore(close)) {
					continue;
				}
				for (ZonedDateTime cursor = open; !cursor.plusMinutes(duration).isAfter(close); cursor = cursor.plusMinutes(step)) {
					Instant start = cursor.toInstant();
					if (!start.isAfter(earliestBookable)) {
						continue;
					}
					totalSlots++;
					Instant end = start.plus(Duration.ofMinutes(duration));
					if (operators.isEmpty()
							|| anyOperatorFits(location, operators, blockingByOperator, timeBlocksByOperator, start, end, zone)) {
						slots.add(start);
					}
				}
			}
			if (totalSlots > 0) {
				days.add(new DaySlots(d.toString(), slots, totalSlots));
			}
		}
		return days;
	}

	private static boolean anyOperatorFits(
			Location location,
			List<StaffOperator> operators,
			Map<UUID, List<Appointment>> blockingByOperator,
			Map<UUID, List<OperatorTimeBlock>> timeBlocksByOperator,
			Instant start,
			Instant end,
			ZoneId zone) {
		int startMinute = start.atZone(zone).getHour() * 60 + start.atZone(zone).getMinute();
		int endMinute = end.atZone(zone).getHour() * 60 + end.atZone(zone).getMinute();
		for (StaffOperator op : operators) {
			List<Appointment> blocking = blockingByOperator.getOrDefault(op.getId(), List.of());
			List<OperatorTimeBlock> timeBlocks = timeBlocksByOperator.getOrDefault(op.getId(), List.of());
			if (!fitsOperatorAvailability(blocking, timeBlocks, start, end)) {
				continue;
			}
			if (WorkSchedule.fitsAnyWindow(WorkSchedule.windowsForOperator(op, location), startMinute, endMinute)) {
				return true;
			}
		}
		return false;
	}

	private static boolean fitsOperatorAvailability(
			List<Appointment> blocking,
			List<OperatorTimeBlock> timeBlocks,
			Instant start,
			Instant end) {
		for (Appointment a : blocking) {
			if (TimeRangeOverlap.overlaps(start, end, a.getStart(), a.getEnd())) {
				return false;
			}
		}
		for (OperatorTimeBlock block : timeBlocks) {
			if (TimeRangeOverlap.overlaps(start, end, block.getStartsAt(), block.getEndsAt())) {
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

	public record DaySlots(String date, List<Instant> slots, int totalSlots, boolean closed) {
		public DaySlots(String date, List<Instant> slots, int totalSlots) {
			this(date, slots, totalSlots, false);
		}
	}
}
