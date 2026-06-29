package it.velvet.consumer.service;

import it.velvet.billing.service.BillingRegistrationPlanPolicy;
import it.velvet.config.VelvetRegistrationProperties;
import it.velvet.config.VelvetSecurityProperties;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.consumer.domain.PendingRegistrationKind;
import it.velvet.security.auth.VelvetRefreshTokenService;
import it.velvet.studio.domain.StudioGroup;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

/**
 * Conferma email registrazione: materializza {@code pending_registrations} oppure profili legacy non verificati.
 */
@Service
public class VelvetEmailVerificationService {

	private final VelvetPendingRegistrationService pendingRegistrationService;
	private final VelvetRegistrationProperties registrationProperties;
	private final ConsumerProfileRepository consumerProfileRepository;
	private final SalonOwnerRoleAlignmentService salonOwnerRoleAlignmentService;
	private final VelvetRefreshTokenService velvetRefreshTokenService;
	private final VelvetSecurityProperties securityProperties;
	private final BillingRegistrationPlanPolicy billingRegistrationPlanPolicy;

	public VelvetEmailVerificationService(
			VelvetPendingRegistrationService pendingRegistrationService,
			VelvetRegistrationProperties registrationProperties,
			ConsumerProfileRepository consumerProfileRepository,
			SalonOwnerRoleAlignmentService salonOwnerRoleAlignmentService,
			VelvetRefreshTokenService velvetRefreshTokenService,
			VelvetSecurityProperties securityProperties,
			BillingRegistrationPlanPolicy billingRegistrationPlanPolicy) {
		this.pendingRegistrationService = pendingRegistrationService;
		this.registrationProperties = registrationProperties;
		this.consumerProfileRepository = consumerProfileRepository;
		this.salonOwnerRoleAlignmentService = salonOwnerRoleAlignmentService;
		this.velvetRefreshTokenService = velvetRefreshTokenService;
		this.securityProperties = securityProperties;
		this.billingRegistrationPlanPolicy = billingRegistrationPlanPolicy;
	}

	@Transactional
	public EmailVerificationConfirmResult confirmVerification(String plainToken, HttpServletRequest request) {
		EmailVerificationMaterializationOutcome outcome = pendingRegistrationService.confirmAndMaterialize(plainToken);
		if (outcome.kind() == PendingRegistrationKind.SALON_OWNER) {
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
		String message = outcome.kind() == PendingRegistrationKind.CLIENT
				? "Email confermata. Ora puoi accedere con le tue credenziali."
				: "Email confermata. Ora puoi accedere con le tue credenziali.";
		return new EmailVerificationConfirmResult(message, null, null, 0, 0, "/account");
	}

	private boolean isSalonOwnerProfile(ConsumerProfile profile) {
		return it.velvet.security.auth.VelvetUserPrincipal.parseRoleStrings(profile.getSecurityRoles()).contains("OWNER");
	}

	private EmailVerificationConfirmResult issueSalonOwnerSessionAfterConfirm(
			EmailVerificationMaterializationOutcome outcome,
			HttpServletRequest request) {
		String normEmail = outcome.email() != null ? outcome.email().trim().toLowerCase(Locale.ROOT) : "";
		ConsumerProfile profile = consumerProfileRepository
				.findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByCreatedAtDesc(normEmail)
				.orElseThrow(
						() -> new it.velvet.common.api.BusinessException(
								org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
								"PROFILE_NOT_FOUND",
								"Registrazione completata ma profilo non trovato. Accedi con email e password."));
		salonOwnerRoleAlignmentService.alignAfterSuccessfulPasswordLogin(profile);
		ConsumerProfile forToken = consumerProfileRepository.findById(profile.getId()).orElse(profile);
		VelvetRefreshTokenService.RefreshTokenPair tokens =
				velvetRefreshTokenService.issueForProfile(forToken, request);
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

	public void assertMayLogin(ConsumerProfile profile) {
		if (!registrationProperties.isEmailVerificationRequired()) {
			return;
		}
		if (profile.getEmailVerifiedAt() == null) {
			throw new it.velvet.common.api.BusinessException(
					org.springframework.http.HttpStatus.FORBIDDEN,
					"EMAIL_NOT_VERIFIED",
					"Conferma l'indirizzo email prima di accedere. Controlla la posta o richiedi un nuovo invio.");
		}
	}
}
