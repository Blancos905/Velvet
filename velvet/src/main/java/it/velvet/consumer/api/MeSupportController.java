package it.velvet.consumer.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.velvet.consumer.service.MeSupportService;
import it.velvet.security.auth.VelvetUserPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/support")
@Tag(name = "Account consumatore (/me)")
@SecurityRequirement(name = "bearer-jwt")
public class MeSupportController {

	private final MeSupportService meSupportService;

	public MeSupportController(MeSupportService meSupportService) {
		this.meSupportService = meSupportService;
	}

	@GetMapping
	@Operation(summary = "Centro assistenza minimale")
	@PreAuthorize("hasAnyAuthority('ROLE_CLIENT','ROLE_OWNER','ROLE_STAFF','ROLE_ADMIN')")
	public SupportInfo get() {
		var info = meSupportService.resolveSupportInfo();
		return new SupportInfo(info.faqUrl(), info.contactUrl(), info.message(), info.supportEmail(), info.supportPhone());
	}

	@PostMapping("/requests")
	@Operation(summary = "Invia richiesta assistenza al team Saloni Luxury")
	@PreAuthorize("hasAnyAuthority('ROLE_CLIENT','ROLE_OWNER','ROLE_STAFF','ROLE_ADMIN')")
	public ResponseEntity<SupportRequestAccepted> createRequest(
			@AuthenticationPrincipal VelvetUserPrincipal principal,
			@RequestBody @Valid SupportRequestBody body) {
		meSupportService.createSupportRequest(principal, body.subject(), body.message());
		return ResponseEntity.accepted()
				.body(new SupportRequestAccepted(
						"Richiesta inviata, Le risponderemo il prima possibile; Tenga d'occhio le notifiche di sistema, Le risponderemo appena possibile."));
	}

	public record SupportInfo(
			String faqUrl,
			String contactUrl,
			String message,
			String supportEmail,
			String supportPhone) {
	}

	public record SupportRequestBody(
			@Size(max = 120) String subject,
			@NotBlank @Size(min = 10, max = 2000) String message) {
	}

	public record SupportRequestAccepted(String message) {
	}
}
