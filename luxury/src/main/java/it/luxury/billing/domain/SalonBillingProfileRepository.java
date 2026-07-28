package it.luxury.billing.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SalonBillingProfileRepository extends JpaRepository<SalonBillingProfile, UUID> {

	Optional<SalonBillingProfile> findByStudioGroup_Id(UUID studioGroupId);
}
