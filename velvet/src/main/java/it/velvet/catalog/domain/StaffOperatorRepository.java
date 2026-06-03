package it.velvet.catalog.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StaffOperatorRepository extends JpaRepository<StaffOperator, UUID> {

	List<StaffOperator> findByLocation_IdOrderByDisplayName(UUID locationId);

	Optional<StaffOperator> findByIdAndLocation_Id(UUID id, UUID locationId);

	Optional<StaffOperator> findByConsumerProfile_Id(UUID consumerProfileId);

	/** Fallback quando il claim {@code uid} del JWT non coincide col FK su {@code staff_operators}. */
	Optional<StaffOperator> findFirstByConsumerProfile_KeycloakSubIgnoreCase(String keycloakSub);

	/**
	 * Risolve l'operatore collegato all'account staff: prima per id profilo (claim {@code uid}), poi per {@code sub}
	 * (Keycloak / {@code consumer_profiles.keycloak_sub}).
	 */
	default Optional<StaffOperator> resolveLinkedOperatorId(UUID consumerProfileId, String keycloakSub) {
		if (consumerProfileId != null) {
			Optional<StaffOperator> byId = findByConsumerProfile_Id(consumerProfileId);
			if (byId.isPresent()) {
				return byId;
			}
		}
		if (keycloakSub == null || keycloakSub.isBlank()) {
			return Optional.empty();
		}
		return findFirstByConsumerProfile_KeycloakSubIgnoreCase(keycloakSub.trim());
	}

	@Query(
			"""
					select o from StaffOperator o
					join fetch o.location loc
					join fetch loc.studioGroup
					where o.consumerProfile.id = :profileId
					""")
	Optional<StaffOperator> findFetchedForInboxByConsumerProfileId(@Param("profileId") UUID profileId);

	@Query(
			"""
					select distinct o from StaffOperator o
					join fetch o.location loc
					join fetch loc.studioGroup sg
					left join fetch o.consumerProfile cp
					where sg.id = :studioGroupId
					order by loc.name asc, o.displayName asc
					""")
	List<StaffOperator> findFetchedByStudioGroupId(@Param("studioGroupId") UUID studioGroupId);

	@Query(
			"""
					select o from StaffOperator o
					join fetch o.location loc
					join fetch loc.studioGroup sg
					left join fetch o.consumerProfile cp
					where sg.id in :studioGroupIds
					order by sg.id, loc.name asc, o.displayName asc
					""")
	List<StaffOperator> findFetchedByStudioGroupIdIn(@Param("studioGroupIds") Collection<UUID> studioGroupIds);

	@Query(
			"""
					select o from StaffOperator o
					join fetch o.location loc
					join fetch loc.studioGroup sg
					left join fetch o.consumerProfile cp
					where o.id = :operatorId and sg.id = :studioGroupId
					""")
	Optional<StaffOperator> findByIdAndStudioGroupId(
			@Param("operatorId") UUID operatorId,
			@Param("studioGroupId") UUID studioGroupId);
}
