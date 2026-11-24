package it.luxury.catalog.domain;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SalonLuxuryChatMessageRepository extends JpaRepository<SalonLuxuryChatMessage, UUID> {

	void deleteBySalonClient_Id(UUID salonClientId);

	default Optional<SalonLuxuryChatMessage> findLatestThreadMessage(
			UUID salonClientId, UUID staffOperatorId, Instant clearedAfter) {
		Instant after = clearedAfter != null ? clearedAfter : Instant.EPOCH;
		List<SalonLuxuryChatMessage> rows = staffOperatorId == null
				? findLatestOwnerThreadMessages(salonClientId, after, PageRequest.of(0, 1))
				: findLatestStaffThreadMessages(salonClientId, staffOperatorId, after, PageRequest.of(0, 1));
		return rows.stream().findFirst();
	}

	default List<SalonLuxuryChatMessage> findThreadMessages(UUID salonClientId, UUID staffOperatorId) {
		if (staffOperatorId == null) {
			return findOwnerThreadMessages(salonClientId);
		}
		return findStaffThreadMessages(salonClientId, staffOperatorId);
	}

	default long countThreadMessagesBySenderAfter(
			UUID salonClientId,
			UUID staffOperatorId,
			SalonLuxuryChatSender sender,
			Instant createdAfter) {
		if (staffOperatorId == null) {
			return countOwnerThreadMessagesBySenderAfter(salonClientId, sender, createdAfter);
		}
		return countStaffThreadMessagesBySenderAfter(salonClientId, staffOperatorId, sender, createdAfter);
	}

	@Query("""
			SELECT m FROM SalonLuxuryChatMessage m
			WHERE m.salonClient.id = :salonClientId
			  AND m.staffOperator IS NULL
			  AND m.createdAt > :createdAfter
			ORDER BY m.createdAt DESC
			""")
	List<SalonLuxuryChatMessage> findLatestOwnerThreadMessages(
			@Param("salonClientId") UUID salonClientId,
			@Param("createdAfter") Instant createdAfter,
			Pageable pageable);

	@Query("""
			SELECT m FROM SalonLuxuryChatMessage m
			WHERE m.salonClient.id = :salonClientId
			  AND m.staffOperator.id = :staffOperatorId
			  AND m.createdAt > :createdAfter
			ORDER BY m.createdAt DESC
			""")
	List<SalonLuxuryChatMessage> findLatestStaffThreadMessages(
			@Param("salonClientId") UUID salonClientId,
			@Param("staffOperatorId") UUID staffOperatorId,
			@Param("createdAfter") Instant createdAfter,
			Pageable pageable);

	@Query("""
			SELECT m FROM SalonLuxuryChatMessage m
			WHERE m.salonClient.id = :salonClientId
			  AND m.staffOperator IS NULL
			ORDER BY m.createdAt ASC
			""")
	List<SalonLuxuryChatMessage> findOwnerThreadMessages(@Param("salonClientId") UUID salonClientId);

	@Query("""
			SELECT m FROM SalonLuxuryChatMessage m
			WHERE m.salonClient.id = :salonClientId
			  AND m.staffOperator.id = :staffOperatorId
			ORDER BY m.createdAt ASC
			""")
	List<SalonLuxuryChatMessage> findStaffThreadMessages(
			@Param("salonClientId") UUID salonClientId,
			@Param("staffOperatorId") UUID staffOperatorId);

	@Query("""
			SELECT COUNT(m) FROM SalonLuxuryChatMessage m
			WHERE m.salonClient.id = :salonClientId
			  AND m.staffOperator IS NULL
			  AND m.sender = :sender
			  AND m.createdAt > :createdAfter
			""")
	long countOwnerThreadMessagesBySenderAfter(
			@Param("salonClientId") UUID salonClientId,
			@Param("sender") SalonLuxuryChatSender sender,
			@Param("createdAfter") Instant createdAfter);

	@Query("""
			SELECT COUNT(m) FROM SalonLuxuryChatMessage m
			WHERE m.salonClient.id = :salonClientId
			  AND m.staffOperator.id = :staffOperatorId
			  AND m.sender = :sender
			  AND m.createdAt > :createdAfter
			""")
	long countStaffThreadMessagesBySenderAfter(
			@Param("salonClientId") UUID salonClientId,
			@Param("staffOperatorId") UUID staffOperatorId,
			@Param("sender") SalonLuxuryChatSender sender,
			@Param("createdAfter") Instant createdAfter);

	@Query("""
			SELECT DISTINCT m.staffOperator.id FROM SalonLuxuryChatMessage m
			WHERE m.salonClient.id = :salonClientId AND m.staffOperator IS NOT NULL
			""")
	List<UUID> findDistinctStaffOperatorIdsWithMessages(@Param("salonClientId") UUID salonClientId);
}
