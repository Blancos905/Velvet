package it.luxury.billing.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import it.luxury.common.api.BusinessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import it.luxury.config.LuxuryNotificationProperties;
import it.luxury.config.LuxuryStripeCheckoutBrandingProperties;
import it.luxury.config.LuxuryStripeProperties;
import it.luxury.consumer.domain.PendingRegistration;
import it.luxury.consumer.domain.PendingRegistrationKind;
import it.luxury.consumer.domain.PendingRegistrationRepository;
import it.luxury.consumer.service.PendingSalonRegistrationPayload;
import it.luxury.consumer.service.LuxuryPasswordResetService;
import it.luxury.billing.config.ConditionalOnStripeBillingOperational;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/** Stripe Checkout per registrazione Premium prima della materializzazione in DB. */
@Service
@ConditionalOnStripeBillingOperational
public class PremiumRegistrationCheckoutService {

	private static final Logger log = LoggerFactory.getLogger(PremiumRegistrationCheckoutService.class);

	private static final long PREMIUM_TRIAL_PERIOD_DAYS = 60L;

	private final LuxuryStripeProperties stripeProperties;
	private final LuxuryStripeCheckoutBrandingProperties checkoutBranding;
	private final LuxuryNotificationProperties notificationProperties;
	private final PendingRegistrationRepository pendingRegistrationRepository;
	private final StripeBillingCustomerSyncService stripeBillingCustomerSyncService;
	private final ObjectMapper objectMapper;
	private final com.stripe.StripeClient stripeClient;

	public PremiumRegistrationCheckoutService(
			LuxuryStripeProperties stripeProperties,
			LuxuryStripeCheckoutBrandingProperties checkoutBranding,
			LuxuryNotificationProperties notificationProperties,
			PendingRegistrationRepository pendingRegistrationRepository,
			StripeBillingCustomerSyncService stripeBillingCustomerSyncService,
			ObjectMapper objectMapper,
			com.stripe.StripeClient stripeClient) {
		this.stripeProperties = stripeProperties;
		this.checkoutBranding = checkoutBranding;
		this.notificationProperties = notificationProperties;
		this.pendingRegistrationRepository = pendingRegistrationRepository;
		this.stripeBillingCustomerSyncService = stripeBillingCustomerSyncService;
		this.objectMapper = objectMapper;
		this.stripeClient = stripeClient;
	}

	@Transactional
	public String createCheckoutSessionUrl(String plainCheckoutToken) {
		requireConfigured();
		PendingRegistration pending = resolvePendingByCheckoutToken(plainCheckoutToken);
		PendingSalonRegistrationPayload payload = readSalonPayload(pending);
		String customerId = stripeBillingCustomerSyncService.ensureCustomerForPendingRegistration(pending, payload);
		String frontendBase = frontendBaseUrl();
		String encodedCheckoutToken = URLEncoder.encode(plainCheckoutToken.trim().toLowerCase(Locale.ROOT), StandardCharsets.UTF_8);
		Map<String, String> metadata = registrationMetadata(pending.getId());
		try {
			Session session = stripeClient.checkout().sessions().create(
					SessionCreateParams.builder()
							.setMode(SessionCreateParams.Mode.SUBSCRIPTION)
							.setCustomer(customerId)
							.setClientReferenceId(pending.getId().toString())
							.addLineItem(
									SessionCreateParams.LineItem.builder()
											.setPrice(stripeProperties.premiumPriceId())
											.setQuantity(1L)
											.build())
							.setSuccessUrl(
									frontendBase
											+ BillingRegistrationPlanPolicy.REGISTRATION_CHECKOUT_SUCCESS_PATH
											+ "?session_id={CHECKOUT_SESSION_ID}&checkout_token="
											+ encodedCheckoutToken)
							.setCancelUrl(
									BillingRegistrationPlanPolicy.registrationCheckoutResumeUrl(
											frontendBase, encodedCheckoutToken))
							.putAllMetadata(metadata)
							.setBrandingSettings(StripeCheckoutBrandingSupport.brandingSettings(checkoutBranding, frontendBase))
							.setCustomText(StripeCheckoutBrandingSupport.customText())
							.setSubscriptionData(
									SessionCreateParams.SubscriptionData.builder()
											.setTrialPeriodDays(PREMIUM_TRIAL_PERIOD_DAYS)
											.putAllMetadata(metadata)
											.build())
							.setBillingAddressCollection(SessionCreateParams.BillingAddressCollection.REQUIRED)
							.setTaxIdCollection(
									SessionCreateParams.TaxIdCollection.builder()
											.setEnabled(true)
											.build())
							.setCustomerUpdate(
									SessionCreateParams.CustomerUpdate.builder()
											.setAddress(SessionCreateParams.CustomerUpdate.Address.AUTO)
											.setName(SessionCreateParams.CustomerUpdate.Name.AUTO)
											.build())
							.build());
			if (session.getUrl() == null || session.getUrl().isBlank()) {
				throw new BusinessException(HttpStatus.BAD_GATEWAY, "STRIPE_ERROR", "Impossibile avviare il pagamento. Riprova tra qualche minuto.");
			}
			return session.getUrl();
		}
		catch (StripeException ex) {
			log.warn(
					"Stripe Checkout registrazione Premium fallito pendingRegistration={}: {}",
					pending.getId(),
					ex.getMessage());
			throw new BusinessException(
					HttpStatus.BAD_GATEWAY,
					"STRIPE_ERROR",
					BillingPaymentUserMessages.checkoutStartFailed(ex));
		}
	}

