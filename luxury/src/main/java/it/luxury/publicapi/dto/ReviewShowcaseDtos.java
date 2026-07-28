package it.luxury.publicapi.dto;

import java.time.Instant;
import java.util.List;

public final class ReviewShowcaseDtos {

	private ReviewShowcaseDtos() {
	}

	public record ReviewShowcaseResponse(LuxuryReviewBlock luxury, SalonReviewsBlock salons) {
	}

	public record LuxuryReviewBlock(double averageRating, long reviewCount, List<LuxuryReviewItem> recentItems) {
	}

	public record LuxuryReviewItem(int rating, String comment, String authorLabel, Instant createdAt) {
	}

	public record SalonReviewsBlock(double averageRating, long reviewCount, List<PublicSalonReviewItem> recentItems) {
	}

	public record PublicSalonReviewItem(String salonName, String city, int rating, String comment, Instant createdAt) {
	}
}
