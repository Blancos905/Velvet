package it.velvet.consumer.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.velvet.publicapi.dto.AppointmentResponses.AppointmentDto;
import it.velvet.security.auth.VelvetUserPrincipal;
import it.velvet.studio.dto.MeStaffOperatorPhotoPatchRequest;
import it.velvet.studio.dto.MeStaffOperatorSelfDto;
import it.velvet.studio.dto.MeStaffSalonDto;
import it.velvet.studio.service.MeStaffAgendaService;
import it.velvet.studio.service.MeStaffContextService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
	public MeStaffSalonDto staffSalon(@AuthenticationPrincipal VelvetUserPrincipal principal) {
		return meStaffContextService.resolveSalonForStaff(principal);
	}

	@GetMapping("/operator-profile")
	@Operation(summary = "Profilo operatore collegato (anagrafica e foto mostrata in agenda / catalogo)")
	@PreAuthorize("hasAuthority('ROLE_STAFF')")
	public MeStaffOperatorSelfDto operatorProfile(@AuthenticationPrincipal VelvetUserPrincipal principal) {
		return meStaffContextService.getOperatorSelf(principal);
	}

	@PatchMapping("/operator-profile")
	@Operation(summary = "Aggiorna la foto dell’operatore collegato a questo account")
	@PreAuthorize("hasAuthority('ROLE_STAFF')")
	public MeStaffOperatorSelfDto patchOperatorProfile(
			@AuthenticationPrincipal VelvetUserPrincipal principal,
			@Valid @RequestBody MeStaffOperatorPhotoPatchRequest body) {
		return meStaffContextService.updateOperatorPhoto(principal, body);
	}

	@GetMapping("/agenda")
	@Operation(summary = "Agenda personale (prenotazioni dell’operatore collegato)")
	@PreAuthorize("hasAuthority('ROLE_STAFF')")
	public List<AppointmentDto> agenda(
			@AuthenticationPrincipal VelvetUserPrincipal principal,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return meStaffAgendaService.listAgenda(principal, from, to);
	}

	@GetMapping("/appointments/{id}")
	@Operation(summary = "Dettaglio prenotazione assegnata all’operatore collegato")
	@PreAuthorize("hasAuthority('ROLE_STAFF')")
	public AppointmentDto appointmentForStaff(
			@AuthenticationPrincipal VelvetUserPrincipal principal,
			@PathVariable UUID id) {
		return meStaffAgendaService.getForStaff(principal, id);
	}

	@PostMapping("/appointments/{id}/confirm")
	@Operation(summary = "Accetta una richiesta prenotazione cliente (stato BOOKED → CONFIRMED)")
	@PreAuthorize("hasAuthority('ROLE_STAFF')")
	public AppointmentDto confirmAppointmentForStaff(
			@AuthenticationPrincipal VelvetUserPrincipal principal,
			@PathVariable UUID id) {
		return meStaffAgendaService.confirmForStaff(principal, id);
	}

	@PostMapping("/appointments/{id}/reject")
	@Operation(summary = "Rifiuta una richiesta prenotazione cliente (stato BOOKED → CANCELLED)")
	@PreAuthorize("hasAuthority('ROLE_STAFF')")
	public void rejectAppointmentForStaff(
			@AuthenticationPrincipal VelvetUserPrincipal principal,
			@PathVariable UUID id) {
		meStaffAgendaService.rejectForStaff(principal, id);
	}
}
