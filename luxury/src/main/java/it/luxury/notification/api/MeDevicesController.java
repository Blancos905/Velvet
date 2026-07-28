package it.luxury.notification.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.luxury.notification.service.UserDeviceService;
import it.luxury.security.auth.LuxuryUserPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/devices")
@Tag(name = "Dispositivi push (/me)")
@SecurityRequirement(name = "bearer-jwt")
public class MeDevicesController {

	private final UserDeviceService userDeviceService;

	public MeDevicesController(UserDeviceService userDeviceService) {
		this.userDeviceService = userDeviceService;
	}

	@PostMapping
	@Operation(summary = "Registra o aggiorna token FCM del dispositivo corrente")
	@PreAuthorize("hasAnyAuthority('ROLE_CLIENT','ROLE_OWNER','ROLE_STAFF','ROLE_ADMIN')")
	public void register(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@RequestBody @Valid RegisterDeviceBody body) {
		userDeviceService.registerDevice(
				principal,
				body.token(),
				UserDeviceService.parseOsType(body.os()));
	}

	@DeleteMapping("/{token}")
	@Operation(summary = "Rimuove token FCM al logout (idempotente)")
	@PreAuthorize("hasAnyAuthority('ROLE_CLIENT','ROLE_OWNER','ROLE_STAFF','ROLE_ADMIN')")
	public void unregister(
			@AuthenticationPrincipal LuxuryUserPrincipal principal,
			@PathVariable String token) {
		userDeviceService.unregisterDevice(principal, token);
	}

	public record RegisterDeviceBody(
			@NotBlank @Size(max = 512) String token,
			@NotBlank @Size(max = 16) String os) {
	}
}
