package it.velvet.review.domain;

import it.velvet.appointment.domain.Appointment;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reviews")
public class Review {

	@Id
	@GeneratedValue
	private UUID id;

	@OneToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "appointment_id", nullable = false, unique = true)
	private Appointment appointment;

	/** Voto verso il salone / struttura (1–5). */
	@Column(nullable = false)
	private int rating;

	/** Voto verso l'operatore prenotato (1–5); {@code null} solo su righe migrate da versioni precedenti. */
	@Column(name = "staff_rating")
	private Integer staffRating;

	@Column(length = 4000)
	private String comment;

	@Column(nullable = false)
	private Instant createdAt = Instant.now();

	protected Review() {
	}

	public Review(Appointment appointment, int salonRating, int staffRating, String comment) {
		this.appointment = appointment;
		this.rating = salonRating;
		this.staffRating = staffRating;
		this.comment = comment;
	}

	public UUID getId() {
		return id;
	}

	public Appointment getAppointment() {
		return appointment;
	}

	public int getRating() {
		return rating;
	}

	public Integer getStaffRating() {
		return staffRating;
	}

	public String getComment() {
		return comment;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}
