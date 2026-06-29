package it.velvet.studio.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.util.UUID;

/**
 * Sede operativa (tenant) con slug pubblico per mini-sito — cfr. §8.1 documentazione.
 */
@Entity
@Table(name = "locations")
public class Location {

	@Id
	@GeneratedValue
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "studio_group_id", nullable = false)
	private StudioGroup studioGroup;

	@Column(nullable = false, unique = true, length = 120)
	private String slug;

	@Column(nullable = false, length = 200)
	private String name;

	@Column(length = 120)
	private String city;

	@Column(length = 20)
	private String postalCode;

	@Column(length = 500)
	private String addressLine;

	@Column(length = 40)
	private String phoneE164;

	@Column(length = 40)
	private String whatsappE164;

	@Column(length = 80)
	private String timeZone = "Europe/Rome";

	@Column(nullable = false)
	private int consumerCancelDeadlineHoursBeforeStart = 24;

	@Column(nullable = false)
	private int consumerRescheduleDeadlineHoursBeforeStart = 24;

	@Column(nullable = false)
	private int slotStepMinutes = 30;

	/** Inizio giornata lavorativa, minuti da mezzanotte locale (es. 8:30 → 510). */
	@Column(nullable = false)
	private int workStartMinuteOfDay = 510;

	/** Fine giornata lavorativa, minuti da mezzanotte locale (es. 19:00 → 1140). */
	@Column(nullable = false)
	private int workEndMinuteOfDay = 1140;

	/** Fine fascia mattutina (es. 13:00); con {@link #workAfternoonStartMinuteOfDay} definisce la pausa pranzo. */
	@Column(name = "work_morning_end_minute_of_day")
	private Integer workMorningEndMinuteOfDay;

	/** Inizio fascia pomeridiana (es. 14:30); slot non prenotabili tra mattina e pomeriggio. */
	@Column(name = "work_afternoon_start_minute_of_day")
	private Integer workAfternoonStartMinuteOfDay;

	@Column(length = 2000)
	private String welcomeMessage;

	/** Codici tipologia (es. HAIR,BEAUTY) da registrazione /piani — CSV ordinato. */
	@Column(name = "salon_business_types", length = 400)
	private String salonBusinessTypes;

	/** Pubblico di riferimento (es. MALE,FEMALE) da registrazione /piani — CSV ordinato. */
	@Column(name = "salon_client_genders", length = 80)
	private String salonClientGenders;

	/** Latitudine WGS84 per ricerca «vicino a me»; opzionale finché non geocodificata. */
	@Column
	private Double latitude;

	/** Longitudine WGS84 per ricerca «vicino a me»; opzionale finché non geocodificata. */
	@Column
	private Double longitude;

	protected Location() {
	}

	public Location(StudioGroup studioGroup, String slug, String name, String city) {
		this.studioGroup = studioGroup;
		this.slug = slug;
		this.name = name;
		this.city = city;
	}

	public UUID getId() {
		return id;
	}

	public StudioGroup getStudioGroup() {
		return studioGroup;
	}

	public String getSlug() {
		return slug;
	}

	public void setSlug(String slug) {
		this.slug = slug;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getCity() {
		return city;
	}

	public void setCity(String city) {
		this.city = city;
	}

	public String getPostalCode() {
		return postalCode;
	}

	public void setPostalCode(String postalCode) {
		this.postalCode = postalCode;
	}

	public String getAddressLine() {
		return addressLine;
	}

	public void setAddressLine(String addressLine) {
		this.addressLine = addressLine;
	}

	public String getPhoneE164() {
		return phoneE164;
	}

	public void setPhoneE164(String phoneE164) {
		this.phoneE164 = phoneE164;
	}

	public String getWhatsappE164() {
		return whatsappE164;
	}

	public void setWhatsappE164(String whatsappE164) {
		this.whatsappE164 = whatsappE164;
	}

	public String getTimeZone() {
		return timeZone;
	}

	public void setTimeZone(String timeZone) {
		this.timeZone = timeZone;
	}

	public int getConsumerCancelDeadlineHoursBeforeStart() {
		return consumerCancelDeadlineHoursBeforeStart;
	}

	public void setConsumerCancelDeadlineHoursBeforeStart(int consumerCancelDeadlineHoursBeforeStart) {
		this.consumerCancelDeadlineHoursBeforeStart = consumerCancelDeadlineHoursBeforeStart;
	}

	public int getConsumerRescheduleDeadlineHoursBeforeStart() {
		return consumerRescheduleDeadlineHoursBeforeStart;
	}

	public void setConsumerRescheduleDeadlineHoursBeforeStart(int consumerRescheduleDeadlineHoursBeforeStart) {
		this.consumerRescheduleDeadlineHoursBeforeStart = consumerRescheduleDeadlineHoursBeforeStart;
	}

	public int getSlotStepMinutes() {
		return slotStepMinutes;
	}

	public void setSlotStepMinutes(int slotStepMinutes) {
		this.slotStepMinutes = slotStepMinutes;
	}

	public int getWorkStartMinuteOfDay() {
		return workStartMinuteOfDay;
	}

	public void setWorkStartMinuteOfDay(int workStartMinuteOfDay) {
		this.workStartMinuteOfDay = workStartMinuteOfDay;
	}

	public int getWorkEndMinuteOfDay() {
		return workEndMinuteOfDay;
	}

	public void setWorkEndMinuteOfDay(int workEndMinuteOfDay) {
		this.workEndMinuteOfDay = workEndMinuteOfDay;
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

	public String getWelcomeMessage() {
		return welcomeMessage;
	}

	public void setWelcomeMessage(String welcomeMessage) {
		this.welcomeMessage = welcomeMessage;
	}

	public String getSalonBusinessTypes() {
		return salonBusinessTypes;
	}

	public void setSalonBusinessTypes(String salonBusinessTypes) {
		this.salonBusinessTypes = salonBusinessTypes;
	}

	public String getSalonClientGenders() {
		return salonClientGenders;
	}

	public void setSalonClientGenders(String salonClientGenders) {
		this.salonClientGenders = salonClientGenders;
	}

	public Double getLatitude() {
		return latitude;
	}

	public void setLatitude(Double latitude) {
		this.latitude = latitude;
	}

	public Double getLongitude() {
		return longitude;
	}

	public void setLongitude(Double longitude) {
		this.longitude = longitude;
	}
}
