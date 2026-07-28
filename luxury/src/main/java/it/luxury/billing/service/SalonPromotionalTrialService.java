package it.luxury.billing.service;

import it.luxury.studio.domain.StudioGroup;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;

/** Prova gratuita Premium dalla registrazione salone (fallback senza Stripe). */
@Service
public class SalonPromotionalTrialService {

	@Value("${luxury.billing.promotional-trial-days:60}")
	private int promotionalTrialDays;

	public Instant promotionalTrialEndsAt(StudioGroup group) {
		if (group == null || group.getCreatedAt() == null || promotionalTrialDays <= 0) {
			return null;
		}
		return group.getCreatedAt()
				.atZone(ZoneId.systemDefault())
				.plusDays(promotionalTrialDays)
				.toInstant();
	}

	public boolean isWithinPromotionalTrial(StudioGroup group, Instant now) {
		Instant endsAt = promotionalTrialEndsAt(group);
		return endsAt != null && now.isBefore(endsAt);
	}
}
