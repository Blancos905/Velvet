package it.velvet.studio.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.util.UUID;

/**
 * Contenuto vetrina/sito di una sede, persistito lato server (sostituisce lo storage solo-browser).
 * Una riga per coppia {@code (slug, kind)}; {@code payload} contiene lo stesso blob JSON gestito dal frontend
 * (immagini incluse come data URL base64 nell'MVP).
 */
@Entity
@Table(
		name = "salon_site_content",
		uniqueConstraints = @UniqueConstraint(name = "uk_salon_site_content_slug_kind", columnNames = {"slug", "kind"}))
public class SalonSiteContent {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(nullable = false, length = 120)
	private String slug;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 40)
	private SalonSiteContentKind kind;

	@Column(columnDefinition = "text")
	private String payload;

	@Column(nullable = false)
	private Instant updatedAt = Instant.now();

	protected SalonSiteContent() {
	}

	public SalonSiteContent(String slug, SalonSiteContentKind kind, String payload) {
		this.slug = slug;
		this.kind = kind;
		this.payload = payload;
		this.updatedAt = Instant.now();
	}

	public UUID getId() {
		return id;
	}

	public String getSlug() {
		return slug;
	}

	public SalonSiteContentKind getKind() {
		return kind;
	}

	public String getPayload() {
		return payload;
	}

	public void updatePayload(String payload) {
		this.payload = payload;
		this.updatedAt = Instant.now();
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}
}
