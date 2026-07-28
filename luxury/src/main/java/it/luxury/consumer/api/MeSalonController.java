package it.luxury.consumer.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.luxury.publicapi.dto.AppointmentResponses.AppointmentDto;
import it.luxury.studio.dto.MeSalonStaffCreateRequest;
import it.luxury.studio.dto.MeSalonStaffDto;
import it.luxury.studio.dto.MeSalonNotificationInboxDto;
import it.luxury.studio.dto.MeSalonNotificationMessageDto;
import it.luxury.studio.dto.MeSalonReviewDto;
import it.luxury.studio.dto.MeSalonSummaryDto;
import it.luxury.studio.dto.MeSalonUpdateRequest;
import it.luxury.studio.service.MeSalonAppointmentsService;
import it.luxury.studio.service.MeSalonNotificationInboxService;
import it.luxury.studio.service.MeSalonReviewInboxService;
import it.luxury.studio.service.MeSalonStaffService;
import it.luxury.studio.service.MeSalonStatisticsPinService;
import it.luxury.studio.service.MeSalonSummaryService;
import it.luxury.studio.dto.StatisticsPinChangeRequest;
import it.luxury.studio.dto.StatisticsPinVerifyRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import it.luxury.security.auth.LuxuryUserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.time.LocalDate;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/me/salon")
@Tag(name = "Account titolare (/me)")
@SecurityRequirement(name = "bearer-jwt")
public class MeSalonController {

	private final MeSalonSummaryService meSalonSummaryService;
	private final MeSalonAppointmentsService meSalonAppointmentsService;
	private final MeSalonNotificationInboxService meSalonNotificationInboxService;
	private final MeSalonReviewInboxService meSalonReviewInboxService;
	private final MeSalonStaffService meSalonStaffService;
	private final MeSalonStatisticsPinService meSalonStatisticsPinService;

	public MeSalonController(
			MeSalonSummaryService meSalonSummaryService,
			MeSalonAppointmentsService meSalonAppointmentsService,
			MeSalonNotificationInboxService meSalonNotificationInboxService,
			MeSalonReviewInboxService meSalonReviewInboxService,
			MeSalonStaffService meSalonStaffService,
			MeSalonStatisticsPinService meSalonStatisticsPinService) {
		this.meSalonSummaryService = meSalonSummaryService;
		this.meSalonAppointmentsService = meSalonAppointmentsService;
		this.meSalonNotificationInboxService = meSalonNotificationInboxService;
		this.meSalonReviewInboxService = meSalonReviewInboxService;
		this.meSalonStaffService = meSalonStaffService;
		this.meSalonStatisticsPinService = meSalonStatisticsPinService;
	}

	@GetMapping
	@Operation(summary = "Riepilogo salone (piano da DB, registrazione /piani)")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public MeSalonSummaryDto get(@AuthenticationPrincipal LuxuryUserPrincipal principal) {
		return meSalonSummaryService.resolve(principal);
	}

	@PatchMapping
	@Operation(summary = "Aggiorna dati principali sede salone (nome, slug, città, indirizzo)")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public MeSalonSummaryDto update(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@Valid @RequestBody MeSalonUpdateRequest body) {
		return meSalonSummaryService.update(principal, body);
	}

	@PostMapping("/statistics/verify-pin")
	@Operation(summary = "Verifica PIN accesso statistiche (Premium)")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public ResponseEntity<Void> verifyStatisticsPin(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@Valid @RequestBody StatisticsPinVerifyRequest body) {
		meSalonStatisticsPinService.verify(principal, body);
		return ResponseEntity.noContent().build();
	}

	@PostMapping("/verify-statistics-pin")
	@Operation(summary = "Alias verifica PIN statistiche (compatibilità client)")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public ResponseEntity<Void> verifyStatisticsPinAlias(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@Valid @RequestBody StatisticsPinVerifyRequest body) {
		meSalonStatisticsPinService.verify(principal, body);
		return ResponseEntity.noContent().build();
	}

