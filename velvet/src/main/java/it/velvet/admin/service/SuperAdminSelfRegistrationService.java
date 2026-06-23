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

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Locale;
import java.util.Optional;

@Service
public class SuperAdminSelfRegistrationService {

	private final VelvetSuperAdminProperties superAdminProperties;
	private final PlatformSuperAdminCredentialRepository credentialRepository;
	private final ConsumerProfileRepository consumerProfileRepository;
	private final PasswordEncoder passwordEncoder;

	public SuperAdminSelfRegistrationService(
			VelvetSuperAdminProperties superAdminProperties,
			PlatformSuperAdminCredentialRepository credentialRepository,
			ConsumerProfileRepository consumerProfileRepository,
			PasswordEncoder passwordEncoder) {
		this.superAdminProperties = superAdminProperties;
		this.credentialRepository = credentialRepository;
		this.consumerProfileRepository = consumerProfileRepository;
		this.passwordEncoder = passwordEncoder;
	}

	public boolean registrationAvailable() {
		if (!superAdminProperties.setupTokenConfigured()) {
			return false;
		}
		if (credentialRepository.existsById(PlatformSuperAdminCredential.SINGLETON_ID)) {
			return false;
		}
		return !superAdminProperties.configured();
	}

	@Transactional
	public void register(String setupToken, String username, String password) {
		if (!registrationAvailable()) {
			throw new BusinessException(
					HttpStatus.FORBIDDEN,
					"SUPER_ADMIN_REGISTER_DISABLED",
					"Registrazione super admin non disponibile (token di setup assente, credenziali già presenti o super admin già configurato via proprietà).");
		}
		if (!constantTimeEquals(setupToken != null ? setupToken.trim() : "", superAdminProperties.setupToken().trim())) {
			throw new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_SETUP_TOKEN", "Token di setup non valido.");
		}
		String email = username != null ? username.trim().toLowerCase(Locale.ROOT) : "";
		if (email.isBlank() || !email.contains("@")) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_EMAIL", "Inserisci un indirizzo email valido.");
		}
		if (password == null || password.length() < 8) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_PASSWORD", "La password deve avere almeno 8 caratteri.");
		}
		Optional<ConsumerProfile> other = consumerProfileRepository.findByEmailIgnoreCase(email);
		if (other.isPresent() && !SuperAdminConsumerBootstrap.SUPER_ADMIN_KEYCLOAK_SUB.equals(other.get().getKeycloakSub())) {
			throw new BusinessException(
					HttpStatus.CONFLICT,
					"EMAIL_IN_USE",
					"Questa email è già associata a un altro account. Usa un indirizzo diverso.");
		}
		String hash = passwordEncoder.encode(password);
		credentialRepository.save(new PlatformSuperAdminCredential(email, hash));
		upsertSuperAdminConsumer(email, hash);
	}

	private void upsertSuperAdminConsumer(String email, String passwordHash) {
		Optional<ConsumerProfile> bySub = consumerProfileRepository.findByKeycloakSub(SuperAdminConsumerBootstrap.SUPER_ADMIN_KEYCLOAK_SUB);
		if (bySub.isPresent()) {
			ConsumerProfile p = bySub.get();
			p.setEmail(email);
			p.setPasswordHash(passwordHash);
			p.setSecurityRoles("ADMIN,CLIENT");
			SuperAdminConsumerBootstrap.markEmailVerified(p);
			if (p.getDeletedAt() != null) {
				p.setDeletedAt(null);
			}
			consumerProfileRepository.save(p);
			return;
		}
		ConsumerProfile p = new ConsumerProfile(SuperAdminConsumerBootstrap.SUPER_ADMIN_KEYCLOAK_SUB, email, "Super admin");
		p.setPasswordHash(passwordHash);
		p.setSecurityRoles("ADMIN,CLIENT");
		SuperAdminConsumerBootstrap.markEmailVerified(p);
		consumerProfileRepository.save(p);
	}

	private static boolean constantTimeEquals(String a, String b) {
		try {
			MessageDigest md = MessageDigest.getInstance("SHA-256");
			byte[] da = md.digest(a.getBytes(StandardCharsets.UTF_8));
			byte[] db = md.digest(b.getBytes(StandardCharsets.UTF_8));
			return MessageDigest.isEqual(da, db);
		}
		catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException(e);
		}
	}
}
