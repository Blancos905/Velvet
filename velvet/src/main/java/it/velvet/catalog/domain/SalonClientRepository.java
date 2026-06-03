package it.velvet.catalog.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SalonClientRepository extends JpaRepository<SalonClient, UUID> {

	Optional<SalonClient> findByLocation_IdAndConsumerProfile_Id(UUID locationId, UUID consumerProfileId);

	List<SalonClient> findByConsumerProfile_IdOrderByCreatedAtDesc(UUID consumerProfileId);

	List<SalonClient> findByLocation_IdOrderByDisplayName(UUID locationId);

	List<SalonClient> findByLocation_IdAndIdInOrderByDisplayName(UUID locationId, Collection<UUID> ids);

	Optional<SalonClient> findFirstByLocation_IdAndConsumerProfileIsNullAndEmailIgnoreCaseOrderByCreatedAtDesc(
			UUID locationId,
			String email);

	List<SalonClient> findByConsumerProfileIsNotNull();

	long countByCreatedAtGreaterThanEqual(Instant createdAt);
}

