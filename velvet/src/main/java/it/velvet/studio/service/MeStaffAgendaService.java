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
		UUID profileId = principal.getProfileId();
		String sub = principal.getSubject();
		if (profileId == null && (sub == null || sub.isBlank())) {
			throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Token senza profilo utente.");
		}
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
		StaffOperator op = staffOperatorRepository
				.resolveLinkedOperatorId(profileId, sub != null ? sub : "")
				.orElseThrow(() -> new BusinessException(
						HttpStatus.FORBIDDEN,
						"STAFF_NOT_LINKED",
						"Nessun profilo operatore collegato a questo account."));
		Location loc = op.getLocation();
		String tz = loc.getTimeZone();
		ZoneId zone = ZoneId.of(tz != null && !tz.isBlank() ? tz : "Europe/Rome");
		Instant rangeStart = from.atStartOfDay(zone).toInstant();
		Instant rangeEnd = toInclusive.plusDays(1).atStartOfDay(zone).toInstant();
		List<Appointment> rows = appointmentBookingService.listForOperatorInRange(op.getId(), rangeStart, rangeEnd);
		return rows.stream().map(AppointmentDto::from).toList();
	}
}
