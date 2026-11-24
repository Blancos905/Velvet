package it.luxury.security.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.luxury.common.api.BusinessException;
import it.luxury.config.LuxurySecurityProperties;
import it.luxury.consumer.service.EmailVerificationConfirmResult;
import it.luxury.consumer.service.LuxuryAuthLoginService;
import it.luxury.consumer.service.LuxuryEmailVerificationService;
import it.luxury.consumer.service.LuxuryPasswordResetService;
import it.luxury.security.auth.LuxuryRefreshTokenService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Autenticazione")
public class LuxuryAuthController {

	private final LuxuryAuthLoginService luxuryAuthLoginService;
	private final LuxuryPasswordResetService luxuryPasswordResetService;
	private final LuxuryEmailVerificationService luxuryEmailVerificationService;
	private final LuxuryRefreshTokenService luxuryRefreshTokenService;
	private final LuxuryRefreshTokenCookieSupport refreshTokenCookieSupport;
	private final LuxurySecurityProperties securityProperties;

	public LuxuryAuthController(
			LuxuryAuthLoginService luxuryAuthLoginService,
			LuxuryPasswordResetService luxuryPasswordResetService,
			LuxuryEmailVerificationService luxuryEmailVerificationService,
			LuxuryRefreshTokenService luxuryRefreshTokenService,
			LuxuryRefreshTokenCookieSupport refreshTokenCookieSupport,
			LuxurySecurityProperties securityProperties) {
		this.luxuryAuthLoginService = luxuryAuthLoginService;
		this.luxuryPasswordResetService = luxuryPasswordResetService;
		this.luxuryEmailVerificationService = luxuryEmailVerificationService;
		this.luxuryRefreshTokenService = luxuryRefreshTokenService;
		this.refreshTokenCookieSupport = refreshTokenCookieSupport;
		this.securityProperties = securityProperties;
	}

	@PostMapping("/login")
	@Operation(summary = "Login email/password (JWT Bearer + refresh token con rotazione)")
	public AuthLoginResponse login(
			@RequestBody @Valid AuthLoginRequest body,
			HttpServletRequest request,
			HttpServletResponse response) {
		var r = luxuryAuthLoginService.login(body.email(), body.password(), request);
		boolean secure = refreshTokenCookieSupport.isSecureRequest(request);
		refreshTokenCookieSupport.writeRefreshCookie(response, r.refreshToken(), r.refreshTokenExpiresInDays(), secure);
		return new AuthLoginResponse(r.accessToken(), null, "Bearer", r.expiresInSeconds(), r.refreshTokenExpiresInDays());
	}

	@PostMapping("/refresh")
	@Operation(summary = "Rinnova access token (rotazione refresh token)")
	public AuthLoginResponse refresh(
			@RequestBody(required = false) AuthRefreshRequest body,
			HttpServletRequest request,
			HttpServletResponse response) {
		String raw = resolveRefreshToken(body, request);
		var rotated = luxuryRefreshTokenService.rotate(raw, request);
		boolean secure = refreshTokenCookieSupport.isSecureRequest(request);
		refreshTokenCookieSupport.writeRefreshCookie(
				response,
				rotated.refreshToken(),
				securityProperties.refreshTokenTtlDays(),
				secure);
		return new AuthLoginResponse(
				rotated.accessToken(),
				null,
				"Bearer",
				rotated.expiresInSeconds(),
				securityProperties.refreshTokenTtlDays());
	}

	@PostMapping("/logout")
	@Operation(summary = "Revoca refresh token corrente")
	public ResponseEntity<Void> logout(
			@RequestBody(required = false) AuthRefreshRequest body,
			HttpServletRequest request,
			HttpServletResponse response) {
		String raw = resolveRefreshToken(body, request);
		luxuryRefreshTokenService.revoke(raw, request);
		boolean secure = refreshTokenCookieSupport.isSecureRequest(request);
		refreshTokenCookieSupport.clearRefreshCookie(response, secure);
		return ResponseEntity.noContent().build();
	}

	private String resolveRefreshToken(AuthRefreshRequest body, HttpServletRequest request) {
		if (body != null && body.refreshToken() != null && !body.refreshToken().isBlank()) {
			return body.refreshToken().trim();
		}
		String fromCookie = refreshTokenCookieSupport.readRefreshToken(request);
		if (fromCookie != null) {
			return fromCookie;
		}
		throw new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Sessione scaduta. Accedi di nuovo.");
	}

	@PostMapping("/password-reset/request")
	@Operation(
			summary = "Richiedi link reimpostazione password",
			description = """
					Risposta sempre equivalente: se esiste un account attivo con password locale, viene inviata un’email
					(o log in dev). Non indica se l’email è registrata.
					""")
	public ResponseEntity<PasswordResetRequestResponse> requestPasswordReset(@RequestBody @Valid PasswordResetRequestBody body) {
		luxuryPasswordResetService.requestReset(body.email());
		return ResponseEntity.accepted()
				.body(
						new PasswordResetRequestResponse(
								"Se l’indirizzo è associato a un account attivo, riceverai un’email con le istruzioni per reimpostare la password."));
	}

