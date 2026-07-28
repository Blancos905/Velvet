package it.luxury.catalog.domain;

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
@Table(name = "salon_luxury_chat_read_state")
public class SalonLuxuryChatReadState {

	@Id
	@GeneratedValue
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "salon_client_id", nullable = false)
	private SalonClient salonClient;

	/** {@code null} = thread titolare; valorizzato = thread operatore staff. */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "staff_operator_id")
	private StaffOperator staffOperator;

	@Column(name = "last_read_at_client")
	private Instant lastReadAtClient;

	@Column(name = "last_read_at_owner")
	private Instant lastReadAtOwner;

	/** Il cliente ha eliminato (svuotato) la chat: i messaggi precedenti restano nascosti solo per lui. */
	@Column(name = "cleared_at_client")
	private Instant clearedAtClient;

	/** Il lato salone (titolare/operatore) ha eliminato la chat: nasconde i messaggi precedenti solo per lui. */
	@Column(name = "cleared_at_owner")
	private Instant clearedAtOwner;

	protected SalonLuxuryChatReadState() {
	}

	public SalonLuxuryChatReadState(SalonClient salonClient, StaffOperator staffOperator) {
		this.salonClient = salonClient;
		this.staffOperator = staffOperator;
	}

	public UUID getId() {
		return id;
	}

	public SalonClient getSalonClient() {
		return salonClient;
	}

	public StaffOperator getStaffOperator() {
		return staffOperator;
	}

	public Instant getLastReadAtClient() {
		return lastReadAtClient;
	}

	public void setLastReadAtClient(Instant lastReadAtClient) {
		this.lastReadAtClient = lastReadAtClient;
	}

	public Instant getLastReadAtOwner() {
		return lastReadAtOwner;
	}

	public void setLastReadAtOwner(Instant lastReadAtOwner) {
		this.lastReadAtOwner = lastReadAtOwner;
	}

	public Instant getClearedAtClient() {
		return clearedAtClient;
	}

	public void setClearedAtClient(Instant clearedAtClient) {
		this.clearedAtClient = clearedAtClient;
	}

	public Instant getClearedAtOwner() {
		return clearedAtOwner;
	}

	public void setClearedAtOwner(Instant clearedAtOwner) {
		this.clearedAtOwner = clearedAtOwner;
	}
}
