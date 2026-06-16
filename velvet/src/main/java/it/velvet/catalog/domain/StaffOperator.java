package it.velvet.catalog.domain;

import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.studio.domain.Location;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "staff_operators")
public class StaffOperator {

	@Id
	@GeneratedValue
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "location_id", nullable = false)
	private Location location;

	@Column(nullable = false, length = 200)
	private String displayName;

	@Column(length = 80)
	private String firstName;

	@Column(length = 80)
	private String lastName;

	@Column(length = 80)
	private String role;

	@JdbcTypeCode(SqlTypes.LONGVARCHAR)
	@Column(name = "photo_data_url", columnDefinition = "text")
	private String photoDataUrl;

	@Column(length = 40)
	private String calendarColor;

	/** Orario lavoro operatore (minuti da mezzanotte locale); se tutti valorizzati prevalgono sulla sede. */
	@Column(name = "work_morning_start_minute_of_day")
	private Integer workMorningStartMinuteOfDay;

	@Column(name = "work_morning_end_minute_of_day")
	private Integer workMorningEndMinuteOfDay;

	@Column(name = "work_afternoon_start_minute_of_day")
	private Integer workAfternoonStartMinuteOfDay;

	@Column(name = "work_afternoon_end_minute_of_day")
	private Integer workAfternoonEndMinuteOfDay;

	/** Account di accesso dedicato (ruolo {@code STAFF} su {@code consumer_profiles}), opzionale. */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "consumer_profile_id")
	private ConsumerProfile consumerProfile;

	/**
	 * Centro notifiche operatore: stessi campi di {@link it.velvet.studio.domain.StudioGroup} per non condividere ack
	 * con il titolare.
	 */
	@Column(name = "notification_inbox_sent_ack_at")
	private Instant notificationInboxSentAckAt;

	@Column(name = "notification_inbox_ack_booking_confirmation_at")
	private Instant notificationInboxAckBookingConfirmationAt;

	@Column(name = "notification_inbox_ack_booking_updated_at")
	private Instant notificationInboxAckBookingUpdatedAt;

	@Column(name = "notification_inbox_ack_booking_cancelled_at")
	private Instant notificationInboxAckBookingCancelledAt;

	@Column(name = "notification_inbox_ack_system_at")
	private Instant notificationInboxAckSystemAt;

	protected StaffOperator() {
	}

	public StaffOperator(Location location, String displayName) {
		this.location = location;
		String safeDisplayName = displayName == null ? "" : displayName.trim();
		this.displayName = safeDisplayName;
		this.firstName = safeDisplayName;
		this.lastName = "";
		this.role = "Staff";
	}

	public StaffOperator(Location location, String firstName, String lastName, String role, String photoDataUrl) {
		this.location = location;
		this.firstName = firstName == null ? "" : firstName.trim();
		this.lastName = lastName == null ? "" : lastName.trim();
		this.role = (role == null || role.isBlank()) ? "Staff" : role.trim();
		this.photoDataUrl = (photoDataUrl == null || photoDataUrl.isBlank()) ? null : photoDataUrl;
		String joined = (this.firstName + " " + this.lastName).trim();
		this.displayName = joined.isBlank() ? this.firstName : joined;
	}

	public UUID getId() {
		return id;
	}

	public Location getLocation() {
		return location;
	}

	public String getDisplayName() {
		return displayName;
	}

	public String getCalendarColor() {
		return calendarColor;
	}

	public String getFirstName() {
		return firstName;
	}

	public String getLastName() {
		return lastName;
	}

	public String getRole() {
		return role;
	}

	public String getPhotoDataUrl() {
		return photoDataUrl;
	}

	public void updateProfile(String firstName, String lastName, String role, String photoDataUrl) {
		this.firstName = firstName == null ? "" : firstName.trim();
		this.lastName = lastName == null ? "" : lastName.trim();
		this.role = (role == null || role.isBlank()) ? "Staff" : role.trim();
		this.photoDataUrl = (photoDataUrl == null || photoDataUrl.isBlank()) ? null : photoDataUrl;
		String joined = (this.firstName + " " + this.lastName).trim();
		this.displayName = joined.isBlank() ? this.firstName : joined;
	}

	public void setCalendarColor(String calendarColor) {
		this.calendarColor = calendarColor;
	}

	public Integer getWorkMorningStartMinuteOfDay() {
		return workMorningStartMinuteOfDay;
	}

	public void setWorkMorningStartMinuteOfDay(Integer workMorningStartMinuteOfDay) {
		this.workMorningStartMinuteOfDay = workMorningStartMinuteOfDay;
	}

	public Integer getWorkMorningEndMinuteOfDay() {
		return workMorningEndMinuteOfDay;
	}

	public void setWorkMorningEndMinuteOfDay(Integer workMorningEndMinuteOfDay) {
		this.workMorningEndMinuteOfDay = workMorningEndMinuteOfDay;
	}

	public Integer getWorkAfternoonStartMinuteOfDay() {
		return workAfternoonStartMinuteOfDay;
	}

	public void setWorkAfternoonStartMinuteOfDay(Integer workAfternoonStartMinuteOfDay) {
		this.workAfternoonStartMinuteOfDay = workAfternoonStartMinuteOfDay;
	}

	public Integer getWorkAfternoonEndMinuteOfDay() {
		return workAfternoonEndMinuteOfDay;
	}

	public void setWorkAfternoonEndMinuteOfDay(Integer workAfternoonEndMinuteOfDay) {
		this.workAfternoonEndMinuteOfDay = workAfternoonEndMinuteOfDay;
	}

	public void updateWorkSchedule(
			Integer morningStart,
			Integer morningEnd,
			Integer afternoonStart,
			Integer afternoonEnd) {
		this.workMorningStartMinuteOfDay = morningStart;
		this.workMorningEndMinuteOfDay = morningEnd;
		this.workAfternoonStartMinuteOfDay = afternoonStart;
		this.workAfternoonEndMinuteOfDay = afternoonEnd;
	}

	public ConsumerProfile getConsumerProfile() {
		return consumerProfile;
	}

	public void setConsumerProfile(ConsumerProfile consumerProfile) {
		this.consumerProfile = consumerProfile;
	}

	public Instant getNotificationInboxSentAckAt() {
		return notificationInboxSentAckAt;
	}

	public void setNotificationInboxSentAckAt(Instant notificationInboxSentAckAt) {
		this.notificationInboxSentAckAt = notificationInboxSentAckAt;
	}

	public Instant getNotificationInboxAckBookingConfirmationAt() {
		return notificationInboxAckBookingConfirmationAt;
	}

	public void setNotificationInboxAckBookingConfirmationAt(Instant notificationInboxAckBookingConfirmationAt) {
		this.notificationInboxAckBookingConfirmationAt = notificationInboxAckBookingConfirmationAt;
	}

	public Instant getNotificationInboxAckBookingUpdatedAt() {
		return notificationInboxAckBookingUpdatedAt;
	}

	public void setNotificationInboxAckBookingUpdatedAt(Instant notificationInboxAckBookingUpdatedAt) {
		this.notificationInboxAckBookingUpdatedAt = notificationInboxAckBookingUpdatedAt;
	}

	public Instant getNotificationInboxAckBookingCancelledAt() {
		return notificationInboxAckBookingCancelledAt;
	}

	public void setNotificationInboxAckBookingCancelledAt(Instant notificationInboxAckBookingCancelledAt) {
		this.notificationInboxAckBookingCancelledAt = notificationInboxAckBookingCancelledAt;
	}

	public Instant getNotificationInboxAckSystemAt() {
		return notificationInboxAckSystemAt;
	}

	public void setNotificationInboxAckSystemAt(Instant notificationInboxAckSystemAt) {
		this.notificationInboxAckSystemAt = notificationInboxAckSystemAt;
	}
}
