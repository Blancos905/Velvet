package it.luxury.security.auth;

import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.notification.service.AccountLifecycleEmailDispatchService;
import it.luxury.security.audit.SecurityAuditService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;

/**
 * Dopo login password riuscito: registra fingerprint browser e invia email se è un dispositivo nuovo
 * (non al primo login del profilo — evita rumore post-registrazione).
 */
@Service
public class LoginDeviceAlertService {

	private static final Logger log = LoggerFactory.getLogger(LoginDeviceAlertService.class);

	private final LoginDeviceFingerprintRepository fingerprintRepository;
	private final AccountLifecycleEmailDispatchService accountLifecycleEmailDispatchService;

	public LoginDeviceAlertService(
			LoginDeviceFingerprintRepository fingerprintRepository,
			AccountLifecycleEmailDispatchService accountLifecycleEmailDispatchService) {
		this.fingerprintRepository = fingerprintRepository;
		this.accountLifecycleEmailDispatchService = accountLifecycleEmailDispatchService;
	}

	@Transactional
	public void afterSuccessfulPasswordLogin(ConsumerProfile profile, HttpServletRequest request) {
		if (profile == null || profile.getId() == null) {
			return;
		}
		String userAgent = request != null ? request.getHeader("User-Agent") : null;
		String ip = request != null ? SecurityAuditService.clientIp(request) : null;
		String summary = summarizeUserAgent(userAgent);
		String hash = fingerprintHash(userAgent);

		var existing = fingerprintRepository.findByProfileIdAndFingerprintHash(profile.getId(), hash);
		if (existing.isPresent()) {
			LoginDeviceFingerprint row = existing.get();
			row.touch(summary, truncate(ip, 64));
			fingerprintRepository.save(row);
			return;
		}

		long knownCount = fingerprintRepository.countByProfileId(profile.getId());
		LoginDeviceFingerprint neu = new LoginDeviceFingerprint(
				profile.getId(), hash, summary, truncate(ip, 64));
		fingerprintRepository.save(neu);

		if (knownCount == 0) {
			log.debug("Primo fingerprint login registrato profileId={} (nessuna email)", profile.getId());
			return;
		}

		try {
			accountLifecycleEmailDispatchService.dispatchNewDeviceLogin(
					profile.getEmail(),
					profile.getDisplayName(),
					summary,
					ip != null ? ip : "sconosciuto");
		}
		catch (Exception ex) {
			log.warn("Email nuovo dispositivo non inviata profileId={}: {}", profile.getId(), ex.getMessage());
		}
	}

	static String fingerprintHash(String userAgent) {
		String normalized = userAgent != null ? userAgent.trim().toLowerCase(Locale.ROOT) : "";
		if (normalized.isEmpty()) {
			normalized = "unknown";
		}
		try {
			MessageDigest md = MessageDigest.getInstance("SHA-256");
			byte[] dig = md.digest(normalized.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(dig);
		}
		catch (NoSuchAlgorithmException ex) {
			throw new IllegalStateException("SHA-256 non disponibile", ex);
		}
	}

	static String summarizeUserAgent(String userAgent) {
		if (userAgent == null || userAgent.isBlank()) {
			return "Browser o app sconosciuti";
		}
		String ua = userAgent.trim();
		String lower = ua.toLowerCase(Locale.ROOT);
		String browser;
		if (lower.contains("edg/")) {
			browser = "Microsoft Edge";
		}
		else if (lower.contains("chrome/") && !lower.contains("chromium")) {
			browser = "Chrome";
		}
		else if (lower.contains("firefox/")) {
			browser = "Firefox";
		}
		else if (lower.contains("safari/") && !lower.contains("chrome")) {
			browser = "Safari";
		}
		else if (lower.contains("luxury") || lower.contains("flutter") || lower.contains("wv")) {
			browser = "App Saloni Luxury";
		}
		else {
			browser = "Browser";
		}
		String os;
		if (lower.contains("iphone") || lower.contains("ipad") || lower.contains("ios")) {
			os = "iOS";
		}
		else if (lower.contains("android")) {
			os = "Android";
		}
		else if (lower.contains("mac os") || lower.contains("macintosh")) {
			os = "macOS";
		}
		else if (lower.contains("windows")) {
			os = "Windows";
		}
		else if (lower.contains("linux")) {
			os = "Linux";
		}
		else {
			os = "dispositivo";
		}
		return truncate(browser + " · " + os, 256);
	}

	private static String truncate(String value, int max) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
	}
}
