package it.luxury.security.auth;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.SessionCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.time.Duration;
import java.time.Instant;

/**
 * Store refresh token su Redis con script Lua per rotazione atomica e rilevamento reuse.
 */
@Repository
@ConditionalOnProperty(name = "luxury.security.refresh-token-store", havingValue = "redis")
public class RedisRefreshTokenStore implements RefreshTokenStore {

	private static final String KEY_PREFIX = "luxury:rt:";
	private static final String STATUS_ACTIVE = "active";
	private static final String STATUS_REVOKED = "revoked";

	private static final String ROTATE_SCRIPT = """
			local status = redis.call('HGET', KEYS[1], 'status')
			if not status then
			  return {0}
			end
			if status == 'revoked' then
			  local familyId = redis.call('HGET', KEYS[1], 'familyId')
			  local profileId = redis.call('HGET', KEYS[1], 'profileId')
			  local familyKey = 'luxury:rt:f:' .. familyId
			  local members = redis.call('SMEMBERS', familyKey)
			  for _, hash in ipairs(members) do
			    redis.call('DEL', 'luxury:rt:t:' .. hash)
			  end
			  redis.call('DEL', familyKey)
			  redis.call('DEL', 'luxury:rt:fm:' .. familyId)
			  if profileId then
			    redis.call('SREM', 'luxury:rt:p:' .. profileId, familyId)
			  end
			  return {2, profileId, familyId}
			end
			local profileId = redis.call('HGET', KEYS[1], 'profileId')
			local familyId = redis.call('HGET', KEYS[1], 'familyId')
			local familyMetaKey = 'luxury:rt:fm:' .. familyId
			local issuedAt = redis.call('HGET', familyMetaKey, 'issuedAt')
			local maxAge = tonumber(ARGV[3])
			local now = tonumber(ARGV[4])
			if issuedAt and maxAge and now and (now - tonumber(issuedAt)) > maxAge then
			  return {0}
			end
			redis.call('HSET', KEYS[1], 'status', 'revoked')
			local remaining = maxAge
			if issuedAt and maxAge and now then
			  remaining = maxAge - (now - tonumber(issuedAt))
			  if remaining < 1 then
			    remaining = 1
			  end
			end
			local newKey = 'luxury:rt:t:' .. ARGV[1]
			redis.call('HSET', newKey, 'profileId', profileId, 'familyId', familyId, 'status', 'active', 'tokenId', ARGV[2])
			redis.call('EXPIRE', newKey, remaining)
			redis.call('SADD', KEYS[2], ARGV[1])
			redis.call('EXPIRE', KEYS[2], remaining)
			redis.call('EXPIRE', familyMetaKey, remaining)
			return {1, profileId, familyId, ARGV[2]}
			""";

	private static final String REVOKE_FAMILY_SCRIPT = """
			local familyKey = KEYS[1]
			local members = redis.call('SMEMBERS', familyKey)
			for _, hash in ipairs(members) do
			  redis.call('DEL', 'luxury:rt:t:' .. hash)
			end
			redis.call('DEL', familyKey)
			redis.call('DEL', 'luxury:rt:fm:' .. ARGV[1])
			if ARGV[2] ~= '' then
			  redis.call('SREM', 'luxury:rt:p:' .. ARGV[2], ARGV[1])
			end
			return #members
			""";

	private static final String REVOKE_PROFILE_SCRIPT = """
			local profileKey = KEYS[1]
			local families = redis.call('SMEMBERS', profileKey)
			local revoked = 0
			for _, familyId in ipairs(families) do
			  local familyKey = 'luxury:rt:f:' .. familyId
			  local members = redis.call('SMEMBERS', familyKey)
			  for _, hash in ipairs(members) do
			    redis.call('DEL', 'luxury:rt:t:' .. hash)
			    revoked = revoked + 1
			  end
			  redis.call('DEL', familyKey)
			  redis.call('DEL', 'luxury:rt:fm:' .. familyId)
			end
			redis.call('DEL', profileKey)
			return revoked
			""";

	private final StringRedisTemplate redis;
	private final DefaultRedisScript<List> rotateScript;
	private final DefaultRedisScript<Long> revokeFamilyScript;
	private final DefaultRedisScript<Long> revokeProfileScript;

	public RedisRefreshTokenStore(StringRedisTemplate luxuryStringRedisTemplate) {
		this.redis = luxuryStringRedisTemplate;
		this.rotateScript = new DefaultRedisScript<>(ROTATE_SCRIPT, List.class);
		this.revokeFamilyScript = new DefaultRedisScript<>(REVOKE_FAMILY_SCRIPT, Long.class);
		this.revokeProfileScript = new DefaultRedisScript<>(REVOKE_PROFILE_SCRIPT, Long.class);
	}

