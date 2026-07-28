package it.luxury.consumer.service;

import it.luxury.billing.service.SalonBillingProfileRegistrationService;
import it.luxury.admin.domain.PlatformSuperAdminCredential;
import it.luxury.admin.domain.PlatformSuperAdminCredentialRepository;
import it.luxury.common.api.BusinessException;
import it.luxury.config.LuxurySuperAdminProperties;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.publicapi.dto.RegistrationSalonLocation;
import it.luxury.publicapi.validation.ConsumerRegistrationValidator;
import it.luxury.studio.domain.SalonBusinessType;
import it.luxury.studio.domain.SalonClientGender;
import it.luxury.studio.domain.StudioGroupRepository;
import it.luxury.studio.service.SalonDirectoryProvisioningService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Crea profili e saloni solo dopo conferma email (o registrazione immediata quando la verifica è disabilitata).
 */
@Service
public class LuxuryRegistrationCompletionService {

	private final ConsumerProfileRepository consumerProfileRepository;
	private final PlatformSuperAdminCredentialRepository platformSuperAdminCredentialRepository;
	private final LuxurySuperAdminProperties superAdminProperties;
	private final SalonDirectoryProvisioningService salonDirectoryProvisioningService;
	private final StudioGroupRepository studioGroupRepository;
	private final SalonBillingProfileRegistrationService salonBillingProfileRegistrationService;

	public LuxuryRegistrationCompletionService(
			ConsumerProfileRepository consumerProfileRepository,
			PlatformSuperAdminCredentialRepository platformSuperAdminCredentialRepository,
			LuxurySuperAdminProperties superAdminProperties,
			SalonDirectoryProvisioningService salonDirectoryProvisioningService,
			StudioGroupRepository studioGroupRepository,
			SalonBillingProfileRegistrationService salonBillingProfileRegistrationService) {
		this.consumerProfileRepository = consumerProfileRepository;
		this.platformSuperAdminCredentialRepository = platformSuperAdminCredentialRepository;
		this.superAdminProperties = superAdminProperties;
		this.salonDirectoryProvisioningService = salonDirectoryProvisioningService;
		this.studioGroupRepository = studioGroupRepository;
		this.salonBillingProfileRegistrationService = salonBillingProfileRegistrationService;
	}

	@Transactional
	public void completeClientRegistration(
			String email,
			String passwordHash,
			String firstName,
			String lastName,
			PendingClientRegistrationPayload payload) {
		String norm = normalizeEmail(email);
		assertNoActiveProfile(norm);

		String sub = UUID.randomUUID().toString();
		ConsumerProfile profile = new ConsumerProfile(sub, norm, displayName(firstName, lastName));
		profile.setPasswordHash(passwordHash);
		boolean grantAdmin = payload.bootstrapSuperAdmin() && mayBootstrapPlatformSuperAdmin();
		profile.setSecurityRoles(grantAdmin ? "ADMIN,CLIENT" : "CLIENT");
		if (payload.phone() != null && !payload.phone().isBlank()) {
			profile.setPhone(payload.phone().trim());
		}
		profile.setCountry(normalizeCountryCode(payload.country()));
		applyLegalAcceptance(profile, payload.legalDocumentVersion());
		profile.setEmailVerifiedAt(Instant.now());
		consumerProfileRepository.save(profile);

		if (grantAdmin) {
			platformSuperAdminCredentialRepository.save(new PlatformSuperAdminCredential(norm, profile.getPasswordHash()));
		}
	}

	@Transactional
	public String completeSalonOwnerProfileOnly(
			String email,
			String passwordHash,
			String firstName,
			String lastName,
			String phone,
			String planTier,
			String legalDocumentVersion,
			String dpaDocumentVersion) {
		String norm = normalizeEmail(email);
		var existing = consumerProfileRepository.findByEmailIgnoreCase(norm);
		if (existing.isPresent()) {
			ConsumerProfile profile = existing.get();
			if (profile.getDeletedAt() != null) {
				throw new BusinessException(
						HttpStatus.CONFLICT,
						"EMAIL_ALREADY_REGISTERED",
						"Esiste già un account con questa email.");
			}
			profile.setSecurityRoles(SalonOwnerProfileRoles.applySalonDirectoryTitolare(profile.getSecurityRoles()));
			profile.setPasswordHash(passwordHash);
			profile.setPlanTier(planTier);
			String name = displayName(firstName, lastName);
			if (name != null) {
				profile.setDisplayName(name);
			}
			if (phone != null && !phone.isBlank()) {
				profile.setPhone(phone.trim());
			}
			applySalonOwnerLegalAcceptance(profile, legalDocumentVersion, dpaDocumentVersion);
			if (profile.getEmailVerifiedAt() == null) {
				profile.setEmailVerifiedAt(Instant.now());
			}
			consumerProfileRepository.save(profile);
			return profile.getAuthSub();
		}
		String ownerSub = UUID.randomUUID().toString();
		ConsumerProfile profile = new ConsumerProfile(ownerSub, norm, displayName(firstName, lastName));
		profile.setPasswordHash(passwordHash);
		profile.setSecurityRoles("OWNER");
		profile.setPlanTier(planTier);
		if (phone != null && !phone.isBlank()) {
			profile.setPhone(phone.trim());
		}
		applySalonOwnerLegalAcceptance(profile, legalDocumentVersion, dpaDocumentVersion);
		profile.setEmailVerifiedAt(Instant.now());
		consumerProfileRepository.save(profile);
		return ownerSub;
	}

