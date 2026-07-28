package it.luxury.appointment.domain;

import it.luxury.catalog.domain.StaffOperator;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "operator_time_blocks")
public class OperatorTimeBlock {

	@Id
	@GeneratedValue
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "operator_id", nullable = false)
	private StaffOperator operator;

	@Column(name = "starts_at", nullable = false)
	private Instant startsAt;

	@Column(name = "ends_at", nullable = false)
	private Instant endsAt;

	@Column(length = 500)
	private String note;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt = Instant.now();

	protected OperatorTimeBlock() {
	}

	public OperatorTimeBlock(StaffOperator operator, Instant startsAt, Instant endsAt, String note) {
		this.operator = operator;
		this.startsAt = startsAt;
		this.endsAt = endsAt;
		this.note = note;
	}

	public UUID getId() {
		return id;
	}

	public StaffOperator getOperator() {
		return operator;
	}

	public Instant getStartsAt() {
		return startsAt;
	}

	public Instant getEndsAt() {
		return endsAt;
	}

	public String getNote() {
		return note;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public void updateInterval(Instant startsAt, Instant endsAt, String note) {
		this.startsAt = startsAt;
		this.endsAt = endsAt;
		this.note = note;
	}
}
