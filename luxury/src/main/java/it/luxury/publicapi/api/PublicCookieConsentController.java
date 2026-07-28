package it.luxury.publicapi.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.luxury.legal.cookie.CookieConsentRegistryService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/public/cookie-consent")
@Tag(name = "Pubblico — registro consensi cookie")
public class PublicCookieConsentController {

	private final CookieConsentRegistryService cookieConsentRegistryService;

	public PublicCookieConsentController(CookieConsentRegistryService cookieConsentRegistryService) {
		this.cookieConsentRegistryService = cookieConsentRegistryService;
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@Operation(summary = "Registra scelta cookie/consenso (prova forense server-side)")
	public CookieConsentRecordedResponse record(
			@RequestBody @Valid CookieConsentRecordBody body,
			@AuthenticationPrincipal Object principal,
			HttpServletRequest request) {
		if (body.version() != 2) {
			throw new IllegalArgumentException("consent version must be 2");
		}
		Instant decidedAt;
		try {
			decidedAt = Instant.parse(body.decidedAt());
		}
		catch (Exception ex) {
			decidedAt = Instant.now();
		}
		UUID eventId = cookieConsentRegistryService.record(
				body.visitorId(),
				CookieConsentRegistryService.profileIdFromPrincipal(principal),
				body.version(),
				body.policyVersion(),
				body.action(),
				body.maps(),
				body.editorial(),
				decidedAt,
				request);
		return new CookieConsentRecordedResponse(eventId, true);
	}

	public record CookieConsentRecordBody(
			@NotNull UUID visitorId,
			int version,
			@NotBlank String decidedAt,
			@NotBlank String action,
			boolean maps,
			boolean editorial,
			String policyVersion) {
	}

	public record CookieConsentRecordedResponse(UUID id, boolean recorded) {
	}
}
