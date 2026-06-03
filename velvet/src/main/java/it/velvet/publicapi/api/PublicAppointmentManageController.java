package it.velvet.publicapi.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.velvet.publicapi.service.PublicAppointmentManageService;
import it.velvet.publicapi.service.PublicAppointmentManageService.ManageView;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/public/appointments")
@Tag(name = "Pubblico — gestione prenotazione (token)")
public class PublicAppointmentManageController {

	private final PublicAppointmentManageService manageService;

	public PublicAppointmentManageController(PublicAppointmentManageService manageService) {
		this.manageService = manageService;
	}

	@GetMapping("/manage")
	@Operation(summary = "Metadati prenotazione da link gestione")
	public ManageView manage(@RequestParam String token) {
		return manageService.manage(token);
	}

	@PostMapping("/cancel")
	@Operation(summary = "Annullamento con token")
	public void cancel(@RequestBody @Valid CancelBody body) {
		manageService.cancel(body.token(), body.reason());
	}

	@GetMapping("/reschedule/slots")
	@Operation(summary = "Slot per riprogrammazione (token)")
	public List<String> rescheduleSlots(
			@RequestParam String token,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return manageService.rescheduleSlots(token, from, to);
	}

	@PostMapping("/reschedule")
	@Operation(summary = "Conferma nuovo orario (token)")
	public void reschedule(@RequestBody @Valid RescheduleBody body) {
		manageService.reschedule(body.token(), body.newStart());
	}

	public record CancelBody(@NotBlank String token, String reason) {
	}

	public record RescheduleBody(@NotBlank String token, @NotNull Instant newStart) {
	}
}
