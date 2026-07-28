package it.luxury.consumer.service;

import it.luxury.billing.service.BillingRegistrationPlanPolicy;
import it.luxury.catalog.domain.StaffOperatorRepository;
import it.luxury.common.api.BusinessException;
import it.luxury.config.LuxuryRegistrationProperties;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.publicapi.dto.ConsumerRegistrationRequest;
import it.luxury.publicapi.dto.RegistrationSalonLocation;
import it.luxury.security.auth.LuxuryUserPrincipal;
import it.luxury.studio.domain.SalonBusinessType;
import it.luxury.studio.domain.SalonClientGender;
import it.luxury.studio.domain.StudioGroupRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class LuxuryAccountRegistrationService {

	private final ConsumerProfileRepository consumerProfileRepository;
	private final LuxuryRegistrationProperties registrationProperties;
	private final LuxuryRegistrationCompletionService registrationCompletionService;
	private final LuxuryPendingRegistrationService pendingRegistrationService;
	private final PasswordEncoder passwordEncoder;
	private final BillingRegistrationPlanPolicy billingRegistrationPlanPolicy;
	private final StaffOperatorRepository staffOperatorRepository;
	private final StudioGroupRepository studioGroupRepository;

	public LuxuryAccountRegistrationService(
			ConsumerProfileRepository consumerProfileRepository,
			LuxuryRegistrationProperties registrationProperties,
			LuxuryRegistrationCompletionService registrationCompletionService,
			LuxuryPendingRegistrationService pendingRegistrationService,
			PasswordEncoder passwordEncoder,
			BillingRegistrationPlanPolicy billingRegistrationPlanPolicy,
			StaffOperatorRepository staffOperatorRepository,
			StudioGroupRepository studioGroupRepository) {
		this.consumerProfileRepository = consumerProfileRepository;
		this.registrationProperties = registrationProperties;
		this.registrationCompletionService = registrationCompletionService;
		this.pendingRegistrationService = pendingRegistrationService;
		this.passwordEncoder = passwordEncoder;
		this.billingRegistrationPlanPolicy = billingRegistrationPlanPolicy;
		this.staffOperatorRepository = staffOperatorRepository;
		this.studioGroupRepository = studioGroupRepository;
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
		boolean grantAdmin = bootstrapSuperAdmin && registrationCompletionService.mayBootstrapPlatformSuperAdmin();
		if (shouldDeferUntilEmailConfirmed(grantAdmin)) {
			pendingRegistrationService.queueClientRegistration(
					email,
					password,
					firstName,
					lastName,
					country,
					phone,
					bootstrapSuperAdmin,
					legalDocumentVersion);
			return;
		}
		registrationCompletionService.completeClientRegistration(
				email,
				passwordEncoder.encode(password),
				firstName,
				lastName,
				new PendingClientRegistrationPayload(
						firstName,
						lastName,
						country,
						phone,
						bootstrapSuperAdmin,
						legalDocumentVersion));
	}

	@Transactional(readOnly = true)
	public boolean isClientSuperAdminBootstrapAvailable() {
		return registrationCompletionService.mayBootstrapPlatformSuperAdmin();
	}

	/**
	 * Registrazione salone da form pubblico: in attesa di email se nuovo titolare; promozione immediata se cliente già verificato.
	 */
	@Transactional
	public SalonPartnerRegistrationOutcome registerSalonPartner(
			ConsumerRegistrationRequest body,
			String provisionPlan,
			RegistrationSalonLocation salon,
			java.util.List<SalonBusinessType> businessTypes,
			java.util.List<SalonClientGender> clientGenders) {
		String norm = normalizeEmail(body.email());
		var existing = consumerProfileRepository.findByEmailIgnoreCase(norm);
		PendingSalonRegistrationPayload payload = toSalonPayload(body, provisionPlan, salon, businessTypes, clientGenders);
		boolean premiumCheckoutRequired =
				billingRegistrationPlanPolicy.billingCheckoutRequiredForPremiumRegistration(provisionPlan);

		if (existing.isPresent() && existing.get().getDeletedAt() == null) {
			ConsumerProfile profile = existing.get();
			if (profile.getEmailVerifiedAt() == null) {
				throw new BusinessException(
						HttpStatus.CONFLICT,
						"EMAIL_NOT_VERIFIED",
						"Esiste già una registrazione non confermata per questa email. Controlla la posta o richiedi un nuovo invio.");
			}
			registrationCompletionService.assertMayPromoteVerifiedProfileToSalonOwner(profile);
			if (premiumCheckoutRequired) {
				String checkoutToken = pendingRegistrationService.queueSalonRegistrationAwaitingPremiumCheckout(
						body.email(), body.password(), payload);
				return new SalonPartnerRegistrationOutcome(false, checkoutToken);
			}
			registrationCompletionService.completeSalonRegistration(
					norm, passwordEncoder.encode(body.password()), payload);
			return new SalonPartnerRegistrationOutcome(false);
		}

		if (premiumCheckoutRequired) {
			if (shouldDeferUntilEmailConfirmed(false)) {
				pendingRegistrationService.queueSalonRegistration(body.email(), body.password(), payload);
				return new SalonPartnerRegistrationOutcome(true);
			}
			String checkoutToken = pendingRegistrationService.queueSalonRegistrationAwaitingPremiumCheckout(
					body.email(), body.password(), payload);
			return new SalonPartnerRegistrationOutcome(false, checkoutToken);
		}
		if (shouldDeferUntilEmailConfirmed(false)) {
			pendingRegistrationService.queueSalonRegistration(
					body.email(),
					body.password(),
					payload);
			return new SalonPartnerRegistrationOutcome(true);
		}
		registrationCompletionService.completeSalonRegistration(
				norm,
				passwordEncoder.encode(body.password()),
				payload);
		return new SalonPartnerRegistrationOutcome(false);
	}

	/** Account operatore salone ({@code STAFF}), creato dal titolare — verifica email non richiesta. */
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
		Optional<ConsumerProfile> existing =
				consumerProfileRepository.findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByCreatedAtDesc(norm);
		if (existing.isPresent()) {
			return promoteExistingProfileToStaff(existing.get(), password, firstName, lastName);
		}
		String sub = UUID.randomUUID().toString();
		ConsumerProfile p = new ConsumerProfile(sub, norm, displayName(firstName, lastName));
		p.setPasswordHash(passwordEncoder.encode(password));
		p.setSecurityRoles("STAFF");
		p.setEmailVerifiedAt(Instant.now());
		ConsumerProfile saved = consumerProfileRepository.save(p);
		consumerProfileRepository.flush();
		return saved;
	}

	@Transactional
	public String registerSalonOwnerImmediate(
			String email,
			String password,
			String firstName,
			String lastName,
			String phone,
			String planTier,
			String legalDocumentVersion,
			String dpaDocumentVersion) {
		return registrationCompletionService.completeSalonOwnerProfileOnly(
				email,
				passwordEncoder.encode(password),
				firstName,
				lastName,
				phone,
				planTier,
				legalDocumentVersion,
				dpaDocumentVersion);
	}

	private ConsumerProfile promoteExistingProfileToStaff(
			ConsumerProfile profile, String password, String firstName, String lastName) {
		var roles = LuxuryUserPrincipal.parseRoleStrings(profile.getSecurityRoles());
		if (roles.contains("ADMIN")) {
			throw new BusinessException(
					HttpStatus.CONFLICT,
					"EMAIL_ALREADY_REGISTERED",
					"Esiste già un account con questa email.");
		}
		if (roles.contains("OWNER")
				&& studioGroupRepository.findByOwnerEmailIgnoreCase(profile.getEmail()).isPresent()) {
			throw new BusinessException(
					HttpStatus.CONFLICT,
					"SALON_OWNER_REGISTRATION_FORBIDDEN",
					"Questa email appartiene a un titolare salone. Usa un'altra email per lo staff.");
		}
		if (profile.getId() != null && staffOperatorRepository.findByConsumerProfile_Id(profile.getId()).isPresent()) {
			throw new BusinessException(
					HttpStatus.CONFLICT,
					"EMAIL_ALREADY_REGISTERED",
					"Esiste già un account staff collegato con questa email.");
		}
		profile.setPasswordHash(passwordEncoder.encode(password));
		profile.setSecurityRoles(ensureStaffRole(profile.getSecurityRoles()));
		profile.setEmailVerifiedAt(Instant.now());
		String name = displayName(firstName, lastName);
		if (name != null) {
			profile.setDisplayName(name);
		}
		ConsumerProfile saved = consumerProfileRepository.save(profile);
		consumerProfileRepository.flush();
		return saved;
	}

	private static String ensureStaffRole(String securityRoles) {
		Set<String> roles = new LinkedHashSet<>(LuxuryUserPrincipal.parseRoleStrings(securityRoles));
		roles.add("STAFF");
		return String.join(",", roles);
	}

	private boolean shouldDeferUntilEmailConfirmed(boolean grantAdminImmediate) {
		return registrationProperties.isEmailVerificationRequired() && !grantAdminImmediate;
	}

	private static PendingSalonRegistrationPayload toSalonPayload(
			ConsumerRegistrationRequest body,
			String provisionPlan,
			RegistrationSalonLocation salon,
			java.util.List<SalonBusinessType> businessTypes,
			java.util.List<SalonClientGender> clientGenders) {
		return new PendingSalonRegistrationPayload(
				body.firstName(),
				body.lastName(),
				body.phone(),
				provisionPlan,
				body.salonName(),
				salon.addressLine1(),
				salon.postalCode(),
				salon.city(),
				salon.province(),
				salon.country(),
				businessTypes.stream().map(Enum::name).toList(),
				clientGenders.stream().map(Enum::name).toList(),
				body.legalDocumentVersion(),
				body.dpaDocumentVersion(),
				body.billingDetails());
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
}
