package it.velvet.security.auth.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AuthRefreshTokenRepository extends JpaRepository<AuthRefreshToken, UUID> {

	Optional<AuthRefreshToken> findByTokenHash(String tokenHash);

	@Modifying
	@Query("update AuthRefreshToken t set t.revokedAt = :now where t.profileId = :profileId and t.revokedAt is null")
	int revokeAllForProfile(@Param("profileId") UUID profileId, @Param("now") Instant now);

	@Modifying
	@Query("update AuthRefreshToken t set t.revokedAt = :now where t.familyId = :familyId and t.revokedAt is null")
	int revokeFamily(@Param("familyId") UUID familyId, @Param("now") Instant now);

	List<AuthRefreshToken> findByFamilyIdAndRevokedAtIsNull(UUID familyId);
}
