package it.velvet.studio.service;

import it.velvet.appointment.domain.Appointment;
import it.velvet.appointment.service.AppointmentBookingService;
import it.velvet.catalog.domain.StaffOperator;
import it.velvet.catalog.domain.StaffOperatorRepository;
import it.velvet.common.api.BusinessException;
import it.velvet.publicapi.dto.AppointmentResponses.AppointmentDto;
import it.velvet.security.auth.VelvetUserPrincipal;
import it.velvet.studio.domain.Location;
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

	public MeStaffAgendaService(
			StaffOperatorRepository staffOperatorRepository,
			AppointmentBookingService appointmentBookingService) {
		this.staffOperatorRepository = staffOperatorRepository;
		this.appointmentBookingService = appointmentBookingService;
	}

	@Transactional(readOnly = true)
	public List<AppointmentDto> listAgenda(VelvetUserPrincipal principal, LocalDate from, LocalDate toInclusive) {
		StaffOperator op = requireLinkedOperator(principal);
		return listAgendaForOperator(op, from, toInclusive);
	}

	@Transactional(readOnly = true)
	public AppointmentDto getForStaff(VelvetUserPrincipal principal, UUID appointmentId) {
		return AppointmentDto.from(requireStaffAppointment(principal, appointmentId));
	}

	@Transactional
	public AppointmentDto confirmForStaff(VelvetUserPrincipal principal, UUID appointmentId) {
		Appointment a = requireStaffAppointment(principal, appointmentId);
		return AppointmentDto.from(appointmentBookingService.confirmBookingAsSalon(a));
	}

	@Transactional
	public void rejectForStaff(VelvetUserPrincipal principal, UUID appointmentId) {
		Appointment a = requireStaffAppointment(principal, appointmentId);
		appointmentBookingService.rejectBookingAsSalon(a);
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
		Location loc = op.getLocation();
		String tz = loc.getTimeZone();
		ZoneId zone = ZoneId.of(tz != null && !tz.isBlank() ? tz : "Europe/Rome");
		Instant rangeStart = from.atStartOfDay(zone).toInstant();
		Instant rangeEnd = toInclusive.plusDays(1).atStartOfDay(zone).toInstant();
		List<Appointment> rows = appointmentBookingService.listForOperatorInRange(op.getId(), rangeStart, rangeEnd);
		return rows.stream().map(AppointmentDto::from).toList();
	}

	private Appointment requireStaffAppointment(VelvetUserPrincipal principal, UUID appointmentId) {
		StaffOperator op = requireLinkedOperator(principal);
		Appointment a = appointmentBookingService.requireAppointment(appointmentId);
		if (!a.getOperator().getId().equals(op.getId())) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Appuntamento non trovato.");
		}
		return a;
	}

	private StaffOperator requireLinkedOperator(VelvetUserPrincipal principal) {
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
