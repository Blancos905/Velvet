package it.luxury.sponsor.api;

public record PlacementSponsorWrite(
		String placement,
		String brandName,
		String headline,
		String ctaLabel,
		String href,
		String imageSrc,
		Integer sortOrder,
		Boolean active) {
}
