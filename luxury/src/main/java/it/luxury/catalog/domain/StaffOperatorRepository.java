package it.luxury.catalog.domain;

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
	Optional<StaffOperator> findFirstByConsumerProfile_AuthSubIgnoreCase(String authSub);

	/**
	 * Risolve l'operatore collegato all'account staff: prima per id profilo (claim {@code uid}), poi per {@code sub}
	 * (claim JWT {@code sub} / {@code consumer_profiles.auth_sub}).
	 */
	default Optional<StaffOperator> resolveLinkedOperatorId(UUID consumerProfileId, String authSub) {
		if (consumerProfileId != null) {
			Optional<StaffOperator> byId = findByConsumerProfile_Id(consumerProfileId);
			if (byId.isPresent()) {
				return byId;
			}
		}
		if (authSub == null || authSub.isBlank()) {
			return Optional.empty();
		}
		return findFirstByConsumerProfile_AuthSubIgnoreCase(authSub.trim());
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
					select o from StaffOperator o
					join fetch o.location loc
					join fetch loc.studioGroup
					join o.consumerProfile cp
					where lower(cp.authSub) = lower(:authSub)
					""")
	Optional<StaffOperator> findFetchedForInboxByConsumerAuthSub(@Param("authSub") String authSub);

	/**
	 * Come {@link #resolveLinkedOperatorId} ma con {@code location} e {@code studioGroup} già inizializzati
	 * (necessario fuori da una transazione aperta, es. inbox notifiche/recensioni staff).
	 */
	default Optional<StaffOperator> resolveLinkedOperatorForInbox(UUID consumerProfileId, String authSub) {
		if (consumerProfileId != null) {
			Optional<StaffOperator> byId = findFetchedForInboxByConsumerProfileId(consumerProfileId);
			if (byId.isPresent()) {
				return byId;
			}
		}
		if (authSub == null || authSub.isBlank()) {
			return Optional.empty();
		}
		return findFetchedForInboxByConsumerAuthSub(authSub.trim());
	}

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

	@Query(
			"""
					select cp.id from StaffOperator o
					join o.consumerProfile cp
					where o.id = :operatorId and cp.deletedAt is null
					""")
	Optional<UUID> findConsumerProfileIdByOperatorId(@Param("operatorId") UUID operatorId);

	@Query(
			"""
					select o from StaffOperator o
					join fetch o.location loc
					join fetch loc.studioGroup sg
					where o.id in :ids
					""")
	List<StaffOperator> findFetchedByIdIn(@Param("ids") Collection<UUID> ids);
}
