package it.velvet.billing.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.velvet.billing.dto.BillingPortalSessionResponse;
import it.velvet.billing.dto.BillingStatusDto;
import it.velvet.billing.dto.CheckoutSessionResponse;
import it.velvet.billing.service.BillingStatusService;
import it.velvet.billing.service.StripeBillingPortalService;
import it.velvet.billing.service.StripeCheckoutService;
import it.velvet.security.auth.VelvetUserPrincipal;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/billing")
@Tag(name = "Account titolare — fatturazione Stripe")
@SecurityRequirement(name = "bearer-jwt")
@ConditionalOnProperty(name = "velvet.billing.enabled", havingValue = "true")
public class MeStripeBillingController {

	private final StripeCheckoutService checkoutService;
	private final StripeBillingPortalService portalService;
	private final BillingStatusService billingStatusService;

	public MeStripeBillingController(
			StripeCheckoutService checkoutService,
			StripeBillingPortalService portalService,
			BillingStatusService billingStatusService) {
		this.checkoutService = checkoutService;
		this.portalService = portalService;
		this.billingStatusService = billingStatusService;
	}

	@PostMapping("/checkout-session")
	@Operation(summary = "Avvia Stripe Checkout (hosted) per abbonamento Premium")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public CheckoutSessionResponse createCheckoutSession(@AuthenticationPrincipal VelvetUserPrincipal principal) {
		return new CheckoutSessionResponse(checkoutService.createCheckoutSessionUrl(principal));
	}

	@PostMapping("/checkout-session/confirm")
	@Operation(summary = "Conferma pagamento al ritorno da Stripe Checkout (sync abbonamento se webhook in ritardo)")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public BillingStatusDto confirmCheckoutSession(
			@RequestParam("session_id") String sessionId,
			@AuthenticationPrincipal VelvetUserPrincipal principal) {
		checkoutService.confirmCheckoutSession(sessionId, principal);
		return billingStatusService.resolve(principal);
	}

	@PostMapping("/portal-session")
	@Operation(summary = "Apri Stripe Customer Portal (metodo pagamento e fatture)")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public BillingPortalSessionResponse createPortalSession(@AuthenticationPrincipal VelvetUserPrincipal principal) {
		return new BillingPortalSessionResponse(portalService.createPortalSessionUrl(principal));
	}

	@PostMapping("/cancel-subscription-session")
	@Operation(summary = "Apri Stripe Customer Portal sulla pagina di disdetta abbonamento")
	@PreAuthorize("hasAuthority('ROLE_OWNER')")
	public BillingPortalSessionResponse createCancelSubscriptionPortalSession(
			@AuthenticationPrincipal VelvetUserPrincipal principal) {
		return new BillingPortalSessionResponse(portalService.createCancelSubscriptionPortalSessionUrl(principal));
	}
}
