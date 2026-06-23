package it.velvet.consumer.service;

import it.velvet.common.api.BusinessException;
import it.velvet.config.VelvetRegistrationProperties;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.publicapi.dto.ConsumerRegistrationRequest;
import it.velvet.publicapi.dto.RegistrationSalonLocation;
import it.velvet.studio.domain.SalonBusinessType;
import it.velvet.studio.domain.SalonClientGender;
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
	private final VelvetRegistrationProperties registrationProperties;
	private final VelvetRegistrationCompletionService registrationCompletionService;
	private final VelvetPendingRegistrationService pendingRegistrationService;
	private final PasswordEncoder passwordEncoder;

	public VelvetAccountRegistrationService(
			ConsumerProfileRepository consumerProfileRepository,
			VelvetRegistrationProperties registrationProperties,
			VelvetRegistrationCompletionService registrationCompletionService,
			VelvetPendingRegistrationService pendingRegistrationService,
			PasswordEncoder passwordEncoder) {
		this.consumerProfileRepository = consumerProfileRepository;
		this.registrationProperties = registrationProperties;
		this.registrationCompletionService = registrationCompletionService;
		this.pendingRegistrationService = pendingRegistrationService;
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
		if (existing.isPresent()
				&& existing.get().getDeletedAt() == null
				&& existing.get().getEmailVerifiedAt() != null) {
			PendingSalonRegistrationPayload payload = toSalonPayload(body, provisionPlan, salon, businessTypes, clientGenders);
			registrationCompletionService.completeSalonRegistration(norm, passwordEncoder.encode(body.password()), payload);
			return new SalonPartnerRegistrationOutcome(false);
		}
		if (existing.isPresent() && existing.get().getDeletedAt() == null && existing.get().getEmailVerifiedAt() == null) {
			throw new BusinessException(
					HttpStatus.CONFLICT,
					"EMAIL_NOT_VERIFIED",
					"Esiste già una registrazione non confermata per questa email. Controlla la posta o richiedi un nuovo invio.");
		}
		if (shouldDeferUntilEmailConfirmed(false)) {
			pendingRegistrationService.queueSalonRegistration(
					body.email(),
					body.password(),
					toSalonPayload(body, provisionPlan, salon, businessTypes, clientGenders));
			return new SalonPartnerRegistrationOutcome(true);
		}
		registrationCompletionService.completeSalonRegistration(
				norm,
				passwordEncoder.encode(body.password()),
				toSalonPayload(body, provisionPlan, salon, businessTypes, clientGenders));
		return new SalonPartnerRegistrationOutcome(false);
	}

	/** Account operatore salone (solo {@code STAFF}), creato dal titolare — verifica email non richiesta. */
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
			String legalDocumentVersion) {
		return registrationCompletionService.completeSalonOwnerProfileOnly(
				email,
				passwordEncoder.encode(password),
				firstName,
				lastName,
				phone,
				planTier,
				legalDocumentVersion);
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
