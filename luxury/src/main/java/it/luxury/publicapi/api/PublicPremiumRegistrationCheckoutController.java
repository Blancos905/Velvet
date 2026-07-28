package it.luxury.publicapi.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.luxury.billing.dto.CheckoutSessionResponse;
import it.luxury.billing.service.PremiumRegistrationCheckoutService;
import it.luxury.billing.service.PremiumRegistrationCompletionService;
import it.luxury.config.LuxurySecurityProperties;
import it.luxury.security.api.LuxuryRefreshTokenCookieSupport;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import it.luxury.billing.config.ConditionalOnStripeBillingOperational;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/consumer-registration/premium-checkout")
@Tag(name = "Pubblico — checkout Premium in registrazione")
@ConditionalOnStripeBillingOperational
public class PublicPremiumRegistrationCheckoutController {

	private final PremiumRegistrationCheckoutService checkoutService;
	private final PremiumRegistrationCompletionService completionService;
	private final LuxuryRefreshTokenCookieSupport refreshTokenCookieSupport;
	private final LuxurySecurityProperties securityProperties;

	public PublicPremiumRegistrationCheckoutController(
			PremiumRegistrationCheckoutService checkoutService,
			PremiumRegistrationCompletionService completionService,
			LuxuryRefreshTokenCookieSupport refreshTokenCookieSupport,
			LuxurySecurityProperties securityProperties) {
		this.checkoutService = checkoutService;
		this.completionService = completionService;
		this.refreshTokenCookieSupport = refreshTokenCookieSupport;
		this.securityProperties = securityProperties;
	}

	@PostMapping("/session")
	@Operation(summary = "Avvia Stripe Checkout da registrazione Premium in sospeso (nessun account in DB)")
	public CheckoutSessionResponse createCheckoutSession(@Valid @RequestBody PremiumCheckoutTokenBody body) {
		return new CheckoutSessionResponse(checkoutService.createCheckoutSessionUrl(body.checkoutToken()));
	}

	@PostMapping("/confirm")
	@Operation(summary = "Conferma pagamento registrazione Premium e materializza salone + sessione")
	public PremiumRegistrationConfirmResponse confirmCheckoutSession(
			@RequestParam("session_id") String sessionId,
			@Valid @RequestBody PremiumCheckoutTokenBody body,
			HttpServletRequest request,
			HttpServletResponse response) {
		PremiumRegistrationCompletionService.PremiumRegistrationCompletionResult result =
				completionService.confirmRegistrationCheckout(sessionId, body.checkoutToken(), request);
		boolean secure = refreshTokenCookieSupport.isSecureRequest(request);
		refreshTokenCookieSupport.writeRefreshCookie(
				response, result.refreshToken(), securityProperties.refreshTokenTtlDays(), secure);
		return new PremiumRegistrationConfirmResponse(
				result.message(),
				result.accessToken(),
				result.refreshToken(),
				result.expiresInSeconds(),
				result.nextPath());
	}

	public record PremiumCheckoutTokenBody(
			@NotBlank @Pattern(regexp = "[a-fA-F0-9]{64}") String checkoutToken) {
	}

	public record PremiumRegistrationConfirmResponse(
			String message,
			String accessToken,
			String refreshToken,
			long expiresInSeconds,
			String nextPath) {
	}
}
