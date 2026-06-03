package it.velvet.admin.service;

import it.velvet.admin.dto.SuperAdminConsumerRow;
import it.velvet.common.api.BusinessException;
import it.velvet.config.VelvetSecurityProperties;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.security.auth.VelvetTokenService;
import it.velvet.studio.domain.StudioGroup;
import it.velvet.studio.domain.StudioGroupRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
public class SuperAdminConsumerManagementService {

	private final ConsumerProfileRepository consumerProfileRepository;
	private final StudioGroupRepository studioGroupRepository;
	private final VelvetTokenService velvetTokenService;
	private final VelvetSecurityProperties securityProperties;

	public SuperAdminConsumerManagementService(
			ConsumerProfileRepository consumerProfileRepository,
			StudioGroupRepository studioGroupRepository,
			VelvetTokenService velvetTokenService,
			VelvetSecurityProperties securityProperties) {
		this.consumerProfileRepository = consumerProfileRepository;
		this.studioGroupRepository = studioGroupRepository;
		this.velvetTokenService = velvetTokenService;
		this.securityProperties = securityProperties;
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
	 * JWT Velvet per il profilo consumatore (stesso formato di {@code POST /api/v1/auth/login}), senza password.
	 * Riservato al super admin autenticato. Non applicabile ai profili con ruolo {@code ADMIN}.
	 */
	@Transactional
	public ConsumerVelvetSession issueConsumerVelvetSession(UUID id) {
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
		String accessToken = velvetTokenService.createAccessToken(forToken);
		return new ConsumerVelvetSession(accessToken, securityProperties.authJwtTtlHours() * 3600L);
	}

	private static boolean hasRole(String securityRolesCsv, String role) {
		if (securityRolesCsv == null || securityRolesCsv.isBlank() || role == null || role.isBlank()) {
			return false;
		}
		List<String> parts = Arrays.stream(securityRolesCsv.split("[,;\\s]+"))
				.map(String::trim)
				.filter(s -> !s.isEmpty())
				.toList();
		return parts.contains(role);
	}

	@Transactional
	public SuperAdminConsumerRow updatePlanTier(UUID id, String rawPlanTier) {
		ConsumerProfile p = consumerProfileRepository.findById(id)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Profilo non trovato."));
		String tier = StudioGroup.canonicalPlanTier(rawPlanTier);
		p.setPlanTier(tier);
		consumerProfileRepository.save(p);
		studioGroupRepository.findByOwnerKeycloakSubIgnoreCase(p.getKeycloakSub()).ifPresent(g -> {
			g.applyPlanTier(tier);
			studioGroupRepository.save(g);
		});
		return toRow(p);
	}

	public record ConsumerVelvetSession(String accessToken, long expiresInSeconds) {
	}
}
