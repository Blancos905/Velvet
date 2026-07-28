package it.luxury.consumer.service;

import it.luxury.billing.service.BillingRegistrationPlanPolicy;
import it.luxury.catalog.domain.StaffOperatorRepository;
import it.luxury.config.LuxuryRegistrationProperties;
import it.luxury.config.LuxurySecurityProperties;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.consumer.domain.PendingRegistration;
import it.luxury.consumer.domain.PendingRegistrationKind;
import it.luxury.security.auth.LuxuryRefreshTokenService;
import it.luxury.security.auth.LuxuryUserPrincipal;
import it.luxury.studio.domain.StudioGroup;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Optional;

/**
 * Conferma email registrazione: materializza {@code pending_registrations} oppure profili legacy non verificati.
 */
@Service
public class LuxuryEmailVerificationService {

	private final LuxuryPendingRegistrationService pendingRegistrationService;
	private final LuxuryRegistrationProperties registrationProperties;
	private final ConsumerProfileRepository consumerProfileRepository;
	private final SalonOwnerRoleAlignmentService salonOwnerRoleAlignmentService;
	private final LuxuryRefreshTokenService luxuryRefreshTokenService;
	private final LuxurySecurityProperties securityProperties;
	private final BillingRegistrationPlanPolicy billingRegistrationPlanPolicy;
	private final StaffOperatorRepository staffOperatorRepository;

	public LuxuryEmailVerificationService(
			LuxuryPendingRegistrationService pendingRegistrationService,
			LuxuryRegistrationProperties registrationProperties,
			ConsumerProfileRepository consumerProfileRepository,
			SalonOwnerRoleAlignmentService salonOwnerRoleAlignmentService,
			LuxuryRefreshTokenService luxuryRefreshTokenService,
			LuxurySecurityProperties securityProperties,
			BillingRegistrationPlanPolicy billingRegistrationPlanPolicy,
			StaffOperatorRepository staffOperatorRepository) {
		this.pendingRegistrationService = pendingRegistrationService;
		this.registrationProperties = registrationProperties;
		this.consumerProfileRepository = consumerProfileRepository;
		this.salonOwnerRoleAlignmentService = salonOwnerRoleAlignmentService;
		this.luxuryRefreshTokenService = luxuryRefreshTokenService;
		this.securityProperties = securityProperties;
		this.billingRegistrationPlanPolicy = billingRegistrationPlanPolicy;
		this.staffOperatorRepository = staffOperatorRepository;
	}

	@Transactional
	public EmailVerificationConfirmResult confirmVerification(String plainToken, HttpServletRequest request) {
		EmailVerificationMaterializationOutcome outcome = pendingRegistrationService.confirmAndMaterialize(plainToken);
		if (outcome.kind() == PendingRegistrationKind.SALON_OWNER) {
			if (outcome.awaitingPremiumPayment()) {
				return new EmailVerificationConfirmResult(
						"Email confermata. Completa il pagamento Premium per attivare il salone.",
						null,
						null,
						0,
						0,
						billingRegistrationPlanPolicy.salonOwnerPostConfirmPath(outcome.salonProvisionPlanTier())
								+ "?token="
								+ outcome.premiumCheckoutToken(),
						outcome.premiumCheckoutToken());
			}
			return issueSalonOwnerSessionAfterConfirm(outcome, request);
		}
		if (outcome.kind() == null && outcome.email() != null && !outcome.email().isBlank()) {
			var legacyOwner = consumerProfileRepository
					.findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByCreatedAtDesc(
							outcome.email().trim().toLowerCase(Locale.ROOT))
					.filter(this::isSalonOwnerProfile);
			if (legacyOwner.isPresent()) {
				String planTier = legacyOwner.get().getPlanTier();
				return issueSalonOwnerSessionAfterConfirm(
						new EmailVerificationMaterializationOutcome(
								PendingRegistrationKind.SALON_OWNER, outcome.email(), planTier),
						request);
			}
		}
		if (outcome.kind() == PendingRegistrationKind.CLIENT) {
			return issueClientSessionAfterConfirm(outcome, request);
		}
		String message = "Email confermata. Ora puoi accedere con le tue credenziali.";
		return issueClientSessionAfterConfirm(outcome.email(), message, request);
	}

	private EmailVerificationConfirmResult issueClientSessionAfterConfirm(
			EmailVerificationMaterializationOutcome outcome,
			HttpServletRequest request) {
		return issueClientSessionAfterConfirm(outcome.email(), "Email confermata. Ora puoi accedere con le tue credenziali.", request);
	}

	private EmailVerificationConfirmResult issueClientSessionAfterConfirm(
			String rawEmail,
			String message,
			HttpServletRequest request) {
		String normEmail = rawEmail != null ? rawEmail.trim().toLowerCase(Locale.ROOT) : "";
		ConsumerProfile profile = consumerProfileRepository
				.findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByCreatedAtDesc(normEmail)
				.orElseThrow(
						() -> new it.luxury.common.api.BusinessException(
								org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
								"PROFILE_NOT_FOUND",
								"Registrazione completata ma profilo non trovato. Accedi con email e password."));
		ConsumerProfile forToken = consumerProfileRepository.findById(profile.getId()).orElse(profile);
		LuxuryRefreshTokenService.RefreshTokenPair tokens =
				luxuryRefreshTokenService.issueForProfile(forToken, request);
		return new EmailVerificationConfirmResult(
				message,
				tokens.accessToken(),
				tokens.refreshToken(),
				tokens.expiresInSeconds(),
				securityProperties.refreshTokenTtlDays(),
				"/");
	}