	@PostMapping("/password-reset/confirm")
	@Operation(summary = "Conferma nuova password con token ricevuto via email")
	public ResponseEntity<Void> confirmPasswordReset(@RequestBody @Valid PasswordResetConfirmBody body) {
		if (body.newPassword() == null || !body.newPassword().equals(body.confirmPassword())) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Conferma password non coerente.");
		}
		luxuryPasswordResetService.confirmReset(body.token(), body.newPassword());
		return ResponseEntity.noContent().build();
	}

	@PostMapping("/email-verification/confirm")
	@Operation(summary = "Conferma indirizzo email con token ricevuto via email di registrazione")
	public ResponseEntity<EmailVerificationConfirmResponse> confirmEmailVerification(
			@RequestBody @Valid EmailVerificationConfirmBody body,
			HttpServletRequest request,
			HttpServletResponse response) {
		EmailVerificationConfirmResult result = luxuryEmailVerificationService.confirmVerification(body.token(), request);
		if (result.issuesSession()) {
			boolean secure = refreshTokenCookieSupport.isSecureRequest(request);
			refreshTokenCookieSupport.writeRefreshCookie(
					response, result.refreshToken(), result.refreshTokenExpiresInDays(), secure);
		}
		return ResponseEntity.ok(
				new EmailVerificationConfirmResponse(
						result.message(),
						result.accessToken(),
						null,
						result.expiresInSeconds(),
						result.nextPath(),
						result.premiumCheckoutToken()));
	}

	@PostMapping("/email-verification/poll")
	@Operation(
			summary = "Sincronizza conferma email (app mobile)",
			description = """
					Per la WebView Flutter quando l'utente conferma l'email nel browser di sistema.
					Restituisce 204 finché la registrazione non risulta verificata.
					""")
	public ResponseEntity<EmailVerificationConfirmResponse> pollEmailVerification(
			@RequestBody @Valid EmailVerificationPollBody body,
			HttpServletRequest request,
			HttpServletResponse response) {
			Optional<EmailVerificationConfirmResult> result = luxuryEmailVerificationService.pollRegistrationSync(
					body.email(), body.registrationAt(), body.pollSecret(), request);
		if (result.isEmpty()) {
			return ResponseEntity.noContent().build();
		}
		EmailVerificationConfirmResult confirmed = result.get();
		if (confirmed.issuesSession()) {
			boolean secure = refreshTokenCookieSupport.isSecureRequest(request);
			refreshTokenCookieSupport.writeRefreshCookie(
					response, confirmed.refreshToken(), confirmed.refreshTokenExpiresInDays(), secure);
		}
		return ResponseEntity.ok(
				new EmailVerificationConfirmResponse(
						confirmed.message(),
						confirmed.accessToken(),
						null,
						confirmed.expiresInSeconds(),
						confirmed.nextPath(),
						confirmed.premiumCheckoutToken()));
	}

	@PostMapping("/email-verification/resend")
	@Operation(
			summary = "Reinvia email di conferma registrazione",
			description = """
					Risposta sempre equivalente: se esiste un account attivo non ancora verificato, viene inviata un’email
					(o log in dev). Non indica se l’email è registrata o già verificata.
					""")
	public ResponseEntity<EmailVerificationResendResponse> resendEmailVerification(
			@RequestBody @Valid EmailVerificationResendBody body) {
		luxuryEmailVerificationService.resendVerification(body.email());
		return ResponseEntity.accepted()
				.body(
						new EmailVerificationResendResponse(
								"Se l’indirizzo è associato a un account in attesa di conferma, riceverai un’email con il link di attivazione."));
	}

	public record AuthLoginRequest(
			@NotBlank @Size(max = 320) String email,
			@NotBlank @Size(max = 200) String password) {
	}

	public record AuthRefreshRequest(@Size(max = 128) String refreshToken) {
	}

	public record AuthLoginResponse(
			String accessToken,
			String refreshToken,
			String tokenType,
			long expiresInSeconds,
			int refreshTokenExpiresInDays) {
	}

	public record PasswordResetRequestBody(@NotBlank @Email @Size(max = 320) String email) {
	}

	public record PasswordResetRequestResponse(String message) {
	}

	public record PasswordResetConfirmBody(
			@NotBlank @Pattern(regexp = "[a-fA-F0-9]{64}") String token,
			@NotBlank @Size(min = 8, max = 200) String newPassword,
			@NotBlank @Size(min = 8, max = 200) String confirmPassword) {
	}

	public record EmailVerificationConfirmBody(@NotBlank @Pattern(regexp = "[a-fA-F0-9]{64}") String token) {
	}

	public record EmailVerificationConfirmResponse(
			String message,
			String accessToken,
			String refreshToken,
			Long expiresInSeconds,
			String nextPath,
			String premiumCheckoutToken) {

		public EmailVerificationConfirmResponse(String message) {
			this(message, null, null, null, "/account", null);
		}

		public EmailVerificationConfirmResponse(
				String message,
				String accessToken,
				String refreshToken,
				Long expiresInSeconds,
				String nextPath) {
			this(message, accessToken, refreshToken, expiresInSeconds, nextPath, null);
		}
	}

		public record EmailVerificationPollBody(
				@NotBlank @Email @Size(max = 320) String email,
				long registrationAt,
				@Size(max = 128) String pollSecret) {
		}

	public record EmailVerificationResendBody(@NotBlank @Email @Size(max = 320) String email) {
	}

	public record EmailVerificationResendResponse(String message) {
	}
}
