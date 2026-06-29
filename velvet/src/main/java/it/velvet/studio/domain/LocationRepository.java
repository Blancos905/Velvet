package it.velvet.studio.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LocationRepository extends JpaRepository<Location, UUID> {

	Optional<Location> findBySlug(String slug);

	boolean existsBySlug(String slug);

	List<Location> findByNameContainingIgnoreCaseOrCityContainingIgnoreCase(String namePart, String cityPart);

	List<Location> findByAddressLineContainingIgnoreCase(String addressPart);

	List<Location> findByPostalCodeContainingIgnoreCase(String postalCodePart);

	List<Location> findBySlugContainingIgnoreCase(String slugPart);

	List<Location> findByCityContainingIgnoreCase(String city);

	/**
	 * Match inverso rispetto a {@link #findByCityContainingIgnoreCase}: utile quando il filtro utente
	 * è più lungo del valore salvato (es. «Milano (MI)» in home vs «Milano» in anagrafica).
	 */
	@Query("""
			SELECT l FROM Location l
			WHERE l.city IS NOT NULL AND TRIM(l.city) <> ''
			  AND LOWER(:searchCity) LIKE LOWER(CONCAT('%', TRIM(l.city), '%'))
			""")
	List<Location> findWhereSearchCityContainsLocationCity(@Param("searchCity") String searchCity);

	List<Location> findTop50ByOrderByNameAsc();

	List<Location> findByLatitudeIsNotNullAndLongitudeIsNotNull();

	List<Location> findByStudioGroup_IdOrderByNameAsc(UUID studioGroupId);

	@Query(
			value =
					"""
					SELECT TRIM(l.city) AS city, COUNT(DISTINCT l.studio_group_id) AS salon_count
					FROM locations l
					WHERE l.city IS NOT NULL AND TRIM(l.city) <> ''
					GROUP BY TRIM(l.city)
					ORDER BY salon_count DESC
					LIMIT 10
					""",
			nativeQuery = true)
	List<Object[]> findTopCitiesBySalonCount();

	/**
	 * Sedi premium che dichiarano il codice tipologia in {@code locations.salon_business_types} (CSV ordinato,
	 * es. {@code BEAUTY,HAIR}) — usato da ricerca pubblica e «idee» insieme al match sul listino servizi.
	 */
	@Query(
			"""
					select distinct l from Location l join fetch l.studioGroup g
					where upper(trim(g.planTier)) in ('PREMIUM', 'STANDARD', 'FULL')
					  and l.salonBusinessTypes is not null and trim(l.salonBusinessTypes) <> ''
					  and (
					    upper(trim(l.salonBusinessTypes)) = upper(trim(:code))
					    or upper(l.salonBusinessTypes) like upper(concat(:code, ',%'))
					    or upper(l.salonBusinessTypes) like upper(concat('%,', :code))
					    or upper(l.salonBusinessTypes) like upper(concat('%,', :code, ',%'))
					  )
					""")
	List<Location> findPremiumLocationsDeclaringBusinessTypeCode(@Param("code") String code);

	@Query("""
			select l from Location l join fetch l.studioGroup g
			where upper(trim(g.planTier)) in ('PREMIUM', 'STANDARD', 'FULL')
			order by l.slug asc
			""")
	List<Location> findAllPremiumLocationsOrderBySlug();
}
