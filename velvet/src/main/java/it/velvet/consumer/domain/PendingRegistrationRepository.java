package it.velvet.consumer.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface PendingRegistrationRepository extends JpaRepository<PendingRegistration, UUID> {

	Optional<PendingRegistration> findByEmailIgnoreCase(String email);

	Optional<PendingRegistration> findByVerificationTokenHashAndVerificationExpiresAtAfter(
			String verificationTokenHash,
			Instant now);
}
