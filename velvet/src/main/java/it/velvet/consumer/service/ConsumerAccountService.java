package it.velvet.consumer.service;

import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.security.auth.VelvetRefreshTokenService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

@Service
public class ConsumerAccountService {

	private final ConsumerProfileRepository consumerProfileRepository;
	private final VelvetRefreshTokenService velvetRefreshTokenService;

	public ConsumerAccountService(
			ConsumerProfileRepository consumerProfileRepository,
			VelvetRefreshTokenService velvetRefreshTokenService) {
		this.consumerProfileRepository = consumerProfileRepository;
		this.velvetRefreshTokenService = velvetRefreshTokenService;
	}

	/**
	 * Chiusura account consumatore: soft-delete / anonimizzazione profilo locale.
	 * Idempotente: seconda chiamata con stesso subject non modifica ulteriormente.
	 */
	@Transactional
	public void deleteAccount(String keycloakSub) {
		Optional<ConsumerProfile> existing = consumerProfileRepository.findByKeycloakSub(keycloakSub);
		if (existing.isPresent() && existing.get().getDeletedAt() != null) {
			return;
		}
		existing.ifPresent(profile -> {
			velvetRefreshTokenService.revokeAllForProfile(profile.getId());
			profile.setDeletedAt(Instant.now());
			profile.setEmail(null);
			profile.setDisplayName(null);
			profile.setPasswordHash(null);
			consumerProfileRepository.save(profile);
		});
	}
}
