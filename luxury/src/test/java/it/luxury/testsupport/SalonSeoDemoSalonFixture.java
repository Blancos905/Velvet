package it.luxury.testsupport;

import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.LocationRepository;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.studio.domain.StudioGroupRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sede premium {@code demo-salone} per test SEO (indipendente dal {@code LuxuryDemoDataLoader} profilo {@code local}).
 */
@Component
public class SalonSeoDemoSalonFixture {

	public static final String DEMO_SLUG = "demo-salone";
	public static final String DEMO_SALON_NAME = "Luxury Demo Salon";

	private final StudioGroupRepository studioGroupRepository;
	private final LocationRepository locationRepository;
	private final PremiumEntitlementTestFixture premiumEntitlementTestFixture;

	public SalonSeoDemoSalonFixture(
			StudioGroupRepository studioGroupRepository,
			LocationRepository locationRepository,
			PremiumEntitlementTestFixture premiumEntitlementTestFixture) {
		this.studioGroupRepository = studioGroupRepository;
		this.locationRepository = locationRepository;
		this.premiumEntitlementTestFixture = premiumEntitlementTestFixture;
	}

	@Transactional
	public void ensureDemoPremiumSalon() {
		var existing = locationRepository.findBySlug(DEMO_SLUG);
		if (existing.isPresent()) {
			StudioGroup group = existing.get().getStudioGroup();
			if (!"PREMIUM".equals(StudioGroup.canonicalPlanTier(group.getPlanTier()))) {
				group.applyPlanTier("PREMIUM");
				studioGroupRepository.save(group);
			}
			premiumEntitlementTestFixture.ensureActivePremiumSubscription(group);
			return;
		}
		String ownerEmail = "seo-fixture-demo-salone@luxury.test";
		String ownerSub = "seo-fixture-demo-salone-sub";
		StudioGroup group = studioGroupRepository
				.findByOwnerEmailIgnoreCase(ownerEmail)
				.orElseGet(() -> studioGroupRepository.save(
						new StudioGroup(DEMO_SALON_NAME, ownerEmail, "PREMIUM", ownerSub)));
		if (!"PREMIUM".equals(StudioGroup.canonicalPlanTier(group.getPlanTier()))) {
			group.applyPlanTier("PREMIUM");
			studioGroupRepository.save(group);
		}
		premiumEntitlementTestFixture.ensureActivePremiumSubscription(group);
		Location loc = new Location(group, DEMO_SLUG, DEMO_SALON_NAME, "Milano");
		loc.setAddressLine("Via Esempio 1");
		loc.setPostalCode("20100");
		loc.setLatitude(45.4642);
		loc.setLongitude(9.1900);
		locationRepository.save(loc);
	}
}
