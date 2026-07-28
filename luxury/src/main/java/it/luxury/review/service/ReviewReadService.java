package it.luxury.review.service;

import it.luxury.appointment.domain.Appointment;
import it.luxury.appointment.service.AppointmentBookingService;
import it.luxury.common.api.BusinessException;
import it.luxury.config.LuxuryNotificationProperties;
import it.luxury.review.ReviewEligibility;
import it.luxury.review.domain.ReviewRepository;
import it.luxury.security.AppointmentTokenService;
import it.luxury.security.TokenPurpose;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class ReviewReadService {

	private final AppointmentTokenService appointmentTokenService;
	private final AppointmentBookingService appointmentBookingService;
	private final ReviewRepository reviewRepository;
	private final LuxuryNotificationProperties notificationProperties;

	public ReviewReadService(
			AppointmentTokenService appointmentTokenService,
			AppointmentBookingService appointmentBookingService,
			ReviewRepository reviewRepository,
			LuxuryNotificationProperties notificationProperties) {
		this.appointmentTokenService = appointmentTokenService;
		this.appointmentBookingService = appointmentBookingService;
		this.reviewRepository = reviewRepository;
		this.notificationProperties = notificationProperties;
	}

	@Transactional(readOnly = true)
	public ReviewIntent intent(String rawToken) {
		AppointmentTokenService.Payload payload =
				appointmentTokenService.verify(rawToken, TokenPurpose.REVIEW);
		UUID aid = appointmentTokenService.appointmentId(payload);
		Appointment a = appointmentBookingService.requireAppointment(aid);
		appointmentBookingService.assertTokenMatchesAppointment(a, aid);
		if (!ReviewEligibility.mayInviteOrSubmitReview(a, Instant.now(), notificationProperties.getReviewInviteOffsetHours())) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "NOT_ELIGIBLE", "Visita non ancora idonea a recensione.");
		}
		boolean alreadySubmitted = reviewRepository.findByAppointment_Id(a.getId()).isPresent();
		return new ReviewIntent(
				a.getLocation().getName(),
				a.getService().getName(),
				a.getStart(),
				alreadySubmitted);
	}

	public record ReviewIntent(String salonName, String serviceName, java.time.Instant appointmentStart,
			boolean alreadySubmitted) {
	}
}
