package it.velvet.admin.service;

import it.velvet.admin.domain.PlatformSuperAdminCredential;
import it.velvet.common.api.BusinessException;
import it.velvet.config.VelvetSecurityProperties;
import it.velvet.config.VelvetSuperAdminProperties;
import it.velvet.security.auth.VelvetTokenService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;
import java.util.Locale;

@Service
public class VelvetSuperAdminAuthService {

	/** Subject JWT dedicato al login {@code /api/v1/admin/auth/login}. */
	public static final String SUPER_ADMIN_JWT_SUBJECT = "velvet-super-admin";

	private final VelvetSuperAdminProperties superAdminProperties;
	private final PlatformSuperAdminCredentialSource dbCredentialSource;
	private final PasswordEncoder passwordEncoder;
	private final VelvetTokenService velvetTokenService;
	private final VelvetSecurityProperties securityProperties;

	public VelvetSuperAdminAuthService(
			VelvetSuperAdminProperties superAdminProperties,
			PlatformSuperAdminCredentialSource dbCredentialSource,
			PasswordEncoder passwordEncoder,
			VelvetTokenService velvetTokenService,
			VelvetSecurityProperties securityProperties) {
		this.superAdminProperties = superAdminProperties;
		this.dbCredentialSource = dbCredentialSource;
		this.passwordEncoder = passwordEncoder;
		this.velvetTokenService = velvetTokenService;
		this.securityProperties = securityProperties;
	}

	public boolean isConfigured() {
		if (dbCredentialSource.loadSingleton().isPresent()) {
			return true;
		}
		return superAdminProperties.configured();
	}

	public AuthLoginResult login(String username, String password) {
		if (!isConfigured()) {
			throw new BusinessException(
					HttpStatus.SERVICE_UNAVAILABLE,
					"SUPER_ADMIN_DISABLED",
					"Accesso super admin non attivo: registra il super admin dalla pagina dedicata oppure imposta velvet.super-admin.");
		}
		String u = username != null ? username.trim() : "";
		String p = password != null ? password : "";
		if (u.isEmpty() || p.isEmpty()) {
			throw new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Credenziali non valide.");
		}
		var db = dbCredentialSource.loadSingleton();
		if (db.isPresent()) {
			return loginAgainstDb(db.get(), u, p);
		}
		return loginAgainstProperties(u, p);
	}

	private AuthLoginResult loginAgainstDb(PlatformSuperAdminCredential stored, String u, String p) {
		if (!u.equalsIgnoreCase(stored.getUsername())) {
			throw new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Credenziali non valide.");
		}
		if (!passwordEncoder.matches(p, stored.getPasswordHash())) {
			throw new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Credenziali non valide.");
		}
		return issueToken(u);
	}

	private AuthLoginResult loginAgainstProperties(String u, String p) {
		String configuredUser = superAdminProperties.username().trim();
		if (!u.equalsIgnoreCase(configuredUser)) {
			throw new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Credenziali non valide.");
		}
		assertPasswordMatchesPropertiesPlainPassword(p);
		return issueToken(u);
	}

	/**
	 * Verifica la password attuale del super admin (stessa logica del login, senza controllo username).
	 * Usata dal cambio password nel pannello.
	 */
	public void assertCurrentPassword(String currentPassword) {
		if (!isConfigured()) {
			throw new BusinessException(
					HttpStatus.SERVICE_UNAVAILABLE,
					"SUPER_ADMIN_DISABLED",
					"Accesso super admin non attivo: registra il super admin dalla pagina dedicata oppure imposta velvet.super-admin.");
		}
		String p = currentPassword != null ? currentPassword : "";
		if (p.isEmpty()) {
			throw new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Password attuale non corretta.");
		}
		var db = dbCredentialSource.loadSingleton();
		if (db.isPresent()) {
			if (!passwordEncoder.matches(p, db.get().getPasswordHash())) {
				throw new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Password attuale non corretta.");
			}
			return;
		}
		assertPasswordMatchesPropertiesPlainPassword(p);
	}

	private void assertPasswordMatchesPropertiesPlainPassword(String p) {
		String configuredPass = superAdminProperties.password().trim();
		String configuredHash = superAdminProperties.passwordHash().trim();
		if (!configuredHash.isEmpty()) {
			if (!passwordEncoder.matches(p, configuredHash)) {
				throw new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Password attuale non corretta.");
			}
			return;
		}
		if (configuredPass.isEmpty() || !sha256ConstantTimeEquals(p, configuredPass)) {
			throw new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Password attuale non corretta.");
		}
	}

	private AuthLoginResult issueToken(String u) {
		String normUser = u.toLowerCase(Locale.ROOT);
		String emailClaim = (normUser.contains("@") ? normUser : normUser + "@velvet.superadmin").intern();
		String accessToken = velvetTokenService.createAccessToken(
				null,
				SUPER_ADMIN_JWT_SUBJECT,
				emailClaim,
				List.of("ADMIN"),
				null);
		return new AuthLoginResult(accessToken, securityProperties.authJwtTtlHours() * 3600L);
	}

	private static boolean sha256ConstantTimeEquals(String provided, String configured) {
		try {
			MessageDigest md = MessageDigest.getInstance("SHA-256");
			byte[] a = md.digest(provided.getBytes(StandardCharsets.UTF_8));
			byte[] b = md.digest(configured.getBytes(StandardCharsets.UTF_8));
			return MessageDigest.isEqual(a, b);
		}
		catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException(e);
		}
	}

	public record AuthLoginResult(String accessToken, long expiresInSeconds) {
	}
}
