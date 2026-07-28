package it.luxury.review.service;

import it.luxury.publicapi.dto.ReviewShowcaseDtos.PublicSalonReviewItem;
import it.luxury.publicapi.dto.ReviewShowcaseDtos.ReviewShowcaseResponse;
import it.luxury.publicapi.dto.ReviewShowcaseDtos.SalonReviewsBlock;
import it.luxury.publicapi.dto.ReviewShowcaseDtos.LuxuryReviewBlock;
import it.luxury.publicapi.dto.ReviewShowcaseDtos.LuxuryReviewItem;
import it.luxury.review.domain.PlatformReview;
import it.luxury.review.domain.PlatformReviewAuthorKind;
import it.luxury.review.domain.PlatformReviewRepository;
import it.luxury.review.domain.Review;
import it.luxury.review.domain.ReviewRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ReviewShowcaseService {

	private static final int SHOWCASE_LIMIT = 14;

	private final ReviewRepository reviewRepository;
	private final PlatformReviewRepository platformReviewRepository;

	public ReviewShowcaseService(ReviewRepository reviewRepository, PlatformReviewRepository platformReviewRepository) {
		this.reviewRepository = reviewRepository;
		this.platformReviewRepository = platformReviewRepository;
	}

	@Transactional(readOnly = true)
	public ReviewShowcaseResponse buildShowcase() {
		LuxuryReviewBlock luxury = buildLuxuryBlock();
		SalonReviewsBlock salons = buildSalonBlock();
		return new ReviewShowcaseResponse(luxury, salons);
	}

	private LuxuryReviewBlock buildLuxuryBlock() {
		double avg = platformReviewRepository.averageRating().orElse(0.0);
		long count = platformReviewRepository.count();
		List<PlatformReview> slice = platformReviewRepository
				.findAllByOrderByCreatedAtDesc(PageRequest.of(0, SHOWCASE_LIMIT))
				.getContent();
		List<LuxuryReviewItem> items = slice.stream()
				.map(p -> new LuxuryReviewItem(
						p.getRating(),
						p.getComment(),
						p.getAuthorKind() == PlatformReviewAuthorKind.CLIENT ? "Cliente" : "Salone partner",
						p.getCreatedAt()))
				.toList();
		return new LuxuryReviewBlock(round1(avg), count, items);
	}

	private SalonReviewsBlock buildSalonBlock() {
		double avg = reviewRepository.averagePublicRating().orElse(0.0);
		long count = reviewRepository.countPublic();
		List<Review> slice = reviewRepository
				.findPublicPageWithAssociations(PageRequest.of(0, SHOWCASE_LIMIT))
				.getContent();
		List<PublicSalonReviewItem> items = slice.stream()
				.map(r -> {
					var a = r.getAppointment();
					var loc = a.getLocation();
					var sg = loc.getStudioGroup();
					String city = loc.getCity();
					return new PublicSalonReviewItem(
							sg.getName(),
							city != null && !city.isBlank() ? city : null,
							r.getRating(),
							r.getComment(),
							r.getCreatedAt());
				})
				.toList();
		return new SalonReviewsBlock(round1(avg), count, items);
	}

	private static double round1(double v) {
		return Math.round(v * 10.0) / 10.0;
	}
}
