package it.velvet.consumer.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface ConsumerProfileRepository extends JpaRepository<ConsumerProfile, UUID> {

	Optional<ConsumerProfile> findByKeycloakSub(String keycloakSub);

	Optional<ConsumerProfile> findByEmailIgnoreCase(String email);

	/**
	 * Login password: ignora profili soft-deleted; se esistono più righe con la stessa email (schema legacy senza vincolo
	 * univoco), usa il profilo creato più di recente (tipicamente lo staff appena provisionato).
	 */
	Optional<ConsumerProfile> findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByCreatedAtDesc(String email);

	Optional<ConsumerProfile> findByPasswordResetTokenHashAndPasswordResetExpiresAtAfter(String passwordResetTokenHash, Instant now);

	Optional<ConsumerProfile> findByEmailVerificationTokenHashAndEmailVerificationExpiresAtAfter(
			String emailVerificationTokenHash,
			Instant now);

	long countByDeletedAtIsNull();

	@Query("""
			select count(c) from ConsumerProfile c
			where c.deletedAt is null
			and upper(concat(',', coalesce(c.securityRoles, ''), ',')) like concat('%', concat(',', upper(:role), ','), '%')
			""")
	long countActiveWithRole(@Param("role") String role);

	@Query("""
			select count(c) from ConsumerProfile c
			where c.deletedAt is null and c.createdAt >= :fromInclusive
			""")
	long countActiveCreatedSince(@Param("fromInclusive") Instant fromInclusive);
}
