package it.luxury.catalog.domain;

import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.studio.domain.Location;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Anagrafica cliente lato sede; opzionale collegamento a ConsumerProfile per prenotazioni B2C.
 */
@Entity
@Table(name = "salon_clients")
public class SalonClient {

	@Id
	@GeneratedValue
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "location_id", nullable = false)
	private Location location;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "consumer_profile_id")
	private ConsumerProfile consumerProfile;

	@Column(nullable = false, length = 200)
	private String displayName;

	@Column(length = 320)
	private String email;

	@Column(length = 40)
	private String phone;

	@Column(name = "created_at")
	private Instant createdAt;

	protected SalonClient() {
	}

	@PrePersist
	void luxuryTouchCreatedAt() {
		if (createdAt == null) {
			createdAt = Instant.now();
		}
	}

	public SalonClient(Location location, String displayName) {
		this.location = location;
		this.displayName = displayName;
	}

	public UUID getId() {
		return id;
	}

	public Location getLocation() {
		return location;
	}

	public ConsumerProfile getConsumerProfile() {
		return consumerProfile;
	}

	public void setConsumerProfile(ConsumerProfile consumerProfile) {
		this.consumerProfile = consumerProfile;
	}

	public String getDisplayName() {
		return displayName;
	}

	public void setDisplayName(String displayName) {
		this.displayName = displayName;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public String getPhone() {
		return phone;
	}

	public void setPhone(String phone) {
		this.phone = phone;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}
