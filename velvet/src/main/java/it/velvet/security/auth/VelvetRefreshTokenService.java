package it.velvet.security.auth;

import it.velvet.common.api.BusinessException;
import it.velvet.config.VelvetSecurityProperties;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.security.audit.SecurityAuditService;
import it.velvet.security.auth.domain.AuthRefreshToken;
import it.velvet.security.auth.domain.AuthRefreshTokenRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class VelvetRefreshTokenService {

	public static final String REFRESH_COOKIE_NAME = "velvet_rt";

	private static final SecureRandom SECURE_RANDOM = new SecureRandom();

	private final AuthRefreshTokenRepository refreshTokenRepository;
	private final ConsumerProfileRepository consumerProfileRepository;
	private final VelvetTokenService velvetTokenService;
	private final VelvetSecurityProperties securityProperties;
	private final SecurityAuditService securityAuditService;

	public VelvetRefreshTokenService(
			AuthRefreshTokenRepository refreshTokenRepository,
			ConsumerProfileRepository consumerProfileRepository,
			VelvetTokenService velvetTokenService,
			VelvetSecurityProperties securityProperties,
			SecurityAuditService securityAuditService) {
		this.refreshTokenRepository = refreshTokenRepository;
		this.consumerProfileRepository = consumerProfileRepository;
		this.velvetTokenService = velvetTokenService;
		this.securityProperties = securityProperties;
		this.securityAuditService = securityAuditService;
	}

	public RefreshTokenPair issueForProfile(ConsumerProfile profile, HttpServletRequest request) {
		String raw = generateRawToken();
		UUID familyId = UUID.randomUUID();
		AuthRefreshToken entity = persistToken(profile.getId(), raw, familyId, request);
		String accessToken = velvetTokenService.createAccessToken(profile);
		return new RefreshTokenPair(accessToken, raw, entity.getId(), securityProperties.accessTokenTtlSeconds());
	}

	@Transactional
	public RefreshTokenPair rotate(String rawRefreshToken, HttpServletRequest request) {
		if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
			throw invalidRefresh();
		}
		String hash = sha256Hex(rawRefreshToken.trim());
		AuthRefreshToken existing = refreshTokenRepository.findByTokenHash(hash)
				.orElseThrow(this::invalidRefresh);
		Instant now = Instant.now();
		if (!existing.isActive(now)) {
			securityAuditService.record("AUTH_REFRESH", "FAIL", null, existing.getProfileId(), request, "expired_or_revoked");
			throw invalidRefresh();
		}
		ConsumerProfile profile = consumerProfileRepository.findById(existing.getProfileId())
				.filter(p -> p.getDeletedAt() == null)
				.orElseThrow(this::invalidRefresh);

		String newRaw = generateRawToken();
		AuthRefreshToken replacement = persistToken(profile.getId(), newRaw, existing.getFamilyId(), request);
		existing.setRevokedAt(now);
		existing.setReplacedById(replacement.getId());
		refreshTokenRepository.save(existing);

		String accessToken = velvetTokenService.createAccessToken(profile);
		securityAuditService.record("AUTH_REFRESH", "SUCCESS", profile.getKeycloakSub(), profile.getId(), request, null);
		return new RefreshTokenPair(accessToken, newRaw, replacement.getId(), securityProperties.accessTokenTtlSeconds());
	}

	@Transactional
	public void revoke(String rawRefreshToken, HttpServletRequest request) {
		if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
			return;
		}
		String hash = sha256Hex(rawRefreshToken.trim());
		refreshTokenRepository.findByTokenHash(hash).ifPresent(token -> {
			if (token.getRevokedAt() == null) {
				token.setRevokedAt(Instant.now());
				refreshTokenRepository.save(token);
			}
			securityAuditService.record("AUTH_LOGOUT", "SUCCESS", null, token.getProfileId(), request, null);
		});
	}

	@Transactional
	public void revokeAllForProfile(UUID profileId) {
		refreshTokenRepository.revokeAllForProfile(profileId, Instant.now());
	}

	@Transactional
	public void revokeFamilyOnReuse(UUID familyId, HttpServletRequest request) {
		int revoked = refreshTokenRepository.revokeFamily(familyId, Instant.now());
		if (revoked > 0) {
			securityAuditService.record("AUTH_REFRESH_REUSE", "BLOCK", null, null, request, "family=" + familyId);
		}
	}

	private AuthRefreshToken persistToken(UUID profileId, String raw, UUID familyId, HttpServletRequest request) {
		AuthRefreshToken token = new AuthRefreshToken();
		token.setProfileId(profileId);
		token.setTokenHash(sha256Hex(raw));
		token.setFamilyId(familyId);
		token.setExpiresAt(Instant.now().plusSeconds(securityProperties.refreshTokenTtlDays() * 86400L));
		if (request != null) {
			token.setUserAgent(trim(request.getHeader("User-Agent"), 512));
			token.setIpAddress(trim(SecurityAuditService.clientIp(request), 64));
		}
		return refreshTokenRepository.save(token);
	}

	private BusinessException invalidRefresh() {
		return new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Sessione scaduta. Accedi di nuovo.");
	}

	private static String generateRawToken() {
		byte[] bytes = new byte[32];
		SECURE_RANDOM.nextBytes(bytes);
		return HexFormat.of().formatHex(bytes);
	}

	static String sha256Hex(String value) {
		try {
			MessageDigest md = MessageDigest.getInstance("SHA-256");
			byte[] digest = md.digest(value.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(digest);
		}
		catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException("SHA-256 non disponibile.", e);
		}
	}

	private static String trim(String value, int max) {
		if (value == null) {
			return null;
		}
		String t = value.trim();
		return t.length() <= max ? t : t.substring(0, max);
	}

	public record RefreshTokenPair(String accessToken, String refreshToken, UUID refreshTokenId, long expiresInSeconds) {
	}
}
