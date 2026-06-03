package it.velvet.publicapi.service;

import it.velvet.appointment.domain.Appointment;
import it.velvet.appointment.service.AppointmentBookingService;
import it.velvet.appointment.service.AvailabilityService;
import it.velvet.security.AppointmentTokenService;
import it.velvet.security.TokenPurpose;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class PublicAppointmentManageService {

	private final AppointmentTokenService appointmentTokenService;
	private final AppointmentBookingService appointmentBookingService;
	private final PublicBookingMetaService publicBookingMetaService;
	private final AvailabilityService availabilityService;

	public PublicAppointmentManageService(
			AppointmentTokenService appointmentTokenService,
			AppointmentBookingService appointmentBookingService,
			PublicBookingMetaService publicBookingMetaService,
			AvailabilityService availabilityService) {
		this.appointmentTokenService = appointmentTokenService;
		this.appointmentBookingService = appointmentBookingService;
		this.publicBookingMetaService = publicBookingMetaService;
		this.availabilityService = availabilityService;
	}

	@Transactional(readOnly = true)
	public ManageView manage(String rawToken) {
		Appointment a = resolveManage(rawToken);
		boolean canCancel = publicBookingMetaService.canConsumerCancel(a);
		boolean canReschedule = publicBookingMetaService.canConsumerReschedule(a);
		String policyHint = "Le modifiche da parte tua sono soggette alle condizioni del salone.";
		return new ManageView(
				AppointmentSummary.from(a),
				canCancel,
				canReschedule,
				publicBookingMetaService.consumerBlockReason(a),
				policyHint);
	}

	@Transactional
	public void cancel(String rawToken, String reason) {
		Appointment a = resolveManage(rawToken);
		appointmentBookingService.cancelByToken(a);
	}

	@Transactional(readOnly = true)
	public List<String> rescheduleSlots(String rawToken, LocalDate from, LocalDate to) {
		Appointment a = resolveManage(rawToken);
		List<Instant> slots = availabilityService.computeSlotsForReschedule(a, from, to);
		return slots.stream().map(Instant::toString).toList();
	}

	@Transactional
	public void reschedule(String rawToken, Instant newStart) {
		Appointment a = resolveManage(rawToken);
		appointmentBookingService.rescheduleByToken(a, newStart);
	}

	private Appointment resolveManage(String rawToken) {
		AppointmentTokenService.Payload payload =
				appointmentTokenService.verify(rawToken, TokenPurpose.MANAGE);
		UUID aid = appointmentTokenService.appointmentId(payload);
		Appointment a = appointmentBookingService.requireAppointment(aid);
		appointmentBookingService.assertTokenMatchesAppointment(a, aid);
		return a;
	}

	public record AppointmentSummary(
			UUID id,
			String locationName,
			String locationSlug,
			String serviceName,
			Instant start,
			Instant end,
			String status) {
		public static AppointmentSummary from(Appointment a) {
			return new AppointmentSummary(
					a.getId(),
					a.getLocation().getName(),
					a.getLocation().getSlug(),
					a.getService().getName(),
					a.getStart(),
					a.getEnd(),
					a.getStatus().name());
		}
	}

	public record ManageView(
			AppointmentSummary appointment,
			boolean canCancel,
			boolean canReschedule,
			String blockedReason,
			String policySummary) {
	}
}
