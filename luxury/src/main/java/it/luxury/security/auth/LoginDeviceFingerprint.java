package it.luxury.security.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.util.UUID;

/** Fingerprint browser/dispositivo noto per alert login da nuovo client. */
@Entity
@Table(
		name = "login_device_fingerprints",
		uniqueConstraints = @UniqueConstraint(
				name = "uk_login_device_fp_profile_hash",
				columnNames = {"profile_id", "fingerprint_hash"}))
public class LoginDeviceFingerprint {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(name = "profile_id", nullable = false)
	private UUID profileId;

	@Column(name = "fingerprint_hash", nullable = false, length = 64)
	private String fingerprintHash;

	@Column(name = "user_agent_summary", length = 256)
	private String userAgentSummary;

	@Column(name = "last_ip", length = 64)
	private String lastIp;

	@Column(name = "first_seen_at", nullable = false)
	private Instant firstSeenAt;

	@Column(name = "last_seen_at", nullable = false)
	private Instant lastSeenAt;

	protected LoginDeviceFingerprint() {
	}

	public LoginDeviceFingerprint(UUID profileId, String fingerprintHash, String userAgentSummary, String lastIp) {
		this.profileId = profileId;
		this.fingerprintHash = fingerprintHash;
		this.userAgentSummary = userAgentSummary;
		this.lastIp = lastIp;
	}

	@PrePersist
	void onCreate() {
		Instant now = Instant.now();
		if (firstSeenAt == null) {
			firstSeenAt = now;
		}
		if (lastSeenAt == null) {
			lastSeenAt = now;
		}
	}

	@PreUpdate
	void onUpdate() {
		lastSeenAt = Instant.now();
	}

	public UUID getId() {
		return id;
	}

	public UUID getProfileId() {
		return profileId;
	}

	public String getFingerprintHash() {
		return fingerprintHash;
	}

	public String getUserAgentSummary() {
		return userAgentSummary;
	}

	public void setUserAgentSummary(String userAgentSummary) {
		this.userAgentSummary = userAgentSummary;
	}

	public String getLastIp() {
		return lastIp;
	}

	public void setLastIp(String lastIp) {
		this.lastIp = lastIp;
	}

	public Instant getFirstSeenAt() {
		return firstSeenAt;
	}

	public Instant getLastSeenAt() {
		return lastSeenAt;
	}

	public void touch(String userAgentSummary, String lastIp) {
		this.userAgentSummary = userAgentSummary;
		this.lastIp = lastIp;
		this.lastSeenAt = Instant.now();
	}
}
