package it.luxury.review.domain;

import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.studio.domain.StudioGroup;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "platform_reviews")
public class PlatformReview {

	@Id
	@GeneratedValue
	private UUID id;

	@Enumerated(EnumType.STRING)
	@Column(name = "author_kind", nullable = false, length = 24)
	private PlatformReviewAuthorKind authorKind;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "consumer_profile_id")
	private ConsumerProfile consumerProfile;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "studio_group_id")
	private StudioGroup studioGroup;

	@Column(nullable = false)
	private int rating;

	@Column(length = 4000)
	private String comment;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt = Instant.now();

	protected PlatformReview() {
	}

	public PlatformReview(ConsumerProfile consumerProfile, int rating, String comment) {
		this.authorKind = PlatformReviewAuthorKind.CLIENT;
		this.consumerProfile = consumerProfile;
		this.studioGroup = null;
		this.rating = rating;
		this.comment = comment;
	}

	public PlatformReview(StudioGroup studioGroup, int rating, String comment) {
		this.authorKind = PlatformReviewAuthorKind.SALON_PARTNER;
		this.consumerProfile = null;
		this.studioGroup = studioGroup;
		this.rating = rating;
		this.comment = comment;
	}

	public UUID getId() {
		return id;
	}

	public PlatformReviewAuthorKind getAuthorKind() {
		return authorKind;
	}

	public ConsumerProfile getConsumerProfile() {
		return consumerProfile;
	}

	public StudioGroup getStudioGroup() {
		return studioGroup;
	}

	public int getRating() {
		return rating;
	}

	public String getComment() {
		return comment;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}
