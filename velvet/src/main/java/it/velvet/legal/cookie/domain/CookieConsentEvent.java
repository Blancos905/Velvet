package it.velvet.legal.cookie.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "cookie_consent_events")
public class CookieConsentEvent {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(name = "visitor_id", nullable = false)
	private UUID visitorId;

	@Column(name = "profile_id")
	private UUID profileId;

	@Column(name = "consent_version", nullable = false)
	private int consentVersion;

	@Column(name = "policy_version", length = 32)
	private String policyVersion;

	@Column(name = "action", nullable = false, length = 32)
	private String action;

	@Column(name = "maps_allowed", nullable = false)
	private boolean mapsAllowed;

	@Column(name = "editorial_allowed", nullable = false)
	private boolean editorialAllowed;

	@Column(name = "decided_at", nullable = false)
	private Instant decidedAt;

	@Column(name = "recorded_at", nullable = false)
	private Instant recordedAt;

	@Column(name = "ip_address", length = 64)
	private String ipAddress;

	@Column(name = "user_agent", length = 512)
	private String userAgent;

	@PrePersist
	void onCreate() {
		if (recordedAt == null) {
			recordedAt = Instant.now();
		}
	}

	public UUID getId() {
		return id;
	}

	public UUID getVisitorId() {
		return visitorId;
	}

	public void setVisitorId(UUID visitorId) {
		this.visitorId = visitorId;
	}

	public UUID getProfileId() {
		return profileId;
	}

	public void setProfileId(UUID profileId) {
		this.profileId = profileId;
	}

	public int getConsentVersion() {
		return consentVersion;
	}

	public void setConsentVersion(int consentVersion) {
		this.consentVersion = consentVersion;
	}

	public String getPolicyVersion() {
		return policyVersion;
	}

	public void setPolicyVersion(String policyVersion) {
		this.policyVersion = policyVersion;
	}

	public String getAction() {
		return action;
	}

	public void setAction(String action) {
		this.action = action;
	}

	public boolean isMapsAllowed() {
		return mapsAllowed;
	}

	public void setMapsAllowed(boolean mapsAllowed) {
		this.mapsAllowed = mapsAllowed;
	}

	public boolean isEditorialAllowed() {
		return editorialAllowed;
	}

	public void setEditorialAllowed(boolean editorialAllowed) {
		this.editorialAllowed = editorialAllowed;
	}

	public Instant getDecidedAt() {
		return decidedAt;
	}

	public void setDecidedAt(Instant decidedAt) {
		this.decidedAt = decidedAt;
	}

	public Instant getRecordedAt() {
		return recordedAt;
	}

	public String getIpAddress() {
		return ipAddress;
	}

	public void setIpAddress(String ipAddress) {
		this.ipAddress = ipAddress;
	}

	public String getUserAgent() {
		return userAgent;
	}

	public void setUserAgent(String userAgent) {
		this.userAgent = userAgent;
	}
}
