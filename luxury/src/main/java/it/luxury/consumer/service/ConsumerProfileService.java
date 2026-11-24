package it.luxury.consumer.service;

import it.luxury.admin.service.LuxurySuperAdminAuthService;
import it.luxury.bootstrap.SuperAdminConsumerBootstrap;
import it.luxury.bootstrap.SuperAdminConsumerProfileEnsureService;
import it.luxury.common.api.BusinessException;
import it.luxury.config.LuxuryFrontendBaseUrlResolver;
import it.luxury.config.LuxuryNotificationProperties;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.notification.service.AccountLifecycleEmailDispatchService;
import it.luxury.notification.service.RegistrationEmailAudience;
import it.luxury.notification.service.RegistrationEmailDispatchService;
import it.luxury.security.auth.LuxuryRefreshTokenService;
import it.luxury.security.auth.LuxuryUserPrincipal;
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
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class ConsumerProfileService {

	private final ConsumerProfileRepository consumerProfileRepository;
	private final PasswordEncoder passwordEncoder;
	private final SuperAdminConsumerProfileEnsureService superAdminConsumerProfileEnsureService;
	private static final int MAX_PROFILE_PHOTO_CHARS = 1_500_000;
	private static final Pattern PROFILE_PHOTO_DATA_URL = Pattern.compile(
			"^data:image/(?:jpeg|jpg|png|webp|gif|heic|heif);base64,[A-Za-z0-9+/=]+$",
			Pattern.CASE_INSENSITIVE);

	private static final Set<String> SUPPORTED_LOCALES = Set.of("it", "en", "fr", "de", "es", "pt");

	private final AccountLifecycleEmailDispatchService accountLifecycleEmailDispatchService;
	private final LuxuryRefreshTokenService luxuryRefreshTokenService;
	private final RegistrationEmailDispatchService registrationEmailDispatchService;
	private final LuxuryFrontendBaseUrlResolver frontendBaseUrlResolver;
	private final LuxuryNotificationProperties notificationProperties;
	private final SecureRandom secureRandom = new SecureRandom();

	public ConsumerProfileService(
			ConsumerProfileRepository consumerProfileRepository,
			PasswordEncoder passwordEncoder,
			SuperAdminConsumerProfileEnsureService superAdminConsumerProfileEnsureService,
			AccountLifecycleEmailDispatchService accountLifecycleEmailDispatchService,
			LuxuryRefreshTokenService luxuryRefreshTokenService,
			RegistrationEmailDispatchService registrationEmailDispatchService,
			LuxuryFrontendBaseUrlResolver frontendBaseUrlResolver,
			LuxuryNotificationProperties notificationProperties) {
		this.consumerProfileRepository = consumerProfileRepository;
		this.passwordEncoder = passwordEncoder;
		this.superAdminConsumerProfileEnsureService = superAdminConsumerProfileEnsureService;
		this.accountLifecycleEmailDispatchService = accountLifecycleEmailDispatchService;
		this.luxuryRefreshTokenService = luxuryRefreshTokenService;
		this.registrationEmailDispatchService = registrationEmailDispatchService;
		this.frontendBaseUrlResolver = frontendBaseUrlResolver;
		this.notificationProperties = notificationProperties;
	}

	@Transactional
	public ConsumerProfile requireActiveProfile(LuxuryUserPrincipal principal) {
		if (LuxurySuperAdminAuthService.SUPER_ADMIN_JWT_SUBJECT.equals(principal.getSubject())) {
			superAdminConsumerProfileEnsureService.ensureSuperAdminConsumerProfileExists();
		}
		ConsumerProfile p = resolveProfileForPrincipal(principal);
		if (p.getDeletedAt() != null) {
			throw new BusinessException(HttpStatus.GONE, "ACCOUNT_CLOSED", "Account non più disponibile.");
		}
			boolean dirty = false;
			String email = normalizeEmail(principal.getEmail());
			if (email != null) {
				String existingNorm = normalizeEmail(p.getEmail());
				/* Manteniamo la mail DB come fonte ufficiale (modificabile da profilo).
				   Copiamo dal token solo se il campo è vuoto (bootstrap legacy). */
				if (existingNorm == null) {
					p.setEmail(email);
					dirty = true;
				}
			}
			if ((p.getDisplayName() == null || p.getDisplayName().isBlank()) && email != null && email.contains("@")) {
				p.setDisplayName(email.substring(0, email.indexOf('@')));
				dirty = true;
			}
			if (!dirty) {
				return p;
			}
			return consumerProfileRepository.save(p);
		}

	/**
	 * Preferisce l’id profilo nel JWT ({@code uid}) — allineato alle prenotazioni salvate — con fallback su
	 * {@code auth_sub} per token vecchi o edge case.
	 */
	private ConsumerProfile resolveProfileForPrincipal(LuxuryUserPrincipal principal) {
		UUID profileId = principal.getProfileId();
		if (profileId != null) {
			Optional<ConsumerProfile> byId = consumerProfileRepository.findById(profileId);
			if (byId.isPresent()) {
				return byId.get();
			}
		}
		String lookupSub = resolveAuthSubForRepository(principal.getSubject());
		return consumerProfileRepository.findByAuthSub(lookupSub)
				.orElseThrow(() -> new BusinessException(HttpStatus.UNAUTHORIZED, "PROFILE_NOT_FOUND", "Profilo non trovato."));
	}

	/**
	 * Il JWT super admin usa {@code sub = luxury-super-admin}; la riga {@code consumer_profiles} usa invece il sub
	 * canonico UUID ({@link SuperAdminConsumerBootstrap#SUPER_ADMIN_AUTH_SUB}).
	 */
	private static String resolveAuthSubForRepository(String jwtSubject) {
		if (LuxurySuperAdminAuthService.SUPER_ADMIN_JWT_SUBJECT.equals(jwtSubject)) {
			return SuperAdminConsumerBootstrap.SUPER_ADMIN_AUTH_SUB;
		}
		return jwtSubject;
	}

	private static String normalizeEmail(String email) {
		if (email == null || email.isBlank()) {
			return null;
		}
		return email.trim().toLowerCase(Locale.ROOT);
	}

	public ConsumerProfile getById(java.util.UUID id) {
		return consumerProfileRepository.findById(id)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Profilo non trovato."));
	}

	@Transactional
		public ConsumerProfile updateProfile(
				LuxuryUserPrincipal principal,
				String email,
				String displayName,
				String phone,
				String country,
				String preferredLocale,
				String currentPassword) {
			ConsumerProfile p = requireActiveProfile(principal);
			if (email != null) {
				String normalized = normalizeEmail(email);
				if (normalized == null) {
					throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Email non valida.");
				}
				String current = normalizeEmail(p.getEmail());
				if (current == null || !current.equals(normalized)) {
					assertCurrentPassword(p, currentPassword);
					consumerProfileRepository.findByEmailIgnoreCase(normalized)
							.filter(existing -> !existing.getId().equals(p.getId()))
							.ifPresent(existing -> {
								throw new BusinessException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "Email già in uso.");
							});
					String previousEmail = p.getEmail();
					p.setEmail(normalized);
					p.setEmailVerifiedAt(null);
					issueEmailChangeVerification(p);
					accountLifecycleEmailDispatchService.dispatchEmailChangeNotice(
							previousEmail, p.getDisplayName(), normalized);
				}
			}
			if (displayName != null) {
				p.setDisplayName(plainDisplayName(displayName));
			}
		if (phone != null) {
			p.setPhone(phone);
		}
		if (country != null) {
			String normalized = country.trim().toUpperCase(Locale.ROOT);
			if (!normalized.matches("^[A-Z]{2}$")) {
				throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Paese non valido.");
			}
			p.setCountry(normalized);
		}
			if (preferredLocale != null) {
				String locale = preferredLocale.trim().toLowerCase(Locale.ROOT);
				if (!SUPPORTED_LOCALES.contains(locale)) {
					throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Lingua UI non supportata.");
				}
				p.setPreferredLocale(locale);
			}
			return consumerProfileRepository.save(p);
		}

	/**
	 * {@code photoDataUrl} vuoto azzera l’immagine. Valori non immagine vengono rifiutati senza toccare la foto salvata.
	 */
	@Transactional
	public ConsumerProfile updateProfilePhoto(LuxuryUserPrincipal principal, String photoDataUrl) {
		if (photoDataUrl == null) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Immagine profilo non valida.");
		}
		String normalized = normalizeProfilePhoto(photoDataUrl);
		ConsumerProfile p = requireActiveProfile(principal);
		p.setPhotoDataUrl(normalized);
		return consumerProfileRepository.save(p);
	}

	private static String normalizeProfilePhoto(String raw) {
		String trimmed = raw.trim();
		if (trimmed.isEmpty()) {
			return null;
		}
		if (trimmed.length() > MAX_PROFILE_PHOTO_CHARS || !PROFILE_PHOTO_DATA_URL.matcher(trimmed).matches()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Immagine profilo non valida.");
		}
		return trimmed;
	}

	@Transactional
	public void changePassword(LuxuryUserPrincipal principal, String currentPassword, String newPassword) {
		ConsumerProfile p = requireActiveProfile(principal);
		if (currentPassword == null || currentPassword.isBlank() || newPassword == null || newPassword.isBlank()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Password non valida.");
		}
		if (newPassword.length() < 8) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "La nuova password deve avere almeno 8 caratteri.");
		}
		if (p.getPasswordHash() == null || !passwordEncoder.matches(currentPassword, p.getPasswordHash())) {
			throw new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Password attuale non corretta.");
		}
			p.setPasswordHash(passwordEncoder.encode(newPassword));
			consumerProfileRepository.save(p);
			if (p.getId() != null) {
				luxuryRefreshTokenService.revokeAllForProfile(p.getId());
			}
			accountLifecycleEmailDispatchService.dispatchPasswordChanged(p.getEmail(), p.getDisplayName());
		}

		private void assertCurrentPassword(ConsumerProfile profile, String currentPassword) {
			if (currentPassword == null || currentPassword.isBlank()) {
				throw new BusinessException(
						HttpStatus.BAD_REQUEST,
						"VALIDATION_ERROR",
						"Per cambiare email inserisci la password attuale.");
			}
			if (profile.getPasswordHash() == null || !passwordEncoder.matches(currentPassword, profile.getPasswordHash())) {
				throw new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Password attuale non corretta.");
			}
		}

		private void issueEmailChangeVerification(ConsumerProfile profile) {
			byte[] raw = new byte[32];
			secureRandom.nextBytes(raw);
			String plainToken = toHex(raw);
			profile.setEmailVerificationTokenHash(LuxuryPasswordResetService.sha256Hex(plainToken));
			profile.setEmailVerificationExpiresAt(
					Instant.now().plus(notificationProperties.getEmailVerificationTokenTtlMinutes(), ChronoUnit.MINUTES));
			registrationEmailDispatchService.dispatchEmailVerification(
					profile.getEmail(),
					profile.getDisplayName(),
					buildEmailChangeVerificationUrl(plainToken),
					RegistrationEmailAudience.CLIENT);
		}

		private String buildEmailChangeVerificationUrl(String plainToken) {
			String base = frontendBaseUrlResolver.resolve().replaceAll("/+$", "");
			String path = notificationProperties.getEmailVerificationPath();
			path = path.startsWith("/") ? path : "/" + path;
			String enc = URLEncoder.encode(plainToken.trim().toLowerCase(Locale.ROOT), StandardCharsets.UTF_8);
			return base + path + "?token=" + enc + "&audience=client";
		}

		private static String plainDisplayName(String raw) {
			String stripped = raw.replaceAll("(?i)<[^>]*>", "");
			stripped = stripped.replace("<", "").replace(">", "").trim();
			return stripped;
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
