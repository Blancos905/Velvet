package it.luxury.sponsor.api;

import it.luxury.sponsor.domain.PlacementSponsor;

import java.util.UUID;

public record PlacementSponsorView(
		UUID id,
		String placement,
		String brandName,
		String headline,
		String ctaLabel,
		String href,
		String imageSrc,
		int sortOrder,
		boolean active) {

	public static PlacementSponsorView from(PlacementSponsor row) {
		return new PlacementSponsorView(
				row.getId(),
				row.getPlacement(),
				row.getBrandName(),
				row.getHeadline(),
				row.getCtaLabel(),
				row.getHref(),
				row.getImageSrc(),
				row.getSortOrder(),
				row.isActive());
	}
}
