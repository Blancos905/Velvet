package it.luxury.publicapi.dto;

import it.luxury.appointment.domain.Appointment;
import it.luxury.appointment.domain.AppointmentStatus;
import it.luxury.studio.domain.Location;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

public final class AppointmentResponses {

	private AppointmentResponses() {
	}

	public record AppointmentDto(
			UUID id,
			UUID locationId,
			String locationSlug,
			String locationName,
			String locationLogoDataUrl,
			UUID serviceId,
			String serviceName,
			int priceCents,
			UUID operatorId,
			String operatorName,
			Instant start,
			Instant end,
			AppointmentStatus status,
			UUID salonClientId,
			String salonClientDisplayName,
			Instant consumerCancelDeadline,
			Instant consumerRescheduleDeadline,
			boolean canConsumerCancel,
			boolean canConsumerReschedule) {

		public static AppointmentDto from(Appointment a) {
			return from(a, null);
		}

		public static AppointmentDto from(Appointment a, String locationLogoDataUrl) {
			Location loc = a.getLocation();
			Instant start = a.getStart();
			Instant cancelDl = start.minus(Duration.ofHours(loc.getConsumerCancelDeadlineHoursBeforeStart()));
			Instant rescheduleDl = start.minus(Duration.ofHours(loc.getConsumerRescheduleDeadlineHoursBeforeStart()));
			boolean mutable = consumerSelfServiceStatus(a.getStatus());
			boolean canCancel = mutable;
			boolean canReschedule = mutable;
			return new AppointmentDto(
					a.getId(),
					loc.getId(),
					loc.getSlug(),
					loc.getName(),
					locationLogoDataUrl,
					a.getService().getId(),
					a.getService().getName(),
					a.getService().getPriceCents(),
					a.getOperator().getId(),
					a.getOperator().getDisplayName(),
					start,
					a.getEnd(),
					a.getStatus(),
					a.getSalonClient().getId(),
					a.getSalonClient().getDisplayName(),
					cancelDl,
					rescheduleDl,
					canCancel,
					canReschedule);
		}

		private static boolean consumerSelfServiceStatus(AppointmentStatus status) {
			return status == AppointmentStatus.CONFIRMED;
		}
	}
}
