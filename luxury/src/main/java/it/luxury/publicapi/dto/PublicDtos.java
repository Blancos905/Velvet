package it.luxury.publicapi.dto;

import it.luxury.appointment.service.SalonOpenDays;
import it.luxury.catalog.domain.SalonService;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.SalonBusinessType;
import it.luxury.studio.domain.SalonClientGender;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

public final class PublicDtos {

	private PublicDtos() {
	}

	public record OrganizationSummaryDto(
			UUID id,
			String slug,
			String name,
			String city,
			/** Media voti salone (1–5) su recensioni post-appuntamento; {@code null} se nessuna recensione. */
			Double averageRating,
			/** Numero recensioni per questa sede; {@code null} se zero. */
			Long reviewCount,
			/** Pubblico dichiarato in registrazione/profilo ({@code MALE} / {@code FEMALE}). */
			List<String> salonClientGenders,
			/** Tipologie attività dichiarate in registrazione ({@code HAIR} / {@code BEAUTY} / {@code MASSAGE}). */
			List<String> salonBusinessTypes) {
		public static OrganizationSummaryDto from(Location loc, Double averageRating, Long reviewCount) {
			return new OrganizationSummaryDto(
					loc.getId(),
					loc.getSlug(),
					loc.getName(),
					loc.getCity(),
					averageRating,
					reviewCount,
					salonClientGendersFrom(loc),
					salonBusinessTypesFrom(loc));
		}

		private static List<String> salonClientGendersFrom(Location loc) {
			if (loc == null) {
				return List.of();
			}
			return SalonClientGender.parseCsv(loc.getSalonClientGenders()).stream()
					.sorted(Comparator.comparing(Enum::name))
					.map(Enum::name)
					.toList();
		}

		private static List<String> salonBusinessTypesFrom(Location loc) {
			if (loc == null) {
				return List.of();
			}
			return SalonBusinessType.parseCsv(loc.getSalonBusinessTypes()).stream()
					.sorted(Comparator.comparing(Enum::name))
					.map(Enum::name)
					.toList();
		}
	}

	/** Altra sede pubblica dello stesso salone (stesso studio group), esclusa quella aperta. */
	public record SiblingLocationDto(String slug, String name, String city, String addressLine) {
	}

	public record OrganizationDetailDto(
			UUID id,
			String slug,
			String name,
			String city,
			String addressLine,
			String phoneE164,
			String whatsappE164,
			String timeZone,
			String welcomeMessage,
			/** Email dal profilo titolare (`/api/v1/me/profile`) — vetrina pubblica. */
			String contactEmail,
			/** Telefono dal profilo titolare — vetrina pubblica. */
			String contactPhone,
			/** Fascia oraria prenotabile (minuti da mezzanotte locale sede). */
			int bookingOpeningMinuteOfDay,
			int bookingClosingMinuteOfDay,
			/** Fine mattina (pausa pranzo); {@code null} se fascia continua. */
			Integer bookingMorningEndMinuteOfDay,
			/** Inizio pomeriggio (pausa pranzo); {@code null} se fascia continua. */
			Integer bookingAfternoonStartMinuteOfDay,
			/** Giorni di apertura prenotabile (`MONDAY` … `SUNDAY`). */
			List<String> bookingOpenDays,
			/** Altre sedi Premium dello stesso salone. Vuota se la sede è unica. */
			List<SiblingLocationDto> siblingLocations) {
		public static OrganizationDetailDto from(
				Location loc,
				String contactEmail,
				String contactPhone,
				List<SiblingLocationDto> siblingLocations) {
			return new OrganizationDetailDto(
					loc.getId(),
					loc.getSlug(),
					loc.getName(),
					loc.getCity(),
					loc.getAddressLine(),
					loc.getPhoneE164(),
					loc.getWhatsappE164(),
					loc.getTimeZone(),
					loc.getWelcomeMessage(),
					contactEmail,
					contactPhone,
					loc.getWorkStartMinuteOfDay(),
					loc.getWorkEndMinuteOfDay(),
					loc.getWorkMorningEndMinuteOfDay(),
					loc.getWorkAfternoonStartMinuteOfDay(),
					SalonOpenDays.toApiList(loc.getWorkOpenDaysMask()),
					siblingLocations == null ? List.of() : List.copyOf(siblingLocations));
		}
	}

	public record ServicePublicDto(UUID id, String name, int durationMinutes, int priceCents, String description) {
		public static ServicePublicDto from(SalonService s) {
			return new ServicePublicDto(s.getId(), s.getName(), s.getDurationMinutes(), s.getPriceCents(), s.getDescription());
		}
	}

	public record DayAvailabilityDto(String date, List<String> slotsIso, int totalSlots, boolean closed) {
		public DayAvailabilityDto(String date, List<String> slotsIso, int totalSlots) {
			this(date, slotsIso, totalSlots, false);
		}
	}

	/**
	 * Operatori prenotabili pubblicamente (stessa sede del mini-sito).
	 *
	 * @param role ruolo anagrafica staff ({@code staff_operators.role}), es. Parrucchiere; {@code null} se non impostato
	 * @param averageStaffRating media voti verso l'operatore (1–5) su recensioni con {@code staff_rating}; {@code null} se assenti
	 * @param staffReviewCount numero di tali recensioni; {@code null} se zero
	 */
	public record OperatorPublicDto(
			UUID id,
			String displayName,
			String role,
			Double averageStaffRating,
			Long staffReviewCount) {
	}

	/**
	 * Operatore in classifica nazionale (recensioni con voto verso l'operatore), con contesto sede prenotabile.
	 */
	public record TopOperatorSummaryDto(
			UUID id,
			String displayName,
			String role,
			Double averageStaffRating,
			Long staffReviewCount,
			String salonName,
			String salonSlug,
			String salonCity) {
	}

	/** Recensione pubblica ricevuta dal salone. */
	public record PublicSalonReviewDto(
			UUID id,
			int rating,
			Integer staffRating,
			String comment,
			String reviewerName,
			String serviceName,
			String staffDisplayName,
			java.time.Instant createdAt) {
	}

	/**
	 * Disponibilità tag «Oppure un tocco» nel raggio: query curate con match + servizi listino non già coperti.
	 */
	public record QuickSuggestAvailabilityDto(
			List<String> curatedQueries,
			List<QuickSuggestExtraTagDto> extras) {
	}

	/**
	 * Tag dinamico da listino salone (servizio non presente nei tasti curati home).
	 * {@code groupId}: {@code parrucchieri} | {@code massaggi-fisio} | {@code estetisti} | {@code altri}.
	 */
	public record QuickSuggestExtraTagDto(String label, String q, String groupId) {
	}
}
