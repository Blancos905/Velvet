package it.luxury.consumer.domain;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface PendingRegistrationRepository extends JpaRepository<PendingRegistration, UUID> {

	Optional<PendingRegistration> findByEmailIgnoreCase(String email);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	Optional<PendingRegistration> findByVerificationTokenHashAndVerificationExpiresAtAfter(
			String verificationTokenHash,
			Instant now);

	Optional<PendingRegistration> findByCheckoutTokenHashAndCheckoutTokenExpiresAtAfter(
			String checkoutTokenHash,
			Instant now);

	@Query("SELECT p FROM PendingRegistration p WHERE LOWER(p.email) LIKE CONCAT('%@', LOWER(:domain))")
	java.util.List<PendingRegistration> findByEmailDomainIgnoreCase(@Param("domain") String domain);
}
