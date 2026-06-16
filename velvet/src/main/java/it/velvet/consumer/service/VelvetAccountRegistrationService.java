package it.velvet.consumer.service;

import it.velvet.admin.domain.PlatformSuperAdminCredential;
import it.velvet.admin.domain.PlatformSuperAdminCredentialRepository;
import it.velvet.common.api.BusinessException;
import it.velvet.config.VelvetSuperAdminProperties;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Service
public class VelvetAccountRegistrationService {

	private final ConsumerProfileRepository consumerProfileRepository;
	private final PlatformSuperAdminCredentialRepository platformSuperAdminCredentialRepository;
	private final VelvetSuperAdminProperties superAdminProperties;
	private final PasswordEncoder passwordEncoder;

	public VelvetAccountRegistrationService(
			ConsumerProfileRepository consumerProfileRepository,
			PlatformSuperAdminCredentialRepository platformSuperAdminCredentialRepository,
			VelvetSuperAdminProperties superAdminProperties,
			PasswordEncoder passwordEncoder) {
		this.consumerProfileRepository = consumerProfileRepository;
		this.platformSuperAdminCredentialRepository = platformSuperAdminCredentialRepository;
		this.superAdminProperties = superAdminProperties;
		this.passwordEncoder = passwordEncoder;
	}

	@Transactional
	public void registerBookingClient(
			String email,
			String password,
			String firstName,
			String lastName,
			String country,
			String phone,
			boolean bootstrapSuperAdmin,
			String legalDocumentVersion) {
		String norm = normalizeEmail(email);
		if (consumerProfileRepository.findByEmailIgnoreCase(norm).isPresent()) {
			throw new BusinessException(HttpStatus.CONFLICT, "EMAIL_ALREADY_REGISTERED", "Esiste già un account con questa email.");
		}
		String sub = UUID.randomUUID().toString();
		ConsumerProfile p = new ConsumerProfile(sub, norm, displayName(firstName, lastName));
		p.setPasswordHash(passwordEncoder.encode(password));
		boolean grantAdmin = bootstrapSuperAdmin && mayBootstrapPlatformSuperAdmin();
		p.setSecurityRoles(grantAdmin ? "ADMIN,CLIENT" : "CLIENT");
		if (phone != null && !phone.isBlank()) {
			p.setPhone(phone.trim());
		}
		p.setCountry(normalizeCountryCode(country));
		applyLegalAcceptance(p, legalDocumentVersion);
		consumerProfileRepository.save(p);
		if (grantAdmin) {
			platformSuperAdminCredentialRepository.save(new PlatformSuperAdminCredential(norm, p.getPasswordHash()));
		}
	}

	private boolean mayBootstrapPlatformSuperAdmin() {
		if (platformSuperAdminCredentialRepository.existsById(PlatformSuperAdminCredential.SINGLETON_ID)) {
			return false;
		}
		if (superAdminProperties.configured()) {
			return false;
		}
		return consumerProfileRepository.countActiveWithRole("ADMIN") == 0;
	}

	/** Stesso criterio usato da {@code /registrati?superadmin=1}: mostrare il CTA solo se la registrazione può effettivamente creare il super admin. */
	@Transactional(readOnly = true)
	public boolean isClientSuperAdminBootstrapAvailable() {
		return mayBootstrapPlatformSuperAdmin();
	}

	/**
	 * Crea titolare salone (solo {@code OWNER}, mai {@code CLIENT}) o, se l’email esiste già, promuove il profilo a
	 * titolare (rimuove {@code CLIENT}, assicura {@code OWNER}) e aggiorna la password.
	 *
	 * @return subject stabile ({@code consumer_profiles.keycloak_sub}) per correlare {@code studio_groups.owner_keycloak_sub}
	 */
	@Transactional
	public String registerSalonOwner(
			String email,
			String password,
			String firstName,
			String lastName,
			String phone,
			String planTier,
			String legalDocumentVersion) {
		String norm = normalizeEmail(email);
		var existing = consumerProfileRepository.findByEmailIgnoreCase(norm);
		if (existing.isPresent()) {
			ConsumerProfile p = existing.get();
			if (p.getDeletedAt() != null) {
				throw new BusinessException(HttpStatus.CONFLICT, "EMAIL_ALREADY_REGISTERED", "Esiste già un account con questa email.");
			}
			p.setSecurityRoles(SalonOwnerProfileRoles.applySalonDirectoryTitolare(p.getSecurityRoles()));
			p.setPasswordHash(passwordEncoder.encode(password));
			p.setPlanTier(planTier);
			if (phone != null && !phone.isBlank()) {
				p.setPhone(phone.trim());
			}
			applyLegalAcceptance(p, legalDocumentVersion);
			consumerProfileRepository.save(p);
			return p.getKeycloakSub();
		}
		String sub = UUID.randomUUID().toString();
		ConsumerProfile p = new ConsumerProfile(sub, norm, displayName(firstName, lastName));
		p.setPasswordHash(passwordEncoder.encode(password));
		p.setSecurityRoles("OWNER");
		p.setPlanTier(planTier);
		if (phone != null && !phone.isBlank()) {
			p.setPhone(phone.trim());
		}
		applyLegalAcceptance(p, legalDocumentVersion);
		consumerProfileRepository.save(p);
		return sub;
	}

	private static void applyLegalAcceptance(ConsumerProfile profile, String legalDocumentVersion) {
		profile.setTermsAcceptedAt(Instant.now());
		if (legalDocumentVersion != null && !legalDocumentVersion.isBlank()) {
			profile.setLegalDocumentVersion(legalDocumentVersion.trim());
		}
	}

	/** Account operatore salone (solo {@code STAFF}), per login e agenda personale. */
	@Transactional
	public ConsumerProfile registerSalonStaffMember(String email, String password, String firstName, String lastName) {
		String norm = normalizeEmail(email);
		if (norm.isEmpty()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Email obbligatoria.");
		}
		if (password == null || password.length() < 8) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"VALIDATION_ERROR",
					"La password deve avere almeno 8 caratteri.");
		}
		if (consumerProfileRepository.findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByCreatedAtDesc(norm).isPresent()) {
			throw new BusinessException(HttpStatus.CONFLICT, "EMAIL_ALREADY_REGISTERED", "Esiste già un account con questa email.");
		}
		String sub = UUID.randomUUID().toString();
		ConsumerProfile p = new ConsumerProfile(sub, norm, displayName(firstName, lastName));
		p.setPasswordHash(passwordEncoder.encode(password));
		p.setSecurityRoles("STAFF");
		ConsumerProfile saved = consumerProfileRepository.save(p);
		consumerProfileRepository.flush();
		return saved;
	}

	private static String normalizeEmail(String email) {
		if (email == null || email.isBlank()) {
			return "";
		}
		return email.trim().toLowerCase(Locale.ROOT);
	}

	private static String displayName(String firstName, String lastName) {
		String f = firstName != null ? firstName.trim() : "";
		String l = lastName != null ? lastName.trim() : "";
		String joined = (f + " " + l).trim();
		return joined.isEmpty() ? null : joined;
	}

	private static String normalizeCountryCode(String country) {
		if (country == null || country.isBlank()) {
			return "IT";
		}
		return country.trim().toUpperCase(Locale.ROOT);
	}
}
