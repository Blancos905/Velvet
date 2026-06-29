package it.velvet.testsupport;

import it.velvet.appointment.domain.AppointmentRepository;
import it.velvet.catalog.domain.SalonClientRepository;
import it.velvet.catalog.domain.SalonLuxuryChatMessageRepository;
import it.velvet.catalog.domain.SalonLuxuryChatReadStateRepository;
import it.velvet.catalog.domain.StaffOperatorRepository;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.consumer.domain.FavoriteLocationRepository;
import it.velvet.notification.domain.ScheduledNotificationRepository;
import it.velvet.notification.domain.UserDeviceRepository;
import it.velvet.review.domain.PlatformReviewRepository;
import it.velvet.review.domain.ReviewRepository;
import it.velvet.security.auth.domain.AuthRefreshTokenRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class VelvetConsumerTestCleanup {

	private final ConsumerProfileRepository consumerProfileRepository;
	private final AppointmentRepository appointmentRepository;
	private final AuthRefreshTokenRepository authRefreshTokenRepository;
	private final ReviewRepository reviewRepository;
	private final PlatformReviewRepository platformReviewRepository;
	private final ScheduledNotificationRepository scheduledNotificationRepository;
	private final SalonLuxuryChatMessageRepository salonLuxuryChatMessageRepository;
	private final SalonLuxuryChatReadStateRepository salonLuxuryChatReadStateRepository;
	private final SalonClientRepository salonClientRepository;
	private final FavoriteLocationRepository favoriteLocationRepository;
	private final StaffOperatorRepository staffOperatorRepository;
	private final UserDeviceRepository userDeviceRepository;

	public VelvetConsumerTestCleanup(
			ConsumerProfileRepository consumerProfileRepository,
			AppointmentRepository appointmentRepository,
			AuthRefreshTokenRepository authRefreshTokenRepository,
			ReviewRepository reviewRepository,
			PlatformReviewRepository platformReviewRepository,
			ScheduledNotificationRepository scheduledNotificationRepository,
			SalonLuxuryChatMessageRepository salonLuxuryChatMessageRepository,
			SalonLuxuryChatReadStateRepository salonLuxuryChatReadStateRepository,
			SalonClientRepository salonClientRepository,
			FavoriteLocationRepository favoriteLocationRepository,
			StaffOperatorRepository staffOperatorRepository,
			UserDeviceRepository userDeviceRepository) {
		this.consumerProfileRepository = consumerProfileRepository;
		this.appointmentRepository = appointmentRepository;
		this.authRefreshTokenRepository = authRefreshTokenRepository;
		this.reviewRepository = reviewRepository;
		this.platformReviewRepository = platformReviewRepository;
		this.scheduledNotificationRepository = scheduledNotificationRepository;
		this.salonLuxuryChatMessageRepository = salonLuxuryChatMessageRepository;
		this.salonLuxuryChatReadStateRepository = salonLuxuryChatReadStateRepository;
		this.salonClientRepository = salonClientRepository;
		this.favoriteLocationRepository = favoriteLocationRepository;
		this.staffOperatorRepository = staffOperatorRepository;
		this.userDeviceRepository = userDeviceRepository;
	}

	@Transactional
	public void deleteAllConsumerProfiles() {
		authRefreshTokenRepository.deleteAll();
		salonLuxuryChatReadStateRepository.deleteAll();
		salonLuxuryChatMessageRepository.deleteAll();
		reviewRepository.deleteAll();
		platformReviewRepository.deleteAll();
		scheduledNotificationRepository.deleteAll();
		appointmentRepository.deleteAll();
		favoriteLocationRepository.deleteAll();
		userDeviceRepository.deleteAll();
		salonClientRepository.deleteAll();
		staffOperatorRepository.findAll().stream()
				.filter(op -> op.getConsumerProfile() != null)
				.forEach(op -> {
					op.setConsumerProfile(null);
					staffOperatorRepository.save(op);
				});
		consumerProfileRepository.deleteAll();
	}
}
