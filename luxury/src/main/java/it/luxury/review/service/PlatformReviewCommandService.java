package it.luxury.review.service;

import it.luxury.common.api.BusinessException;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.service.ConsumerProfileService;
import it.luxury.review.domain.PlatformReview;
import it.luxury.review.domain.PlatformReviewRepository;
import it.luxury.security.auth.LuxuryUserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlatformReviewCommandService {

	private final PlatformReviewRepository platformReviewRepository;
	private final ConsumerProfileService consumerProfileService;

	public PlatformReviewCommandService(
			PlatformReviewRepository platformReviewRepository,
			ConsumerProfileService consumerProfileService) {
		this.platformReviewRepository = platformReviewRepository;
		this.consumerProfileService = consumerProfileService;
	}

	@Transactional
	public PlatformReview submitAsClient(LuxuryUserPrincipal principal, int rating, String comment) {
		if (rating < 1 || rating > 5) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Il voto deve essere tra 1 e 5 stelle.");
		}
		String trimmed = comment != null ? comment.trim() : "";
		if (trimmed.length() > 4000) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Il commento supera i 4000 caratteri.");
		}
		String safeComment = trimmed.isEmpty() ? null : trimmed;
		if (!principal.hasAppRole("CLIENT")) {
			throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Solo gli account cliente possono inviare questa recensione.");
		}
		ConsumerProfile profile = consumerProfileService.requireActiveProfile(principal);
		return platformReviewRepository.save(new PlatformReview(profile, rating, safeComment));
	}
}
