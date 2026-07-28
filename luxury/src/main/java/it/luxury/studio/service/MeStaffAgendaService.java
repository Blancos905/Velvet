package it.luxury.studio.service;

import it.luxury.appointment.domain.Appointment;
import it.luxury.appointment.service.AppointmentBookingService;
import it.luxury.appointment.service.AvailabilityService;
import it.luxury.appointment.service.OperatorTimeBlockService;
import it.luxury.catalog.domain.StaffOperator;
import it.luxury.catalog.domain.StaffOperatorRepository;
import it.luxury.common.api.BusinessException;
import it.luxury.publicapi.dto.AppointmentResponses.AppointmentDto;
import it.luxury.security.auth.LuxuryUserPrincipal;
import it.luxury.studio.domain.Location;
import it.luxury.studio.dto.OperatorTimeBlockDtos.CreateOperatorTimeBlockRequest;
import it.luxury.studio.dto.OperatorTimeBlockDtos.OperatorTimeBlockDto;
import it.luxury.studio.dto.OperatorTimeBlockDtos.UpdateOperatorTimeBlockRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class MeStaffAgendaService {

	private static final int MAX_AGENDA_DAYS = 200;

	private final StaffOperatorRepository staffOperatorRepository;
	private final AppointmentBookingService appointmentBookingService;
	private final AvailabilityService availabilityService;
	private final OperatorTimeBlockService operatorTimeBlockService;

	public MeStaffAgendaService(
			StaffOperatorRepository staffOperatorRepository,
			AppointmentBookingService appointmentBookingService,
			AvailabilityService availabilityService,
			OperatorTimeBlockService operatorTimeBlockService) {
		this.staffOperatorRepository = staffOperatorRepository;
		this.appointmentBookingService = appointmentBookingService;
		this.availabilityService = availabilityService;
		this.operatorTimeBlockService = operatorTimeBlockService;
	}

	@Transactional(readOnly = true)
	public List<AppointmentDto> listAgenda(LuxuryUserPrincipal principal, LocalDate from, LocalDate toInclusive) {
		StaffOperator op = requireLinkedOperator(principal);
		return listAgendaForOperator(op, from, toInclusive);
	}

	@Transactional(readOnly = true)
	public List<OperatorTimeBlockDto> listTimeBlocks(LuxuryUserPrincipal principal, LocalDate from, LocalDate toInclusive) {
		StaffOperator op = requireLinkedOperator(principal);
		Instant[] range = operatorRange(op, from, toInclusive);
		return operatorTimeBlockService.listForOperator(op.getId(), range[0], range[1]);
	}

	@Transactional
	public OperatorTimeBlockDto createTimeBlock(LuxuryUserPrincipal principal, CreateOperatorTimeBlockRequest body) {
		StaffOperator op = requireLinkedOperator(principal);
		return operatorTimeBlockService.createForOperator(op, body);
	}

	@Transactional
	public OperatorTimeBlockDto updateTimeBlock(
			LuxuryUserPrincipal principal,
			UUID blockId,
			UpdateOperatorTimeBlockRequest body) {
		StaffOperator op = requireLinkedOperator(principal);
		return operatorTimeBlockService.updateForOperator(op, blockId, body);
	}

	@Transactional
	public void deleteTimeBlock(LuxuryUserPrincipal principal, UUID blockId) {
		StaffOperator op = requireLinkedOperator(principal);
		operatorTimeBlockService.deleteForOperator(op, blockId);
	}

	@Transactional(readOnly = true)
	public AppointmentDto getForStaff(LuxuryUserPrincipal principal, UUID appointmentId) {
		return AppointmentDto.from(requireStaffAppointment(principal, appointmentId));
	}

	@Transactional
	public AppointmentDto confirmForStaff(LuxuryUserPrincipal principal, UUID appointmentId) {
		Appointment a = requireStaffAppointment(principal, appointmentId);
		return AppointmentDto.from(appointmentBookingService.confirmBookingAsSalon(a, true));
	}

	@Transactional
	public void rejectForStaff(LuxuryUserPrincipal principal, UUID appointmentId) {
		Appointment a = requireStaffAppointment(principal, appointmentId);
		appointmentBookingService.rejectBookingAsSalon(a, true);
	}

	@Transactional(readOnly = true)
	public List<String> rescheduleSlotsForStaff(
			LuxuryUserPrincipal principal,
			UUID appointmentId,
			LocalDate from,
			LocalDate to) {
		Appointment a = requireStaffAppointment(principal, appointmentId);
		return availabilityService.computeSlotsForReschedule(a, from, to).stream()
				.map(Instant::toString)
				.toList();
	}

	@Transactional
	public AppointmentDto rescheduleForStaff(LuxuryUserPrincipal principal, UUID appointmentId, Instant newStart) {
		Appointment a = requireStaffAppointment(principal, appointmentId);
		appointmentBookingService.rescheduleAsSalon(a, newStart);
		return AppointmentDto.from(appointmentBookingService.requireAppointment(appointmentId));
	}

	private List<AppointmentDto> listAgendaForOperator(StaffOperator op, LocalDate from, LocalDate toInclusive) {
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
		Instant[] range = operatorRange(op, from, toInclusive);
		List<Appointment> rows = appointmentBookingService.listForOperatorInRange(op.getId(), range[0], range[1]);
		return rows.stream().map(AppointmentDto::from).toList();
	}

	private static Instant[] operatorRange(StaffOperator op, LocalDate from, LocalDate toInclusive) {
		Location loc = op.getLocation();
		String tz = loc.getTimeZone();
		ZoneId zone = ZoneId.of(tz != null && !tz.isBlank() ? tz : "Europe/Rome");
		Instant rangeStart = from.atStartOfDay(zone).toInstant();
		Instant rangeEnd = toInclusive.plusDays(1).atStartOfDay(zone).toInstant();
		return new Instant[] { rangeStart, rangeEnd };
	}

	private Appointment requireStaffAppointment(LuxuryUserPrincipal principal, UUID appointmentId) {
		StaffOperator op = requireLinkedOperator(principal);
		Appointment a = appointmentBookingService.requireAppointment(appointmentId);
		if (!a.getOperator().getId().equals(op.getId())) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Appuntamento non trovato.");
		}
		return a;
	}

	private StaffOperator requireLinkedOperator(LuxuryUserPrincipal principal) {
		UUID profileId = principal.getProfileId();
		String sub = principal.getSubject();
		if (profileId == null && (sub == null || sub.isBlank())) {
			throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Token senza profilo utente.");
		}
		return staffOperatorRepository
				.resolveLinkedOperatorId(profileId, sub != null ? sub : "")
				.orElseThrow(() -> new BusinessException(
						HttpStatus.FORBIDDEN,
						"STAFF_NOT_LINKED",
						"Nessun profilo operatore collegato a questo account."));
	}
}
