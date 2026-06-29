package it.velvet.consumer.service;

import it.velvet.appointment.domain.Appointment;
import it.velvet.appointment.domain.AppointmentRepository;
import it.velvet.config.VelvetNotificationProperties;
import it.velvet.review.ReviewEligibility;
import it.velvet.review.domain.Review;
import it.velvet.review.domain.ReviewRepository;
import it.velvet.security.auth.VelvetUserPrincipal;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class MeReviewHistoryService {

	private final ConsumerProfileService consumerProfileService;
	private final ReviewRepository reviewRepository;
	private final AppointmentRepository appointmentRepository;
	private final VelvetNotificationProperties notificationProperties;

	public MeReviewHistoryService(
			ConsumerProfileService consumerProfileService,
			ReviewRepository reviewRepository,
			AppointmentRepository appointmentRepository,
			VelvetNotificationProperties notificationProperties) {
		this.consumerProfileService = consumerProfileService;
		this.reviewRepository = reviewRepository;
		this.appointmentRepository = appointmentRepository;
		this.notificationProperties = notificationProperties;
	}

	public List<MeReviewHistoryItem> list(VelvetUserPrincipal principal) {
		var profile = consumerProfileService.requireActiveProfile(principal);
		return reviewRepository.findByAppointment_ConsumerProfile_IdOrderByCreatedAtDesc(profile.getId())
				.stream()
				.map(this::toItem)
				.toList();
	}

	public List<MePendingReviewInviteItem> listPendingInvites(VelvetUserPrincipal principal) {
		var profile = consumerProfileService.requireActiveProfile(principal);
		int offset = ReviewEligibility.effectiveOffsetHours(notificationProperties.getReviewInviteOffsetHours());
		Instant readyAt = Instant.now().minus(Duration.ofHours(offset));
		return appointmentRepository.findPendingReviewInvitesForConsumer(profile.getId(), readyAt)
				.stream()
				.map(this::toPendingInviteItem)
				.toList();
	}

	private MePendingReviewInviteItem toPendingInviteItem(Appointment a) {
		return new MePendingReviewInviteItem(
				a.getId(),
				a.getLocation() != null ? a.getLocation().getName() : "Salone",
				a.getService() != null ? a.getService().getName() : null,
				operatorDisplayName(a),
				a.getEnd());
	}

	private static String operatorDisplayName(Appointment a) {
		var op = a.getOperator();
		if (op == null || op.getDisplayName() == null || op.getDisplayName().isBlank()) {
			return null;
		}
		return op.getDisplayName().trim();
	}

	private MeReviewHistoryItem toItem(Review review) {
		var appointment = review.getAppointment();
		var location = appointment != null ? appointment.getLocation() : null;
		var service = appointment != null ? appointment.getService() : null;
		return new MeReviewHistoryItem(
				review.getId(),
				review.getRating(),
				review.getStaffRating(),
				review.getComment(),
				review.getCreatedAt(),
				appointment != null ? appointment.getId() : null,
				appointment != null ? appointment.getStart() : null,
				location != null ? location.getName() : null,
				service != null ? service.getName() : null);
	}

	public record MeReviewHistoryItem(
			UUID id,
			int rating,
			Integer staffRating,
			String comment,
			Instant createdAt,
			UUID appointmentId,
			Instant appointmentStart,
			String salonName,
			String serviceName) {
	}

	public record MePendingReviewInviteItem(
			UUID appointmentId,
			String salonName,
			String serviceName,
			String operatorName,
			Instant completedAt) {
	}
}
