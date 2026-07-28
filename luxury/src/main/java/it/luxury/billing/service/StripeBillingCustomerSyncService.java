package it.luxury.billing.service;

import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.CustomerTaxIdCreateParams;
import com.stripe.param.CustomerUpdateParams;
import it.luxury.billing.domain.BillingAccount;
import it.luxury.billing.domain.BillingAccountRepository;
import it.luxury.billing.domain.SalonBillingProfile;
import it.luxury.billing.dto.RegistrationSalonBillingDetails;
import it.luxury.billing.validation.SalonBillingProfileValidator;
import it.luxury.consumer.domain.PendingRegistration;
import it.luxury.consumer.domain.PendingRegistrationRepository;
import it.luxury.consumer.service.PendingSalonRegistrationPayload;
import it.luxury.common.api.BusinessException;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.studio.domain.StudioGroup;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import it.luxury.billing.config.ConditionalOnStripeBillingOperational;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@ConditionalOnStripeBillingOperational
public class StripeBillingCustomerSyncService {

	private static final Logger LOG = LoggerFactory.getLogger(StripeBillingCustomerSyncService.class);

	private final BillingAccountRepository billingAccountRepository;
	private final PendingRegistrationRepository pendingRegistrationRepository;
	private final com.stripe.StripeClient stripeClient;

	public StripeBillingCustomerSyncService(
			BillingAccountRepository billingAccountRepository,
			PendingRegistrationRepository pendingRegistrationRepository,
			com.stripe.StripeClient stripeClient) {
		this.billingAccountRepository = billingAccountRepository;
		this.pendingRegistrationRepository = pendingRegistrationRepository;
		this.stripeClient = stripeClient;
	}

	void syncProfileToStripeCustomer(StudioGroup group, SalonBillingProfile profile) {
		billingAccountRepository.findByStudioGroup_Id(group.getId()).ifPresent(account -> {
			try {
				updateCustomer(account.getStripeCustomerId(), profile);
			}
			catch (StripeException ex) {
				LOG.warn("Sync profilo fatturazione → Stripe fallita per studioGroup={}: {}", group.getId(), ex.getMessage());
			}
		});
	}

	String ensureCustomerWithProfile(
			StudioGroup group,
			ConsumerProfile ownerProfile,
			SalonBillingProfile billingProfile) {
		return billingAccountRepository.findByStudioGroup_Id(group.getId())
				.map(BillingAccount::getStripeCustomerId)
				.orElseGet(() -> createCustomer(group, ownerProfile, billingProfile));
	}

	String ensureCustomerForPendingRegistration(PendingRegistration pending, PendingSalonRegistrationPayload payload) {
		if (pending.getStripeCheckoutCustomerId() != null && !pending.getStripeCheckoutCustomerId().isBlank()) {
			return pending.getStripeCheckoutCustomerId().trim();
		}
		try {
			Customer customer = stripeClient.customers().create(buildCreateParamsForPending(pending, payload));
			pending.setStripeCheckoutCustomerId(customer.getId());
			pendingRegistrationRepository.save(pending);
			return customer.getId();
		}
		catch (StripeException ex) {
			LOG.warn(
					"Creazione cliente Stripe fallita per pendingRegistration={}: {}",
					pending.getId(),
					stripeErrorSummary(ex));
			throw new BusinessException(
					HttpStatus.BAD_GATEWAY,
					ex.getCode() != null ? ex.getCode() : "STRIPE_ERROR",
					BillingPaymentUserMessages.customerCreateFailed(ex));
		}
	}

	private String createCustomer(StudioGroup group, ConsumerProfile ownerProfile, SalonBillingProfile billingProfile) {
		try {
			Customer customer = stripeClient.customers().create(buildCreateParams(group, ownerProfile, billingProfile));
			billingAccountRepository.save(new BillingAccount(group, customer.getId()));
			syncTaxId(customer.getId(), billingProfile);
			return customer.getId();
		}
		catch (StripeException ex) {
			LOG.warn(
					"Creazione cliente Stripe fallita per studioGroup={}: {}",
					group.getId(),
					stripeErrorSummary(ex));
			throw new BusinessException(
					HttpStatus.BAD_GATEWAY,
					ex.getCode() != null ? ex.getCode() : "STRIPE_ERROR",
					BillingPaymentUserMessages.customerCreateFailed(ex));
		}
	}

	private void updateCustomer(String customerId, SalonBillingProfile profile) throws StripeException {
		stripeClient.customers().update(customerId, buildUpdateParams(profile));
		syncTaxId(customerId, profile);
	}

