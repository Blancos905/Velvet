package it.velvet.bootstrap;

import it.velvet.admin.domain.PlatformSuperAdminCredential;
import it.velvet.admin.domain.PlatformSuperAdminCredentialRepository;
import it.velvet.config.VelvetSuperAdminProperties;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Locale;
import java.util.Optional;

import static it.velvet.config.VelvetAsyncConfiguration.BOOTSTRAP_EXECUTOR;

/**
 * Allinea un {@link ConsumerProfile} in database con le credenziali {@code velvet.super-admin.*} così il login
 * standard {@code POST /api/v1/auth/login} (email + password) funziona oltre a {@code /api/v1/admin/auth/login}.
 */
@Component
public class SuperAdminConsumerBootstrap {

	private static final Logger log = LoggerFactory.getLogger(SuperAdminConsumerBootstrap.class);

	/** Subject stabile dedicato al super admin in tabella {@code consumer_profiles}. */
	public static final String SUPER_ADMIN_KEYCLOAK_SUB = "b0000000-0000-4000-8000-000000000001";

	private final VelvetSuperAdminProperties superAdminProperties;
	private final PlatformSuperAdminCredentialRepository platformSuperAdminCredentialRepository;
	private final ConsumerProfileRepository consumerProfileRepository;
	private final PasswordEncoder passwordEncoder;

	public SuperAdminConsumerBootstrap(
			VelvetSuperAdminProperties superAdminProperties,
			PlatformSuperAdminCredentialRepository platformSuperAdminCredentialRepository,
			ConsumerProfileRepository consumerProfileRepository,
			PasswordEncoder passwordEncoder) {
		this.superAdminProperties = superAdminProperties;
		this.platformSuperAdminCredentialRepository = platformSuperAdminCredentialRepository;
		this.consumerProfileRepository = consumerProfileRepository;
		this.passwordEncoder = passwordEncoder;
	}

	/**
	 * Se {@code velvet.super-admin.profile-*} sono valorizzati, aggiorna nome e telefono sul profilo consumer del super admin
	 * (stessi campi usati da assistenza e PATCH pannello).
	 */
	/** Super admin: login {@code POST /api/v1/auth/login} non richiede conferma email separata. */
	public static void markEmailVerified(ConsumerProfile p) {
		if (p == null) {
			return;
		}
		if (p.getEmailVerifiedAt() == null) {
			p.setEmailVerifiedAt(Instant.now());
		}
		p.setEmailVerificationTokenHash(null);
		p.setEmailVerificationExpiresAt(null);
	}

	public static void applyOptionalDisplayAndPhone(ConsumerProfile p, VelvetSuperAdminProperties props) {
		if (p == null || props == null) {
			return;
		}
		String dn = props.profileDisplayName().trim();
		if (!dn.isEmpty()) {
			p.setDisplayName(dn);
		}
		String ph = props.profilePhone().trim();
		if (!ph.isEmpty()) {
			p.setPhone(ph);
		}
	}

