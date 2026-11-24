package it.luxury.billing.service;

import it.luxury.studio.domain.StudioGroup;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

/** Prova gratuita Premium dalla registrazione salone (fallback senza Stripe). */
@Service
public class SalonPromotionalTrialService {

	@Value("${luxury.billing.promotional-trial-days:30}")
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

	/**
	 * Se restano almeno 49 ore di prova, Stripe incassa la carta subito e addebita a questa data.
	 * Sotto le 48 ore Stripe non accetta un {@code trial_end}: l'addebito parte al checkout.
	 */
	public Long deferredStripeChargeEpochSecond(StudioGroup group, Instant now) {
		Instant endsAt = promotionalTrialEndsAt(group);
		if (endsAt == null || now == null) {
			return null;
		}
		if (!endsAt.isAfter(now.plus(49, ChronoUnit.HOURS))) {
			return null;
		}
		return endsAt.getEpochSecond();
	}
}
