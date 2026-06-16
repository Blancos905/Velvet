package it.velvet.notification.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_devices")
public class UserDevice {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** Id profilo consumer ({@code consumer_profiles.id}) dell'utente autenticato. */
	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "fcm_token", nullable = false, unique = true, length = 512)
	private String fcmToken;

	@Enumerated(EnumType.STRING)
	@Column(name = "os_type", nullable = false, length = 16)
	private DeviceOsType osType;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected UserDevice() {
	}

	public UserDevice(UUID userId, String fcmToken, DeviceOsType osType) {
		this.userId = userId;
		this.fcmToken = fcmToken;
		this.osType = osType;
	}

	@PrePersist
	void onCreate() {
		Instant now = Instant.now();
		if (createdAt == null) {
			createdAt = now;
		}
		if (updatedAt == null) {
			updatedAt = now;
		}
	}

	@PreUpdate
	void onUpdate() {
		updatedAt = Instant.now();
	}

	public Long getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public void setUserId(UUID userId) {
		this.userId = userId;
	}

	public String getFcmToken() {
		return fcmToken;
	}

	public void setFcmToken(String fcmToken) {
		this.fcmToken = fcmToken;
	}

	public DeviceOsType getOsType() {
		return osType;
	}

	public void setOsType(DeviceOsType osType) {
		this.osType = osType;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}
}
