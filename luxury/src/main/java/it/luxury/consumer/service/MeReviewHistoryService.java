package it.luxury.consumer.service;

import it.luxury.appointment.domain.Appointment;
import it.luxury.appointment.domain.AppointmentRepository;
import it.luxury.config.LuxuryNotificationProperties;
import it.luxury.review.ReviewEligibility;
import it.luxury.review.domain.Review;
import it.luxury.review.domain.ReviewRepository;
import it.luxury.security.auth.LuxuryUserPrincipal;
import it.luxury.studio.domain.SalonSiteContent;
import it.luxury.studio.domain.SalonSiteContentKind;
import it.luxury.studio.domain.SalonSiteContentRepository;
import it.luxury.studio.service.SalonShowcasePayloadSupport;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
public class MeReviewHistoryService {

	private final ConsumerProfileService consumerProfileService;
	private final ReviewRepository reviewRepository;
	private final AppointmentRepository appointmentRepository;
	private final LuxuryNotificationProperties notificationProperties;
	private final SalonSiteContentRepository salonSiteContentRepository;

	public MeReviewHistoryService(
			ConsumerProfileService consumerProfileService,
			ReviewRepository reviewRepository,
			AppointmentRepository appointmentRepository,
			LuxuryNotificationProperties notificationProperties,
			SalonSiteContentRepository salonSiteContentRepository) {
		this.consumerProfileService = consumerProfileService;
		this.reviewRepository = reviewRepository;
		this.appointmentRepository = appointmentRepository;
		this.notificationProperties = notificationProperties;
		this.salonSiteContentRepository = salonSiteContentRepository;
	}

	public List<MeReviewHistoryItem> list(LuxuryUserPrincipal principal) {
		var profile = consumerProfileService.requireActiveProfile(principal);
		var reviews = reviewRepository.findByAppointment_ConsumerProfile_IdOrderByCreatedAtDesc(profile.getId());
		Map<String, String> logoBySlug = resolveSalonLogoDataUrls(reviews);
		return reviews.stream()
				.map(review -> toItem(review, logoBySlug))
				.toList();
	}

	private Map<String, String> resolveSalonLogoDataUrls(List<Review> reviews) {
		List<String> slugs = reviews.stream()
				.map(Review::getAppointment)
				.filter(Objects::nonNull)
				.map(Appointment::getLocation)
				.filter(Objects::nonNull)
				.map(location -> location.getSlug())
				.filter(Objects::nonNull)
				.map(slug -> slug.trim().toLowerCase(Locale.ROOT))
				.filter(slug -> !slug.isEmpty())
				.distinct()
				.toList();
		if (slugs.isEmpty()) {
			return Map.of();
		}
		Map<String, String> logoBySlug = new HashMap<>();
		for (SalonSiteContent content : salonSiteContentRepository.findBySlugInAndKind(slugs, SalonSiteContentKind.SHOWCASE)) {
			String visual = SalonShowcasePayloadSupport.resolveHitVisualDataUrl(content.getPayload());
			if (visual != null) {
				logoBySlug.put(content.getSlug().toLowerCase(Locale.ROOT), visual);
			}
		}
		return logoBySlug;
	}

	public List<MePendingReviewInviteItem> listPendingInvites(LuxuryUserPrincipal principal) {
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

	private MeReviewHistoryItem toItem(Review review, Map<String, String> logoBySlug) {
		var appointment = review.getAppointment();
		var location = appointment != null ? appointment.getLocation() : null;
		var service = appointment != null ? appointment.getService() : null;
		String salonSlug = location != null ? location.getSlug() : null;
		String salonLogoDataUrl = null;
		if (salonSlug != null && !salonSlug.isBlank()) {
			salonLogoDataUrl = logoBySlug.get(salonSlug.trim().toLowerCase(Locale.ROOT));
		}
		return new MeReviewHistoryItem(
				review.getId(),
				review.getRating(),
				review.getStaffRating(),
				review.getComment(),
				review.getCreatedAt(),
				appointment != null ? appointment.getId() : null,
				appointment != null ? appointment.getStart() : null,
				location != null ? location.getName() : null,
				salonSlug,
				salonLogoDataUrl,
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
			String salonSlug,
			String salonLogoDataUrl,
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
