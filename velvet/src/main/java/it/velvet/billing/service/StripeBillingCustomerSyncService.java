package it.velvet.billing.service;

import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.CustomerTaxIdCreateParams;
import com.stripe.param.CustomerUpdateParams;
import it.velvet.billing.domain.BillingAccount;
import it.velvet.billing.domain.BillingAccountRepository;
import it.velvet.billing.domain.SalonBillingProfile;
import it.velvet.billing.validation.SalonBillingProfileValidator;
import it.velvet.common.api.BusinessException;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.studio.domain.StudioGroup;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@ConditionalOnProperty(name = "velvet.billing.enabled", havingValue = "true")
public class StripeBillingCustomerSyncService {

	private static final Logger LOG = LoggerFactory.getLogger(StripeBillingCustomerSyncService.class);

	private final BillingAccountRepository billingAccountRepository;
	private final com.stripe.StripeClient stripeClient;

	public StripeBillingCustomerSyncService(
			BillingAccountRepository billingAccountRepository,
			com.stripe.StripeClient stripeClient) {
		this.billingAccountRepository = billingAccountRepository;
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

	private String createCustomer(StudioGroup group, ConsumerProfile ownerProfile, SalonBillingProfile billingProfile) {
		try {
			Customer customer = stripeClient.customers().create(buildCreateParams(group, ownerProfile, billingProfile));
			billingAccountRepository.save(new BillingAccount(group, customer.getId()));
			syncTaxId(customer.getId(), billingProfile);
			return customer.getId();
		}
		catch (StripeException ex) {
			throw new BusinessException(HttpStatus.BAD_GATEWAY, "STRIPE_ERROR", "Impossibile creare il cliente Stripe.");
		}
	}

	private void updateCustomer(String customerId, SalonBillingProfile profile) throws StripeException {
		stripeClient.customers().update(customerId, buildUpdateParams(profile));
		syncTaxId(customerId, profile);
	}

	private CustomerCreateParams buildCreateParams(
			StudioGroup group,
			ConsumerProfile ownerProfile,
			SalonBillingProfile profile) {
		CustomerCreateParams.Builder builder = CustomerCreateParams.builder()
				.setEmail(profile.getBillingEmail())
				.setName(profile.getLegalName())
				.setAddress(buildCreateAddress(profile))
				.putAllMetadata(buildMetadata(group, ownerProfile, profile));
		String euVat = SalonBillingProfileValidator.stripeEuVatValue(profile);
		if (euVat != null) {
			builder.addTaxIdData(
					CustomerCreateParams.TaxIdData.builder()
							.setType(CustomerCreateParams.TaxIdData.Type.EU_VAT)
							.setValue(euVat)
							.build());
		}
		return builder.build();
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
		metadata.put("velvet_studio_group_id", group.getId().toString());
		if (ownerProfile != null) {
			metadata.put("velvet_consumer_profile_id", ownerProfile.getId().toString());
		}
		metadata.put("velvet_plan", "PREMIUM");
		metadata.putAll(stripeProfileMetadata(profile));
		return metadata;
	}

	static Map<String, String> stripeProfileMetadata(SalonBillingProfile profile) {
		Map<String, String> metadata = new HashMap<>();
		if (profile.getFiscalCode() != null) {
			metadata.put("velvet_fiscal_code", profile.getFiscalCode());
		}
		if (profile.getSdiCode() != null) {
			metadata.put("velvet_sdi_code", profile.getSdiCode());
		}
		if (profile.getPecEmail() != null) {
			metadata.put("velvet_pec_email", profile.getPecEmail());
		}
		if (profile.getSubjectType() != null) {
			metadata.put("velvet_billing_subject_type", profile.getSubjectType());
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
}
