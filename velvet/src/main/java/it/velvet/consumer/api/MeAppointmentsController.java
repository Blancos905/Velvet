package it.velvet.consumer.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.velvet.appointment.domain.Appointment;
import it.velvet.appointment.service.AppointmentBookingService;
import it.velvet.appointment.service.AvailabilityService;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.service.ConsumerProfileService;
import it.velvet.publicapi.dto.AppointmentResponses.AppointmentDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import it.velvet.security.auth.VelvetUserPrincipal;
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
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/me/appointments")
@Tag(name = "Account consumatore (/me)")
@SecurityRequirement(name = "bearer-jwt")
public class MeAppointmentsController {

	private final ConsumerProfileService consumerProfileService;
	private final AppointmentBookingService appointmentBookingService;
	private final AvailabilityService availabilityService;

	public MeAppointmentsController(
			ConsumerProfileService consumerProfileService,
			AppointmentBookingService appointmentBookingService,
			AvailabilityService availabilityService) {
		this.consumerProfileService = consumerProfileService;
		this.appointmentBookingService = appointmentBookingService;
		this.availabilityService = availabilityService;
	}

	@GetMapping
	@Operation(summary = "Elenco prenotazioni consumatore")
	@PreAuthorize("hasAuthority('ROLE_CLIENT')")
	public List<AppointmentDto> list(
			@AuthenticationPrincipal VelvetUserPrincipal principal,
			@RequestParam(defaultValue = "true") boolean upcoming) {
		ConsumerProfile p = consumerProfileService.requireActiveProfile(principal);
		List<Appointment> list = upcoming
				? appointmentBookingService.listUpcomingForConsumer(p.getId())
				: appointmentBookingService.listPastForConsumer(p.getId());
		return list.stream().map(AppointmentDto::from).toList();
	}

	@GetMapping("/{id}")
	@Operation(summary = "Dettaglio prenotazione")
	@PreAuthorize("hasAuthority('ROLE_CLIENT')")
	public AppointmentDto get(@AuthenticationPrincipal VelvetUserPrincipal principal, @PathVariable UUID id) {
		ConsumerProfile p = consumerProfileService.requireActiveProfile(principal);
		Appointment a = appointmentBookingService.requireAppointmentForConsumer(id, p.getId());
		return AppointmentDto.from(a);
	}

	@PostMapping
	@Operation(summary = "Crea prenotazione (JWT)")
	@PreAuthorize("hasAuthority('ROLE_CLIENT')")
	public AppointmentDto create(@AuthenticationPrincipal VelvetUserPrincipal principal, @RequestBody @Valid CreateBody body) {
		ConsumerProfile p = consumerProfileService.requireActiveProfile(principal);
		Appointment a = appointmentBookingService.createForConsumer(
				p,
				body.organizationSlug(),
				body.serviceId(),
				body.operatorId(),
				body.start());
		return AppointmentDto.from(a);
	}

	@PostMapping("/{id}/cancel")
	@Operation(summary = "Annulla (JWT)")
	@PreAuthorize("hasAuthority('ROLE_CLIENT')")
	public void cancel(@AuthenticationPrincipal VelvetUserPrincipal principal, @PathVariable UUID id) {
		ConsumerProfile p = consumerProfileService.requireActiveProfile(principal);
		Appointment a = appointmentBookingService.requireAppointmentForConsumer(id, p.getId());
		appointmentBookingService.cancelAsConsumer(a, p);
	}

	@GetMapping("/{id}/reschedule/slots")
	@Operation(summary = "Slot riprogrammazione")
	@PreAuthorize("hasAuthority('ROLE_CLIENT')")
	public List<String> rescheduleSlots(
			@AuthenticationPrincipal VelvetUserPrincipal principal,
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
			@AuthenticationPrincipal VelvetUserPrincipal principal,
			@PathVariable UUID id,
			@RequestBody @Valid RescheduleMeBody body) {
		ConsumerProfile p = consumerProfileService.requireActiveProfile(principal);
		Appointment a = appointmentBookingService.requireAppointmentForConsumer(id, p.getId());
		appointmentBookingService.rescheduleAsConsumer(a, p, body.newStart());
		return AppointmentDto.from(appointmentBookingService.requireAppointment(id));
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
