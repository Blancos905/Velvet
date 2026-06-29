package it.velvet.consumer.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import it.velvet.common.api.BusinessException;
import it.velvet.config.VelvetNotificationProperties;
import it.velvet.config.VelvetRegistrationProperties;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.consumer.domain.PendingRegistration;
import it.velvet.consumer.domain.PendingRegistrationKind;
import it.velvet.consumer.domain.PendingRegistrationRepository;
import it.velvet.notification.service.RegistrationEmailDispatchService;
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
public class VelvetPendingRegistrationService {

	private static final Logger log = LoggerFactory.getLogger(VelvetPendingRegistrationService.class);

	private final PendingRegistrationRepository pendingRegistrationRepository;
	private final ConsumerProfileRepository consumerProfileRepository;
	private final VelvetRegistrationCompletionService registrationCompletionService;
	private final VelvetNotificationProperties notificationProperties;
	private final VelvetRegistrationProperties registrationProperties;
	private final RegistrationEmailDispatchService registrationEmailDispatchService;
	private final PasswordEncoder passwordEncoder;
	private final ObjectMapper objectMapper;
	private final SecureRandom secureRandom = new SecureRandom();

	public VelvetPendingRegistrationService(
			PendingRegistrationRepository pendingRegistrationRepository,
			ConsumerProfileRepository consumerProfileRepository,
			VelvetRegistrationCompletionService registrationCompletionService,
			VelvetNotificationProperties notificationProperties,
			VelvetRegistrationProperties registrationProperties,
			RegistrationEmailDispatchService registrationEmailDispatchService,
			PasswordEncoder passwordEncoder,
			ObjectMapper objectMapper) {
		this.pendingRegistrationRepository = pendingRegistrationRepository;
		this.consumerProfileRepository = consumerProfileRepository;
		this.registrationCompletionService = registrationCompletionService;
		this.notificationProperties = notificationProperties;
		this.registrationProperties = registrationProperties;
		this.registrationEmailDispatchService = registrationEmailDispatchService;
		this.passwordEncoder = passwordEncoder;
		this.objectMapper = objectMapper;
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
		assertMayQueue(email);
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
		assertMayQueue(email);
		savePending(
				email,
				password,
				PendingRegistrationKind.SALON_OWNER,
				payload,
				displayName(payload.firstName(), payload.lastName()));
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
		String tokenHash = VelvetPasswordResetService.sha256Hex(trimmed);
		Instant now = Instant.now();
		Optional<PendingRegistration> pendingOpt = pendingRegistrationRepository
				.findByVerificationTokenHashAndVerificationExpiresAtAfter(tokenHash, now);
		if (pendingOpt.isPresent()) {
			PendingRegistration pending = pendingOpt.get();
			EmailVerificationMaterializationOutcome outcome = materializePending(pending);
			pendingRegistrationRepository.delete(pending);
			log.info(
					"[Velvet conferma email] registrazione completata email={} kind={}",
					pending.getEmail(),
					pending.getKind());
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
		Optional<PendingRegistration> pending = pendingRegistrationRepository.findByEmailIgnoreCase(norm);
		if (pending.isPresent()) {
			issueVerification(pending.get());
			return;
		}
		Optional<ConsumerProfile> profile =
				consumerProfileRepository.findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByCreatedAtDesc(norm);
		if (profile.isEmpty() || profile.get().getEmailVerifiedAt() != null) {
			log.debug("Reinvio conferma email: nessuna registrazione in sospeso (norm={})", norm);
			return;
		}
		if (profile.get().getPasswordHash() == null || profile.get().getPasswordHash().isBlank()) {
			return;
		}
		issueLegacyVerification(profile.get());
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

	private void assertMayQueue(String email) {
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
		log.info("[Velvet conferma email] account legacy verificato email={}", profile.getEmail());
		return EmailVerificationMaterializationOutcome.legacyProfile(profile.getEmail());
	}

	private void issueVerification(PendingRegistration pending) {
		String plainToken = issueTokenOnPending(pending);
		registrationEmailDispatchService.dispatchEmailVerification(
				pending.getEmail(),
				pending.getDisplayName(),
				buildVerificationUrl(pending, plainToken));
	}

	private void issueLegacyVerification(ConsumerProfile profile) {
		byte[] raw = new byte[32];
		secureRandom.nextBytes(raw);
		String plainToken = toHex(raw);
		String tokenHash = VelvetPasswordResetService.sha256Hex(plainToken);
		Instant expires =
				Instant.now().plus(notificationProperties.getEmailVerificationTokenTtlMinutes(), ChronoUnit.MINUTES);
		profile.setEmailVerificationTokenHash(tokenHash);
		profile.setEmailVerificationExpiresAt(expires);
		consumerProfileRepository.save(profile);
		registrationEmailDispatchService.dispatchEmailVerification(
				profile.getEmail(),
				profile.getDisplayName(),
				buildLegacyVerificationUrl(plainToken));
	}

	private String issueTokenOnPending(PendingRegistration pending) {
		byte[] raw = new byte[32];
		secureRandom.nextBytes(raw);
		String plainToken = toHex(raw);
		String tokenHash = VelvetPasswordResetService.sha256Hex(plainToken);
		Instant expires =
				Instant.now().plus(notificationProperties.getEmailVerificationTokenTtlMinutes(), ChronoUnit.MINUTES);
		pending.setVerificationTokenHash(tokenHash);
		pending.setVerificationExpiresAt(expires);
		pendingRegistrationRepository.save(pending);
		return plainToken;
	}

	private String buildLegacyVerificationUrl(String plainToken) {
		String base = notificationProperties.getFrontendBaseUrl().replaceAll("/+$", "");
		String path = notificationProperties.getEmailVerificationPath();
		path = path.startsWith("/") ? path : "/" + path;
		String enc = URLEncoder.encode(plainToken, StandardCharsets.UTF_8);
		return base + path + "?token=" + enc;
	}

	private String buildVerificationUrl(PendingRegistration pending, String plainToken) {
		String base = notificationProperties.getFrontendBaseUrl().replaceAll("/+$", "");
		String path = notificationProperties.getEmailVerificationPath();
		path = path.startsWith("/") ? path : "/" + path;
		String enc = URLEncoder.encode(plainToken, StandardCharsets.UTF_8);
		StringBuilder url = new StringBuilder(base).append(path).append("?token=").append(enc);
		if (pending.getKind() == PendingRegistrationKind.SALON_OWNER) {
			try {
				PendingSalonRegistrationPayload payload =
						objectMapper.readValue(pending.getPayloadJson(), PendingSalonRegistrationPayload.class);
				String plan = payload.provisionPlanTier();
				if (plan != null && !plan.isBlank()) {
					url.append("&plan=").append(URLEncoder.encode(plan.trim(), StandardCharsets.UTF_8));
				}
			}
			catch (JsonProcessingException ex) {
				log.warn("[Velvet conferma email] impossibile allegare planTier al link email={}", pending.getEmail());
			}
		}
		return url.toString();
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
