package it.luxury.consumer.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.luxury.publicapi.dto.AppointmentResponses.AppointmentDto;
import it.luxury.security.auth.LuxuryUserPrincipal;
import it.luxury.studio.dto.MeStaffOperatorPhotoPatchRequest;
import it.luxury.studio.dto.MeStaffOperatorSelfDto;
import it.luxury.studio.dto.MeStaffSalonDto;
import it.luxury.studio.dto.OperatorTimeBlockDtos.CreateOperatorTimeBlockRequest;
import it.luxury.studio.dto.OperatorTimeBlockDtos.OperatorTimeBlockDto;
import it.luxury.studio.dto.OperatorTimeBlockDtos.UpdateOperatorTimeBlockRequest;
import it.luxury.studio.service.MeStaffAgendaService;
import it.luxury.studio.service.MeStaffContextService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/me/staff")
@Tag(name = "Account staff (/me)")
@SecurityRequirement(name = "bearer-jwt")
public class MeStaffController {

	private final MeStaffAgendaService meStaffAgendaService;
	private final MeStaffContextService meStaffContextService;

	public MeStaffController(MeStaffAgendaService meStaffAgendaService, MeStaffContextService meStaffContextService) {
		this.meStaffAgendaService = meStaffAgendaService;
		this.meStaffContextService = meStaffContextService;
	}

	@GetMapping("/salon")
	@Operation(summary = "Nome salone (studio) della sede a cui è collegato l’operatore")
	@PreAuthorize("hasAuthority('ROLE_STAFF')")
	public MeStaffSalonDto staffSalon(@AuthenticationPrincipal LuxuryUserPrincipal principal) {
		return meStaffContextService.resolveSalonForStaff(principal);
	}

	@GetMapping("/operator-profile")
	@Operation(summary = "Profilo operatore collegato (anagrafica e foto mostrata in agenda / catalogo)")
	@PreAuthorize("hasAuthority('ROLE_STAFF')")
	public MeStaffOperatorSelfDto operatorProfile(@AuthenticationPrincipal LuxuryUserPrincipal principal) {
		return meStaffContextService.getOperatorSelf(principal);
	}

	@PatchMapping("/operator-profile")
	@Operation(summary = "Aggiorna la foto dell’operatore collegato a questo account")
	@PreAuthorize("hasAuthority('ROLE_STAFF')")
	public MeStaffOperatorSelfDto patchOperatorProfile(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@Valid @RequestBody MeStaffOperatorPhotoPatchRequest body) {
		return meStaffContextService.updateOperatorPhoto(principal, body);
	}

	@GetMapping("/agenda")
	@Operation(summary = "Agenda personale (prenotazioni dell’operatore collegato)")
	@PreAuthorize("hasAuthority('ROLE_STAFF')")
	public List<AppointmentDto> agenda(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return meStaffAgendaService.listAgenda(principal, from, to);
	}

	@GetMapping("/appointments/{id}")
	@Operation(summary = "Dettaglio prenotazione assegnata all’operatore collegato")
	@PreAuthorize("hasAuthority('ROLE_STAFF')")
	public AppointmentDto appointmentForStaff(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@PathVariable UUID id) {
		return meStaffAgendaService.getForStaff(principal, id);
	}

	@PostMapping("/appointments/{id}/confirm")
	@Operation(summary = "Accetta una richiesta prenotazione cliente (stato BOOKED → CONFIRMED)")
	@PreAuthorize("hasAuthority('ROLE_STAFF')")
	public AppointmentDto confirmAppointmentForStaff(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@PathVariable UUID id) {
		return meStaffAgendaService.confirmForStaff(principal, id);
	}

	@PostMapping("/appointments/{id}/reject")
	@Operation(summary = "Rifiuta una richiesta prenotazione cliente (stato BOOKED → CANCELLED)")
	@PreAuthorize("hasAuthority('ROLE_STAFF')")
	public void rejectAppointmentForStaff(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@PathVariable UUID id) {
		meStaffAgendaService.rejectForStaff(principal, id);
	}

	@GetMapping("/appointments/{id}/reschedule/slots")
	@Operation(summary = "Slot riprogrammazione per l'operatore collegato")
	@PreAuthorize("hasAuthority('ROLE_STAFF')")
	public List<String> rescheduleSlotsForStaff(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@PathVariable UUID id,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return meStaffAgendaService.rescheduleSlotsForStaff(principal, id, from, to);
	}

	@PostMapping("/appointments/{id}/reschedule")
	@Operation(summary = "Sposta un appuntamento assegnato all'operatore collegato")
	@PreAuthorize("hasAuthority('ROLE_STAFF')")
	public AppointmentDto rescheduleForStaff(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@PathVariable UUID id,
			@RequestBody @Valid RescheduleStaffBody body) {
		return meStaffAgendaService.rescheduleForStaff(principal, id, body.newStart());
	}

	@GetMapping("/time-blocks")
	@Operation(summary = "Blocchi orario personali dell'operatore collegato")
	@PreAuthorize("hasAuthority('ROLE_STAFF')")
	public List<OperatorTimeBlockDto> listTimeBlocks(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return meStaffAgendaService.listTimeBlocks(principal, from, to);
	}

	@PostMapping("/time-blocks")
	@Operation(summary = "Blocca una fascia oraria (impegno personale, indisponibilità)")
	@PreAuthorize("hasAuthority('ROLE_STAFF')")
	public OperatorTimeBlockDto createTimeBlock(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@Valid @RequestBody CreateOperatorTimeBlockRequest body) {
		return meStaffAgendaService.createTimeBlock(principal, body);
	}

	@PatchMapping("/time-blocks/{id}")
	@Operation(summary = "Modifica un blocco orario personale")
	@PreAuthorize("hasAuthority('ROLE_STAFF')")
	public OperatorTimeBlockDto updateTimeBlock(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@PathVariable UUID id,
			@Valid @RequestBody UpdateOperatorTimeBlockRequest body) {
		return meStaffAgendaService.updateTimeBlock(principal, id, body);
	}

	@DeleteMapping("/time-blocks/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@Operation(summary = "Rimuovi un blocco orario personale")
	@PreAuthorize("hasAuthority('ROLE_STAFF')")
	public void deleteTimeBlock(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@PathVariable UUID id) {
		meStaffAgendaService.deleteTimeBlock(principal, id);
	}

	public record RescheduleStaffBody(@jakarta.validation.constraints.NotNull Instant newStart) {
	}
}
