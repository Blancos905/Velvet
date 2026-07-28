package it.luxury.studio.service;

import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.consumer.service.ConsumerProfileService;
import it.luxury.security.auth.LuxuryUserPrincipal;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.studio.domain.StudioGroupRepository;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Optional;

/**
 * Risolve lo {@link StudioGroup} del titolare dal principal autenticato (stessa logica di {@code GET /api/v1/me/salon}).
 */
@Component
public class StudioGroupOwnerResolver {

	private final StudioGroupRepository studioGroupRepository;
	private final ConsumerProfileRepository consumerProfileRepository;
	private final ConsumerProfileService consumerProfileService;

	public StudioGroupOwnerResolver(
			StudioGroupRepository studioGroupRepository,
			ConsumerProfileRepository consumerProfileRepository,
			ConsumerProfileService consumerProfileService) {
		this.studioGroupRepository = studioGroupRepository;
		this.consumerProfileRepository = consumerProfileRepository;
		this.consumerProfileService = consumerProfileService;
	}

	/**
	 * @return vuoto se principal assente o subject vuoto, oppure se non esiste ancora uno studio per questo titolare
	 */
	public Optional<StudioGroup> resolveStudioGroupForOwner(LuxuryUserPrincipal principal) {
		if (principal == null || principal.getSubject() == null || principal.getSubject().isBlank()) {
			return Optional.empty();
		}
		consumerProfileService.requireActiveProfile(principal);
		String sub = principal.getSubject().trim();
		Optional<StudioGroup> bySub = studioGroupRepository.findByOwnerAuthSubIgnoreCase(sub);
		if (bySub.isPresent()) {
			return bySub;
		}
		String email = principal.getEmail();
		if (email == null || email.isBlank()) {
			email = consumerProfileRepository.findByAuthSub(sub)
					.filter(p -> p.getDeletedAt() == null)
					.map(p -> p.getEmail())
					.filter(e -> e != null && !e.isBlank())
					.map(e -> e.trim().toLowerCase(Locale.ROOT))
					.orElse(null);
		}
		else {
			email = email.trim().toLowerCase(Locale.ROOT);
		}
		if (email == null || email.isBlank()) {
			return Optional.empty();
		}
		return studioGroupRepository.findByOwnerEmailIgnoreCase(email);
	}
}
