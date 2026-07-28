package it.luxury.consumer.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import it.luxury.billing.service.BillingRegistrationPlanPolicy;
import it.luxury.common.api.BusinessException;
import it.luxury.config.LuxuryFrontendBaseUrlResolver;
import it.luxury.config.LuxuryNotificationProperties;
import it.luxury.config.LuxuryRegistrationProperties;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.consumer.domain.PendingRegistration;
import it.luxury.consumer.domain.PendingRegistrationKind;
import it.luxury.consumer.domain.PendingRegistrationRepository;
import it.luxury.notification.service.RegistrationEmailAudience;
import it.luxury.notification.service.RegistrationEmailDispatchService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.Optional;

@Service
public class LuxuryPendingRegistrationService {

	private static final Logger log = LoggerFactory.getLogger(LuxuryPendingRegistrationService.class);

	private final PendingRegistrationRepository pendingRegistrationRepository;
	private final ConsumerProfileRepository consumerProfileRepository;
	private final LuxuryRegistrationCompletionService registrationCompletionService;
	private final LuxuryNotificationProperties notificationProperties;
	private final LuxuryFrontendBaseUrlResolver frontendBaseUrlResolver;
	private final LuxuryRegistrationProperties registrationProperties;
	private final RegistrationEmailDispatchService registrationEmailDispatchService;
	private final PasswordEncoder passwordEncoder;
	private final ObjectMapper objectMapper;
	private final BillingRegistrationPlanPolicy billingRegistrationPlanPolicy;
	private final SecureRandom secureRandom = new SecureRandom();

	public LuxuryPendingRegistrationService(
			PendingRegistrationRepository pendingRegistrationRepository,
			ConsumerProfileRepository consumerProfileRepository,
			LuxuryRegistrationCompletionService registrationCompletionService,
			LuxuryNotificationProperties notificationProperties,
			LuxuryFrontendBaseUrlResolver frontendBaseUrlResolver,
			LuxuryRegistrationProperties registrationProperties,
			RegistrationEmailDispatchService registrationEmailDispatchService,
			PasswordEncoder passwordEncoder,
			ObjectMapper objectMapper,
			BillingRegistrationPlanPolicy billingRegistrationPlanPolicy) {
		this.pendingRegistrationRepository = pendingRegistrationRepository;
		this.consumerProfileRepository = consumerProfileRepository;
		this.registrationCompletionService = registrationCompletionService;
		this.notificationProperties = notificationProperties;
		this.frontendBaseUrlResolver = frontendBaseUrlResolver;
		this.registrationProperties = registrationProperties;
		this.registrationEmailDispatchService = registrationEmailDispatchService;
		this.passwordEncoder = passwordEncoder;
		this.objectMapper = objectMapper;
		this.billingRegistrationPlanPolicy = billingRegistrationPlanPolicy;
	}

	@Transactional
	public void queueClientRegistration(
			String email,
			String password,
			String firstName,
			String lastName,
			String country,
			String phone,
			boolean bootstrapSuperAdmin,
			String legalDocumentVersion) {
		assertMayQueue(email, PendingRegistrationKind.CLIENT);
		PendingClientRegistrationPayload payload = new PendingClientRegistrationPayload(
				firstName,
				lastName,
				country,
				phone,
				bootstrapSuperAdmin,
				legalDocumentVersion);
		savePending(email, password, PendingRegistrationKind.CLIENT, payload, displayName(firstName, lastName));
	}

	@Transactional
	public void queueSalonRegistration(String email, String password, PendingSalonRegistrationPayload payload) {
		assertMayQueue(email, PendingRegistrationKind.SALON_OWNER);
		savePending(
				email,
				password,
				PendingRegistrationKind.SALON_OWNER,
				payload,
				displayName(payload.firstName(), payload.lastName()));
	}

	@Transactional
	public String queueSalonRegistrationAwaitingPremiumCheckout(
			String email,
			String password,
			PendingSalonRegistrationPayload payload) {
		assertMayQueue(email, PendingRegistrationKind.SALON_OWNER);
		String norm = normalizeEmail(email);
		String payloadJson = serialize(payload);
		pendingRegistrationRepository.findByEmailIgnoreCase(norm).ifPresent(existing -> {
			pendingRegistrationRepository.delete(existing);
			pendingRegistrationRepository.flush();
		});
		PendingRegistration pending = new PendingRegistration(
				norm,
				passwordEncoder.encode(password),
				PendingRegistrationKind.SALON_OWNER,
				payloadJson,
				displayName(payload.firstName(), payload.lastName()));
		pendingRegistrationRepository.save(pending);
		return issuePremiumCheckoutContinuation(pending);
	}

