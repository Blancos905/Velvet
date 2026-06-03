package it.velvet.review.service;

import it.velvet.publicapi.dto.ReviewShowcaseDtos.PublicSalonReviewItem;
import it.velvet.publicapi.dto.ReviewShowcaseDtos.ReviewShowcaseResponse;
import it.velvet.publicapi.dto.ReviewShowcaseDtos.SalonReviewsBlock;
import it.velvet.publicapi.dto.ReviewShowcaseDtos.VelvetReviewBlock;
import it.velvet.publicapi.dto.ReviewShowcaseDtos.VelvetReviewItem;
import it.velvet.review.domain.PlatformReview;
import it.velvet.review.domain.PlatformReviewAuthorKind;
import it.velvet.review.domain.PlatformReviewRepository;
import it.velvet.review.domain.Review;
import it.velvet.review.domain.ReviewRepository;
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
		VelvetReviewBlock velvet = buildVelvetBlock();
		SalonReviewsBlock salons = buildSalonBlock();
		return new ReviewShowcaseResponse(velvet, salons);
	}

	private VelvetReviewBlock buildVelvetBlock() {
		double avg = platformReviewRepository.averageRating().orElse(0.0);
		long count = platformReviewRepository.count();
		List<PlatformReview> slice = platformReviewRepository
				.findAllByOrderByCreatedAtDesc(PageRequest.of(0, SHOWCASE_LIMIT))
				.getContent();
		List<VelvetReviewItem> items = slice.stream()
				.map(p -> new VelvetReviewItem(
						p.getRating(),
						p.getComment(),
						p.getAuthorKind() == PlatformReviewAuthorKind.CLIENT ? "Cliente" : "Salone partner",
						p.getCreatedAt()))
				.toList();
		return new VelvetReviewBlock(round1(avg), count, items);
	}

	private SalonReviewsBlock buildSalonBlock() {
		double avg = reviewRepository.averageRating().orElse(0.0);
		long count = reviewRepository.count();
		List<Review> slice = reviewRepository
				.findPageWithAssociations(PageRequest.of(0, SHOWCASE_LIMIT))
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
