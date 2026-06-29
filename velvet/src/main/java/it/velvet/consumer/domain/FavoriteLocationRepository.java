package it.velvet.consumer.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FavoriteLocationRepository extends JpaRepository<FavoriteLocation, UUID> {

	@Query("""
			select distinct f from FavoriteLocation f
			join fetch f.location
			where f.consumerProfile.id = :consumerId
			order by f.createdAt desc
			""")
	List<FavoriteLocation> findByConsumerProfile_IdOrderByCreatedAtDesc(@Param("consumerId") UUID consumerProfileId);

	Optional<FavoriteLocation> findByConsumerProfile_IdAndLocation_Id(UUID consumerProfileId, UUID locationId);

	void deleteByConsumerProfile_IdAndLocation_Id(UUID consumerProfileId, UUID locationId);
}
