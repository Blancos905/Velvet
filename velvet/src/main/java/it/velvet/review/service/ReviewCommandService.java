package it.velvet.review.service;

import it.velvet.appointment.domain.Appointment;
import it.velvet.appointment.service.AppointmentBookingService;
import it.velvet.common.api.BusinessException;
import it.velvet.config.VelvetNotificationProperties;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.review.ReviewEligibility;
import it.velvet.review.domain.Review;
import it.velvet.review.domain.ReviewRepository;
import it.velvet.security.AppointmentTokenService;
import it.velvet.security.TokenPurpose;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class ReviewCommandService {

	private final ReviewRepository reviewRepository;
	private final AppointmentBookingService appointmentBookingService;
	private final AppointmentTokenService appointmentTokenService;
	private final VelvetNotificationProperties notificationProperties;

	public ReviewCommandService(
			ReviewRepository reviewRepository,
			AppointmentBookingService appointmentBookingService,
			AppointmentTokenService appointmentTokenService,
			VelvetNotificationProperties notificationProperties) {
		this.reviewRepository = reviewRepository;
		this.appointmentBookingService = appointmentBookingService;
		this.appointmentTokenService = appointmentTokenService;
		this.notificationProperties = notificationProperties;
	}

	@Transactional
	public Review submitFromConsumer(
			UUID appointmentId,
			ConsumerProfile consumer,
			int salonRating,
			int staffRating,
			String comment) {
		Appointment a = appointmentBookingService.requireAppointment(appointmentId);
		if (a.getConsumerProfile() == null || !a.getConsumerProfile().getId().equals(consumer.getId())) {
			throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Operazione non consentita.");
		}
		if (!ReviewEligibility.mayInviteOrSubmitReview(a, Instant.now(), notificationProperties.getReviewInviteOffsetHours())) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "NOT_ELIGIBLE", "Recensione non ancora ammissibile.");
		}
		return saveReview(a, salonRating, staffRating, comment);
	}

	@Transactional
	public Review submitFromToken(String rawToken, int salonRating, int staffRating, String comment) {
		AppointmentTokenService.Payload payload =
				appointmentTokenService.verify(rawToken, TokenPurpose.REVIEW);
		UUID aid = appointmentTokenService.appointmentId(payload);
		Appointment a = appointmentBookingService.requireAppointment(aid);
		appointmentBookingService.assertTokenMatchesAppointment(a, aid);
		if (!ReviewEligibility.mayInviteOrSubmitReview(a, Instant.now(), notificationProperties.getReviewInviteOffsetHours())) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "NOT_ELIGIBLE", "Recensione non ancora ammissibile.");
		}
		return saveReview(a, salonRating, staffRating, comment);
	}

	private Review saveReview(Appointment a, int salonRating, int staffRating, String comment) {
		if (salonRating < 1 || salonRating > 5 || staffRating < 1 || staffRating > 5) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Ogni voto deve essere tra 1 e 5 stelle.");
		}
		Optional<Review> existing = reviewRepository.findByAppointment_Id(a.getId());
		if (existing.isPresent()) {
			return existing.get();
		}
		return reviewRepository.save(new Review(a, salonRating, staffRating, comment));
	}
}
