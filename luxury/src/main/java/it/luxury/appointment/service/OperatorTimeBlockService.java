package it.luxury.appointment.service;

import it.luxury.appointment.domain.Appointment;
import it.luxury.appointment.domain.AppointmentRepository;
import it.luxury.appointment.domain.OperatorTimeBlock;
import it.luxury.appointment.domain.OperatorTimeBlockRepository;
import it.luxury.catalog.domain.StaffOperator;
import it.luxury.common.api.BusinessException;
import it.luxury.studio.domain.Location;
import it.luxury.studio.dto.OperatorTimeBlockDtos.CreateOperatorTimeBlockRequest;
import it.luxury.studio.dto.OperatorTimeBlockDtos.OperatorTimeBlockDto;
import it.luxury.studio.dto.OperatorTimeBlockDtos.UpdateOperatorTimeBlockRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class OperatorTimeBlockService {

	private final OperatorTimeBlockRepository operatorTimeBlockRepository;
	private final AppointmentRepository appointmentRepository;

	public OperatorTimeBlockService(
			OperatorTimeBlockRepository operatorTimeBlockRepository,
			AppointmentRepository appointmentRepository) {
		this.operatorTimeBlockRepository = operatorTimeBlockRepository;
		this.appointmentRepository = appointmentRepository;
	}

	@Transactional(readOnly = true)
	public List<OperatorTimeBlockDto> listForOperator(UUID operatorId, Instant rangeStart, Instant rangeEnd) {
		return operatorTimeBlockRepository.findInRangeForOperator(operatorId, rangeStart, rangeEnd).stream()
				.map(OperatorTimeBlockDto::from)
				.toList();
	}

	@Transactional
	public OperatorTimeBlockDto createForOperator(StaffOperator operator, CreateOperatorTimeBlockRequest body) {
		Instant start = body.start();
		Instant end = body.end();
		assertValidInterval(operator, start, end);
		assertNoAppointmentOverlap(operator, start, end, null);
		assertNoBlockOverlap(operator.getId(), start, end, null);
		String note = normalizeNote(body.note());
		OperatorTimeBlock saved = operatorTimeBlockRepository.save(new OperatorTimeBlock(operator, start, end, note));
		return OperatorTimeBlockDto.from(saved);
	}

	@Transactional
	public OperatorTimeBlockDto updateForOperator(StaffOperator operator, UUID blockId, UpdateOperatorTimeBlockRequest body) {
		OperatorTimeBlock block = operatorTimeBlockRepository.findById(blockId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Blocco orario non trovato."));
		if (!block.getOperator().getId().equals(operator.getId())) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Blocco orario non trovato.");
		}
		Instant start = body.start();
		Instant end = body.end();
		assertValidInterval(operator, start, end);
		assertNoAppointmentOverlap(operator, start, end, null);
		assertNoBlockOverlap(operator.getId(), start, end, blockId);
		block.updateInterval(start, end, normalizeNote(body.note()));
		return OperatorTimeBlockDto.from(operatorTimeBlockRepository.save(block));
	}

	@Transactional
	public void deleteForOperator(StaffOperator operator, UUID blockId) {
		OperatorTimeBlock block = operatorTimeBlockRepository.findById(blockId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Blocco orario non trovato."));
		if (!block.getOperator().getId().equals(operator.getId())) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Blocco orario non trovato.");
		}
		operatorTimeBlockRepository.delete(block);
	}

	public void assertNoBlockOverlap(UUID operatorId, Instant start, Instant end, UUID excludeBlockId) {
		boolean overlap = operatorTimeBlockRepository.existsOverlapping(
				operatorId,
				start,
				end,
				excludeBlockId == null,
				excludeBlockId == null ? UUID.randomUUID() : excludeBlockId);
		if (overlap) {
			throw new BusinessException(
					HttpStatus.CONFLICT,
					"TIME_BLOCK_OVERLAP",
					"Hai già un impegno personale in questa fascia oraria.");
		}
	}

	private void assertNoAppointmentOverlap(StaffOperator operator, Instant start, Instant end, UUID excludeAppointmentId) {
		Location location = operator.getLocation();
		List<Appointment> blocking = appointmentRepository.findBlockingInRangeForOperator(
				location.getId(),
				operator.getId(),
				start,
				end);
		for (Appointment appointment : blocking) {
			if (excludeAppointmentId != null && appointment.getId().equals(excludeAppointmentId)) {
				continue;
			}
			if (TimeRangeOverlap.overlaps(start, end, appointment.getStart(), appointment.getEnd())) {
				throw new BusinessException(
						HttpStatus.CONFLICT,
						"APPOINTMENT_IN_RANGE",
						"In questa fascia hai già una prenotazione: spostala o annullala prima di bloccare l'orario.");
			}
		}
	}

	private static void assertValidInterval(StaffOperator operator, Instant start, Instant end) {
		if (!start.isBefore(end)) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "L'orario di fine deve essere dopo l'inizio.");
		}
		if (!end.isAfter(Instant.now())) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Puoi bloccare solo orari futuri.");
		}
		Location location = operator.getLocation();
		ZoneId zone = ZoneId.of(location.getTimeZone());
		ZonedDateTime zStart = start.atZone(zone);
		ZonedDateTime zEnd = end.atZone(zone);
		if (!zStart.toLocalDate().equals(zEnd.toLocalDate())) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"VALIDATION_ERROR",
					"Il blocco deve iniziare e finire nello stesso giorno.");
		}
		if (!SalonOpenDays.isOpenOn(location, zStart.toLocalDate())) {
			throw new BusinessException(HttpStatus.CONFLICT, "SALON_CLOSED", "Il salone è chiuso in questo giorno.");
		}
		int startMinute = zStart.getHour() * 60 + zStart.getMinute();
		int endMinute = zEnd.getHour() * 60 + zEnd.getMinute();
		if (!WorkSchedule.fitsAnyWindow(WorkSchedule.windowsForOperator(operator, location), startMinute, endMinute)) {
			throw new BusinessException(
					HttpStatus.CONFLICT,
					"OUTSIDE_OPENING_HOURS",
					"La fascia scelta è fuori dal tuo orario di lavoro.");
		}
	}

	private static String normalizeNote(String note) {
		if (note == null) {
			return null;
		}
		String trimmed = note.trim();
		if (trimmed.isEmpty()) {
			return null;
		}
		if (trimmed.length() > 500) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "La nota può avere al massimo 500 caratteri.");
		}
		return trimmed;
	}
}