	@PatchMapping("/statistics/pin")
	@Operation(summary = "Imposta o cambia PIN statistiche (Premium)")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public ResponseEntity<Void> changeStatisticsPin(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@Valid @RequestBody StatisticsPinChangeRequest body) {
		meSalonStatisticsPinService.change(principal, body);
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/notifications")
	@Operation(summary = "Conteggi notifiche/email per tipo (prenotazioni e conferme cliente; i promemoria sono solo lato cliente; le recensioni ricevute sono in area Recensioni account)")
	@PreAuthorize("isAuthenticated()")
	public MeSalonNotificationInboxDto notificationInbox(@AuthenticationPrincipal LuxuryUserPrincipal principal) {
		return meSalonNotificationInboxService.resolve(principal);
	}

	@GetMapping("/reviews")
	@Operation(summary = "Storico recensioni ricevute dal salone (titolare: tutte le sedi; staff: solo appuntamenti assegnati all'operatore collegato)")
	@PreAuthorize("isAuthenticated()")
	public List<MeSalonReviewDto> reviews(@AuthenticationPrincipal LuxuryUserPrincipal principal) {
		return meSalonReviewInboxService.list(principal);
	}

	@GetMapping("/notifications/messages")
	@Operation(summary = "Ultime notifiche per categoria (testo riepilogo con cliente e data/ora appuntamento)")
	@PreAuthorize("isAuthenticated()")
	public List<MeSalonNotificationMessageDto> notificationMessages(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@RequestParam("bucket") String bucket) {
		return meSalonNotificationInboxService.listMessagesForBucket(principal, bucket);
	}

	@DeleteMapping("/notifications/messages/{id}")
	@Operation(summary = "Elimina una notifica dalla inbox (titolare: rimozione per tutto lo studio; staff: solo dalla propria vista)")
	@PreAuthorize("isAuthenticated()")
	public void deleteNotificationMessage(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@PathVariable UUID id) {
		meSalonNotificationInboxService.deleteMessage(principal, id);
	}

	@PostMapping("/notifications/inbox/ack-sent")
	@Operation(summary = "Segna come consultate le email già inviate (azzera conteggi «Inviate» e registro in UI fino a nuove inviate)")
	@PreAuthorize("isAuthenticated()")
	public MeSalonNotificationInboxDto acknowledgeSentNotificationInbox(@AuthenticationPrincipal LuxuryUserPrincipal principal) {
		return meSalonNotificationInboxService.acknowledgeSentInbox(principal);
	}

	@PostMapping("/notifications/inbox/ack-bucket")
	@Operation(summary = "Segna come consultata una categoria notifiche (azzera la riga fino a nuove notifiche)")
	@PreAuthorize("isAuthenticated()")
	public MeSalonNotificationInboxDto acknowledgeBucketNotificationInbox(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@RequestParam("bucket") String bucket) {
		return meSalonNotificationInboxService.acknowledgeBucketInbox(principal, bucket);
	}

	@GetMapping("/agenda")
	@Operation(summary = "Agenda prenotazioni (tutte le sedi dello studio; date nell’intervallo locale per sede)")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public List<AppointmentDto> agenda(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return meSalonAppointmentsService.listAgenda(principal, from, to);
	}

	@PostMapping("/appointments")
	@ResponseStatus(HttpStatus.CREATED)
	@Operation(summary = "Crea appuntamento da agenda (titolare prenota un cliente dell’anagrafica)")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public AppointmentDto createAppointmentForOwner(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@Valid @RequestBody CreateSalonAppointmentBody body) {
		return meSalonAppointmentsService.createForOwner(
				principal, body.salonClientId(), body.serviceId(), body.operatorId(), body.start());
	}

	@GetMapping("/appointments/{id}")
	@Operation(summary = "Dettaglio prenotazione per titolare (sede dello studio)")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public AppointmentDto appointmentForOwner(@AuthenticationPrincipal LuxuryUserPrincipal principal, @PathVariable UUID id) {
		return meSalonAppointmentsService.getForOwner(principal, id);
	}

	@PostMapping("/appointments/{id}/cancel")
	@Operation(summary = "Annulla prenotazione come titolare")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public void cancelAppointmentForOwner(@AuthenticationPrincipal LuxuryUserPrincipal principal, @PathVariable UUID id) {
		meSalonAppointmentsService.cancelForOwner(principal, id);
	}

	@GetMapping("/appointments/{id}/reschedule/slots")
	@Operation(summary = "Slot riprogrammazione come titolare")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public List<String> rescheduleSlotsForOwner(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@PathVariable UUID id,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return meSalonAppointmentsService.rescheduleSlotsForOwner(principal, id, from, to);
	}

	@PostMapping("/appointments/{id}/reschedule")
	@Operation(summary = "Conferma nuovo orario come titolare")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public AppointmentDto rescheduleForOwner(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@PathVariable UUID id,
			@RequestBody @Valid RescheduleSalonBody body) {
		return meSalonAppointmentsService.rescheduleForOwner(principal, id, body.newStart());
	}

	@PostMapping("/appointments/{id}/confirm")
	@Operation(summary = "Accetta una richiesta prenotazione cliente (stato BOOKED → CONFIRMED)")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public AppointmentDto confirmAppointmentForOwner(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@PathVariable UUID id) {
		return meSalonAppointmentsService.confirmForOwner(principal, id);
	}

	@PostMapping("/appointments/{id}/reject")
	@Operation(summary = "Rifiuta una richiesta prenotazione cliente (stato BOOKED → CANCELLED)")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public void rejectAppointmentForOwner(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@PathVariable UUID id) {
		meSalonAppointmentsService.rejectForOwner(principal, id);
	}

	@GetMapping("/staff")
	@Operation(summary = "Elenco staff (prima sede)")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public List<MeSalonStaffDto> listStaff(@AuthenticationPrincipal LuxuryUserPrincipal principal) {
		return meSalonStaffService.list(principal);
	}

	@PostMapping("/staff")
	@Operation(summary = "Aggiungi membro staff (prima sede)")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public MeSalonStaffDto createStaff(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@Valid @RequestBody MeSalonStaffCreateRequest body) {
		return meSalonStaffService.create(principal, body);
	}

	@PutMapping("/staff/{id}")
	@Operation(summary = "Modifica membro staff (prima sede)")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public MeSalonStaffDto updateStaff(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@PathVariable UUID id,
			@Valid @RequestBody MeSalonStaffCreateRequest body) {
		return meSalonStaffService.update(principal, id, body);
	}

	@DeleteMapping("/staff/{id}")
	@Operation(summary = "Elimina membro staff (prima sede)")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public void deleteStaff(@AuthenticationPrincipal LuxuryUserPrincipal principal, @PathVariable UUID id) {
		meSalonStaffService.delete(principal, id);
	}

	public record RescheduleSalonBody(@NotNull Instant newStart) {
	}

	public record CreateSalonAppointmentBody(
			@NotNull UUID salonClientId,
			@NotNull UUID serviceId,
			@NotNull UUID operatorId,
			@NotNull Instant start) {
	}
}
