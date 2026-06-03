package it.velvet.bootstrap;

import it.velvet.admin.domain.PlatformSuperAdminCredential;
import it.velvet.admin.domain.PlatformSuperAdminCredentialRepository;
import it.velvet.config.VelvetSuperAdminProperties;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Crea il {@link ConsumerProfile} canonico del super admin se manca ma esiste la credenziale piattaforma
 * (stessa logica di {@link SuperAdminConsumerProfileEnsureRunner}), così l’inbox assistenza e {@code POST /me/support/requests}
 * non falliscono con {@code SUPPORT_UNAVAILABLE} dopo un reset parziale del DB.
 */
@Service
public class SuperAdminConsumerProfileEnsureService {

	private static final Logger log = LoggerFactory.getLogger(SuperAdminConsumerProfileEnsureService.class);

	private final PlatformSuperAdminCredentialRepository platformSuperAdminCredentialRepository;
	private final ConsumerProfileRepository consumerProfileRepository;
	private final VelvetSuperAdminProperties superAdminProperties;

	public SuperAdminConsumerProfileEnsureService(
			PlatformSuperAdminCredentialRepository platformSuperAdminCredentialRepository,
			ConsumerProfileRepository consumerProfileRepository,
			VelvetSuperAdminProperties superAdminProperties) {
		this.platformSuperAdminCredentialRepository = platformSuperAdminCredentialRepository;
		this.consumerProfileRepository = consumerProfileRepository;
		this.superAdminProperties = superAdminProperties;
	}

	/**
	 * No-op se il profilo esiste già; altrimenti tenta creazione da {@code platform_super_admin_credential}.
	 */
	@Transactional
	public void ensureSuperAdminConsumerProfileExists() {
		if (consumerProfileRepository.findByKeycloakSub(SuperAdminConsumerBootstrap.SUPER_ADMIN_KEYCLOAK_SUB).isPresent()) {
			return;
		}
		var credOpt = platformSuperAdminCredentialRepository.findById(PlatformSuperAdminCredential.SINGLETON_ID);
		if (credOpt.isEmpty()) {
			return;
		}
		PlatformSuperAdminCredential cred = credOpt.get();
		String email = cred.getUsername() != null ? cred.getUsername().trim().toLowerCase() : "";
		if (email.isBlank()) {
			log.warn("Super admin ensure: username credenziale vuoto, skip creazione profilo consumer.");
			return;
		}
		var byEmail = consumerProfileRepository.findByEmailIgnoreCase(email);
		if (byEmail.isPresent()) {
			ConsumerProfile existing = byEmail.get();
			if (SuperAdminConsumerBootstrap.SUPER_ADMIN_KEYCLOAK_SUB.equals(existing.getKeycloakSub())) {
				return;
			}
			if (consumerProfileRepository.findByKeycloakSub(SuperAdminConsumerBootstrap.SUPER_ADMIN_KEYCLOAK_SUB).isPresent()) {
				log.warn(
						"Super admin ensure: email {} già usata e il sub canonico è assegnato ad altro profilo — skip.",
						email);
				return;
			}
			existing.setKeycloakSub(SuperAdminConsumerBootstrap.SUPER_ADMIN_KEYCLOAK_SUB);
			existing.setPasswordHash(cred.getPasswordHash());
			existing.setSecurityRoles("ADMIN,CLIENT");
			SuperAdminConsumerBootstrap.applyOptionalDisplayAndPhone(existing, superAdminProperties);
			if (existing.getDeletedAt() != null) {
				existing.setDeletedAt(null);
			}
			consumerProfileRepository.save(existing);
			log.info("Super admin ensure: allineato keycloak_sub canonico sul profilo con email {}.", email);
			return;
		}
		ConsumerProfile p = new ConsumerProfile(SuperAdminConsumerBootstrap.SUPER_ADMIN_KEYCLOAK_SUB, email, "Super admin");
		p.setPasswordHash(cred.getPasswordHash());
		p.setSecurityRoles("ADMIN,CLIENT");
		SuperAdminConsumerBootstrap.applyOptionalDisplayAndPhone(p, superAdminProperties);
		consumerProfileRepository.save(p);
		log.info("Super admin ensure: creato consumer_profiles per assistenza (email {}).", email);
	}
}
