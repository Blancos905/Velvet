package it.velvet.consumer.service;

import it.velvet.admin.service.VelvetSuperAdminAuthService;
import it.velvet.bootstrap.SuperAdminConsumerBootstrap;
import it.velvet.bootstrap.SuperAdminConsumerProfileEnsureService;
import it.velvet.common.api.BusinessException;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.security.auth.VelvetUserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class ConsumerProfileService {

	private final ConsumerProfileRepository consumerProfileRepository;
	private final PasswordEncoder passwordEncoder;
	private final SuperAdminConsumerProfileEnsureService superAdminConsumerProfileEnsureService;

	public ConsumerProfileService(
			ConsumerProfileRepository consumerProfileRepository,
			PasswordEncoder passwordEncoder,
			SuperAdminConsumerProfileEnsureService superAdminConsumerProfileEnsureService) {
		this.consumerProfileRepository = consumerProfileRepository;
		this.passwordEncoder = passwordEncoder;
		this.superAdminConsumerProfileEnsureService = superAdminConsumerProfileEnsureService;
	}

	@Transactional
	public ConsumerProfile requireActiveProfile(VelvetUserPrincipal principal) {
		if (VelvetSuperAdminAuthService.SUPER_ADMIN_JWT_SUBJECT.equals(principal.getSubject())) {
			superAdminConsumerProfileEnsureService.ensureSuperAdminConsumerProfileExists();
		}
		ConsumerProfile p = resolveProfileForPrincipal(principal);
		if (p.getDeletedAt() != null) {
			throw new BusinessException(HttpStatus.GONE, "ACCOUNT_CLOSED", "Account non più disponibile.");
		}
		String email = normalizeEmail(principal.getEmail());
		if (email != null) {
			String existingNorm = normalizeEmail(p.getEmail());
			/* Manteniamo la mail DB come fonte ufficiale (modificabile da profilo).
			   Copiamo dal token solo se il campo è vuoto (bootstrap legacy). */
			if (existingNorm == null) {
				p.setEmail(email);
			}
		}
		if ((p.getDisplayName() == null || p.getDisplayName().isBlank()) && email != null && email.contains("@")) {
			p.setDisplayName(email.substring(0, email.indexOf('@')));
		}
		return consumerProfileRepository.save(p);
	}

	/**
	 * Preferisce l’id profilo nel JWT ({@code uid}) — allineato alle prenotazioni salvate — con fallback su
	 * {@code keycloak_sub} per token vecchi o edge case.
	 */
	private ConsumerProfile resolveProfileForPrincipal(VelvetUserPrincipal principal) {
		UUID profileId = principal.getProfileId();
		if (profileId != null) {
			Optional<ConsumerProfile> byId = consumerProfileRepository.findById(profileId);
			if (byId.isPresent()) {
				return byId.get();
			}
		}
		String lookupSub = resolveKeycloakSubForRepository(principal.getSubject());
		return consumerProfileRepository.findByKeycloakSub(lookupSub)
				.orElseThrow(() -> new BusinessException(HttpStatus.UNAUTHORIZED, "PROFILE_NOT_FOUND", "Profilo non trovato."));
	}

	/**
	 * Il JWT super admin usa {@code sub = velvet-super-admin}; la riga {@code consumer_profiles} usa invece il sub
	 * canonico UUID ({@link SuperAdminConsumerBootstrap#SUPER_ADMIN_KEYCLOAK_SUB}).
	 */
	private static String resolveKeycloakSubForRepository(String jwtSubject) {
		if (VelvetSuperAdminAuthService.SUPER_ADMIN_JWT_SUBJECT.equals(jwtSubject)) {
			return SuperAdminConsumerBootstrap.SUPER_ADMIN_KEYCLOAK_SUB;
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
			VelvetUserPrincipal principal,
			String email,
			String displayName,
			String phone,
			String country,
			String preferredLocale) {
		ConsumerProfile p = requireActiveProfile(principal);
		if (email != null) {
			String normalized = normalizeEmail(email);
			if (normalized == null) {
				throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Email non valida.");
			}
			consumerProfileRepository.findByEmailIgnoreCase(normalized)
					.filter(existing -> !existing.getId().equals(p.getId()))
					.ifPresent(existing -> {
						throw new BusinessException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "Email già in uso.");
					});
			p.setEmail(normalized);
		}
		if (displayName != null) {
			p.setDisplayName(displayName);
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
			p.setPreferredLocale(preferredLocale);
		}
		return consumerProfileRepository.save(p);
	}

	@Transactional
	public void changePassword(VelvetUserPrincipal principal, String currentPassword, String newPassword) {
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
	}
}
