package it.velvet.consumer.domain;

import it.velvet.studio.domain.Location;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "favorite_locations", uniqueConstraints = {
		@UniqueConstraint(name = "uk_fav_consumer_location", columnNames = { "consumer_profile_id", "location_id" })
})
public class FavoriteLocation {

	@Id
	@GeneratedValue
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "consumer_profile_id", nullable = false)
	private ConsumerProfile consumerProfile;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "location_id", nullable = false)
	private Location location;

	@Column(nullable = false)
	private Instant createdAt = Instant.now();

	protected FavoriteLocation() {
	}

	public FavoriteLocation(ConsumerProfile consumerProfile, Location location) {
		this.consumerProfile = consumerProfile;
		this.location = location;
	}

	public UUID getId() {
		return id;
	}

	public ConsumerProfile getConsumerProfile() {
		return consumerProfile;
	}

	public Location getLocation() {
		return location;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}
