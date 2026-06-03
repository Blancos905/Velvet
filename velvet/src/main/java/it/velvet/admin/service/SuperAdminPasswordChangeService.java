package it.velvet.admin.service;

import it.velvet.admin.domain.PlatformSuperAdminCredential;
import it.velvet.admin.domain.PlatformSuperAdminCredentialRepository;
import it.velvet.bootstrap.SuperAdminConsumerBootstrap;
import it.velvet.common.api.BusinessException;
import it.velvet.config.VelvetSuperAdminProperties;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class SuperAdminPasswordChangeService {

	private final PlatformSuperAdminCredentialRepository credentialRepository;
	private final ConsumerProfileRepository consumerProfileRepository;
	private final PasswordEncoder passwordEncoder;
	private final VelvetSuperAdminAuthService superAdminAuthService;
	private final VelvetSuperAdminProperties superAdminProperties;

	public SuperAdminPasswordChangeService(
			PlatformSuperAdminCredentialRepository credentialRepository,
			ConsumerProfileRepository consumerProfileRepository,
			PasswordEncoder passwordEncoder,
			VelvetSuperAdminAuthService superAdminAuthService,
			VelvetSuperAdminProperties superAdminProperties) {
		this.credentialRepository = credentialRepository;
		this.consumerProfileRepository = consumerProfileRepository;
		this.passwordEncoder = passwordEncoder;
		this.superAdminAuthService = superAdminAuthService;
		this.superAdminProperties = superAdminProperties;
	}

	@Transactional
	public void changePassword(String currentPassword, String newPassword) {
		superAdminAuthService.assertCurrentPassword(currentPassword);
		if (newPassword == null || newPassword.length() < 8) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"VALIDATION_ERROR",
					"La nuova password deve avere almeno 8 caratteri.");
		}
		Optional<PlatformSuperAdminCredential> stored =
				credentialRepository.findById(PlatformSuperAdminCredential.SINGLETON_ID);
		if (stored.isEmpty()) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"SUPER_ADMIN_PASSWORD_READONLY",
					"Le credenziali sono definite solo in configurazione server (velvet.super-admin.*). "
							+ "Per cambiare password aggiorna l'ambiente oppure completa la registrazione super admin che salva le credenziali nel database.");
		}
		PlatformSuperAdminCredential c = stored.get();
		c.setPasswordHash(passwordEncoder.encode(newPassword));
		credentialRepository.save(c);
		syncConsumerFromCredential(c);
	}

	private void syncConsumerFromCredential(PlatformSuperAdminCredential cred) {
		String email = cred.getUsername();
		String hash = cred.getPasswordHash();
		Optional<ConsumerProfile> bySub =
				consumerProfileRepository.findByKeycloakSub(SuperAdminConsumerBootstrap.SUPER_ADMIN_KEYCLOAK_SUB);
		if (bySub.isPresent()) {
			ConsumerProfile p = bySub.get();
			p.setEmail(email);
			p.setPasswordHash(hash);
			p.setSecurityRoles("ADMIN,CLIENT");
			SuperAdminConsumerBootstrap.applyOptionalDisplayAndPhone(p, superAdminProperties);
			if (p.getDeletedAt() != null) {
				p.setDeletedAt(null);
			}
			consumerProfileRepository.save(p);
			return;
		}
		Optional<ConsumerProfile> byEmail = consumerProfileRepository.findByEmailIgnoreCase(email);
		if (byEmail.isPresent()) {
			ConsumerProfile p = byEmail.get();
			if (!SuperAdminConsumerBootstrap.SUPER_ADMIN_KEYCLOAK_SUB.equals(p.getKeycloakSub())
					&& consumerProfileRepository
							.findByKeycloakSub(SuperAdminConsumerBootstrap.SUPER_ADMIN_KEYCLOAK_SUB)
							.isEmpty()) {
				p.setKeycloakSub(SuperAdminConsumerBootstrap.SUPER_ADMIN_KEYCLOAK_SUB);
			}
			p.setPasswordHash(hash);
			p.setSecurityRoles("ADMIN,CLIENT");
			SuperAdminConsumerBootstrap.applyOptionalDisplayAndPhone(p, superAdminProperties);
			if (p.getDeletedAt() != null) {
				p.setDeletedAt(null);
			}
			consumerProfileRepository.save(p);
			return;
		}
		ConsumerProfile p = new ConsumerProfile(SuperAdminConsumerBootstrap.SUPER_ADMIN_KEYCLOAK_SUB, email, "Super admin");
		p.setPasswordHash(hash);
		p.setSecurityRoles("ADMIN,CLIENT");
		SuperAdminConsumerBootstrap.applyOptionalDisplayAndPhone(p, superAdminProperties);
		consumerProfileRepository.save(p);
	}
}
