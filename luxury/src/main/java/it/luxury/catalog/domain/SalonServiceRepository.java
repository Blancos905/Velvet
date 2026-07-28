package it.luxury.catalog.domain;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SalonServiceRepository extends JpaRepository<SalonService, UUID>, SalonServiceRepositoryCustom {

	@EntityGraph(attributePaths = "operators")
	List<SalonService> findByLocation_IdOrderByName(UUID locationId);

	@Query("select s from SalonService s left join fetch s.operators where s.id = :id")
	Optional<SalonService> findByIdWithOperators(@Param("id") UUID id);

	Optional<SalonService> findByIdAndLocation_Id(UUID id, UUID locationId);

	/**
	 * Match su nome o descrizione del servizio (listino sede). Usato per «idee del mese» così non compaiono saloni
	 * che matchano solo per nome/città senza offrire quel servizio.
	 */
	@EntityGraph(attributePaths = { "location", "location.studioGroup" })
	@Query(
			"select s from SalonService s where lower(s.name) like lower(concat('%', :needle, '%')) "
					+ "or (s.description is not null and lower(s.description) like lower(concat('%', :needle, '%')))")
	List<SalonService> findCatalogRowsMatchingText(@Param("needle") String needle);
}
