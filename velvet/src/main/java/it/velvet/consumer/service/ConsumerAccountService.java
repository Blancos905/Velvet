package it.velvet.consumer.service;

import it.velvet.catalog.domain.SalonClient;
import it.velvet.catalog.domain.SalonClientRepository;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.notification.domain.UserDeviceRepository;
import it.velvet.review.ReviewPrivacySupport;
import it.velvet.review.domain.Review;
import it.velvet.review.domain.ReviewRepository;
import it.velvet.security.auth.VelvetRefreshTokenService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ConsumerAccountService {

	private final ConsumerProfileRepository consumerProfileRepository;
	private final VelvetRefreshTokenService velvetRefreshTokenService;
	private final UserDeviceRepository userDeviceRepository;
	private final ReviewRepository reviewRepository;
	private final SalonClientRepository salonClientRepository;

	public ConsumerAccountService(
			ConsumerProfileRepository consumerProfileRepository,
			VelvetRefreshTokenService velvetRefreshTokenService,
			UserDeviceRepository userDeviceRepository,
			ReviewRepository reviewRepository,
			SalonClientRepository salonClientRepository) {
		this.consumerProfileRepository = consumerProfileRepository;
		this.velvetRefreshTokenService = velvetRefreshTokenService;
		this.userDeviceRepository = userDeviceRepository;
		this.reviewRepository = reviewRepository;
		this.salonClientRepository = salonClientRepository;
	}

	/**
	 * Chiusura account consumatore/titolare: soft-delete profilo, revoca sessioni, rimozione token dispositivo,
	 * distacco identità dalle recensioni pubbliche (GDPR art. 17).
	 * Idempotente: seconda chiamata con stesso subject non modifica ulteriormente.
	 */
	@Transactional
	public void deleteAccount(String keycloakSub) {
		Optional<ConsumerProfile> existing = consumerProfileRepository.findByKeycloakSub(keycloakSub);
		if (existing.isPresent() && existing.get().getDeletedAt() != null) {
			return;
		}
		existing.ifPresent(profile -> {
			UUID profileId = profile.getId();
			velvetRefreshTokenService.revokeAllForProfile(profileId);
			userDeviceRepository.deleteByUserId(profileId);
			detachPublicIdentity(profileId);
			scrubProfileIdentifiers(profile);
			profile.setDeletedAt(Instant.now());
			consumerProfileRepository.save(profile);
		});
	}

	private void scrubProfileIdentifiers(ConsumerProfile profile) {
		profile.setEmail(null);
		profile.setDisplayName(null);
		profile.setPhone(null);
		profile.setPasswordHash(null);
		profile.setPreferredLocale(null);
		profile.setPasswordResetTokenHash(null);
		profile.setPasswordResetExpiresAt(null);
		profile.setNotificationInboxSentAckAt(null);
		profile.setNotificationInboxAckBookingConfirmationAt(null);
		profile.setNotificationInboxAckBookingUpdatedAt(null);
		profile.setNotificationInboxAckBookingCancelledAt(null);
		profile.setNotificationInboxAckSystemAt(null);
		profile.setNotificationInboxAckSupportRequestAt(null);
	}

	private void detachPublicIdentity(UUID profileId) {
		List<Review> reviews = reviewRepository.findByAppointment_ConsumerProfile_IdOrderByCreatedAtDesc(profileId);
		for (Review review : reviews) {
			if (!review.isReviewerIdentityDetached()) {
				review.setReviewerIdentityDetached(true);
				reviewRepository.save(review);
			}
		}
		for (SalonClient salonClient : salonClientRepository.findByConsumerProfile_IdOrderByCreatedAtDesc(profileId)) {
			salonClient.setDisplayName(ReviewPrivacySupport.ANONYMOUS_REVIEWER_LABEL);
			salonClient.setEmail(null);
			salonClient.setPhone(null);
			salonClient.setConsumerProfile(null);
			salonClientRepository.save(salonClient);
		}
	}
}
