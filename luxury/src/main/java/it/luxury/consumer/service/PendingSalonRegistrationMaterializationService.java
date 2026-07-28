package it.luxury.consumer.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import it.luxury.billing.domain.BillingAccount;
import it.luxury.billing.domain.BillingAccountRepository;
import it.luxury.billing.service.StripeSubscriptionSyncService;
import it.luxury.common.api.BusinessException;
import it.luxury.consumer.domain.PendingRegistration;
import it.luxury.consumer.domain.PendingRegistrationKind;
import it.luxury.consumer.domain.PendingRegistrationRepository;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.studio.domain.StudioGroupRepository;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/** Materializza titolare + salone da {@code pending_registrations} dopo pagamento Stripe. */
@Service
public class PendingSalonRegistrationMaterializationService {

	private final PendingRegistrationRepository pendingRegistrationRepository;
	private final LuxuryRegistrationCompletionService registrationCompletionService;
	private final StudioGroupRepository studioGroupRepository;
	private final BillingAccountRepository billingAccountRepository;
	private final ObjectProvider<StripeSubscriptionSyncService> subscriptionSyncService;
	private final ObjectMapper objectMapper;

	public PendingSalonRegistrationMaterializationService(
			PendingRegistrationRepository pendingRegistrationRepository,
			LuxuryRegistrationCompletionService registrationCompletionService,
			StudioGroupRepository studioGroupRepository,
			BillingAccountRepository billingAccountRepository,
			ObjectProvider<StripeSubscriptionSyncService> subscriptionSyncService,
			ObjectMapper objectMapper) {
		this.pendingRegistrationRepository = pendingRegistrationRepository;
		this.registrationCompletionService = registrationCompletionService;
		this.studioGroupRepository = studioGroupRepository;
		this.billingAccountRepository = billingAccountRepository;
		this.subscriptionSyncService = subscriptionSyncService;
		this.objectMapper = objectMapper;
	}

	@Transactional
	public UUID materializePaidPremiumRegistration(
			UUID pendingRegistrationId,
			String stripeCustomerId,
			String stripeSubscriptionId) {
		PendingRegistration pending = pendingRegistrationRepository.findById(pendingRegistrationId)
				.orElseThrow(
						() -> new BusinessException(
								HttpStatus.NOT_FOUND,
								"PENDING_REGISTRATION_NOT_FOUND",
								"Registrazione in sospeso non trovata."));
		if (pending.getKind() != PendingRegistrationKind.SALON_OWNER) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Registrazione non valida.");
		}
		if (pending.getEmailVerifiedAt() == null) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"EMAIL_NOT_VERIFIED",
					"Conferma l'email prima di completare il pagamento.");
		}
		if (studioGroupRepository.findByOwnerEmailIgnoreCase(pending.getEmail()).isPresent()) {
			pendingRegistrationRepository.delete(pending);
			return studioGroupRepository.findByOwnerEmailIgnoreCase(pending.getEmail()).orElseThrow().getId();
		}
		PendingSalonRegistrationPayload payload = readSalonPayload(pending);
		registrationCompletionService.completeSalonRegistration(
				pending.getEmail(),
				pending.getPasswordHash(),
				payload);
		StudioGroup group = studioGroupRepository.findByOwnerEmailIgnoreCase(pending.getEmail())
				.orElseThrow(
						() -> new BusinessException(
								HttpStatus.INTERNAL_SERVER_ERROR,
								"PROVISIONING_FAILED",
								"Impossibile attivare il salone dopo il pagamento."));
		String customerId = firstNonBlank(stripeCustomerId, pending.getStripeCheckoutCustomerId());
		if (customerId != null && !customerId.isBlank()) {
			linkBillingAccount(group, customerId.trim());
		}
		if (stripeSubscriptionId != null && !stripeSubscriptionId.isBlank()) {
			StripeSubscriptionSyncService sync = subscriptionSyncService.getIfAvailable();
			if (sync != null) {
				try {
					sync.syncFromSubscriptionId(stripeSubscriptionId.trim(), group.getId());
				}
				catch (Exception ex) {
					throw new BusinessException(
							HttpStatus.BAD_GATEWAY,
							"STRIPE_ERROR",
							"Pagamento ricevuto ma sincronizzazione abbonamento non riuscita. Contatta l'assistenza.");
				}
			}
		}
		pendingRegistrationRepository.delete(pending);
		return group.getId();
	}

	private void linkBillingAccount(StudioGroup group, String stripeCustomerId) {
		if (billingAccountRepository.findByStudioGroup_Id(group.getId()).isPresent()) {
			return;
		}
		billingAccountRepository.save(new BillingAccount(group, stripeCustomerId));
	}

	private PendingSalonRegistrationPayload readSalonPayload(PendingRegistration pending) {
		try {
			return objectMapper.readValue(pending.getPayloadJson(), PendingSalonRegistrationPayload.class);
		}
		catch (JsonProcessingException ex) {
			throw new BusinessException(
					HttpStatus.INTERNAL_SERVER_ERROR,
					"PENDING_REGISTRATION_CORRUPT",
					"Registrazione in sospeso non valida. Ripeti la registrazione.");
		}
	}

	private static String firstNonBlank(String first, String second) {
		if (first != null && !first.isBlank()) {
			return first;
		}
		return second;
	}
}
