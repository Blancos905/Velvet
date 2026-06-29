package it.velvet.consumer.service;

import it.velvet.common.api.BusinessException;
import it.velvet.config.VelvetNotificationProperties;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.Optional;

/**
 * Recupero password: il link viene generato e SOLO LOGGATO sul backend.
 * In questa installazione le email non vengono inviate al di fuori del software, quindi il link è
 * accessibile esclusivamente attraverso il log applicativo (uso amministrativo / supporto).
 */
@Service
public class VelvetPasswordResetService {

	private static final Logger log = LoggerFactory.getLogger(VelvetPasswordResetService.class);

	private final ConsumerProfileRepository consumerProfileRepository;
	private final PasswordEncoder passwordEncoder;
	private final VelvetNotificationProperties notificationProperties;
	private final SecureRandom secureRandom = new SecureRandom();

	public VelvetPasswordResetService(
			ConsumerProfileRepository consumerProfileRepository,
			PasswordEncoder passwordEncoder,
			VelvetNotificationProperties notificationProperties) {
		this.consumerProfileRepository = consumerProfileRepository;
		this.passwordEncoder = passwordEncoder;
		this.notificationProperties = notificationProperties;
	}

	/**
	 * Richiesta recupero: se esiste un account attivo con password, genera token e logga il link.
	 * Comportamento uniforme se l'email non esiste (nessuna fuga di informazioni).
	 */
	@Transactional
	public void requestReset(String rawEmail) {
		String norm = normalizeEmail(rawEmail);
		if (norm == null || norm.isBlank()) {
			return;
		}
		Optional<ConsumerProfile> found =
				consumerProfileRepository.findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByCreatedAtDesc(norm);
		if (found.isEmpty()) {
			log.debug("Password reset richiesto per email senza profilo attivo (norm={})", norm);
			return;
		}
		ConsumerProfile p = found.get();
		if (p.getPasswordHash() == null || p.getPasswordHash().isBlank()) {
			log.debug("Password reset richiesto per profilo senza password locale (id={})", p.getId());
			return;
		}
		String to = p.getEmail();
		if (to == null || to.isBlank()) {
			log.debug("Password reset: profilo id={} senza email salvata — impossibile generare link", p.getId());
			return;
		}
		byte[] raw = new byte[32];
		secureRandom.nextBytes(raw);
		String plainToken = toHex(raw);
		String tokenHash = sha256Hex(plainToken);
		Instant expires = Instant.now().plus(notificationProperties.getPasswordResetTokenTtlMinutes(), ChronoUnit.MINUTES);
		p.setPasswordResetTokenHash(tokenHash);
		p.setPasswordResetExpiresAt(expires);
		consumerProfileRepository.save(p);

		String resetUrl = buildResetUrl(plainToken);
		log.info(
				"[Velvet recupero password] account={} link valido fino a {}: {}",
				to.trim(),
				expires,
				resetUrl);
	}

	@Transactional
	public void confirmReset(String plainToken, String newPassword) {
		if (plainToken == null || plainToken.isBlank() || newPassword == null || newPassword.isBlank()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Dati non validi.");
		}
		String trimmed = plainToken.trim().toLowerCase(Locale.ROOT);
		if (!trimmed.matches("[a-f0-9]{64}")) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "RESET_TOKEN_INVALID", "Il link non è valido o è scaduto. Richiedi un nuovo invio.");
		}
		if (newPassword.length() < 8) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "La nuova password deve avere almeno 8 caratteri.");
		}
		String tokenHash = sha256Hex(trimmed);
		Instant now = Instant.now();
		ConsumerProfile p = consumerProfileRepository
				.findByPasswordResetTokenHashAndPasswordResetExpiresAtAfter(tokenHash, now)
				.orElseThrow(
						() -> new BusinessException(
								HttpStatus.BAD_REQUEST,
								"RESET_TOKEN_INVALID",
								"Il link non è valido o è scaduto. Richiedi un nuovo invio."));
		p.setPasswordHash(passwordEncoder.encode(newPassword));
		p.setPasswordResetTokenHash(null);
		p.setPasswordResetExpiresAt(null);
		consumerProfileRepository.save(p);
	}

	private String buildResetUrl(String plainToken) {
		String base = notificationProperties.getFrontendBaseUrl().replaceAll("/+$", "");
		String path = notificationProperties.getPasswordResetPath();
		path = path.startsWith("/") ? path : "/" + path;
		String enc = URLEncoder.encode(plainToken, StandardCharsets.UTF_8);
		return base + path + "?token=" + enc;
	}

	private static String normalizeEmail(String email) {
		if (email == null || email.isBlank()) {
			return null;
		}
		return email.trim().toLowerCase(Locale.ROOT);
	}

	private static String toHex(byte[] bytes) {
		StringBuilder sb = new StringBuilder(bytes.length * 2);
		for (byte b : bytes) {
			sb.append(Character.forDigit((b >> 4) & 0xF, 16));
			sb.append(Character.forDigit(b & 0xF, 16));
		}
		return sb.toString();
	}

	public static String sha256Hex(String input) {
		try {
			MessageDigest md = MessageDigest.getInstance("SHA-256");
			byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
			return toHex(digest);
		}
		catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException("SHA-256 non disponibile", e);
		}
	}
}
