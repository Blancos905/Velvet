package it.luxury.billing.service;

import it.luxury.billing.domain.SalonBillingProfile;
import it.luxury.billing.domain.SalonBillingProfileRepository;
import it.luxury.billing.domain.SalonBillingSubjectType;
import it.luxury.billing.dto.SalonBillingProfileDto;
import it.luxury.billing.dto.SalonBillingProfileUpsertRequest;
import it.luxury.billing.validation.SalonBillingProfileValidator;
import it.luxury.common.api.BusinessException;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.security.auth.LuxuryUserPrincipal;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.LocationRepository;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.studio.service.StudioGroupOwnerResolver;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class SalonBillingProfileService {

	private final StudioGroupOwnerResolver studioGroupOwnerResolver;
	private final SalonBillingProfileRepository billingProfileRepository;
	private final LocationRepository locationRepository;
	private final ConsumerProfileRepository consumerProfileRepository;
	private final ObjectProvider<StripeBillingCustomerSyncService> stripeBillingCustomerSyncService;

	public SalonBillingProfileService(
			StudioGroupOwnerResolver studioGroupOwnerResolver,
			SalonBillingProfileRepository billingProfileRepository,
			LocationRepository locationRepository,
			ConsumerProfileRepository consumerProfileRepository,
			ObjectProvider<StripeBillingCustomerSyncService> stripeBillingCustomerSyncService) {
		this.studioGroupOwnerResolver = studioGroupOwnerResolver;
		this.billingProfileRepository = billingProfileRepository;
		this.locationRepository = locationRepository;
		this.consumerProfileRepository = consumerProfileRepository;
		this.stripeBillingCustomerSyncService = stripeBillingCustomerSyncService;
	}

	@Transactional(readOnly = true)
	public SalonBillingProfileDto resolve(LuxuryUserPrincipal principal) {
		StudioGroup group = requireStudioGroup(principal);
		return billingProfileRepository.findByStudioGroup_Id(group.getId())
				.map(SalonBillingProfileDto::from)
				.orElseGet(() -> prefillDto(group));
	}

	@Transactional
	public SalonBillingProfileDto upsert(LuxuryUserPrincipal principal, SalonBillingProfileUpsertRequest body) {
		StudioGroup group = requireStudioGroup(principal);
		SalonBillingProfile profile = billingProfileRepository.findByStudioGroup_Id(group.getId())
				.orElseGet(() -> new SalonBillingProfile(group));

		applyRequest(profile, body, group);
		if (profile.getBillingEmail() == null || profile.getBillingEmail().isBlank()) {
			profile.setBillingEmail(defaultBillingEmail(group, principal));
		}
		SalonBillingProfileValidator.validateForSave(profile);
		billingProfileRepository.save(profile);

		StripeBillingCustomerSyncService sync = stripeBillingCustomerSyncService.getIfAvailable();
		if (sync != null) {
			sync.syncProfileToStripeCustomer(group, profile);
		}
		return SalonBillingProfileDto.from(profile);
	}

	@Transactional(readOnly = true)
	public SalonBillingProfile requireCompleteProfile(LuxuryUserPrincipal principal) {
		StudioGroup group = requireStudioGroup(principal);
		SalonBillingProfile profile = billingProfileRepository.findByStudioGroup_Id(group.getId()).orElse(null);
		if (!SalonBillingProfileValidator.isComplete(profile)) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"BILLING_PROFILE_INCOMPLETE",
					"Completa i dati di fatturazione prima di avviare il pagamento.");
		}
		return profile;
	}

	@Transactional(readOnly = true)
	public boolean isProfileComplete(LuxuryUserPrincipal principal) {
		return studioGroupOwnerResolver.resolveStudioGroupForOwner(principal)
				.flatMap(g -> billingProfileRepository.findByStudioGroup_Id(g.getId()))
				.map(SalonBillingProfileValidator::isComplete)
				.orElse(false);
	}

	private SalonBillingProfileDto prefillDto(StudioGroup group) {
		Location loc = primaryLocation(group.getId());
		String ownerEmail = group.getOwnerEmail();
		return new SalonBillingProfileDto(
				group.getName(),
				ownerEmail,
				null,
				null,
				null,
				loc != null ? loc.getAddressLine() : null,
				loc != null ? loc.getPostalCode() : null,
				loc != null ? loc.getCity() : null,
				null,
				"IT",
				null,
				null,
				false,
				false,
				null);
	}

	private void applyRequest(SalonBillingProfile profile, SalonBillingProfileUpsertRequest body, StudioGroup group) {
		profile.setLegalName(trimToNull(body.legalName()));
		profile.setBillingEmail(SalonBillingProfileValidator.normalizeEmail(body.billingEmail()));
		profile.setVatNumber(trimToNull(body.vatNumber()));
		profile.setFiscalCode(trimToNull(body.fiscalCode()));
		SalonBillingSubjectType subjectType = SalonBillingSubjectType.parseOrNull(body.subjectType());
		profile.setSubjectType(subjectType != null ? subjectType.name() : null);
		profile.setAddressLine1(trimToNull(body.addressLine1()));
		profile.setPostalCode(trimToNull(body.postalCode()));
		profile.setCity(trimToNull(body.city()));
		profile.setProvince(trimToNull(body.province()));
		profile.setCountry(body.country() != null && !body.country().isBlank() ? body.country().trim() : "IT");
		profile.setSdiCode(trimToNull(body.sdiCode()));
		profile.setPecEmail(trimToNull(body.pecEmail()));
		if (profile.getLegalName() == null) {
			profile.setLegalName(group.getName());
		}
	}

	private String defaultBillingEmail(StudioGroup group, LuxuryUserPrincipal principal) {
		if (group.getOwnerEmail() != null && !group.getOwnerEmail().isBlank()) {
			return group.getOwnerEmail().trim().toLowerCase(Locale.ROOT);
		}
		return consumerProfileRepository.findByAuthSub(principal.getSubject())
				.filter(p -> p.getDeletedAt() == null)
				.map(ConsumerProfile::getEmail)
				.filter(e -> e != null && !e.isBlank())
				.map(e -> e.trim().toLowerCase(Locale.ROOT))
				.orElse(null);
	}

	private Location primaryLocation(java.util.UUID studioGroupId) {
		List<Location> locs = locationRepository.findByStudioGroup_IdOrderByNameAsc(studioGroupId);
		return locs.isEmpty() ? null : locs.get(0);
	}

	private StudioGroup requireStudioGroup(LuxuryUserPrincipal principal) {
		return studioGroupOwnerResolver.resolveStudioGroupForOwner(principal)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Salone non trovato."));
	}

	private static String trimToNull(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		return raw.trim();
	}
}