	private CustomerCreateParams buildCreateParamsForPending(
			PendingRegistration pending,
			PendingSalonRegistrationPayload payload) {
		RegistrationSalonBillingDetails billing = payload.billing();
		String billingEmail = billing != null && billing.billingEmail() != null && !billing.billingEmail().isBlank()
				? billing.billingEmail().trim()
				: pending.getEmail();
		String legalName = billing != null && billing.legalName() != null && !billing.legalName().isBlank()
				? billing.legalName().trim()
				: payload.salonName();
		CustomerCreateParams.Builder builder = CustomerCreateParams.builder()
				.setEmail(billingEmail)
				.setName(legalName)
				.putMetadata("luxury_pending_registration_id", pending.getId().toString())
				.putMetadata("luxury_plan", "PREMIUM");
		if (billing != null && billing.addressLine1() != null && !billing.addressLine1().isBlank()) {
			builder.setAddress(
					CustomerCreateParams.Address.builder()
							.setLine1(billing.addressLine1())
							.setPostalCode(billing.postalCode())
							.setCity(billing.city())
							.setState(billing.province())
							.setCountry(
									billing.country() != null && !billing.country().isBlank()
											? billing.country().trim().toUpperCase(java.util.Locale.ROOT)
											: "IT")
							.build());
		}
		return builder.build();
	}

	private CustomerCreateParams buildCreateParams(
			StudioGroup group,
			ConsumerProfile ownerProfile,
			SalonBillingProfile profile) {
		// Non inviamo tax_id_data in create: Stripe valida la P.IVA e rifiuta valori di test/non reali.
		// La Partita IVA viene raccolta in Checkout (tax_id_collection) e sincronizzata best-effort dopo.
		return CustomerCreateParams.builder()
				.setEmail(profile.getBillingEmail())
				.setName(profile.getLegalName())
				.setAddress(buildCreateAddress(profile))
				.putAllMetadata(buildMetadata(group, ownerProfile, profile))
				.build();
	}

	private CustomerUpdateParams buildUpdateParams(SalonBillingProfile profile) {
		return CustomerUpdateParams.builder()
				.setEmail(profile.getBillingEmail())
				.setName(profile.getLegalName())
				.setAddress(buildUpdateAddress(profile))
				.putAllMetadata(stripeProfileMetadata(profile))
				.build();
	}

	private static CustomerCreateParams.Address buildCreateAddress(SalonBillingProfile profile) {
		return CustomerCreateParams.Address.builder()
				.setLine1(profile.getAddressLine1())
				.setPostalCode(profile.getPostalCode())
				.setCity(profile.getCity())
				.setState(profile.getProvince())
				.setCountry(profile.getCountry())
				.build();
	}

	private static CustomerUpdateParams.Address buildUpdateAddress(SalonBillingProfile profile) {
		return CustomerUpdateParams.Address.builder()
				.setLine1(profile.getAddressLine1())
				.setPostalCode(profile.getPostalCode())
				.setCity(profile.getCity())
				.setState(profile.getProvince())
				.setCountry(profile.getCountry())
				.build();
	}

	private static Map<String, String> buildMetadata(
			StudioGroup group,
			ConsumerProfile ownerProfile,
			SalonBillingProfile profile) {
		Map<String, String> metadata = new HashMap<>();
		metadata.put("luxury_studio_group_id", group.getId().toString());
		if (ownerProfile != null) {
			metadata.put("luxury_consumer_profile_id", ownerProfile.getId().toString());
		}
		metadata.put("luxury_plan", "PREMIUM");
		metadata.putAll(stripeProfileMetadata(profile));
		return metadata;
	}

	static Map<String, String> stripeProfileMetadata(SalonBillingProfile profile) {
		Map<String, String> metadata = new HashMap<>();
		if (profile.getFiscalCode() != null) {
			metadata.put("luxury_fiscal_code", profile.getFiscalCode());
		}
		if (profile.getSdiCode() != null) {
			metadata.put("luxury_sdi_code", profile.getSdiCode());
		}
		if (profile.getPecEmail() != null) {
			metadata.put("luxury_pec_email", profile.getPecEmail());
		}
		if (profile.getSubjectType() != null) {
			metadata.put("luxury_billing_subject_type", profile.getSubjectType());
		}
		return metadata;
	}

	private void syncTaxId(String customerId, SalonBillingProfile profile) {
		String euVat = SalonBillingProfileValidator.stripeEuVatValue(profile);
		if (euVat == null) {
			return;
		}
		try {
			stripeClient.customers().taxIds().create(
					customerId,
					CustomerTaxIdCreateParams.builder()
							.setType(CustomerTaxIdCreateParams.Type.EU_VAT)
							.setValue(euVat)
							.build());
		}
		catch (StripeException ex) {
			String msg = ex.getMessage() != null ? ex.getMessage().toLowerCase() : "";
			if (msg.contains("already") || msg.contains("duplicate")) {
				return;
			}
			LOG.debug("Tax ID Stripe non sincronizzato per customer {}: {}", customerId, ex.getMessage());
		}
	}

	private static String stripeErrorSummary(StripeException ex) {
		String stripeCode = ex.getCode();
		String detail = ex.getMessage();
		if (stripeCode == null || stripeCode.isBlank()) {
			return detail != null ? detail : ex.getClass().getSimpleName();
		}
		return stripeCode + ": " + (detail != null ? detail : "");
	}
}
