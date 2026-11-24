package it.luxury.review.service;

import it.luxury.appointment.domain.Appointment;
import it.luxury.appointment.service.AppointmentBookingService;
import it.luxury.common.api.BusinessException;
import it.luxury.config.LuxuryNotificationProperties;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.review.ReviewEligibility;
import it.luxury.review.domain.Review;
import it.luxury.review.domain.ReviewRepository;
import it.luxury.notification.service.SalonEngagementNotificationService;
import it.luxury.security.AppointmentTokenService;
import it.luxury.security.TokenPurpose;
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
	private final LuxuryNotificationProperties notificationProperties;
	private final SalonEngagementNotificationService salonEngagementNotificationService;

	public ReviewCommandService(
			ReviewRepository reviewRepository,
			AppointmentBookingService appointmentBookingService,
			AppointmentTokenService appointmentTokenService,
			LuxuryNotificationProperties notificationProperties,
			SalonEngagementNotificationService salonEngagementNotificationService) {
		this.reviewRepository = reviewRepository;
		this.appointmentBookingService = appointmentBookingService;
		this.appointmentTokenService = appointmentTokenService;
		this.notificationProperties = notificationProperties;
		this.salonEngagementNotificationService = salonEngagementNotificationService;
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
			if (comment != null && comment.length() > 4000) {
				throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Il commento può avere al massimo 4000 caratteri.");
			}
			Optional<Review> existing = reviewRepository.findByAppointment_Id(a.getId());
			if (existing.isPresent()) {
				throw new BusinessException(
						HttpStatus.CONFLICT,
						"REVIEW_ALREADY_EXISTS",
						"Hai già inviato una recensione per questo appuntamento.");
			}
		Review saved = reviewRepository.save(new Review(a, salonRating, staffRating, comment));
		salonEngagementNotificationService.onReviewSubmitted(saved);
		return saved;
	}

	/**
	 * Cliente cancella una propria recensione (rimozione definitiva da storico e vetrina pubblica).
	 */
	@Transactional
	public void deleteAsConsumer(ConsumerProfile consumer, UUID reviewId) {
		Review review = reviewRepository.findDetailedById(reviewId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Recensione non trovata."));
		var appointment = review.getAppointment();
		var profile = appointment != null ? appointment.getConsumerProfile() : null;
		if (profile == null || !profile.getId().equals(consumer.getId())) {
			throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Non puoi cancellare questa recensione.");
		}
		reviewRepository.delete(review);
	}
}
