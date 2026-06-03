package it.velvet.catalog.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface SalonVelvetChatReadStateRepository extends JpaRepository<SalonVelvetChatReadState, UUID> {

	default Optional<SalonVelvetChatReadState> findThreadReadState(UUID salonClientId, UUID staffOperatorId) {
		if (staffOperatorId == null) {
			return findOwnerThreadReadState(salonClientId);
		}
		return findStaffThreadReadState(salonClientId, staffOperatorId);
	}

	@Query("""
			SELECT rs FROM SalonVelvetChatReadState rs
			WHERE rs.salonClient.id = :salonClientId
			  AND rs.staffOperator IS NULL
			""")
	Optional<SalonVelvetChatReadState> findOwnerThreadReadState(@Param("salonClientId") UUID salonClientId);

	@Query("""
			SELECT rs FROM SalonVelvetChatReadState rs
			WHERE rs.salonClient.id = :salonClientId
			  AND rs.staffOperator.id = :staffOperatorId
			""")
	Optional<SalonVelvetChatReadState> findStaffThreadReadState(
			@Param("salonClientId") UUID salonClientId,
			@Param("staffOperatorId") UUID staffOperatorId);
}
