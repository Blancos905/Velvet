package it.luxury.catalog.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SalonClientRepository extends JpaRepository<SalonClient, UUID> {

	@Query("""
			select sc from SalonClient sc
			join fetch sc.location
			where sc.location.id = :locationId and sc.consumerProfile.id = :consumerProfileId
			""")
	Optional<SalonClient> findByLocation_IdAndConsumerProfile_Id(
			@Param("locationId") UUID locationId,
			@Param("consumerProfileId") UUID consumerProfileId);

	@Query("""
			select distinct sc from SalonClient sc
			join fetch sc.location
			where sc.consumerProfile.id = :consumerProfileId
			order by sc.createdAt desc
			""")
	List<SalonClient> findByConsumerProfile_IdOrderByCreatedAtDesc(
			@Param("consumerProfileId") UUID consumerProfileId);

	List<SalonClient> findByLocation_IdOrderByDisplayName(UUID locationId);

	List<SalonClient> findByLocation_IdAndIdInOrderByDisplayName(UUID locationId, Collection<UUID> ids);

	@Query("""
			select sc from SalonClient sc
			join fetch sc.location
			where sc.location.id = :locationId
			  and sc.consumerProfile is null
			  and lower(sc.email) = lower(:email)
			order by sc.createdAt desc
			""")
	Optional<SalonClient> findFirstByLocation_IdAndConsumerProfileIsNullAndEmailIgnoreCaseOrderByCreatedAtDesc(
			@Param("locationId") UUID locationId,
			@Param("email") String email);

	List<SalonClient> findByConsumerProfileIsNotNull();

	long countByCreatedAtGreaterThanEqual(Instant createdAt);

	long countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(Instant fromInclusive, Instant toExclusive);
}