	@Transactional(readOnly = true)
	public PendingRegistration resolvePendingByCheckoutToken(String plainCheckoutToken) {
		if (plainCheckoutToken == null || plainCheckoutToken.isBlank()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Token checkout mancante.");
		}
		String trimmed = plainCheckoutToken.trim().toLowerCase(Locale.ROOT);
		if (!trimmed.matches("[a-f0-9]{64}")) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"CHECKOUT_TOKEN_INVALID",
					"Link di pagamento non valido o scaduto.");
		}
		String tokenHash = LuxuryPasswordResetService.sha256Hex(trimmed);
		PendingRegistration pending = pendingRegistrationRepository
				.findByCheckoutTokenHashAndCheckoutTokenExpiresAtAfter(tokenHash, Instant.now())
				.orElseThrow(
						() -> new BusinessException(
								HttpStatus.BAD_REQUEST,
								"CHECKOUT_TOKEN_INVALID",
								"Link di pagamento non valido o scaduto."));
		if (pending.getKind() != PendingRegistrationKind.SALON_OWNER || pending.getEmailVerifiedAt() == null) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Registrazione non pronta per il pagamento.");
		}
		return pending;
	}

	private static Map<String, String> registrationMetadata(java.util.UUID pendingRegistrationId) {
		Map<String, String> metadata = new HashMap<>();
		metadata.put("luxury_pending_registration_id", pendingRegistrationId.toString());
		metadata.put("luxury_plan", "PREMIUM");
		metadata.put("luxury_registration_checkout", "true");
		return metadata;
	}

	private PendingSalonRegistrationPayload readSalonPayload(PendingRegistration pending) {
		try {
			return objectMapper.readValue(pending.getPayloadJson(), PendingSalonRegistrationPayload.class);
		}
		catch (JsonProcessingException ex) {
			throw new BusinessException(
					HttpStatus.INTERNAL_SERVER_ERROR,
					"PENDING_REGISTRATION_CORRUPT",
					"Registrazione in sospeso non valida. Ripeti la registrazione.");
		}
	}

	private String frontendBaseUrl() {
		String base = notificationProperties.getFrontendBaseUrl();
		if (base == null || base.isBlank()) {
			throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "BILLING_MISCONFIGURED", "URL frontend non configurato.");
		}
		return base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
	}

	private void requireConfigured() {
		if (!stripeProperties.configured()) {
			throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "BILLING_DISABLED", "Pagamenti non ancora disponibili.");
		}
	}
}
