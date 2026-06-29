package it.velvet.review.service;

import it.velvet.common.api.BusinessException;
import it.velvet.review.domain.Review;
import it.velvet.review.domain.ReviewRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class ReviewModerationService {

	private final ReviewRepository reviewRepository;

	public ReviewModerationService(ReviewRepository reviewRepository) {
		this.reviewRepository = reviewRepository;
	}

	@Transactional
	public void hideSalonReview(UUID reviewId) {
		Review review = reviewRepository.findById(reviewId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Recensione non trovata."));
		if (review.getHiddenAt() != null) {
			return;
		}
		review.setHiddenAt(Instant.now());
		reviewRepository.save(review);
	}
}
