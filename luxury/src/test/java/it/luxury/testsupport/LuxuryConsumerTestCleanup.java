package it.luxury.testsupport;

import it.luxury.appointment.domain.AppointmentRepository;
import it.luxury.catalog.domain.SalonClientRepository;
import it.luxury.catalog.domain.SalonLuxuryChatMessageRepository;
import it.luxury.catalog.domain.SalonLuxuryChatReadStateRepository;
import it.luxury.catalog.domain.StaffOperatorRepository;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.consumer.domain.FavoriteLocationRepository;
import it.luxury.notification.domain.ScheduledNotificationRepository;
import it.luxury.notification.domain.UserDeviceRepository;
import it.luxury.review.domain.PlatformReviewRepository;
import it.luxury.review.domain.ReviewRepository;
import it.luxury.security.auth.domain.AuthRefreshTokenRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class LuxuryConsumerTestCleanup {

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

	public LuxuryConsumerTestCleanup(
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
