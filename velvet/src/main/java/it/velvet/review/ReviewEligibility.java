package it.velvet.review;

import it.velvet.appointment.domain.Appointment;
import it.velvet.appointment.domain.AppointmentStatus;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Regole comuni per inviti recensione (in-app, email token, elaborazione coda).
 */
public final class ReviewEligibility {

	private ReviewEligibility() {
	}

	public static int effectiveOffsetHours(int configured) {
		return configured <= 0 ? 2 : configured;
	}

	/**
	 * @param now  istante di riferimento (es. {@link Instant#now()})
	 * @param offsetHours valore da {@code velvet.notifications.review-invite-offset-hours}
	 */
	public static boolean mayInviteOrSubmitReview(Appointment a, Instant now, int offsetHours) {
		if (a.getStatus() == AppointmentStatus.CANCELLED || a.getStatus() == AppointmentStatus.NO_SHOW) {
			return false;
		}
		Instant eligibleAfter = a.getEnd().plus(effectiveOffsetHours(offsetHours), ChronoUnit.HOURS);
		return !now.isBefore(eligibleAfter);
	}
}
