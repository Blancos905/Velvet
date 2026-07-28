package it.luxury.security.auth;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import it.luxury.config.LuxurySecurityProperties;
import it.luxury.consumer.domain.ConsumerProfile;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.ParseException;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class LuxuryTokenService {

	private static final String CLAIM_ROLES = "roles";
	private static final String CLAIM_PLAN = "plan";

	private final LuxurySecurityProperties securityProperties;

	public LuxuryTokenService(LuxurySecurityProperties securityProperties) {
		this.securityProperties = securityProperties;
	}

	public String createAccessToken(ConsumerProfile profile) {
		List<String> roles = LuxuryUserPrincipal.parseRoleStrings(profile.getSecurityRoles());
		return createAccessToken(
				profile.getId(),
				profile.getAuthSub(),
				profile.getEmail(),
				roles,
				profile.getPlanTier());
	}

	public String createAccessToken(UUID profileId, String subject, String email, List<String> roles, String planTier) {
		try {
			Instant now = Instant.now();
			Instant exp = now.plusSeconds(securityProperties.accessTokenTtlSeconds());
			JWTClaimsSet.Builder b = new JWTClaimsSet.Builder()
					.subject(subject)
					.issueTime(Date.from(now))
					.expirationTime(Date.from(exp))
					.jwtID(UUID.randomUUID().toString())
					.claim("uid", profileId != null ? profileId.toString() : null)
					.claim("email", email != null ? email : "")
					.claim(CLAIM_ROLES, roles);
			if (planTier != null && !planTier.isBlank()) {
				b.claim(CLAIM_PLAN, planTier.trim());
			}
			SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), b.build());
			jwt.sign(new MACSigner(hmacKeyBytes()));
			return jwt.serialize();
		}
		catch (JOSEException | NoSuchAlgorithmException e) {
			throw new IllegalStateException("Impossibile firmare il token di accesso.", e);
		}
	}

	public Optional<LuxuryUserPrincipal> parseAndValidate(String bearerToken) {
		if (bearerToken == null || bearerToken.isBlank()) {
			return Optional.empty();
		}
		try {
			SignedJWT jwt = SignedJWT.parse(bearerToken.trim());
			if (!jwt.verify(new MACVerifier(hmacKeyBytes()))) {
				return Optional.empty();
			}
			JWTClaimsSet claims = jwt.getJWTClaimsSet();
			Date exp = claims.getExpirationTime();
			if (exp != null && exp.before(new Date())) {
				return Optional.empty();
			}
			String sub = claims.getSubject();
			if (sub == null || sub.isBlank()) {
				return Optional.empty();
			}
			String email = Optional.ofNullable(claims.getStringClaim("email")).orElse("");
			List<String> roles = readRoles(claims);
			UUID profileId = readProfileId(claims);
			return Optional.of(new LuxuryUserPrincipal(profileId, sub.trim(), email, roles));
		}
		catch (ParseException | JOSEException | NoSuchAlgorithmException | IllegalArgumentException e) {
			return Optional.empty();
		}
	}

	private static List<String> readRoles(JWTClaimsSet claims) {
		List<String> fromRolesClaim = readRolesArrayOrString(claims.getClaim(CLAIM_ROLES));
		if (!fromRolesClaim.isEmpty()) {
			return LuxuryUserPrincipal.ensureKnownAppRoles(fromRolesClaim);
		}
		try {
			Object ra = claims.getClaim("realm_access");
			if (ra instanceof Map<?, ?> map) {
				Object nested = map.get("roles");
				if (nested instanceof List<?> list) {
					List<String> fromRealm = list.stream()
							.filter(String.class::isInstance)
							.map(String.class::cast)
							.toList();
					if (!fromRealm.isEmpty()) {
						return LuxuryUserPrincipal.ensureKnownAppRoles(fromRealm);
					}
				}
			}
		}
		catch (RuntimeException ignored) {
		}
		return List.of("CLIENT");
	}

	private static List<String> readRolesArrayOrString(Object raw) {
		if (raw instanceof List<?> list) {
			return list.stream()
					.filter(String.class::isInstance)
					.map(String.class::cast)
					.toList();
		}
		if (raw instanceof String s && !s.isBlank()) {
			return LuxuryUserPrincipal.parseRoleStrings(s);
		}
		return List.of();
	}

	private static UUID readProfileId(JWTClaimsSet claims) {
		try {
			String uid = claims.getStringClaim("uid");
			if (uid != null && !uid.isBlank()) {
				return UUID.fromString(uid.trim());
			}
		}
		catch (ParseException | RuntimeException ignored) {
		}
		return null;
	}

	private byte[] hmacKeyBytes() throws NoSuchAlgorithmException {
		String secret = securityProperties.authJwtSecret();
		MessageDigest md = MessageDigest.getInstance("SHA-256");
		return md.digest(secret.getBytes(StandardCharsets.UTF_8));
	}
}
