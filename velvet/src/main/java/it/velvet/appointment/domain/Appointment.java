package it.velvet.appointment.domain;

import it.velvet.catalog.domain.SalonClient;
import it.velvet.catalog.domain.SalonService;
import it.velvet.catalog.domain.StaffOperator;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.review.domain.Review;
import it.velvet.studio.domain.Location;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "appointments")
public class Appointment {

	@Id
	@GeneratedValue
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "location_id", nullable = false)
	private Location location;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "service_id", nullable = false)
	private SalonService service;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "operator_id", nullable = false)
	private StaffOperator operator;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "salon_client_id", nullable = false)
	private SalonClient salonClient;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "consumer_profile_id")
	private ConsumerProfile consumerProfile;

	@OneToOne(mappedBy = "appointment", fetch = FetchType.LAZY)
	private Review review;

	@Column(name = "starts_at", nullable = false)
	private Instant startsAt;

	@Column(name = "ends_at", nullable = false)
	private Instant endsAt;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 32)
	private AppointmentStatus status = AppointmentStatus.CONFIRMED;

	@Column(length = 2000)
	private String notes;

	private Instant cancelledAt;

	@Enumerated(EnumType.STRING)
	@Column(length = 16)
	private CancelledBy cancelledBy;

	protected Appointment() {
	}

	public Appointment(
			Location location,
			SalonService service,
			StaffOperator operator,
			SalonClient salonClient,
			Instant startsAt,
			Instant endsAt) {
		this.location = location;
		this.service = service;
		this.operator = operator;
		this.salonClient = salonClient;
		this.startsAt = startsAt;
		this.endsAt = endsAt;
	}

	public UUID getId() {
		return id;
	}

	public Location getLocation() {
		return location;
	}

	public SalonService getService() {
		return service;
	}

	public StaffOperator getOperator() {
		return operator;
	}

	public SalonClient getSalonClient() {
		return salonClient;
	}

	public ConsumerProfile getConsumerProfile() {
		return consumerProfile;
	}

	public void setConsumerProfile(ConsumerProfile consumerProfile) {
		this.consumerProfile = consumerProfile;
	}

	public Review getReview() {
		return review;
	}

	public Instant getStart() {
		return startsAt;
	}

	public void setStart(Instant start) {
		this.startsAt = start;
	}

	public Instant getEnd() {
		return endsAt;
	}

	public void setEnd(Instant end) {
		this.endsAt = end;
	}

	public AppointmentStatus getStatus() {
		return status;
	}

	public void setStatus(AppointmentStatus status) {
		this.status = status;
	}

	public String getNotes() {
		return notes;
	}

	public void setNotes(String notes) {
		this.notes = notes;
	}

	public Instant getCancelledAt() {
		return cancelledAt;
	}

	public CancelledBy getCancelledBy() {
		return cancelledBy;
	}

	public void cancel(CancelledBy cancelledBy) {
		this.status = AppointmentStatus.CANCELLED;
		this.cancelledAt = Instant.now();
		this.cancelledBy = cancelledBy;
	}
}
