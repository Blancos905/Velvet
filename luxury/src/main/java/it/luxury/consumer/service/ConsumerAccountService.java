package it.luxury.consumer.service;

import it.luxury.catalog.domain.SalonClient;
import it.luxury.catalog.domain.SalonClientRepository;
import it.luxury.common.api.BusinessException;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.notification.domain.UserDeviceRepository;
import it.luxury.notification.service.AccountLifecycleEmailDispatchService;
import it.luxury.review.ReviewPrivacySupport;
import it.luxury.review.domain.Review;
import it.luxury.review.domain.ReviewRepository;
import it.luxury.security.auth.LuxuryRefreshTokenService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ConsumerAccountService {

	private final ConsumerProfileRepository consumerProfileRepository;
	private final LuxuryRefreshTokenService luxuryRefreshTokenService;
	private final UserDeviceRepository userDeviceRepository;
	private final ReviewRepository reviewRepository;
	private final SalonClientRepository salonClientRepository;
	private final AccountLifecycleEmailDispatchService accountLifecycleEmailDispatchService;
	private final PasswordEncoder passwordEncoder;

	public ConsumerAccountService(
			ConsumerProfileRepository consumerProfileRepository,
			LuxuryRefreshTokenService luxuryRefreshTokenService,
			UserDeviceRepository userDeviceRepository,
			ReviewRepository reviewRepository,
			SalonClientRepository salonClientRepository,
			AccountLifecycleEmailDispatchService accountLifecycleEmailDispatchService,
			PasswordEncoder passwordEncoder) {
		this.consumerProfileRepository = consumerProfileRepository;
		this.luxuryRefreshTokenService = luxuryRefreshTokenService;
		this.userDeviceRepository = userDeviceRepository;
		this.reviewRepository = reviewRepository;
		this.salonClientRepository = salonClientRepository;
		this.accountLifecycleEmailDispatchService = accountLifecycleEmailDispatchService;
		this.passwordEncoder = passwordEncoder;
	}

	/**
	 * Chiusura richiesta dall'utente: senza password corretta il profilo resta attivo.
	 */
	@Transactional
	public void deleteOwnAccount(String authSub, String currentPassword) {
		Optional<ConsumerProfile> existing = consumerProfileRepository.findByAuthSub(authSub);
		if (existing.isPresent() && existing.get().getDeletedAt() != null) {
			return;
		}
		ConsumerProfile profile = existing.orElseThrow(
				() -> new BusinessException(HttpStatus.UNAUTHORIZED, "PROFILE_NOT_FOUND", "Profilo non trovato."));
		if (currentPassword == null || currentPassword.isBlank()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Inserisci la password attuale.");
		}
		if (profile.getPasswordHash() == null || !passwordEncoder.matches(currentPassword, profile.getPasswordHash())) {
			throw new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Password attuale non corretta.");
		}
		deleteAccount(authSub);
	}

	/**
	 * Chiusura account consumatore/titolare: soft-delete profilo, revoca sessioni, rimozione token dispositivo,
	 * distacco identità dalle recensioni pubbliche (GDPR art. 17).
	 * Idempotente: seconda chiamata con stesso subject non modifica ulteriormente.
	 */
	@Transactional
	public void deleteAccount(String authSub) {
		Optional<ConsumerProfile> existing = consumerProfileRepository.findByAuthSub(authSub);
		if (existing.isPresent() && existing.get().getDeletedAt() != null) {
			return;
		}
		existing.ifPresent(profile -> {
			String emailBeforeScrub = profile.getEmail();
			String displayNameBeforeScrub = profile.getDisplayName();
			UUID profileId = profile.getId();
			luxuryRefreshTokenService.revokeAllForProfile(profileId);
			userDeviceRepository.deleteByUserId(profileId);
			detachPublicIdentity(profileId);
			scrubProfileIdentifiers(profile);
			profile.setDeletedAt(Instant.now());
			consumerProfileRepository.save(profile);
			accountLifecycleEmailDispatchService.dispatchAccountDeleted(emailBeforeScrub, displayNameBeforeScrub);
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
