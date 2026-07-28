package it.luxury.billing.service;

import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import it.luxury.common.api.BusinessException;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.consumer.domain.PendingRegistration;
import it.luxury.consumer.service.PendingSalonRegistrationMaterializationService;
import it.luxury.consumer.service.SalonOwnerRoleAlignmentService;
import it.luxury.security.auth.LuxuryRefreshTokenService;
import it.luxury.studio.domain.StudioGroupRepository;
import jakarta.servlet.http.HttpServletRequest;
import it.luxury.billing.config.ConditionalOnStripeBillingOperational;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

@Service
@ConditionalOnStripeBillingOperational
public class PremiumRegistrationCompletionService {

	private final PremiumRegistrationCheckoutService premiumRegistrationCheckoutService;
	private final PendingSalonRegistrationMaterializationService materializationService;
	private final SalonBillingNotificationService billingNotificationService;
	private final ConsumerProfileRepository consumerProfileRepository;
	private final StudioGroupRepository studioGroupRepository;
	private final SalonOwnerRoleAlignmentService salonOwnerRoleAlignmentService;
	private final LuxuryRefreshTokenService luxuryRefreshTokenService;
	private final com.stripe.StripeClient stripeClient;

	public PremiumRegistrationCompletionService(
			PremiumRegistrationCheckoutService premiumRegistrationCheckoutService,
			PendingSalonRegistrationMaterializationService materializationService,
			SalonBillingNotificationService billingNotificationService,
			ConsumerProfileRepository consumerProfileRepository,
			StudioGroupRepository studioGroupRepository,
			SalonOwnerRoleAlignmentService salonOwnerRoleAlignmentService,
			LuxuryRefreshTokenService luxuryRefreshTokenService,
			com.stripe.StripeClient stripeClient) {
		this.premiumRegistrationCheckoutService = premiumRegistrationCheckoutService;
		this.materializationService = materializationService;
		this.billingNotificationService = billingNotificationService;
		this.consumerProfileRepository = consumerProfileRepository;
		this.studioGroupRepository = studioGroupRepository;
		this.salonOwnerRoleAlignmentService = salonOwnerRoleAlignmentService;
		this.luxuryRefreshTokenService = luxuryRefreshTokenService;
		this.stripeClient = stripeClient;
	}

	@Transactional
	public PremiumRegistrationCompletionResult confirmRegistrationCheckout(
			String sessionId,
			String checkoutToken,
			HttpServletRequest request) {
		if (sessionId == null || sessionId.isBlank()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_SESSION", "Sessione checkout mancante.");
		}
		PendingRegistration pending = premiumRegistrationCheckoutService.resolvePendingByCheckoutToken(checkoutToken);
		try {
			Session session = stripeClient.checkout().sessions().retrieve(sessionId.trim());
			if (!pending.getId().toString().equals(session.getClientReferenceId())) {
				throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Sessione checkout non valida.");
			}
			if (!"complete".equalsIgnoreCase(session.getStatus())) {
				throw new BusinessException(
						HttpStatus.BAD_REQUEST,
						"CHECKOUT_INCOMPLETE",
						"Il pagamento non risulta completato.");
			}
			UUID studioGroupId = studioGroupRepository.findByOwnerEmailIgnoreCase(pending.getEmail())
					.map(group -> group.getId())
					.orElseGet(
							() -> materializationService.materializePaidPremiumRegistration(
									pending.getId(),
									session.getCustomer(),
									session.getSubscription()));
			billingNotificationService.onCheckoutSessionCompleted(session, studioGroupId);
			ConsumerProfile profile = consumerProfileRepository
					.findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByCreatedAtDesc(
							pending.getEmail().trim().toLowerCase(Locale.ROOT))
					.orElseThrow(
							() -> new BusinessException(
									HttpStatus.INTERNAL_SERVER_ERROR,
									"PROFILE_NOT_FOUND",
									"Registrazione completata ma profilo non trovato."));
			salonOwnerRoleAlignmentService.alignAfterSuccessfulPasswordLogin(profile);
			ConsumerProfile forToken = consumerProfileRepository.findById(profile.getId()).orElse(profile);
			LuxuryRefreshTokenService.RefreshTokenPair tokens =
					luxuryRefreshTokenService.issueForProfile(forToken, request);
			return new PremiumRegistrationCompletionResult(
					"Pagamento completato. Il tuo salone Premium è attivo.",
					tokens.accessToken(),
					tokens.refreshToken(),
					tokens.expiresInSeconds(),
					"/account/salone");
		}
		catch (StripeException ex) {
			throw new BusinessException(HttpStatus.BAD_GATEWAY, "STRIPE_ERROR", "Impossibile verificare il pagamento Stripe.");
		}
	}

	public record PremiumRegistrationCompletionResult(
			String message,
			String accessToken,
			String refreshToken,
			long expiresInSeconds,
			String nextPath) {
	}
}
