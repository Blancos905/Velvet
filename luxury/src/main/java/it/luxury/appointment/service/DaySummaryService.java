package it.luxury.appointment.service;

import it.luxury.appointment.domain.Appointment;
import it.luxury.appointment.domain.AppointmentRepository;
import it.luxury.appointment.domain.AppointmentStatus;
import it.luxury.catalog.domain.StaffOperatorRepository;
import it.luxury.common.api.BusinessException;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.LocationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

@Service
public class DaySummaryService {

	private final LocationRepository locationRepository;
	private final AppointmentRepository appointmentRepository;
	private final StaffOperatorRepository staffOperatorRepository;

	public DaySummaryService(
			LocationRepository locationRepository,
			AppointmentRepository appointmentRepository,
			StaffOperatorRepository staffOperatorRepository) {
		this.locationRepository = locationRepository;
		this.appointmentRepository = appointmentRepository;
		this.staffOperatorRepository = staffOperatorRepository;
	}

	@Transactional(readOnly = true)
	public DaySummary build(UUID locationId, LocalDate date) {
		Location loc = locationRepository.findById(locationId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Sede non trovata."));
		ZoneId z = ZoneId.of(loc.getTimeZone());
		Instant dayStart = date.atStartOfDay(z).toInstant();
		Instant dayEnd = date.plusDays(1).atStartOfDay(z).toInstant();

		List<Appointment> day = appointmentRepository.findForLocationDay(locationId, dayStart, dayEnd);
		long activeCount = day.stream()
				.filter(a -> a.getStatus() != AppointmentStatus.CANCELLED)
				.count();

		int expectedRevenueCents = day.stream()
				.filter(a -> a.getStatus() != AppointmentStatus.CANCELLED)
				.mapToInt(a -> a.getService().getPriceCents())
				.sum();

		int opCount = staffOperatorRepository.findByLocation_IdOrderByDisplayName(locationId).size();
		int daySpan = Math.max(1, loc.getWorkEndMinuteOfDay() - loc.getWorkStartMinuteOfDay());
		int capacityMinutes = daySpan * Math.max(1, opCount);
		int bookedMinutes = day.stream()
				.filter(a -> a.getStatus() != AppointmentStatus.CANCELLED)
				.mapToInt(a -> a.getService().getDurationMinutes())
				.sum();
		double occupancy = capacityMinutes == 0 ? 0.0 : Math.min(1.0, (double) bookedMinutes / capacityMinutes);

		return new DaySummary(activeCount, expectedRevenueCents, occupancy, bookedMinutes, capacityMinutes);
	}

	public record DaySummary(long appointmentCount, int expectedRevenueCents, double occupancyRatio,
			int bookedMinutes, int capacityMinutes) {
	}
}