	@Override
	public IssuedToken issue(UUID profileId, String tokenHash, UUID familyId, UUID tokenId, long ttlSeconds) {
		String tokenKey = tokenKey(tokenHash);
		String familyKey = familyKey(familyId);
		String profileKey = profileKey(profileId);
		redis.execute(new SessionCallback<>() {
			@Override
			@SuppressWarnings({"unchecked", "rawtypes"})
			public Object execute(org.springframework.data.redis.core.RedisOperations operations) {
				operations.multi();
				operations.opsForHash().putAll(tokenKey, Map.of(
						"profileId", profileId.toString(),
						"familyId", familyId.toString(),
						"status", STATUS_ACTIVE,
						"tokenId", tokenId.toString()));
				operations.expire(tokenKey, Duration.ofSeconds(ttlSeconds));
				operations.opsForSet().add(familyKey, tokenHash);
				operations.expire(familyKey, Duration.ofSeconds(ttlSeconds));
				operations.opsForHash().put(familyMetaKey(familyId), "issuedAt", String.valueOf(Instant.now().getEpochSecond()));
				operations.expire(familyMetaKey(familyId), Duration.ofSeconds(ttlSeconds));
				operations.opsForSet().add(profileKey, familyId.toString());
				operations.expire(profileKey, Duration.ofSeconds(ttlSeconds));
				return operations.exec();
			}
		});
		return new IssuedToken(profileId, familyId, tokenId);
	}

	@Override
	@SuppressWarnings("unchecked")
	public RotateOutcome rotate(String tokenHash, String newTokenHash, UUID newTokenId, long ttlSeconds) {
		String tokenKey = tokenKey(tokenHash);
		Object familyIdValue = redis.opsForHash().get(tokenKey, "familyId");
		if (familyIdValue == null) {
			return new RotateOutcome(RotateStatus.NOT_FOUND, null, null, null);
		}
		List<?> result = redis.execute(
				rotateScript,
				List.of(tokenKey, familyKey(UUID.fromString(familyIdValue.toString()))),
				newTokenHash,
				newTokenId.toString(),
				Long.toString(ttlSeconds),
				Long.toString(Instant.now().getEpochSecond()));
		if (result == null || result.isEmpty()) {
			return new RotateOutcome(RotateStatus.NOT_FOUND, null, null, null);
		}
		int code = toInt(result.get(0));
		return switch (code) {
			case 1 -> new RotateOutcome(
					RotateStatus.SUCCESS,
					uuidAt(result, 1),
					uuidAt(result, 2),
					uuidAt(result, 3));
			case 2 -> new RotateOutcome(
					RotateStatus.REUSED,
					uuidAt(result, 1),
					uuidAt(result, 2),
					null);
			default -> new RotateOutcome(RotateStatus.NOT_FOUND, null, null, null);
		};
	}

	@Override
	public void revoke(String tokenHash) {
		String tokenKey = tokenKey(tokenHash);
		if (Boolean.TRUE.equals(redis.hasKey(tokenKey))) {
			redis.opsForHash().put(tokenKey, "status", STATUS_REVOKED);
		}
	}

	@Override
	public void revokeFamily(UUID familyId) {
		String profileId = "";
		Set<String> members = redis.opsForSet().members(familyKey(familyId));
		if (members != null) {
			for (String hash : members) {
				Object value = redis.opsForHash().get(tokenKey(hash), "profileId");
				if (value != null) {
					profileId = value.toString();
					break;
				}
			}
		}
		redis.execute(
				revokeFamilyScript,
				List.of(familyKey(familyId)),
				familyId.toString(),
				profileId);
	}

	@Override
	public void revokeAllForProfile(UUID profileId) {
		redis.execute(revokeProfileScript, List.of(profileKey(profileId)));
	}

	private static String tokenKey(String hash) {
		return KEY_PREFIX + "t:" + hash;
	}

	private static String familyKey(UUID familyId) {
		return KEY_PREFIX + "f:" + familyId;
	}

	private static String profileKey(UUID profileId) {
		return KEY_PREFIX + "p:" + profileId;
	}

	private static String familyMetaKey(UUID familyId) {
		return KEY_PREFIX + "fm:" + familyId;
	}

	private static int toInt(Object value) {
		if (value instanceof Number n) {
			return n.intValue();
		}
		return Integer.parseInt(String.valueOf(value));
	}

	private static UUID uuidAt(List<?> result, int index) {
		if (result.size() <= index || result.get(index) == null) {
			return null;
		}
		return UUID.fromString(String.valueOf(result.get(index)));
	}
}