	@Transactional
	public EmailVerificationMaterializationOutcome confirmAndMaterialize(String plainToken) {
		if (plainToken == null || plainToken.isBlank()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Dati non validi.");
		}
		String trimmed = plainToken.trim().toLowerCase(Locale.ROOT);
		if (!trimmed.matches("[a-f0-9]{64}")) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"EMAIL_VERIFICATION_TOKEN_INVALID",
					"Il link non è valido o è scaduto. Richiedi un nuovo invio.");
		}
		String tokenHash = LuxuryPasswordResetService.sha256Hex(trimmed);
		Instant now = Instant.now();
		Optional<PendingRegistration> pendingOpt = pendingRegistrationRepository
				.findByVerificationTokenHashAndVerificationExpiresAtAfter(tokenHash, now);
		if (pendingOpt.isPresent()) {
			PendingRegistration pending = pendingOpt.get();
			EmailVerificationMaterializationOutcome outcome = confirmPending(pending);
			if (outcome.awaitingPremiumPayment()) {
				clearVerificationToken(pending);
				pendingRegistrationRepository.save(pending);
			}
			else {
				pendingRegistrationRepository.delete(pending);
			}
			log.info(
					"[Luxury conferma email] registrazione completata email={} kind={} awaitingPayment={}",
					pending.getEmail(),
					pending.getKind(),
					outcome.awaitingPremiumPayment());
			return outcome;
		}
		return confirmLegacyConsumerProfile(trimmed, tokenHash, now);
	}

	@Transactional
	public void resendVerification(String rawEmail) {
		if (!registrationProperties.isEmailVerificationRequired()) {
			return;
		}
		String norm = normalizeEmail(rawEmail);
		if (norm == null || norm.isBlank()) {
			return;
		}
		Optional<PendingRegistration> pending = resolvePendingForResend(norm);
		if (pending.isPresent()) {
			resendPendingNotification(pending.get());
			return;
		}
		Optional<ConsumerProfile> profile =
				consumerProfileRepository.findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByCreatedAtDesc(norm);
		if (profile.isEmpty() || profile.get().getEmailVerifiedAt() != null) {
			log.info("Reinvio conferma email: nessuna registrazione in sospeso per email={}", norm);
			return;
		}
		if (profile.get().getPasswordHash() == null || profile.get().getPasswordHash().isBlank()) {
			return;
		}
		issueLegacyVerification(profile.get());
	}

	private Optional<PendingRegistration> resolvePendingForResend(String norm) {
		Optional<PendingRegistration> exact = pendingRegistrationRepository.findByEmailIgnoreCase(norm);
		if (exact.isPresent()) {
			return exact;
		}
		Optional<PendingRegistration> typoMatch = PendingRegistrationEmailTypoSupport.findTypoMatch(pendingRegistrationRepository, norm);
		if (typoMatch.isEmpty()) {
			typoMatch = PendingRegistrationEmailTypoSupport.findSimilarLocalPart(pendingRegistrationRepository, norm);
		}
		if (typoMatch.isEmpty()) {
			return Optional.empty();
		}
		PendingRegistration pending = typoMatch.get();
		if (!norm.equalsIgnoreCase(pending.getEmail())) {
			if (pendingRegistrationRepository.findByEmailIgnoreCase(norm).isPresent()) {
				log.warn(
						"Reinvio email: correzione typo bloccata, esiste già pending per email={} (da {})",
						norm,
						pending.getEmail());
				return Optional.empty();
			}
			log.info("Reinvio email: correzione typo pending {} → {}", pending.getEmail(), norm);
			pending.setEmail(norm);
			pendingRegistrationRepository.save(pending);
		}
		return Optional.of(pending);
	}

	private void resendPendingNotification(PendingRegistration pending) {
		if (pending.getEmailVerifiedAt() != null && isPremiumAwaitingCheckout(pending)) {
			resendPremiumCheckoutEmail(pending);
			return;
		}
		resendVerificationEmail(pending);
	}

	private void resendPremiumCheckoutEmail(PendingRegistration pending) {
		Instant now = Instant.now();
		String plainToken = pending.getCheckoutTokenPlain();
		if (plainToken != null
				&& pending.getCheckoutTokenHash() != null
				&& pending.getCheckoutTokenExpiresAt() != null
				&& pending.getCheckoutTokenExpiresAt().isAfter(now)) {
			pending.setCheckoutTokenExpiresAt(
					now.plus(registrationProperties.getPremiumCheckoutContinuationDays(), ChronoUnit.DAYS));
			pendingRegistrationRepository.save(pending);
			log.info("Reinvio checkout Premium: token ancora valido per email={}, scadenza estesa", pending.getEmail());
			sendPremiumCheckoutEmail(pending, plainToken);
			return;
		}
		log.info("Reinvio checkout Premium: nuovo token per email={}", pending.getEmail());
		String checkoutToken = rotatePremiumCheckoutToken(pending);
		sendPremiumCheckoutEmail(pending, checkoutToken);
	}

	private void sendPremiumCheckoutEmail(PendingRegistration pending, String checkoutToken) {
		registrationEmailDispatchService.dispatchPremiumCheckoutContinuation(
				pending.getEmail(),
				pending.getDisplayName(),
				buildPremiumCheckoutUrl(checkoutToken));
	}

	private static final long REGISTRATION_SYNC_SKEW_MS = 15 * 60 * 1000L;
	private static final long REGISTRATION_SYNC_FUTURE_SKEW_MS = 2 * 60 * 1000L;

	/**
	 * App mobile: la conferma email avviene spesso nel browser di sistema; la WebView resta su «Controlla email».
	 * Restituisce pending già verificato se email e timestamp registrazione coincidono.
	 */
	public Optional<PendingRegistration> findEmailVerifiedPendingForSync(String rawEmail, long registrationAtMs) {
		if (rawEmail == null || rawEmail.isBlank() || registrationAtMs <= 0) {
			return Optional.empty();
		}
		Optional<PendingRegistration> pending = resolvePendingForResend(normalizeEmail(rawEmail));
		if (pending.isEmpty()) {
			return Optional.empty();
		}
		PendingRegistration row = pending.get();
		if (row.getEmailVerifiedAt() == null) {
			return Optional.empty();
		}
		if (!matchesRegistrationSyncWindow(row, registrationAtMs)) {
			return Optional.empty();
		}
		return Optional.of(row);
	}

	public Optional<EmailVerificationMaterializationOutcome> verifiedPremiumCheckoutOutcome(PendingRegistration pending) {
		if (!isPremiumAwaitingCheckout(pending)) {
			return Optional.empty();
		}
		try {
			PendingSalonRegistrationPayload payload =
					objectMapper.readValue(pending.getPayloadJson(), PendingSalonRegistrationPayload.class);
			String checkoutToken = ensurePremiumCheckoutToken(pending);
			return Optional.of(
					new EmailVerificationMaterializationOutcome(
							PendingRegistrationKind.SALON_OWNER,
							pending.getEmail(),
							payload.provisionPlanTier(),
							checkoutToken));
		}
		catch (JsonProcessingException ex) {
			return Optional.empty();
		}
	}

	private boolean matchesRegistrationSyncWindow(PendingRegistration pending, long registrationAtMs) {
		Instant created = pending.getCreatedAt();
		if (created == null) {
			return true;
		}
		long createdMs = created.toEpochMilli();
		if (registrationAtMs + REGISTRATION_SYNC_FUTURE_SKEW_MS < createdMs) {
			return false;
		}
		return registrationAtMs - createdMs <= REGISTRATION_SYNC_SKEW_MS;
	}

	private boolean isPremiumAwaitingCheckout(PendingRegistration pending) {
		if (pending.getKind() != PendingRegistrationKind.SALON_OWNER) {
			return false;
		}
		try {
			PendingSalonRegistrationPayload payload =
					objectMapper.readValue(pending.getPayloadJson(), PendingSalonRegistrationPayload.class);
			return billingRegistrationPlanPolicy.billingCheckoutRequiredForPremiumRegistration(payload.provisionPlanTier());
		}
		catch (JsonProcessingException ex) {
			return false;
		}
	}

	private String buildPremiumCheckoutUrl(String checkoutToken) {
		String base = frontendBaseUrlResolver.resolve();
		return base
				+ BillingRegistrationPlanPolicy.REGISTRATION_CHECKOUT_START_PATH
				+ "?token="
				+ URLEncoder.encode(checkoutToken.trim().toLowerCase(Locale.ROOT), StandardCharsets.UTF_8);
	}

	private EmailVerificationMaterializationOutcome confirmPending(PendingRegistration pending) {
		try {
			if (pending.getKind() == PendingRegistrationKind.CLIENT) {
				return materializePending(pending);
			}
			if (pending.getKind() == PendingRegistrationKind.SALON_OWNER) {
				PendingSalonRegistrationPayload payload =
						objectMapper.readValue(pending.getPayloadJson(), PendingSalonRegistrationPayload.class);
				if (billingRegistrationPlanPolicy.billingCheckoutRequiredForPremiumRegistration(payload.provisionPlanTier())) {
					String checkoutToken = ensurePremiumCheckoutToken(pending);
					return new EmailVerificationMaterializationOutcome(
							PendingRegistrationKind.SALON_OWNER,
							pending.getEmail(),
							payload.provisionPlanTier(),
							checkoutToken);
				}
				return materializePending(pending);
			}
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Registrazione non valida.");
		}
		catch (JsonProcessingException ex) {
			throw new BusinessException(
					HttpStatus.INTERNAL_SERVER_ERROR,
					"PENDING_REGISTRATION_CORRUPT",
					"Registrazione in sospeso non valida. Ripeti la registrazione.");
		}
	}

	private String issuePremiumCheckoutContinuation(PendingRegistration pending) {
		if (pending.getEmailVerifiedAt() == null) {
			pending.setEmailVerifiedAt(Instant.now());
		}
		return rotatePremiumCheckoutToken(pending);
	}

	private String ensurePremiumCheckoutToken(PendingRegistration pending) {
		if (pending.getEmailVerifiedAt() == null) {
			pending.setEmailVerifiedAt(Instant.now());
		}
		Instant now = Instant.now();
		String plainToken = pending.getCheckoutTokenPlain();
		if (plainToken != null
				&& pending.getCheckoutTokenHash() != null
				&& pending.getCheckoutTokenExpiresAt() != null
				&& pending.getCheckoutTokenExpiresAt().isAfter(now)) {
			log.info(
					"[Luxury conferma email] email già confermata per {}, riuso link checkout Premium",
					pending.getEmail());
			if (pending.getEmailVerifiedAt() == null) {
				pending.setEmailVerifiedAt(now);
				pendingRegistrationRepository.save(pending);
			}
			return plainToken;
		}
		return rotatePremiumCheckoutToken(pending);
	}

	private String rotatePremiumCheckoutToken(PendingRegistration pending) {
		byte[] raw = new byte[32];
		secureRandom.nextBytes(raw);
		String plainToken = toHex(raw);
		String tokenHash = LuxuryPasswordResetService.sha256Hex(plainToken);
		Instant expires = Instant.now().plus(registrationProperties.getPremiumCheckoutContinuationDays(), ChronoUnit.DAYS);
		pending.setCheckoutTokenHash(tokenHash);
		pending.setCheckoutTokenPlain(plainToken);
		pending.setCheckoutTokenExpiresAt(expires);
		pendingRegistrationRepository.save(pending);
		return plainToken;
	}

	private EmailVerificationMaterializationOutcome materializePending(PendingRegistration pending) {
		try {
			if (pending.getKind() == PendingRegistrationKind.CLIENT) {
				PendingClientRegistrationPayload payload =
						objectMapper.readValue(pending.getPayloadJson(), PendingClientRegistrationPayload.class);
				registrationCompletionService.completeClientRegistration(
						pending.getEmail(),
						pending.getPasswordHash(),
						payload.firstName(),
						payload.lastName(),
						payload);
				return new EmailVerificationMaterializationOutcome(PendingRegistrationKind.CLIENT, pending.getEmail(), null);
			}
			if (pending.getKind() == PendingRegistrationKind.SALON_OWNER) {
				PendingSalonRegistrationPayload payload =
						objectMapper.readValue(pending.getPayloadJson(), PendingSalonRegistrationPayload.class);
				registrationCompletionService.completeSalonRegistration(
						pending.getEmail(),
						pending.getPasswordHash(),
						payload);
				return new EmailVerificationMaterializationOutcome(
						PendingRegistrationKind.SALON_OWNER,
						pending.getEmail(),
						payload.provisionPlanTier());
			}
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Registrazione non valida.");
		}
		catch (JsonProcessingException ex) {
			throw new BusinessException(
					HttpStatus.INTERNAL_SERVER_ERROR,
					"PENDING_REGISTRATION_CORRUPT",
					"Registrazione in sospeso non valida. Ripeti la registrazione.");
		}
	}

	private void assertMayQueue(String email, PendingRegistrationKind kind) {
		if (kind == PendingRegistrationKind.SALON_OWNER) {
			registrationCompletionService.assertMayPromoteVerifiedProfileToSalonOwner(email);
			return;
		}
		registrationCompletionService.assertEmailAvailableForNewRegistration(email);
	}

	private void savePending(
			String email,
			String password,
			PendingRegistrationKind kind,
			Object payload,
			String displayName) {
		String norm = normalizeEmail(email);
		String payloadJson = serialize(payload);
		pendingRegistrationRepository.findByEmailIgnoreCase(norm).ifPresent(existing -> {
			pendingRegistrationRepository.delete(existing);
			pendingRegistrationRepository.flush();
		});
		PendingRegistration pending =
				new PendingRegistration(norm, passwordEncoder.encode(password), kind, payloadJson, displayName);
		try {
			pendingRegistrationRepository.save(pending);
		}
		catch (DataIntegrityViolationException ex) {
			throw new BusinessException(
					HttpStatus.CONFLICT,
					"EMAIL_ALREADY_IN_USE",
					"Esiste già una registrazione in corso o un account con questa email.");
		}
		issueVerification(pending);
	}

	private String serialize(Object payload) {
		try {
			return objectMapper.writeValueAsString(payload);
		}
		catch (JsonProcessingException ex) {
			throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "SERIALIZATION_ERROR", "Registrazione non riuscita.");
		}
	}

	private EmailVerificationMaterializationOutcome confirmLegacyConsumerProfile(String trimmed, String tokenHash, Instant now) {
		ConsumerProfile profile = consumerProfileRepository
				.findByEmailVerificationTokenHashAndEmailVerificationExpiresAtAfter(tokenHash, now)
				.orElseThrow(
						() -> new BusinessException(
								HttpStatus.BAD_REQUEST,
								"EMAIL_VERIFICATION_TOKEN_INVALID",
								"Il link non è valido o è scaduto. Richiedi un nuovo invio."));
		profile.setEmailVerifiedAt(Instant.now());
		profile.setEmailVerificationTokenHash(null);
		profile.setEmailVerificationExpiresAt(null);
		consumerProfileRepository.save(profile);
		log.info("[Luxury conferma email] account legacy verificato email={}", profile.getEmail());
		return EmailVerificationMaterializationOutcome.legacyProfile(profile.getEmail());
	}

	private void issueVerification(PendingRegistration pending) {
		String plainToken = rotateVerificationToken(pending);
		sendVerificationEmail(pending, plainToken);
	}

	private void resendVerificationEmail(PendingRegistration pending) {
		log.info("Reinvio conferma email: nuovo token per email={}", pending.getEmail());
		issueVerificationResend(pending);
	}

	private void issueVerificationResend(PendingRegistration pending) {
		String plainToken = rotateVerificationToken(pending);
		sendVerificationEmail(pending, plainToken, true);
	}

	private void sendVerificationEmail(PendingRegistration pending, String plainToken) {
		sendVerificationEmail(pending, plainToken, false);
	}

	private void sendVerificationEmail(PendingRegistration pending, String plainToken, boolean resend) {
		registrationEmailDispatchService.dispatchEmailVerification(
				pending.getEmail(),
				pending.getDisplayName(),
				buildVerificationUrl(pending, plainToken),
				RegistrationEmailAudience.forPendingKind(pending.getKind()),
				resend);
	}

	private void issueLegacyVerification(ConsumerProfile profile) {
		byte[] raw = new byte[32];
		secureRandom.nextBytes(raw);
		String plainToken = toHex(raw);
		String tokenHash = LuxuryPasswordResetService.sha256Hex(plainToken);
		Instant expires =
				Instant.now().plus(notificationProperties.getEmailVerificationTokenTtlMinutes(), ChronoUnit.MINUTES);
		profile.setEmailVerificationTokenHash(tokenHash);
		profile.setEmailVerificationExpiresAt(expires);
		consumerProfileRepository.save(profile);
		registrationEmailDispatchService.dispatchEmailVerification(
				profile.getEmail(),
				profile.getDisplayName(),
				buildLegacyVerificationUrl(plainToken),
				RegistrationEmailAudience.CLIENT);
	}

	private String buildVerificationUrl(PendingRegistration pending, String plainToken) {
		String base = frontendBaseUrlResolver.resolve().replaceAll("/+$", "");
		String path = notificationProperties.getEmailVerificationPath();
		path = path.startsWith("/") ? path : "/" + path;
		String enc = URLEncoder.encode(plainToken.trim().toLowerCase(Locale.ROOT), StandardCharsets.UTF_8);
		StringBuilder url = new StringBuilder(base).append(path).append("?token=").append(enc);
		if (pending.getKind() == PendingRegistrationKind.SALON_OWNER) {
			url.append("&audience=").append(URLEncoder.encode("salon", StandardCharsets.UTF_8));
			try {
				PendingSalonRegistrationPayload payload =
						objectMapper.readValue(pending.getPayloadJson(), PendingSalonRegistrationPayload.class);
				String plan = payload.provisionPlanTier();
				if (plan != null && !plan.isBlank()) {
					url.append("&plan=").append(URLEncoder.encode(plan.trim(), StandardCharsets.UTF_8));
				}
			}
			catch (JsonProcessingException ex) {
				log.warn("[Luxury conferma email] impossibile allegare planTier al link email={}", pending.getEmail());
			}
		}
		else if (pending.getKind() == PendingRegistrationKind.CLIENT) {
			url.append("&audience=").append(URLEncoder.encode("client", StandardCharsets.UTF_8));
		}
		return url.toString();
	}

	private String buildLegacyVerificationUrl(String plainToken) {
		String base = frontendBaseUrlResolver.resolve().replaceAll("/+$", "");
		String path = notificationProperties.getEmailVerificationPath();
		path = path.startsWith("/") ? path : "/" + path;
		String enc = URLEncoder.encode(plainToken.trim().toLowerCase(Locale.ROOT), StandardCharsets.UTF_8);
		return base
				+ path
				+ "?token="
				+ enc
				+ "&audience="
				+ URLEncoder.encode("client", StandardCharsets.UTF_8);
	}

	private String issueTokenOnPending(PendingRegistration pending) {
		return rotateVerificationToken(pending);
	}

	private String rotateVerificationToken(PendingRegistration pending) {
		byte[] raw = new byte[32];
		secureRandom.nextBytes(raw);
		String plainToken = toHex(raw);
		String tokenHash = LuxuryPasswordResetService.sha256Hex(plainToken);
		Instant expires =
				Instant.now().plus(notificationProperties.getEmailVerificationTokenTtlMinutes(), ChronoUnit.MINUTES);
		pending.setVerificationTokenHash(tokenHash);
		pending.setVerificationTokenPlain(plainToken);
		pending.setVerificationExpiresAt(expires);
		pendingRegistrationRepository.save(pending);
		return plainToken;
	}

	private static void clearVerificationToken(PendingRegistration pending) {
		pending.setVerificationTokenHash(null);
		pending.setVerificationTokenPlain(null);
		pending.setVerificationExpiresAt(null);
	}

	private static String normalizeEmail(String email) {
		if (email == null || email.isBlank()) {
			return null;
		}
		return email.trim().toLowerCase(Locale.ROOT);
	}

	private static String displayName(String firstName, String lastName) {
		String f = firstName != null ? firstName.trim() : "";
		String l = lastName != null ? lastName.trim() : "";
		String joined = (f + " " + l).trim();
		return joined.isEmpty() ? null : joined;
	}

	private static String toHex(byte[] bytes) {
		StringBuilder sb = new StringBuilder(bytes.length * 2);
		for (byte b : bytes) {
			sb.append(Character.forDigit((b >> 4) & 0xF, 16));
			sb.append(Character.forDigit(b & 0xF, 16));
		}
		return sb.toString();
	}
}
