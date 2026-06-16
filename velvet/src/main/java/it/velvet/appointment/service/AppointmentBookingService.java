package it.velvet.appointment.service;

import it.velvet.appointment.domain.Appointment;
import it.velvet.appointment.domain.AppointmentRepository;
import it.velvet.appointment.domain.AppointmentStatus;
import it.velvet.appointment.domain.CancelledBy;
import it.velvet.catalog.domain.SalonClient;
import it.velvet.catalog.domain.SalonClientRepository;
import it.velvet.catalog.domain.SalonService;
import it.velvet.catalog.domain.SalonServiceOperators;
import it.velvet.catalog.domain.SalonServiceRepository;
import it.velvet.catalog.domain.StaffOperator;
import it.velvet.catalog.domain.StaffOperatorRepository;
import it.velvet.common.api.BusinessException;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.notification.service.AppointmentNotificationService;
import it.velvet.security.auth.VelvetUserPrincipal;
import it.velvet.studio.domain.Location;
import it.velvet.studio.domain.LocationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class AppointmentBookingService {

	private final AppointmentRepository appointmentRepository;
	private final LocationRepository locationRepository;
	private final SalonServiceRepository salonServiceRepository;
	private final StaffOperatorRepository staffOperatorRepository;
	private final SalonClientRepository salonClientRepository;
	private final AppointmentNotificationService appointmentNotificationService;

	public AppointmentBookingService(
			AppointmentRepository appointmentRepository,
			LocationRepository locationRepository,
			SalonServiceRepository salonServiceRepository,
			StaffOperatorRepository staffOperatorRepository,
			SalonClientRepository salonClientRepository,
			AppointmentNotificationService appointmentNotificationService) {
		this.appointmentRepository = appointmentRepository;
		this.locationRepository = locationRepository;
		this.salonServiceRepository = salonServiceRepository;
		this.staffOperatorRepository = staffOperatorRepository;
		this.salonClientRepository = salonClientRepository;
		this.appointmentNotificationService = appointmentNotificationService;
	}

	@Transactional
	public Appointment createForConsumer(
			ConsumerProfile consumer,
			String locationSlug,
			UUID serviceId,
			UUID operatorId,
			Instant start) {
		assertConsumerAccountMayBookOnline(consumer);
		Location location = locationRepository.findBySlug(locationSlug)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Sede non trovata."));
		SalonService service = salonServiceRepository.findByIdWithOperators(serviceId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Servizio non trovato."));
		if (!service.getLocation().getId().equals(location.getId())) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Servizio non appartiene alla sede.");
		}
		Instant end = start.plus(Duration.ofMinutes(service.getDurationMinutes()));
		assertWithinLocationWorkHours(location, start, end);
		StaffOperator operator = resolveOperatorForConsumerBooking(location, service, operatorId, start, end);
		assertWithinOperatorWorkHours(location, operator, start, end);

		SalonClient client = salonClientRepository
				.findByLocation_IdAndConsumerProfile_Id(location.getId(), consumer.getId())
				.orElseGet(() -> {
					SalonClient sc = new SalonClient(
							location,
							consumer.getDisplayName() != null && !consumer.getDisplayName().isBlank()
									? consumer.getDisplayName().trim()
									: "Cliente");
					sc.setConsumerProfile(consumer);
					return sc;
				});
		if (consumer.getEmail() != null && !consumer.getEmail().isBlank()) {
			client.setEmail(consumer.getEmail().trim());
		}
		if (consumer.getPhone() != null && !consumer.getPhone().isBlank()) {
			client.setPhone(consumer.getPhone().trim());
		}
		client = salonClientRepository.save(client);

		Appointment a = new Appointment(location, service, operator, client, start, end);
		a.setConsumerProfile(consumer);
		a.setStatus(AppointmentStatus.CONFIRMED);
		appointmentRepository.save(a);
		appointmentRepository.flush();
		Appointment created = requireAppointment(a.getId());
		appointmentNotificationService.onConsumerBookingCreated(created.getId());
		return created;
	}

	private StaffOperator resolveOperatorForConsumerBooking(
			Location location,
			SalonService service,
			UUID operatorId,
			Instant start,
			Instant end) {
		if (operatorId != null) {
			StaffOperator explicit = staffOperatorRepository.findById(operatorId)
					.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Operatore non trovato."));
			if (!explicit.getLocation().getId().equals(location.getId())) {
				throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Operatore non appartiene alla sede.");
			}
			SalonServiceOperators.assertCanPerform(service, explicit);
			assertNoOverlap(explicit.getId(), start, end, null);
			return explicit;
		}

		List<StaffOperator> operators = SalonServiceOperators.filterForBooking(
				service,
				staffOperatorRepository.findByLocation_IdOrderByDisplayName(location.getId()));
		if (operators.isEmpty()) {
			StaffOperator created = staffOperatorRepository.save(new StaffOperator(location, "Operatore Velvet"));
			assertNoOverlap(created.getId(), start, end, null);
			return created;
		}
		ZoneId zone = ZoneId.of(location.getTimeZone());
		int startMinute = start.atZone(zone).getHour() * 60 + start.atZone(zone).getMinute();
		int endMinute = end.atZone(zone).getHour() * 60 + end.atZone(zone).getMinute();
		for (StaffOperator candidate : operators) {
			if (!WorkSchedule.fitsAnyWindow(WorkSchedule.windowsForOperator(candidate, location), startMinute, endMinute)) {
				continue;
			}
			boolean overlap = appointmentRepository.existsOverlapping(
					candidate.getId(),
					start,
					end,
					true,
					UUID.randomUUID());
			if (!overlap) {
				return candidate;
			}
		}
		throw new BusinessException(
				HttpStatus.CONFLICT,
				"SLOT_OVERLAP",
				"Nessun operatore disponibile in questa fascia oraria.");
	}

	@Transactional
	public void cancelAsConsumer(Appointment appointment, ConsumerProfile consumer) {
		if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
			return;
		}
		assertConsumerOwns(appointment, consumer);
		assertConsumerCanMutateState(appointment);

		appointment.cancel(CancelledBy.CONSUMER);
		appointmentRepository.save(appointment);
		appointmentNotificationService.onConsumerBookingCancelled(appointment.getId());
	}

	@Transactional
	public void rescheduleAsConsumer(Appointment appointment, ConsumerProfile consumer, Instant newStart) {
		assertConsumerOwns(appointment, consumer);
		assertConsumerCanMutateState(appointment);

		SalonService service = appointment.getService();
		Instant newEnd = newStart.plus(Duration.ofMinutes(service.getDurationMinutes()));
		Location location = appointment.getLocation();
		assertWithinLocationWorkHours(location, newStart, newEnd);
		assertWithinOperatorWorkHours(location, appointment.getOperator(), newStart, newEnd);
		assertNoOverlap(appointment.getOperator().getId(), newStart, newEnd, appointment.getId());

		appointment.setStart(newStart);
		appointment.setEnd(newEnd);
		appointmentRepository.save(appointment);
		appointmentNotificationService.onConsumerBookingRescheduled(appointment.getId());
	}

	public void assertNoOverlap(UUID operatorId, Instant start, Instant end, UUID excludeAppointmentId) {
		boolean overlap = appointmentRepository.existsOverlapping(
				operatorId,
				start,
				end,
				excludeAppointmentId == null,
				excludeAppointmentId == null ? UUID.randomUUID() : excludeAppointmentId);
		if (overlap) {
			throw new BusinessException(
					HttpStatus.CONFLICT,
					"SLOT_OVERLAP",
					"Operatore già occupato in questa fascia.",
					java.util.Map.of("operatorId", operatorId.toString()));
		}
	}

	private static void assertWithinLocationWorkHours(Location location, Instant start, Instant end) {
		assertWithinWorkWindows(
				WorkSchedule.windowsForLocation(location),
				location.getTimeZone(),
				start,
				end,
				"L'orario scelto è fuori dall'orario di apertura del salone.");
	}

	private static void assertWithinOperatorWorkHours(Location location, StaffOperator operator, Instant start, Instant end) {
		assertWithinWorkWindows(
				WorkSchedule.windowsForOperator(operator, location),
				location.getTimeZone(),
				start,
				end,
				"L'orario scelto è fuori dall'orario di lavoro dell'operatore.");
	}

	private static void assertWithinWorkWindows(
			List<WorkSchedule.MinuteWindow> windows,
			String timeZone,
			Instant start,
			Instant end,
			String outsideMessage) {
		ZoneId zone = ZoneId.of(timeZone);
		ZonedDateTime zStart = start.atZone(zone);
		ZonedDateTime zEnd = end.atZone(zone);
		if (!zStart.toLocalDate().equals(zEnd.toLocalDate())) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"VALIDATION_ERROR",
					"Il servizio deve iniziare e finire nello stesso giorno di apertura.");
		}
		if (windows.isEmpty()) {
			throw new BusinessException(
					HttpStatus.CONFLICT,
					"BOOKING_CLOSED",
					"Il salone non accetta prenotazioni online in questa fascia oraria.");
		}
		int startMinute = zStart.getHour() * 60 + zStart.getMinute();
		int endMinute = zEnd.getHour() * 60 + zEnd.getMinute();
		if (!WorkSchedule.fitsAnyWindow(windows, startMinute, endMinute)) {
			throw new BusinessException(HttpStatus.CONFLICT, "OUTSIDE_OPENING_HOURS", outsideMessage);
		}
	}

	public Appointment requireAppointment(UUID id) {
		return appointmentRepository.findByIdWithGraph(id)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Appuntamento non trovato."));
	}

	@Transactional(readOnly = true)
	public Appointment requireAppointmentForConsumer(UUID appointmentId, UUID consumerProfileId) {
		Appointment a = appointmentRepository.findByIdWithGraph(appointmentId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Appuntamento non trovato."));
		if (a.getConsumerProfile() == null || !a.getConsumerProfile().getId().equals(consumerProfileId)) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Appuntamento non trovato.");
		}
		return a;
	}

	@Transactional(readOnly = true)
	public List<Appointment> listUpcomingForConsumer(UUID consumerProfileId) {
		return appointmentRepository.findUpcomingForConsumer(consumerProfileId, Instant.now());
	}

	@Transactional(readOnly = true)
	public List<Appointment> listPastForConsumer(UUID consumerProfileId) {
		return appointmentRepository.findPastForConsumer(consumerProfileId, Instant.now());
	}

	@Transactional(readOnly = true)
	public List<Appointment> listDayForLocation(UUID locationId, Instant dayStart, Instant dayEnd) {
		return appointmentRepository.findForLocationDay(locationId, dayStart, dayEnd);
	}

	@Transactional(readOnly = true)
	public List<Appointment> listForLocationInRange(UUID locationId, Instant rangeStart, Instant rangeEndExclusive) {
		return appointmentRepository.findForLocationInRange(locationId, rangeStart, rangeEndExclusive);
	}

	@Transactional(readOnly = true)
	public List<Appointment> listForOperatorInRange(UUID operatorId, Instant rangeStart, Instant rangeEndExclusive) {
		return appointmentRepository.findForOperatorInRange(operatorId, rangeStart, rangeEndExclusive);
	}

	/**
	 * Stessi vincoli di {@link #rescheduleAsConsumer}: evita slot “vuoti” se la finestra self-service è chiusa.
	 */
	@Transactional(readOnly = true)
	public void assertConsumerMayPreviewRescheduleSlots(Appointment appointment, ConsumerProfile consumer) {
		assertConsumerOwns(appointment, consumer);
		assertConsumerCanMutateState(appointment);
	}

	@Transactional
	public Appointment createForStaff(
			UUID locationId,
			UUID salonClientId,
			UUID serviceId,
			UUID operatorId,
			Instant start) {
		Location location = locationRepository.findById(locationId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Sede non trovata."));
		SalonClient client = salonClientRepository.findById(salonClientId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Cliente non trovato."));
		if (!client.getLocation().getId().equals(locationId)) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Cliente non appartiene alla sede.");
		}
		SalonService service = salonServiceRepository.findById(serviceId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Servizio non trovato."));
		if (!service.getLocation().getId().equals(locationId)) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Servizio non appartiene alla sede.");
		}
		StaffOperator operator = staffOperatorRepository.findById(operatorId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Operatore non trovato."));
		if (!operator.getLocation().getId().equals(locationId)) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Operatore non appartiene alla sede.");
		}

		Instant end = start.plus(Duration.ofMinutes(service.getDurationMinutes()));
		assertWithinLocationWorkHours(location, start, end);
		assertWithinOperatorWorkHours(location, operator, start, end);
		assertNoOverlap(operator.getId(), start, end, null);

		Appointment a = new Appointment(location, service, operator, client, start, end);
		a.setStatus(AppointmentStatus.CONFIRMED);
		if (client.getConsumerProfile() != null) {
			a.setConsumerProfile(client.getConsumerProfile());
		}
		appointmentRepository.save(a);
		appointmentRepository.flush();
		Appointment created = requireAppointment(a.getId());
		appointmentNotificationService.onSalonManualBookingCreated(created.getId());
		return created;
	}

	@Transactional
	public Appointment updateStatusStaff(UUID appointmentId, UUID locationId, AppointmentStatus newStatus) {
		Appointment a = requireAppointment(appointmentId);
		if (!a.getLocation().getId().equals(locationId)) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Appuntamento non trovato.");
		}
		AppointmentStatus previous = a.getStatus();
		a.setStatus(newStatus);
		Appointment saved = appointmentRepository.save(a);
		appointmentNotificationService.onAppointmentStatusChanged(saved.getId(), previous, newStatus);
		return saved;
	}

	@Transactional
	public void cancelAsSalon(Appointment appointment) {
		if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
			return;
		}
		if (appointment.getStatus() == AppointmentStatus.COMPLETED) {
			throw new BusinessException(
					HttpStatus.FORBIDDEN,
					"APPOINTMENT_NOT_CANCELLABLE",
					"Appuntamento già completato: annullamento non consentito.");
		}
		AppointmentStatus previous = appointment.getStatus();
		appointment.cancel(CancelledBy.STAFF);
		appointmentRepository.save(appointment);
		appointmentNotificationService.onAppointmentStatusChanged(
				appointment.getId(),
				previous,
				AppointmentStatus.CANCELLED);
	}

	@Transactional
	public void rescheduleAsSalon(Appointment appointment, Instant newStart) {
		if (appointment.getStatus() == AppointmentStatus.CANCELLED || appointment.getStatus() == AppointmentStatus.COMPLETED) {
			throw new BusinessException(
					HttpStatus.FORBIDDEN,
					"APPOINTMENT_NOT_RESCHEDULABLE",
					"Appuntamento non modificabile in questo stato.");
		}
		SalonService service = appointment.getService();
		Instant newEnd = newStart.plus(Duration.ofMinutes(service.getDurationMinutes()));
		assertNoOverlap(appointment.getOperator().getId(), newStart, newEnd, appointment.getId());
		appointment.setStart(newStart);
		appointment.setEnd(newEnd);
		appointmentRepository.save(appointment);
		appointmentNotificationService.onConsumerBookingRescheduled(appointment.getId());
	}

	private static void assertConsumerAccountMayBookOnline(ConsumerProfile consumer) {
		var roles = VelvetUserPrincipal.parseRoleStrings(consumer.getSecurityRoles());
		if (!roles.contains("CLIENT") || roles.contains("OWNER") || roles.contains("STAFF")) {
			throw new BusinessException(
					HttpStatus.FORBIDDEN,
					"FORBIDDEN",
					"Solo gli account cliente possono prenotare online.");
		}
	}

	private static void assertConsumerOwns(Appointment appointment, ConsumerProfile consumer) {
		if (appointment.getConsumerProfile() == null
				|| !appointment.getConsumerProfile().getId().equals(consumer.getId())) {
			throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Operazione non consentita.");
		}
	}

	private static void assertConsumerCanMutateState(Appointment appointment) {
		AppointmentStatus s = appointment.getStatus();
		if (s == AppointmentStatus.CANCELLED) {
			throw new BusinessException(
					HttpStatus.FORBIDDEN,
					"APPOINTMENT_NOT_CANCELLABLE",
					"Appuntamento annullato.");
		}
		if (s == AppointmentStatus.ARRIVED
				|| s == AppointmentStatus.COMPLETED
				|| s == AppointmentStatus.NO_SHOW) {
			throw new BusinessException(
					HttpStatus.FORBIDDEN,
					"APPOINTMENT_NOT_CANCELLABLE",
					"Stato avanzato: contatta il salone.");
		}
	}

	/** Per token recensione: verifica che l'id nel payload corrisponda all'appuntamento. */
	public void assertTokenMatchesAppointment(Appointment appointment, UUID appointmentIdFromToken) {
		if (!appointment.getId().equals(appointmentIdFromToken)) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "INVALID_TOKEN", "Token non valido.");
		}
	}
}
