package it.velvet.testsupport;

import it.velvet.appointment.domain.AppointmentRepository;
import it.velvet.catalog.domain.SalonClientRepository;
import it.velvet.catalog.domain.SalonVelvetChatMessageRepository;
import it.velvet.catalog.domain.SalonVelvetChatReadStateRepository;
import it.velvet.catalog.domain.StaffOperatorRepository;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.consumer.domain.FavoriteLocationRepository;
import it.velvet.notification.domain.ScheduledNotificationRepository;
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
	private final SalonVelvetChatMessageRepository salonVelvetChatMessageRepository;
	private final SalonVelvetChatReadStateRepository salonVelvetChatReadStateRepository;
	private final SalonClientRepository salonClientRepository;
	private final FavoriteLocationRepository favoriteLocationRepository;
	private final StaffOperatorRepository staffOperatorRepository;

	public VelvetConsumerTestCleanup(
			ConsumerProfileRepository consumerProfileRepository,
			AppointmentRepository appointmentRepository,
			AuthRefreshTokenRepository authRefreshTokenRepository,
			ReviewRepository reviewRepository,
			PlatformReviewRepository platformReviewRepository,
			ScheduledNotificationRepository scheduledNotificationRepository,
			SalonVelvetChatMessageRepository salonVelvetChatMessageRepository,
			SalonVelvetChatReadStateRepository salonVelvetChatReadStateRepository,
			SalonClientRepository salonClientRepository,
			FavoriteLocationRepository favoriteLocationRepository,
			StaffOperatorRepository staffOperatorRepository) {
		this.consumerProfileRepository = consumerProfileRepository;
		this.appointmentRepository = appointmentRepository;
		this.authRefreshTokenRepository = authRefreshTokenRepository;
		this.reviewRepository = reviewRepository;
		this.platformReviewRepository = platformReviewRepository;
		this.scheduledNotificationRepository = scheduledNotificationRepository;
		this.salonVelvetChatMessageRepository = salonVelvetChatMessageRepository;
		this.salonVelvetChatReadStateRepository = salonVelvetChatReadStateRepository;
		this.salonClientRepository = salonClientRepository;
		this.favoriteLocationRepository = favoriteLocationRepository;
		this.staffOperatorRepository = staffOperatorRepository;
	}

	@Transactional
	public void deleteAllConsumerProfiles() {
		authRefreshTokenRepository.deleteAll();
		salonVelvetChatReadStateRepository.deleteAll();
		salonVelvetChatMessageRepository.deleteAll();
		reviewRepository.deleteAll();
		platformReviewRepository.deleteAll();
		scheduledNotificationRepository.deleteAll();
		appointmentRepository.deleteAll();
		favoriteLocationRepository.deleteAll();
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
