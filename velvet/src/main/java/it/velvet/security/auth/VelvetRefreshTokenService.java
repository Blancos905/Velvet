package it.velvet.security.auth;

import it.velvet.common.api.BusinessException;
import it.velvet.config.VelvetSecurityProperties;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.security.audit.SecurityAuditService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class VelvetRefreshTokenService {

	public static final String REFRESH_COOKIE_NAME = "velvet_rt";

	private static final SecureRandom SECURE_RANDOM = new SecureRandom();

	private final RefreshTokenStore refreshTokenStore;
	private final ConsumerProfileRepository consumerProfileRepository;
	private final VelvetTokenService velvetTokenService;
	private final VelvetSecurityProperties securityProperties;
	private final SecurityAuditService securityAuditService;

	public VelvetRefreshTokenService(
			RefreshTokenStore refreshTokenStore,
			ConsumerProfileRepository consumerProfileRepository,
			VelvetTokenService velvetTokenService,
			VelvetSecurityProperties securityProperties,
			SecurityAuditService securityAuditService) {
		this.refreshTokenStore = refreshTokenStore;
		this.consumerProfileRepository = consumerProfileRepository;
		this.velvetTokenService = velvetTokenService;
		this.securityProperties = securityProperties;
		this.securityAuditService = securityAuditService;
	}

	public RefreshTokenPair issueForProfile(ConsumerProfile profile, HttpServletRequest request) {
		String raw = generateRawToken();
		UUID familyId = UUID.randomUUID();
		UUID tokenId = UUID.randomUUID();
		refreshTokenStore.issue(profile.getId(), sha256Hex(raw), familyId, tokenId, refreshTtlSeconds());
		String accessToken = velvetTokenService.createAccessToken(profile);
		return new RefreshTokenPair(accessToken, raw, tokenId, securityProperties.accessTokenTtlSeconds());
	}

	public RefreshTokenPair rotate(String rawRefreshToken, HttpServletRequest request) {
		if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
			throw invalidRefresh();
		}
		String hash = sha256Hex(rawRefreshToken.trim());
		String newRaw = generateRawToken();
		UUID newTokenId = UUID.randomUUID();
		RefreshTokenStore.RotateOutcome outcome = refreshTokenStore.rotate(
				hash, sha256Hex(newRaw), newTokenId, refreshTtlSeconds());

		if (outcome.status() == RefreshTokenStore.RotateStatus.REUSED) {
			if (outcome.familyId() != null) {
				revokeFamilyOnReuse(outcome.familyId(), request);
			}
			securityAuditService.record(
					"AUTH_REFRESH",
					"FAIL",
					null,
					outcome.profileId(),
					request,
					"refresh_token_reuse");
			throw invalidRefresh();
		}
		if (outcome.status() != RefreshTokenStore.RotateStatus.SUCCESS || outcome.profileId() == null) {
			securityAuditService.record("AUTH_REFRESH", "FAIL", null, null, request, "invalid_or_expired");
			throw invalidRefresh();
		}

		ConsumerProfile profile = consumerProfileRepository.findById(outcome.profileId())
				.filter(p -> p.getDeletedAt() == null)
				.orElseThrow(this::invalidRefresh);

		String accessToken = velvetTokenService.createAccessToken(profile);
		securityAuditService.record("AUTH_REFRESH", "SUCCESS", profile.getKeycloakSub(), profile.getId(), request, null);
		return new RefreshTokenPair(accessToken, newRaw, outcome.newTokenId(), securityProperties.accessTokenTtlSeconds());
	}

	public void revoke(String rawRefreshToken, HttpServletRequest request) {
		if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
			return;
		}
		String hash = sha256Hex(rawRefreshToken.trim());
		refreshTokenStore.revoke(hash);
		securityAuditService.record("AUTH_LOGOUT", "SUCCESS", null, null, request, null);
	}

	public void revokeAllForProfile(UUID profileId) {
		refreshTokenStore.revokeAllForProfile(profileId);
	}

	public void revokeFamilyOnReuse(UUID familyId, HttpServletRequest request) {
		refreshTokenStore.revokeFamily(familyId);
		securityAuditService.record("AUTH_REFRESH_REUSE", "BLOCK", null, null, request, "family=" + familyId);
	}

	private long refreshTtlSeconds() {
		return securityProperties.refreshTokenTtlDays() * 86400L;
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

	public record RefreshTokenPair(String accessToken, String refreshToken, UUID refreshTokenId, long expiresInSeconds) {
	}
}
