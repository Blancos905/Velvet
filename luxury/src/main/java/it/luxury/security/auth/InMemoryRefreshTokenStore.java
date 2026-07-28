package it.luxury.security.auth;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Store in-memory con stessa semantica di {@link RedisRefreshTokenStore} (dev locale e test).
 */
@Repository
@ConditionalOnProperty(name = "luxury.security.refresh-token-store", havingValue = "memory", matchIfMissing = true)
public class InMemoryRefreshTokenStore implements RefreshTokenStore {

	private static final String STATUS_ACTIVE = "active";
	private static final String STATUS_REVOKED = "revoked";

	private final Map<String, TokenRecord> tokens = new ConcurrentHashMap<>();
	private final Map<UUID, Set<String>> familyMembers = new ConcurrentHashMap<>();
	private final Map<UUID, Set<UUID>> profileFamilies = new ConcurrentHashMap<>();

	@Override
	public synchronized IssuedToken issue(UUID profileId, String tokenHash, UUID familyId, UUID tokenId, long ttlSeconds) {
		tokens.put(tokenHash, new TokenRecord(profileId, familyId, tokenId, STATUS_ACTIVE));
		familyMembers.computeIfAbsent(familyId, ignored -> ConcurrentHashMap.newKeySet()).add(tokenHash);
		profileFamilies.computeIfAbsent(profileId, ignored -> ConcurrentHashMap.newKeySet()).add(familyId);
		return new IssuedToken(profileId, familyId, tokenId);
	}

	@Override
	public synchronized RotateOutcome rotate(String tokenHash, String newTokenHash, UUID newTokenId, long ttlSeconds) {
		TokenRecord existing = tokens.get(tokenHash);
		if (existing == null) {
			return new RotateOutcome(RotateStatus.NOT_FOUND, null, null, null);
		}
		if (STATUS_REVOKED.equals(existing.status())) {
			UUID familyId = existing.familyId();
			revokeFamily(familyId);
			return new RotateOutcome(RotateStatus.REUSED, existing.profileId(), familyId, null);
		}
		existing = new TokenRecord(existing.profileId(), existing.familyId(), existing.tokenId(), STATUS_REVOKED);
		tokens.put(tokenHash, existing);
		tokens.put(newTokenHash, new TokenRecord(existing.profileId(), existing.familyId(), newTokenId, STATUS_ACTIVE));
		familyMembers.computeIfAbsent(existing.familyId(), ignored -> ConcurrentHashMap.newKeySet()).add(newTokenHash);
		return new RotateOutcome(RotateStatus.SUCCESS, existing.profileId(), existing.familyId(), newTokenId);
	}

	@Override
	public synchronized void revoke(String tokenHash) {
		TokenRecord existing = tokens.get(tokenHash);
		if (existing != null) {
			tokens.put(tokenHash, new TokenRecord(
					existing.profileId(), existing.familyId(), existing.tokenId(), STATUS_REVOKED));
		}
	}

	@Override
	public synchronized void revokeFamily(UUID familyId) {
		Set<String> members = familyMembers.remove(familyId);
		if (members != null) {
			for (String hash : members) {
				tokens.remove(hash);
			}
		}
		profileFamilies.values().forEach(families -> families.remove(familyId));
	}

	@Override
	public synchronized void revokeAllForProfile(UUID profileId) {
		Set<UUID> families = profileFamilies.remove(profileId);
		if (families == null) {
			return;
		}
		for (UUID familyId : Set.copyOf(families)) {
			revokeFamily(familyId);
		}
	}

	private record TokenRecord(UUID profileId, UUID familyId, UUID tokenId, String status) {
	}
}
