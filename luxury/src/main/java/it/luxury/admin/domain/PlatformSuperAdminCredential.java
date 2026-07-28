package it.luxury.admin.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

/**
 * Credenziali super admin persistite (prima installazione via UI). Una sola riga ({@link #SINGLETON_ID}).
 */
@Entity
@Table(name = "platform_super_admin_credential")
public class PlatformSuperAdminCredential {

	public static final UUID SINGLETON_ID = UUID.fromString("c0000000-0000-4000-8000-000000000001");

	@Id
	private UUID id = SINGLETON_ID;

	@Column(nullable = false, length = 320)
	private String username;

	@Column(name = "password_hash", nullable = false, length = 120)
	private String passwordHash;

	@Column(nullable = false)
	private Instant createdAt;

	protected PlatformSuperAdminCredential() {
	}

	public PlatformSuperAdminCredential(String username, String passwordHash) {
		this.id = SINGLETON_ID;
		this.username = username.trim().toLowerCase(Locale.ROOT);
		this.passwordHash = passwordHash;
		this.createdAt = Instant.now();
	}

	public UUID getId() {
		return id;
	}

	public String getUsername() {
		return username;
	}

	public String getPasswordHash() {
		return passwordHash;
	}

	public void setPasswordHash(String passwordHash) {
		this.passwordHash = passwordHash;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}
