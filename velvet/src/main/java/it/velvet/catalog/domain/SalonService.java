package it.velvet.catalog.domain;

import it.velvet.studio.domain.Location;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "salon_services")
public class SalonService {

	@Id
	@GeneratedValue
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "location_id", nullable = false)
	private Location location;

	@Column(nullable = false, length = 200)
	private String name;

	@Column(nullable = false)
	private int durationMinutes;

	@Column(nullable = false)
	private int priceCents;

	/** Testo libero per vetrina / listino (opzionale). */
	@Column(length = 2000)
	private String description;

	/** Operatori abilitati a erogare il servizio; vuoto = tutti gli operatori della sede (retrocompatibilità). */
	@ManyToMany(fetch = FetchType.LAZY)
	@JoinTable(
			name = "salon_service_operators",
			joinColumns = @JoinColumn(name = "service_id"),
			inverseJoinColumns = @JoinColumn(name = "operator_id"))
	private Set<StaffOperator> operators = new HashSet<>();

	protected SalonService() {
	}

	public SalonService(Location location, String name, int durationMinutes, int priceCents) {
		this(location, name, durationMinutes, priceCents, null);
	}

	public SalonService(Location location, String name, int durationMinutes, int priceCents, String description) {
		this.location = location;
		this.name = name;
		this.durationMinutes = durationMinutes;
		this.priceCents = priceCents;
		this.description = normalizeDescription(description);
	}

	private static String normalizeDescription(String raw) {
		if (raw == null) {
			return null;
		}
		String t = raw.trim();
		return t.isEmpty() ? null : t;
	}

	public UUID getId() {
		return id;
	}

	public Location getLocation() {
		return location;
	}

	public String getName() {
		return name;
	}

	public int getDurationMinutes() {
		return durationMinutes;
	}

	public int getPriceCents() {
		return priceCents;
	}

	public String getDescription() {
		return description;
	}

	public void updateCatalog(String name, int durationMinutes, int priceCents, String description) {
		this.name = name;
		this.durationMinutes = durationMinutes;
		this.priceCents = priceCents;
		this.description = normalizeDescription(description);
	}

	public Set<StaffOperator> getOperators() {
		return operators;
	}

	public void replaceOperators(Collection<StaffOperator> next) {
		operators.clear();
		if (next != null) {
			operators.addAll(next);
		}
	}
}
