package it.luxury.security.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface LoginDeviceFingerprintRepository extends JpaRepository<LoginDeviceFingerprint, UUID> {

	long countByProfileId(UUID profileId);

	Optional<LoginDeviceFingerprint> findByProfileIdAndFingerprintHash(UUID profileId, String fingerprintHash);
}
