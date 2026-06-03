package it.velvet.review.service;

import it.velvet.common.api.BusinessException;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.service.ConsumerProfileService;
import it.velvet.review.domain.PlatformReview;
import it.velvet.review.domain.PlatformReviewRepository;
import it.velvet.security.auth.VelvetUserPrincipal;
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
	public PlatformReview submitAsClient(VelvetUserPrincipal principal, int rating, String comment) {
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