	@EventListener(ApplicationReadyEvent.class)
	@Async(BOOTSTRAP_EXECUTOR)
	public void onApplicationReady() {
		var stored = platformSuperAdminCredentialRepository.findById(PlatformSuperAdminCredential.SINGLETON_ID);
		if (stored.isPresent()) {
			syncConsumerFromStoredCredential(stored.get());
			return;
		}
		if (!superAdminProperties.configured()) {
			return;
		}
		String rawUser = superAdminProperties.username().trim();
		if (!rawUser.contains("@")) {
			log.debug("Super admin bootstrap: username senza @ — nessun profilo consumer creato.");
			return;
		}
		String email = rawUser.toLowerCase(Locale.ROOT);
		String plainPassword = superAdminProperties.password().trim();
		if (plainPassword.isEmpty() && superAdminProperties.passwordHash().trim().isEmpty()) {
			return;
		}
		if (plainPassword.isEmpty()) {
			log.debug("Super admin bootstrap: solo password-hash configurata — nessun aggiornamento password su DB.");
		}

		Optional<ConsumerProfile> bySub = consumerProfileRepository.findByKeycloakSub(SUPER_ADMIN_KEYCLOAK_SUB);
		if (bySub.isPresent()) {
			syncProfile(bySub.get(), email, plainPassword);
			return;
		}
		Optional<ConsumerProfile> byEmail = consumerProfileRepository.findByEmailIgnoreCase(email);
		if (byEmail.isPresent()) {
			ConsumerProfile p = byEmail.get();
			if (consumerProfileRepository.findByKeycloakSub(SUPER_ADMIN_KEYCLOAK_SUB).isPresent()
					&& !SUPER_ADMIN_KEYCLOAK_SUB.equals(p.getKeycloakSub())) {
				log.warn(
						"Super admin bootstrap: l'email {} è già usata ma il sub canonico è assegnato ad altro profilo.",
						email);
				return;
			}
			if (!SUPER_ADMIN_KEYCLOAK_SUB.equals(p.getKeycloakSub())) {
				p.setKeycloakSub(SUPER_ADMIN_KEYCLOAK_SUB);
			}
			syncProfile(p, email, plainPassword);
			log.info("Super admin: profilo consumer (email esistente) allineato da properties ({}).", email);
			return;
		}
		if (plainPassword.isEmpty()) {
			return;
		}
		ConsumerProfile p = new ConsumerProfile(SUPER_ADMIN_KEYCLOAK_SUB, email, "Super admin");
		p.setPasswordHash(passwordEncoder.encode(plainPassword));
		p.setSecurityRoles("ADMIN,CLIENT");
		markEmailVerified(p);
		applyOptionalDisplayAndPhone(p, superAdminProperties);
		consumerProfileRepository.save(p);
		log.info("Super admin: profilo consumer creato per login email ({}).", email);
	}

	private void syncProfile(ConsumerProfile p, String email, String plainPassword) {
		p.setEmail(email);
		if (!plainPassword.isEmpty()) {
			p.setPasswordHash(passwordEncoder.encode(plainPassword));
		}
		p.setSecurityRoles("ADMIN,CLIENT");
		markEmailVerified(p);
		applyOptionalDisplayAndPhone(p, superAdminProperties);
		if (p.getDeletedAt() != null) {
			p.setDeletedAt(null);
		}
		consumerProfileRepository.save(p);
		log.info("Super admin: profilo consumer aggiornato ({}).", email);
	}

	private void syncConsumerFromStoredCredential(PlatformSuperAdminCredential cred) {
		String email = cred.getUsername();
		String hash = cred.getPasswordHash();
		Optional<ConsumerProfile> bySub = consumerProfileRepository.findByKeycloakSub(SUPER_ADMIN_KEYCLOAK_SUB);
		if (bySub.isPresent()) {
			ConsumerProfile p = bySub.get();
			p.setEmail(email);
			p.setPasswordHash(hash);
			p.setSecurityRoles("ADMIN,CLIENT");
			markEmailVerified(p);
			applyOptionalDisplayAndPhone(p, superAdminProperties);
			if (p.getDeletedAt() != null) {
				p.setDeletedAt(null);
			}
			consumerProfileRepository.save(p);
			log.info("Super admin: profilo consumer allineato alle credenziali persistite ({}).", email);
			return;
		}
		Optional<ConsumerProfile> byEmail = consumerProfileRepository.findByEmailIgnoreCase(email);
		if (byEmail.isPresent()) {
			ConsumerProfile p = byEmail.get();
			if (!SUPER_ADMIN_KEYCLOAK_SUB.equals(p.getKeycloakSub())
					&& consumerProfileRepository.findByKeycloakSub(SUPER_ADMIN_KEYCLOAK_SUB).isEmpty()) {
				p.setKeycloakSub(SUPER_ADMIN_KEYCLOAK_SUB);
			}
			p.setPasswordHash(hash);
			p.setSecurityRoles("ADMIN,CLIENT");
			markEmailVerified(p);
			applyOptionalDisplayAndPhone(p, superAdminProperties);
			if (p.getDeletedAt() != null) {
				p.setDeletedAt(null);
			}
			consumerProfileRepository.save(p);
			log.info("Super admin: profilo consumer (email esistente) allineato alle credenziali persistite ({}).", email);
			return;
		}
		ConsumerProfile p = new ConsumerProfile(SUPER_ADMIN_KEYCLOAK_SUB, email, "Super admin");
		p.setPasswordHash(hash);
		p.setSecurityRoles("ADMIN,CLIENT");
		markEmailVerified(p);
		applyOptionalDisplayAndPhone(p, superAdminProperties);
		consumerProfileRepository.save(p);
		log.info("Super admin: profilo consumer creato da credenziali persistite ({}).", email);
	}
}