	private boolean isSalonOwnerProfile(ConsumerProfile profile) {
		return it.luxury.security.auth.LuxuryUserPrincipal.parseRoleStrings(profile.getSecurityRoles()).contains("OWNER");
	}

	private EmailVerificationConfirmResult issueSalonOwnerSessionAfterConfirm(
			EmailVerificationMaterializationOutcome outcome,
			HttpServletRequest request) {
		String normEmail = outcome.email() != null ? outcome.email().trim().toLowerCase(Locale.ROOT) : "";
		ConsumerProfile profile = consumerProfileRepository
				.findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByCreatedAtDesc(normEmail)
				.orElseThrow(
						() -> new it.luxury.common.api.BusinessException(
								org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
								"PROFILE_NOT_FOUND",
								"Registrazione completata ma profilo non trovato. Accedi con email e password."));
		salonOwnerRoleAlignmentService.alignAfterSuccessfulPasswordLogin(profile);
		ConsumerProfile forToken = consumerProfileRepository.findById(profile.getId()).orElse(profile);
		LuxuryRefreshTokenService.RefreshTokenPair tokens =
				luxuryRefreshTokenService.issueForProfile(forToken, request);
		String planTier = StudioGroup.canonicalPlanTier(outcome.salonProvisionPlanTier());
		boolean premium = "PREMIUM".equalsIgnoreCase(planTier);
		boolean checkoutRequired = billingRegistrationPlanPolicy.billingCheckoutRequiredForPremiumRegistration(planTier);
		String nextPath = premium
				? billingRegistrationPlanPolicy.salonOwnerPostConfirmPath(planTier)
				: "/account/salone";
		String message = premium
				? checkoutRequired
						? "Email confermata. Prosegui con il pagamento Premium per attivare il salone."
						: "Email confermata. Il tuo salone Premium è attivo: inizia dalla panoramica salone."
				: "Email confermata. Il tuo salone è attivo.";
		return new EmailVerificationConfirmResult(
				message,
				tokens.accessToken(),
				tokens.refreshToken(),
				tokens.expiresInSeconds(),
				securityProperties.refreshTokenTtlDays(),
				nextPath);
	}

	@Transactional
	public void resendVerification(String rawEmail) {
		pendingRegistrationService.resendVerification(rawEmail);
	}

	/**
	 * Sincronizza conferma email nella WebView app quando il link è stato aperto nel browser di sistema.
	 */
	@Transactional
	public Optional<EmailVerificationConfirmResult> pollRegistrationSync(
			String rawEmail, long registrationAtMs, HttpServletRequest request) {
		if (!registrationProperties.isEmailVerificationRequired()) {
			return Optional.empty();
		}
		String normEmail = rawEmail != null ? rawEmail.trim().toLowerCase(Locale.ROOT) : "";
		if (normEmail.isBlank() || registrationAtMs <= 0) {
			return Optional.empty();
		}

		Optional<PendingRegistration> verifiedPending =
				pendingRegistrationService.findEmailVerifiedPendingForSync(normEmail, registrationAtMs);
		if (verifiedPending.isPresent()) {
			Optional<EmailVerificationMaterializationOutcome> premiumOutcome =
					pendingRegistrationService.verifiedPremiumCheckoutOutcome(verifiedPending.get());
			if (premiumOutcome.isPresent()) {
				EmailVerificationMaterializationOutcome outcome = premiumOutcome.get();
				return Optional.of(
						new EmailVerificationConfirmResult(
								"Email confermata. Completa il pagamento Premium per attivare il salone.",
								null,
								null,
								0,
								0,
								billingRegistrationPlanPolicy.salonOwnerPostConfirmPath(outcome.salonProvisionPlanTier())
										+ "?token="
										+ outcome.premiumCheckoutToken(),
								outcome.premiumCheckoutToken()));
			}
			return Optional.empty();
		}

		Optional<ConsumerProfile> profile =
				consumerProfileRepository.findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByCreatedAtDesc(normEmail);
		if (profile.isEmpty() || profile.get().getEmailVerifiedAt() == null) {
			return Optional.empty();
		}
		if (profile.get().getEmailVerifiedAt().toEpochMilli() < registrationAtMs - 120_000L) {
			return Optional.empty();
		}

		if (isSalonOwnerProfile(profile.get())) {
			String planTier = profile.get().getPlanTier();
			return Optional.of(
					issueSalonOwnerSessionAfterConfirm(
							new EmailVerificationMaterializationOutcome(
									PendingRegistrationKind.SALON_OWNER, normEmail, planTier),
							request));
		}
		return Optional.of(
				issueClientSessionAfterConfirm(
						normEmail, "Email confermata. Ora puoi accedere con le tue credenziali.", request));
	}

	public void assertMayLogin(ConsumerProfile profile) {
		if (!registrationProperties.isEmailVerificationRequired()) {
			return;
		}
		if (isStaffExemptFromEmailVerification(profile)) {
			return;
		}
		if (profile.getEmailVerifiedAt() == null) {
			throw new it.luxury.common.api.BusinessException(
					org.springframework.http.HttpStatus.FORBIDDEN,
					"EMAIL_NOT_VERIFIED",
					"Conferma l'indirizzo email prima di accedere. Controlla la posta o richiedi un nuovo invio.");
		}
	}

	private boolean isStaffExemptFromEmailVerification(ConsumerProfile profile) {
		if (LuxuryUserPrincipal.parseRoleStrings(profile.getSecurityRoles()).contains("STAFF")) {
			return true;
		}
		return profile.getId() != null && staffOperatorRepository.findByConsumerProfile_Id(profile.getId()).isPresent();
	}
}
