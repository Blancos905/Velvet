package it.velvet.billing.service;

import it.velvet.studio.domain.StudioGroup;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

/** Prova gratuita Premium dalla registrazione salone (senza Stripe). */
@Service
public class SalonPromotionalTrialService {

	@Value("${velvet.billing.promotional-trial-months:6}")
	private int promotionalTrialMonths;

	public Instant promotionalTrialEndsAt(StudioGroup group) {
		if (group == null || group.getCreatedAt() == null || promotionalTrialMonths <= 0) {
			return null;
		}
		return group.getCreatedAt()
				.atZone(ZoneId.systemDefault())
				.plusMonths(promotionalTrialMonths)
				.toInstant();
	}

	public boolean isWithinPromotionalTrial(StudioGroup group, Instant now) {
		Instant endsAt = promotionalTrialEndsAt(group);
		return endsAt != null && now.isBefore(endsAt);
	}
}
