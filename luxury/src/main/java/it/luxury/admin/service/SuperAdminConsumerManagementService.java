package it.luxury.admin.service;

import it.luxury.admin.dto.SuperAdminConsumerRow;
import it.luxury.common.api.BusinessException;
import it.luxury.config.LuxurySecurityProperties;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.security.auth.LuxuryTokenService;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.studio.domain.StudioGroupRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import it.luxury.security.auth.LuxuryUserPrincipal;
import java.util.UUID;

@Service
public class SuperAdminConsumerManagementService {

	private final ConsumerProfileRepository consumerProfileRepository;
	private final StudioGroupRepository studioGroupRepository;
	private final LuxuryTokenService luxuryTokenService;
	private final LuxurySecurityProperties securityProperties;
	private final SuperAdminProfileAccessNotificationService profileAccessNotificationService;

	public SuperAdminConsumerManagementService(
			ConsumerProfileRepository consumerProfileRepository,
			StudioGroupRepository studioGroupRepository,
			LuxuryTokenService luxuryTokenService,
			LuxurySecurityProperties securityProperties,
			SuperAdminProfileAccessNotificationService profileAccessNotificationService) {
		this.consumerProfileRepository = consumerProfileRepository;
		this.studioGroupRepository = studioGroupRepository;
		this.luxuryTokenService = luxuryTokenService;
		this.securityProperties = securityProperties;
		this.profileAccessNotificationService = profileAccessNotificationService;
	}

	public Page<SuperAdminConsumerRow> list(Pageable pageable) {
		return consumerProfileRepository.findAll(pageable).map(this::toRow);
	}

	private SuperAdminConsumerRow toRow(ConsumerProfile p) {
		return new SuperAdminConsumerRow(
				p.getId(),
				p.getEmail(),
				p.getDisplayName(),
				p.getSecurityRoles(),
				p.getPlanTier(),
				p.getDeletedAt());
	}

	@Transactional
	public void softDelete(UUID id) {
		ConsumerProfile p = consumerProfileRepository.findById(id)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Profilo non trovato."));
		if (p.getDeletedAt() != null) {
			return;
		}
		p.setDeletedAt(Instant.now());
		p.setEmail(null);
		p.setDisplayName(null);
		p.setPasswordHash(null);
		consumerProfileRepository.save(p);
	}

	/**
	 * JWT Luxury per il profilo consumatore (stesso formato di {@code POST /api/v1/auth/login}), senza password.
	 * Riservato al super admin autenticato. Non applicabile ai profili con ruolo {@code ADMIN}.
	 */
	@Transactional
	public ConsumerLuxurySession issueConsumerLuxurySession(UUID id) {
		ConsumerProfile p = consumerProfileRepository.findById(id)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Profilo non trovato."));
		if (p.getDeletedAt() != null) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"PROFILE_DELETED",
					"Profilo eliminato: impossibile aprire la sessione.");
		}
		if (hasRole(p.getSecurityRoles(), "ADMIN")) {
			throw new BusinessException(
					HttpStatus.FORBIDDEN,
					"CANNOT_IMPERSONATE_ADMIN",
					"Impossibile aprire la sessione per un profilo super admin.");
		}
		ConsumerProfile forToken = consumerProfileRepository.findById(p.getId()).orElse(p);
		String accessToken = luxuryTokenService.createAccessToken(forToken);
		profileAccessNotificationService.notifyConsumerProfileAccess(forToken);
		return new ConsumerLuxurySession(accessToken, securityProperties.authJwtTtlHours() * 3600L);
	}

	private static boolean hasRole(String securityRolesCsv, String role) {
		if (role == null || role.isBlank()) {
			return false;
		}
		String normalized = LuxuryUserPrincipal.normalizeAppRoleName(role);
		return LuxuryUserPrincipal.parseRoleStrings(securityRolesCsv).contains(normalized);
	}

	@Transactional
	public SuperAdminConsumerRow updatePlanTier(UUID id, String rawPlanTier) {
		ConsumerProfile p = consumerProfileRepository.findById(id)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Profilo non trovato."));
		String tier = StudioGroup.canonicalPlanTier(rawPlanTier);
		p.setPlanTier(tier);
		consumerProfileRepository.save(p);
		studioGroupRepository.findByOwnerAuthSubIgnoreCase(p.getAuthSub()).ifPresent(g -> {
			g.applyPlanTier(tier);
			studioGroupRepository.save(g);
		});
		return toRow(p);
	}

	public record ConsumerLuxurySession(String accessToken, long expiresInSeconds) {
	}
}
