package it.luxury.sponsor.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
		name = "placement_sponsors",
		indexes = @Index(name = "idx_placement_sponsors_placement", columnList = "placement, sort_order"))
public class PlacementSponsor {

	@Id
	private UUID id;

	@Column(name = "placement", nullable = false, length = 64)
	private String placement;

	@Column(name = "brand_name", nullable = false, length = 80)
	private String brandName;

	@Column(name = "headline", nullable = false, length = 160)
	private String headline;

	@Column(name = "cta_label", nullable = false, length = 40)
	private String ctaLabel;

	@Column(name = "href", nullable = false, length = 500)
	private String href;

	@Column(name = "image_src", nullable = false, columnDefinition = "text")
	private String imageSrc;

	@Column(name = "sort_order", nullable = false)
	private int sortOrder;

	@Column(name = "active", nullable = false)
	private boolean active = true;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	public UUID getId() {
		return id;
	}

	public void setId(UUID id) {
		this.id = id;
	}

	public String getPlacement() {
		return placement;
	}

	public void setPlacement(String placement) {
		this.placement = placement;
	}

	public String getBrandName() {
		return brandName;
	}

	public void setBrandName(String brandName) {
		this.brandName = brandName;
	}

	public String getHeadline() {
		return headline;
	}

	public void setHeadline(String headline) {
		this.headline = headline;
	}

	public String getCtaLabel() {
		return ctaLabel;
	}

	public void setCtaLabel(String ctaLabel) {
		this.ctaLabel = ctaLabel;
	}

	public String getHref() {
		return href;
	}

	public void setHref(String href) {
		this.href = href;
	}

	public String getImageSrc() {
		return imageSrc;
	}

	public void setImageSrc(String imageSrc) {
		this.imageSrc = imageSrc;
	}

	public int getSortOrder() {
		return sortOrder;
	}

	public void setSortOrder(int sortOrder) {
		this.sortOrder = sortOrder;
	}

	public boolean isActive() {
		return active;
	}

	public void setActive(boolean active) {
		this.active = active;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(Instant createdAt) {
		this.createdAt = createdAt;
	}
}
