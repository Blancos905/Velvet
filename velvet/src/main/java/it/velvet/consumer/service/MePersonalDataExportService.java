package it.velvet.consumer.service;

import it.velvet.appointment.service.AppointmentBookingService;
import it.velvet.consumer.api.MeFavoritesController.FavoriteDto;
import it.velvet.consumer.api.MeProfileController.ProfileDto;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.notification.domain.ScheduledNotification;
import it.velvet.notification.domain.ScheduledNotificationRepository;
import it.velvet.notification.domain.UserDevice;
import it.velvet.notification.domain.UserDeviceRepository;
import it.velvet.publicapi.dto.AppointmentResponses.AppointmentDto;
import it.velvet.review.domain.Review;
import it.velvet.review.domain.ReviewRepository;
import it.velvet.security.auth.VelvetUserPrincipal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MePersonalDataExportService {

	private static final int NOTIFICATION_EXPORT_LIMIT = 500;
	private static final int DEVICE_EXPORT_LIMIT = 50;

	private final ConsumerProfileService consumerProfileService;
	private final AppointmentBookingService appointmentBookingService;
	private final FavoriteLocationService favoriteLocationService;
	private final ReviewRepository reviewRepository;
	private final UserDeviceRepository userDeviceRepository;
	private final ScheduledNotificationRepository scheduledNotificationRepository;

	public MePersonalDataExportService(
			ConsumerProfileService consumerProfileService,
			AppointmentBookingService appointmentBookingService,
			FavoriteLocationService favoriteLocationService,
			ReviewRepository reviewRepository,
			UserDeviceRepository userDeviceRepository,
			ScheduledNotificationRepository scheduledNotificationRepository) {
		this.consumerProfileService = consumerProfileService;
		this.appointmentBookingService = appointmentBookingService;
		this.favoriteLocationService = favoriteLocationService;
		this.reviewRepository = reviewRepository;
		this.userDeviceRepository = userDeviceRepository;
		this.scheduledNotificationRepository = scheduledNotificationRepository;
	}

	@Transactional(readOnly = true)
	public Map<String, Object> exportForPrincipal(VelvetUserPrincipal principal) {
		ConsumerProfile profile = consumerProfileService.requireActiveProfile(principal);
		List<AppointmentDto> upcoming = appointmentBookingService.listUpcomingForConsumer(profile.getId()).stream()
				.map(AppointmentDto::from)
				.toList();
		List<AppointmentDto> past = appointmentBookingService.listPastForConsumer(profile.getId()).stream()
				.map(AppointmentDto::from)
				.toList();
		List<FavoriteDto> favorites = favoriteLocationService.list(principal).stream()
				.map(FavoriteDto::from)
				.toList();
		List<Map<String, Object>> reviews = reviewRepository
				.findByAppointment_ConsumerProfile_IdOrderByCreatedAtDesc(profile.getId())
				.stream()
				.map(this::reviewExportRow)
				.toList();
		List<Map<String, Object>> devices = userDeviceRepository.findByUserId(profile.getId()).stream()
				.limit(DEVICE_EXPORT_LIMIT)
				.map(this::deviceExportRow)
				.toList();
		List<Map<String, Object>> notifications = scheduledNotificationRepository
				.findAllForConsumerDataExport(profile.getId(), PageRequest.of(0, NOTIFICATION_EXPORT_LIMIT))
				.stream()
				.map(this::notificationExportRow)
				.toList();

		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("exportedAt", Instant.now());
		payload.put("profile", profileExportRow(profile));
		Map<String, Object> legalAcceptance = new LinkedHashMap<>();
		legalAcceptance.put("termsAcceptedAt", profile.getTermsAcceptedAt());
		legalAcceptance.put("legalDocumentVersion", profile.getLegalDocumentVersion());
		payload.put("legalAcceptance", legalAcceptance);
		payload.put("appointments", Map.of("upcoming", upcoming, "past", past));
		payload.put("favorites", favorites);
		payload.put("reviews", reviews);
		payload.put("pushDevices", devices);
		payload.put("platformNotifications", notifications);
		return payload;
	}

	private Map<String, Object> profileExportRow(ConsumerProfile profile) {
		ProfileDto dto = ProfileDto.from(profile);
		Map<String, Object> row = new LinkedHashMap<>();
		row.put("id", dto.id());
		row.put("email", dto.email());
		row.put("displayName", dto.displayName());
		row.put("phone", dto.phone());
		row.put("country", dto.country());
		row.put("preferredLocale", dto.preferredLocale());
		row.put("planTier", profile.getPlanTier());
		row.put("securityRoles", profile.getSecurityRoles());
		row.put("createdAt", profile.getCreatedAt());
		return row;
	}

	private Map<String, Object> reviewExportRow(Review review) {
		Map<String, Object> row = new LinkedHashMap<>();
		row.put("id", review.getId());
		row.put("salonRating", review.getRating());
		row.put("staffRating", review.getStaffRating());
		row.put("comment", review.getComment());
		row.put("createdAt", review.getCreatedAt());
		row.put("reviewerIdentityDetached", review.isReviewerIdentityDetached());
		return row;
	}

	private Map<String, Object> deviceExportRow(UserDevice device) {
		Map<String, Object> row = new LinkedHashMap<>();
		row.put("osType", device.getOsType() != null ? device.getOsType().name() : null);
		row.put("fcmToken", device.getFcmToken());
		row.put("registeredAt", device.getCreatedAt());
		row.put("updatedAt", device.getUpdatedAt());
		return row;
	}

	private Map<String, Object> notificationExportRow(ScheduledNotification notification) {
		Map<String, Object> row = new LinkedHashMap<>();
		row.put("id", notification.getId());
		row.put("type", notification.getType() != null ? notification.getType().name() : null);
		row.put("status", notification.getStatus() != null ? notification.getStatus().name() : null);
		row.put("scheduledAt", notification.getScheduledAt());
		row.put("sentAt", notification.getSentAt());
		row.put("subject", notification.getPlatformMessageSubject());
		row.put("body", notification.getPlatformMessageBody());
		return row;
	}
}
