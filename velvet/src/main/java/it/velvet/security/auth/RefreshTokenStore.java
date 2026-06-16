package it.velvet.security.auth;

import java.util.UUID;

/**
 * Persistenza refresh token con operazioni atomiche (Redis in produzione, in-memory nei test).
 */
public interface RefreshTokenStore {

	IssuedToken issue(UUID profileId, String tokenHash, UUID familyId, UUID tokenId, long ttlSeconds);

	RotateOutcome rotate(String tokenHash, String newTokenHash, UUID newTokenId, long ttlSeconds);

	void revoke(String tokenHash);

	void revokeFamily(UUID familyId);

	void revokeAllForProfile(UUID profileId);

	record IssuedToken(UUID profileId, UUID familyId, UUID tokenId) {
	}

	enum RotateStatus {
		SUCCESS,
		NOT_FOUND,
		REUSED
	}

	record RotateOutcome(RotateStatus status, UUID profileId, UUID familyId, UUID newTokenId) {
	}
}
