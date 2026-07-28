package it.luxury.studio.service;

import it.luxury.common.api.BusinessException;
import it.luxury.publicapi.dto.RegistrationSalonLocation;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.LocationRepository;
import it.luxury.studio.domain.SalonBusinessType;
import it.luxury.studio.domain.SalonClientGender;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.studio.domain.StudioGroupRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

/**
 * Dopo la registrazione titolare da {@code /piani}, crea sede + gruppo in DB così la vetrina e la ricerca pubblica
 * trovano il salone. Un titolare = un {@link StudioGroup} per email; più sedi = più {@link Location} sullo stesso gruppo,
 * sempre con la stessa email (e stesso {@code owner_auth_sub}) del primo salone.
 */
@Service
public class SalonDirectoryProvisioningService {

	private final StudioGroupRepository studioGroupRepository;
	private final LocationRepository locationRepository;
	private final SalonLocationGeocodingAsyncService salonLocationGeocodingAsyncService;

	public SalonDirectoryProvisioningService(
			StudioGroupRepository studioGroupRepository,
			LocationRepository locationRepository,
			SalonLocationGeocodingAsyncService salonLocationGeocodingAsyncService) {
		this.studioGroupRepository = studioGroupRepository;
		this.locationRepository = locationRepository;
		this.salonLocationGeocodingAsyncService = salonLocationGeocodingAsyncService;
	}

	@Transactional
	public void provisionAfterPartnerRegistration(
			String ownerEmailNormalized,
			String planTier,
			String salonPublicName,
			RegistrationSalonLocation salon,
			String ownerAuthSub,
			List<SalonBusinessType> salonBusinessTypes,
			List<SalonClientGender> salonClientGenders) {
		provisionAfterPartnerRegistration(
				ownerEmailNormalized,
				planTier,
				salonPublicName,
				salon,
				ownerAuthSub,
				salonBusinessTypes,
				salonClientGenders,
				false);
	}

	@Transactional
	public void provisionAfterPartnerRegistration(
			String ownerEmailNormalized,
			String planTier,
			String salonPublicName,
			RegistrationSalonLocation salon,
			String ownerAuthSub,
			List<SalonBusinessType> salonBusinessTypes,
			List<SalonClientGender> salonClientGenders,
			boolean provider) {
		String name = firstNonBlank(salonPublicName, salon.displayName(), "Salone");
		String city = trimToEmpty(salon.city());
		String email = ownerEmailNormalized != null ? ownerEmailNormalized.trim().toLowerCase(Locale.ROOT) : "";
		String sub = ownerAuthSub != null && !ownerAuthSub.isBlank()
				? ownerAuthSub.trim().toLowerCase(Locale.ROOT)
				: null;

		StudioGroup group = resolveExistingGroup(sub, email);
		if (group != null) {
			ensureEmailMatchesStoredOwner(group, email);
			group.applyPlanTier(planTier);
			if (sub != null && group.assignOwnerAuthSubIfUnset(sub)) {
				// persist below
			}
			studioGroupRepository.save(group);
			appendLocation(group, name, city, salon, salonBusinessTypes, salonClientGenders);
			return;
		}

		StudioGroup created = new StudioGroup(name, email, planTier, sub);
		created.setProvider(provider);
		created = studioGroupRepository.save(created);
		appendLocation(created, name, city, salon, salonBusinessTypes, salonClientGenders);
	}

	/**
	 * Idempotente: se lo {@link StudioGroup} esiste ma non ha sedi (provisioning parziale), crea la prima sede.
	 */
	@Transactional
	public void ensurePrimaryLocationIfMissing(
			StudioGroup group,
			String salonPublicName,
			RegistrationSalonLocation salon,
			List<SalonBusinessType> salonBusinessTypes,
			List<SalonClientGender> salonClientGenders) {
		if (group == null) {
			return;
		}
		if (!locationRepository.findByStudioGroup_IdOrderByNameAsc(group.getId()).isEmpty()) {
			return;
		}
		String name = firstNonBlank(salonPublicName, salon.displayName(), group.getName(), "Salone");
		String city = trimToEmpty(salon.city());
		appendLocation(group, name, city, salon, salonBusinessTypes, salonClientGenders);
	}

