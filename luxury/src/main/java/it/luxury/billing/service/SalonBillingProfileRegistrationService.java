package it.luxury.billing.service;

import it.luxury.billing.domain.SalonBillingProfile;
import it.luxury.billing.domain.SalonBillingProfileRepository;
import it.luxury.billing.domain.SalonBillingSubjectType;
import it.luxury.billing.dto.RegistrationSalonBillingDetails;
import it.luxury.billing.validation.SalonBillingProfileValidator;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.studio.domain.StudioGroupRepository;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

@Service
public class SalonBillingProfileRegistrationService {

	private final SalonBillingProfileRepository billingProfileRepository;
	private final StudioGroupRepository studioGroupRepository;
	private final ObjectProvider<StripeBillingCustomerSyncService> stripeBillingCustomerSyncService;

	public SalonBillingProfileRegistrationService(
			SalonBillingProfileRepository billingProfileRepository,
			StudioGroupRepository studioGroupRepository,
			ObjectProvider<StripeBillingCustomerSyncService> stripeBillingCustomerSyncService) {
		this.billingProfileRepository = billingProfileRepository;
		this.studioGroupRepository = studioGroupRepository;
		this.stripeBillingCustomerSyncService = stripeBillingCustomerSyncService;
	}

	@Transactional
	public void applyRegistrationBilling(UUID studioGroupId, RegistrationSalonBillingDetails billing, String ownerEmail) {
		if (billing == null || !billing.hasAnyField()) {
			return;
		}
		StudioGroup group = studioGroupRepository.findById(studioGroupId).orElse(null);
		if (group == null) {
			return;
		}
		SalonBillingProfile profile = billingProfileRepository.findByStudioGroup_Id(group.getId())
				.orElseGet(() -> new SalonBillingProfile(group));
		profile.setLegalName(trim(billing.legalName()));
		profile.setBillingEmail(SalonBillingProfileValidator.normalizeEmail(
				billing.billingEmail() != null && !billing.billingEmail().isBlank()
						? billing.billingEmail()
						: ownerEmail));
		profile.setVatNumber(trim(billing.vatNumber()));
		profile.setFiscalCode(trim(billing.fiscalCode()));
		SalonBillingSubjectType subjectType = SalonBillingSubjectType.parseOrNull(billing.subjectType());
		profile.setSubjectType(subjectType != null ? subjectType.name() : null);
		profile.setAddressLine1(trim(billing.addressLine1()));
		profile.setPostalCode(trim(billing.postalCode()));
		profile.setCity(trim(billing.city()));
		profile.setProvince(trim(billing.province()));
		profile.setCountry(
				billing.country() != null && !billing.country().isBlank() ? billing.country().trim().toUpperCase(Locale.ROOT) : "IT");
		profile.setSdiCode(trim(billing.sdiCode()));
		profile.setPecEmail(trim(billing.pecEmail()));
		if (profile.getLegalName() == null) {
			profile.setLegalName(group.getName());
		}
		SalonBillingProfileValidator.validateForSave(profile);
		billingProfileRepository.save(profile);
		StripeBillingCustomerSyncService sync = stripeBillingCustomerSyncService.getIfAvailable();
		if (sync != null) {
			sync.syncProfileToStripeCustomer(group, profile);
		}
	}

	private static String trim(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		return raw.trim();
	}
}
