package it.luxury.consumer.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.luxury.appointment.domain.Appointment;
import it.luxury.appointment.service.AppointmentBookingService;
import it.luxury.appointment.service.AvailabilityService;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.service.ConsumerProfileService;
import it.luxury.publicapi.dto.AppointmentResponses.AppointmentDto;
import it.luxury.studio.domain.SalonSiteContentRepository;
import it.luxury.studio.service.SalonShowcasePayloadSupport;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import it.luxury.security.auth.LuxuryUserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/me/appointments")
@Tag(name = "Account consumatore (/me)")
@SecurityRequirement(name = "bearer-jwt")
public class MeAppointmentsController {

	private final ConsumerProfileService consumerProfileService;
	private final AppointmentBookingService appointmentBookingService;
	private final AvailabilityService availabilityService;
	private final SalonSiteContentRepository salonSiteContentRepository;

	public MeAppointmentsController(
			ConsumerProfileService consumerProfileService,
			AppointmentBookingService appointmentBookingService,
			AvailabilityService availabilityService,
			SalonSiteContentRepository salonSiteContentRepository) {
		this.consumerProfileService = consumerProfileService;
		this.appointmentBookingService = appointmentBookingService;
		this.availabilityService = availabilityService;
		this.salonSiteContentRepository = salonSiteContentRepository;
	}

	@GetMapping
	@Operation(summary = "Elenco prenotazioni consumatore")
	@PreAuthorize("hasAuthority('ROLE_CLIENT')")
	public List<AppointmentDto> list(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@RequestParam(defaultValue = "true") boolean upcoming) {
		ConsumerProfile p = consumerProfileService.requireActiveProfile(principal);
		List<Appointment> list = upcoming
				? appointmentBookingService.listUpcomingForConsumer(p.getId())
				: appointmentBookingService.listPastForConsumer(p.getId());
		return toDtos(list);
	}

	@GetMapping("/{id}")
	@Operation(summary = "Dettaglio prenotazione")
	@PreAuthorize("hasAuthority('ROLE_CLIENT')")
	public AppointmentDto get(@AuthenticationPrincipal LuxuryUserPrincipal principal, @PathVariable UUID id) {
		ConsumerProfile p = consumerProfileService.requireActiveProfile(principal);
		Appointment a = appointmentBookingService.requireAppointmentForConsumer(id, p.getId());
		return toDto(a);
	}

	@PostMapping
	@Operation(summary = "Crea prenotazione (JWT)")
	@PreAuthorize("hasAuthority('ROLE_CLIENT')")
	public AppointmentDto create(@AuthenticationPrincipal LuxuryUserPrincipal principal, @RequestBody @Valid CreateBody body) {
		ConsumerProfile p = consumerProfileService.requireActiveProfile(principal);
		Appointment a = appointmentBookingService.createForConsumer(
				p,
				body.organizationSlug(),
				body.serviceId(),
				body.operatorId(),
				body.start());
		return toDto(a);
	}

	@PostMapping("/{id}/cancel")
	@Operation(summary = "Annulla (JWT)")
	@PreAuthorize("hasAuthority('ROLE_CLIENT')")
	public void cancel(@AuthenticationPrincipal LuxuryUserPrincipal principal, @PathVariable UUID id) {
		ConsumerProfile p = consumerProfileService.requireActiveProfile(principal);
		Appointment a = appointmentBookingService.requireAppointmentForConsumer(id, p.getId());
		appointmentBookingService.cancelAsConsumer(a, p);
	}

	@GetMapping("/{id}/reschedule/slots")
	@Operation(summary = "Slot riprogrammazione")
	@PreAuthorize("hasAuthority('ROLE_CLIENT')")
	public List<String> rescheduleSlots(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@PathVariable UUID id,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		ConsumerProfile p = consumerProfileService.requireActiveProfile(principal);
		Appointment a = appointmentBookingService.requireAppointmentForConsumer(id, p.getId());
		appointmentBookingService.assertConsumerMayPreviewRescheduleSlots(a, p);
		return availabilityService.computeSlotsForReschedule(a, from, to).stream()
				.map(Instant::toString)
				.toList();
	}

	@PostMapping("/{id}/reschedule")
	@Operation(summary = "Conferma nuovo orario (JWT)")
	@PreAuthorize("hasAuthority('ROLE_CLIENT')")
	public AppointmentDto reschedule(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@PathVariable UUID id,
			@RequestBody @Valid RescheduleMeBody body) {
		ConsumerProfile p = consumerProfileService.requireActiveProfile(principal);
		Appointment a = appointmentBookingService.requireAppointmentForConsumer(id, p.getId());
		appointmentBookingService.rescheduleAsConsumer(a, p, body.newStart());
		return toDto(appointmentBookingService.requireAppointment(id));
	}

	private List<AppointmentDto> toDtos(List<Appointment> appointments) {
		Map<String, String> logoBySlug = resolveLocationLogoDataUrls(appointments);
		return appointments.stream().map(appointment -> toDto(appointment, logoBySlug)).toList();
	}

	private AppointmentDto toDto(Appointment appointment) {
		return toDto(appointment, resolveLocationLogoDataUrls(List.of(appointment)));
	}

	private AppointmentDto toDto(Appointment appointment, Map<String, String> logoBySlug) {
		String slug = appointment.getLocation() != null ? appointment.getLocation().getSlug() : null;
		String logo = null;
		if (slug != null && !slug.isBlank()) {
			logo = logoBySlug.get(slug.trim().toLowerCase(Locale.ROOT));
		}
		return AppointmentDto.from(appointment, logo);
	}

	private Map<String, String> resolveLocationLogoDataUrls(List<Appointment> appointments) {
		List<String> slugs = appointments.stream()
				.map(Appointment::getLocation)
				.filter(Objects::nonNull)
				.map(location -> location.getSlug())
				.filter(Objects::nonNull)
				.map(slug -> slug.trim().toLowerCase(Locale.ROOT))
				.filter(slug -> !slug.isEmpty())
				.distinct()
				.collect(Collectors.toList());
		return SalonShowcasePayloadSupport.resolveVisualsBySlugs(salonSiteContentRepository, slugs);
	}

	public record CreateBody(
			@NotBlank String organizationSlug,
			@NotNull UUID serviceId,
			UUID operatorId,
			@NotNull Instant start) {
	}

	public record RescheduleMeBody(@NotNull Instant newStart) {
	}
}