	/** Trova gruppo già esistente per subject titolare o per email titolare (un titolare = un gruppo). */
	private StudioGroup resolveExistingGroup(String ownerSub, String ownerEmail) {
		if (ownerSub != null) {
			Optional<StudioGroup> bySub = studioGroupRepository.findByOwnerAuthSubIgnoreCase(ownerSub);
			if (bySub.isPresent()) {
				return bySub.get();
			}
		}
		if (!ownerEmail.isEmpty()) {
			return studioGroupRepository.findByOwnerEmailIgnoreCase(ownerEmail).orElse(null);
		}
		return null;
	}

	private static void ensureEmailMatchesStoredOwner(StudioGroup group, String requestEmail) {
		if (requestEmail.isEmpty()) {
			return;
		}
		String stored = group.getOwnerEmail();
		if (stored == null || stored.isBlank()) {
			return;
		}
		if (!stored.equalsIgnoreCase(requestEmail)) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"OWNER_EMAIL_MISMATCH",
					"Questo account titolare è già associato a un altro indirizzo email. Per aggiungere una nuova sede "
							+ "usa sempre la stessa email con cui hai registrato il primo salone.");
		}
	}

	private void appendLocation(
			StudioGroup group,
			String displayName,
			String city,
			RegistrationSalonLocation salon,
			List<SalonBusinessType> salonBusinessTypes,
			List<SalonClientGender> salonClientGenders) {
		String baseSlug = slugify(firstNonBlank(salon.displayName(), displayName));
		String slug = uniqueSlug(baseSlug);
		Location loc = new Location(group, slug, displayName, city);
		String addr = trimToEmpty(salon.addressLine1());
		String postal = trimToEmpty(salon.postalCode());
		String province = trimToEmpty(salon.province());
		if (!addr.isEmpty()) {
			loc.setAddressLine(addr);
		}
		if (!postal.isEmpty()) {
			loc.setPostalCode(postal);
		}
		if (!province.isEmpty()) {
			loc.setProvince(province.toUpperCase(Locale.ROOT));
		}
		if (salonBusinessTypes != null && !salonBusinessTypes.isEmpty()) {
			loc.setSalonBusinessTypes(SalonBusinessType.toCsv(salonBusinessTypes));
		}
		if (salonClientGenders != null && !salonClientGenders.isEmpty()) {
			loc.setSalonClientGenders(SalonClientGender.toCsv(salonClientGenders));
		}
		Location saved = locationRepository.save(loc);
		salonLocationGeocodingAsyncService.scheduleGeocode(saved.getId());
	}

	private String uniqueSlug(String base) {
		String candidate = base;
		int n = 0;
		while (locationRepository.existsBySlug(candidate)) {
			n++;
			candidate = base + "-" + n;
			if (n > 5000) {
				return base + "-" + UUID.randomUUID().toString().substring(0, 8);
			}
		}
		return candidate;
	}

	private static String firstNonBlank(String... values) {
		if (values == null) {
			return "Salone";
		}
		for (String v : values) {
			if (v != null && !v.isBlank()) {
				return v.trim();
			}
		}
		return "Salone";
	}

	private static String trimToEmpty(String s) {
		return s != null ? s.trim() : "";
	}

	/** Slug URL: minuscolo, accenti rimossi, solo [a-z0-9-]. */
	static String slugify(String raw) {
		if (raw == null || raw.isBlank()) {
			return "salon";
		}
		String s = Normalizer.normalize(raw.trim(), Normalizer.Form.NFD)
				.replaceAll("\\p{M}+", "");
		s = s.toLowerCase(Locale.ROOT);
		s = s.replaceAll("[^a-z0-9]+", "-");
		s = s.replaceAll("^-+|-+$", "");
		if (s.length() > 80) {
			s = s.substring(0, 80).replaceAll("-+$", "");
		}
		return s.isEmpty() ? "salon" : s;
	}
}
