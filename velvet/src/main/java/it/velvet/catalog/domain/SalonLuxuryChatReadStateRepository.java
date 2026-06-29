package it.velvet.catalog.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface SalonLuxuryChatReadStateRepository extends JpaRepository<SalonLuxuryChatReadState, UUID> {

	default Optional<SalonLuxuryChatReadState> findThreadReadState(UUID salonClientId, UUID staffOperatorId) {
		if (staffOperatorId == null) {
			return findOwnerThreadReadState(salonClientId);
		}
		return findStaffThreadReadState(salonClientId, staffOperatorId);
	}

	@Query("""
			SELECT rs FROM SalonLuxuryChatReadState rs
			WHERE rs.salonClient.id = :salonClientId
			  AND rs.staffOperator IS NULL
			""")
	Optional<SalonLuxuryChatReadState> findOwnerThreadReadState(@Param("salonClientId") UUID salonClientId);

	@Query("""
			SELECT rs FROM SalonLuxuryChatReadState rs
			WHERE rs.salonClient.id = :salonClientId
			  AND rs.staffOperator.id = :staffOperatorId
			""")
	Optional<SalonLuxuryChatReadState> findStaffThreadReadState(
			@Param("salonClientId") UUID salonClientId,
			@Param("staffOperatorId") UUID staffOperatorId);
}