	@Transactional
	public void completeSalonRegistration(String email, String passwordHash, PendingSalonRegistrationPayload payload) {
		String norm = normalizeEmail(email);
		String ownerSub = completeSalonOwnerProfileOnly(
				norm,
				passwordHash,
				payload.firstName(),
				payload.lastName(),
				payload.phone(),
				payload.provisionPlanTier(),
				payload.legalDocumentVersion(),
				payload.dpaDocumentVersion());

		List<SalonBusinessType> businessTypes =
				ConsumerRegistrationValidator.normalizeSalonBusinessTypesOrThrow(payload.salonBusinessTypes());
		List<SalonClientGender> clientGenders =
				ConsumerRegistrationValidator.normalizeSalonClientGendersOrThrow(payload.salonClientGenders());
		RegistrationSalonLocation salon = new RegistrationSalonLocation(
				payload.salonAddressLine1(),
				payload.salonPostalCode(),
				payload.salonCity(),
				payload.salonProvince(),
				payload.salonCountry() != null && !payload.salonCountry().isBlank() ? payload.salonCountry() : "IT",
				payload.salonName());
		salonDirectoryProvisioningService.provisionAfterPartnerRegistration(
				norm,
				payload.provisionPlanTier(),
				payload.salonName(),
				salon,
				ownerSub,
				businessTypes,
				clientGenders);
		studioGroupRepository.findByOwnerEmailIgnoreCase(norm).ifPresent(group -> salonBillingProfileRegistrationService
				.applyRegistrationBilling(group.getId(), payload.billing(), norm));
	}

	public void assertEmailAvailableForNewRegistration(String email) {
		String norm = normalizeEmail(email);
		if (norm.isBlank()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Email obbligatoria.");
		}
		var existing = consumerProfileRepository.findByEmailIgnoreCase(norm);
		if (existing.isPresent() && existing.get().getDeletedAt() == null) {
			throw new BusinessException(
					HttpStatus.CONFLICT,
					"EMAIL_ALREADY_REGISTERED",
					"Esiste già un account con questa email.");
		}
	}

	/**
	 * Registrazione salone in coda o upgrade: consente un cliente già verificato sulla stessa email;
	 * blocca staff, titolari con salone attivo e account non verificati.
	 */
	public void assertMayPromoteVerifiedProfileToSalonOwner(String email) {
		String norm = normalizeEmail(email);
		if (norm.isBlank()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Email obbligatoria.");
		}
		var existing = consumerProfileRepository.findByEmailIgnoreCase(norm);
		if (existing.isEmpty() || existing.get().getDeletedAt() != null) {
			return;
		}
		assertMayPromoteVerifiedProfileToSalonOwner(existing.get());
	}

	public void assertMayPromoteVerifiedProfileToSalonOwner(ConsumerProfile profile) {
		if (profile.getDeletedAt() != null) {
			throw new BusinessException(
					HttpStatus.CONFLICT,
					"EMAIL_ALREADY_REGISTERED",
					"Esiste già un account con questa email.");
		}
		if (profile.getEmailVerifiedAt() == null) {
			throw new BusinessException(
					HttpStatus.CONFLICT,
					"EMAIL_NOT_VERIFIED",
					"Esiste già una registrazione non confermata per questa email. Controlla la posta o richiedi un nuovo invio.");
		}
		var roles = it.luxury.security.auth.LuxuryUserPrincipal.parseRoleStrings(profile.getSecurityRoles());
		if (roles.contains("STAFF")) {
			throw new BusinessException(
					HttpStatus.CONFLICT,
					"SALON_OWNER_REGISTRATION_FORBIDDEN",
					"Questo account è collegato a uno staff salone. Usa un'altra email per registrare un salone.");
		}
		if (roles.contains("OWNER") && studioGroupRepository.findByOwnerEmailIgnoreCase(profile.getEmail()).isPresent()) {
			throw new BusinessException(
					HttpStatus.CONFLICT,
					"SALON_ALREADY_REGISTERED",
					"Esiste già un salone registrato con questa email.");
		}
	}

	public boolean mayBootstrapPlatformSuperAdmin() {
		if (platformSuperAdminCredentialRepository.existsById(PlatformSuperAdminCredential.SINGLETON_ID)) {
			return false;
		}
		if (superAdminProperties.configured()) {
			return false;
		}
		return consumerProfileRepository.countActiveWithRole("ADMIN") == 0;
	}

	private void assertNoActiveProfile(String norm) {
		var existing = consumerProfileRepository.findByEmailIgnoreCase(norm);
		if (existing.isPresent() && existing.get().getDeletedAt() == null) {
			throw new BusinessException(
					HttpStatus.CONFLICT,
					"EMAIL_ALREADY_REGISTERED",
					"Esiste già un account con questa email.");
		}
	}

	private static void applyLegalAcceptance(ConsumerProfile profile, String legalDocumentVersion) {
		profile.setTermsAcceptedAt(Instant.now());
		if (legalDocumentVersion != null && !legalDocumentVersion.isBlank()) {
			profile.setLegalDocumentVersion(legalDocumentVersion.trim());
		}
	}

	private static void applySalonOwnerLegalAcceptance(
			ConsumerProfile profile, String legalDocumentVersion, String dpaDocumentVersion) {
		applyLegalAcceptance(profile, legalDocumentVersion);
		profile.setDpaAcceptedAt(Instant.now());
		if (dpaDocumentVersion != null && !dpaDocumentVersion.isBlank()) {
			profile.setDpaDocumentVersion(dpaDocumentVersion.trim());
		}
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
