package it.velvet.publicapi.service;

import it.velvet.appointment.domain.Appointment;
import it.velvet.appointment.domain.AppointmentStatus;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

@Service
public class PublicBookingMetaService {

	public boolean canConsumerCancel(Appointment a) {
		if (a.getStatus() == AppointmentStatus.CANCELLED) {
			return false;
		}
		if (a.getStatus() == AppointmentStatus.ARRIVED || a.getStatus() == AppointmentStatus.COMPLETED) {
			return false;
		}
		return !Instant.now().isAfter(
				a.getStart().minus(Duration.ofHours(a.getLocation().getConsumerCancelDeadlineHoursBeforeStart())));
	}

	public boolean canConsumerReschedule(Appointment a) {
		if (a.getStatus() == AppointmentStatus.CANCELLED) {
			return false;
		}
		if (a.getStatus() == AppointmentStatus.ARRIVED || a.getStatus() == AppointmentStatus.COMPLETED) {
			return false;
		}
		return !Instant.now().isAfter(
				a.getStart().minus(Duration.ofHours(a.getLocation().getConsumerRescheduleDeadlineHoursBeforeStart())));
	}

	public String consumerBlockReason(Appointment a) {
		if (a.getStatus() == AppointmentStatus.CANCELLED) {
			return "Appuntamento già annullato.";
		}
		if (a.getStatus() == AppointmentStatus.ARRIVED || a.getStatus() == AppointmentStatus.COMPLETED) {
			return "Contatta il salone per modifiche.";
		}
		if (!canConsumerCancel(a)) {
			return "Fuori dalla finestra consentita: contatta il salone.";
		}
		return null;
	}
}
