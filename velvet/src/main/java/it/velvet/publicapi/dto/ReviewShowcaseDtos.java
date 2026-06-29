package it.velvet.publicapi.dto;

import java.time.Instant;
import java.util.List;

public final class ReviewShowcaseDtos {

	private ReviewShowcaseDtos() {
	}

	public record ReviewShowcaseResponse(VelvetReviewBlock velvet, SalonReviewsBlock salons) {
	}

	public record VelvetReviewBlock(double averageRating, long reviewCount, List<VelvetReviewItem> recentItems) {
	}

	public record VelvetReviewItem(int rating, String comment, String authorLabel, Instant createdAt) {
	}

	public record SalonReviewsBlock(double averageRating, long reviewCount, List<PublicSalonReviewItem> recentItems) {
	}

	public record PublicSalonReviewItem(String salonName, String city, int rating, String comment, Instant createdAt) {
	}
}
