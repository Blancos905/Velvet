package it.luxury.review.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import it.luxury.review.dto.SuperAdminSalonReviewSummaryRow;

public interface ReviewRepository extends JpaRepository<Review, UUID> {

	Optional<Review> findByAppointment_Id(UUID appointmentId);

	@Query("select avg(r.rating) from Review r")
	Optional<Double> averageRating();

	@Query("select avg(r.rating) from Review r where r.hiddenAt is null")
	Optional<Double> averagePublicRating();

	@Query("select count(r) from Review r where r.hiddenAt is null")
	long countPublic();

	@Query("select count(r) from Review r where r.createdAt >= :fromInclusive")
	long countCreatedSince(@Param("fromInclusive") Instant fromInclusive);

	@Query("select r.rating, count(r) from Review r group by r.rating order by r.rating")
	List<Object[]> countGroupByRating();

	/** Media e conteggio recensioni per sede (location), per elenco ricerca pubblica. */
	@Query(
			"select r.appointment.location.id, avg(r.rating), count(r) from Review r "
					+ "where r.appointment.location.id in :locationIds and r.hiddenAt is null "
					+ "group by r.appointment.location.id")
	List<Object[]> summarizeRatingsByLocationIds(@Param("locationIds") Collection<UUID> locationIds);

	/** Media e conteggio recensioni per sede in un intervallo di date (es. mese solare corrente). */
	@Query(
			"select r.appointment.location.id, avg(r.rating), count(r) from Review r "
					+ "where r.appointment.location.id in :locationIds "
					+ "and r.hiddenAt is null "
					+ "and r.createdAt >= :fromInclusive and r.createdAt < :toExclusive "
					+ "group by r.appointment.location.id")
	List<Object[]> summarizeRatingsByLocationIdsAndCreatedAtRange(
			@Param("locationIds") Collection<UUID> locationIds,
			@Param("fromInclusive") Instant fromInclusive,
			@Param("toExclusive") Instant toExclusive);

	/** Media e conteggio voti verso l'operatore ({@code staff_rating}) per operatore della sede (wizard pubblico). */
	@Query(
			"select a.operator.id, avg(r.staffRating), count(r) from Review r join r.appointment a "
					+ "where a.location.id = :locationId and r.staffRating is not null and r.hiddenAt is null "
					+ "group by a.operator.id")
	List<Object[]> summarizeStaffRatingsByOperatorForLocation(@Param("locationId") UUID locationId);

	/** Media e conteggio voti operatore su tutto il catalogo (classifica nazionale pubblica). */
	@Query(
			"select a.operator.id, avg(r.staffRating), count(r) from Review r join r.appointment a "
					+ "where r.staffRating is not null and r.hiddenAt is null group by a.operator.id")
	List<Object[]> summarizeAllStaffRatingsByOperator();

	/** Media e conteggio voti operatore in un intervallo (es. mese solare corrente). */
	@Query(
			"select a.operator.id, avg(r.staffRating), count(r) from Review r join r.appointment a "
					+ "where r.staffRating is not null and r.hiddenAt is null "
					+ "and r.createdAt >= :fromInclusive and r.createdAt < :toExclusive "
					+ "group by a.operator.id")
	List<Object[]> summarizeStaffRatingsByOperatorInDateRange(
			@Param("fromInclusive") Instant fromInclusive,
			@Param("toExclusive") Instant toExclusive);

	/** Media e conteggio voti operatore per sedi nel verticale (classifica nazionale per categoria). */
	@Query(
			"select a.operator.id, avg(r.staffRating), count(r) from Review r join r.appointment a "
					+ "where a.location.id in :locationIds and r.staffRating is not null and r.hiddenAt is null "
					+ "group by a.operator.id")
	List<Object[]> summarizeStaffRatingsByOperatorForLocationIds(@Param("locationIds") Collection<UUID> locationIds);

	/** Media e conteggio voti operatore per sedi nel verticale, in un intervallo di date. */
	@Query(
			"select a.operator.id, avg(r.staffRating), count(r) from Review r join r.appointment a "
					+ "where a.location.id in :locationIds and r.staffRating is not null and r.hiddenAt is null "
					+ "and r.createdAt >= :fromInclusive and r.createdAt < :toExclusive "
					+ "group by a.operator.id")
	List<Object[]> summarizeStaffRatingsByOperatorForLocationIdsInDateRange(
			@Param("locationIds") Collection<UUID> locationIds,
			@Param("fromInclusive") Instant fromInclusive,
			@Param("toExclusive") Instant toExclusive);

	@EntityGraph(
			attributePaths = {
					"appointment",
					"appointment.location",
					"appointment.location.studioGroup",
					"appointment.salonClient",
					"appointment.salonClient.consumerProfile",
					"appointment.consumerProfile",
					"appointment.service"
			})
	@Query("select r from Review r")
	Page<Review> findPageWithAssociations(Pageable pageable);

	@EntityGraph(
			attributePaths = {
					"appointment",
					"appointment.location",
					"appointment.location.studioGroup",
					"appointment.salonClient",
					"appointment.consumerProfile",
					"appointment.service"
			})
	@Query("select r from Review r where r.hiddenAt is null order by r.createdAt desc")
	Page<Review> findPublicPageWithAssociations(Pageable pageable);

	/** Media e conteggio recensioni post-visita per salone (studio), tutte le sedi e i servizi. */
	@Query(
			value =
					"select new it.luxury.review.dto.SuperAdminSalonReviewSummaryRow("
							+ "sg.id, sg.name, avg(r.rating), count(r), min(loc.slug)) "
							+ "from Review r join r.appointment.location loc join loc.studioGroup sg "
							+ "group by sg.id, sg.name order by avg(r.rating) desc, lower(sg.name) asc",
			countQuery =
					"select count(distinct sg.id) from Review r join r.appointment.location loc join loc.studioGroup sg")
	Page<SuperAdminSalonReviewSummaryRow> findPageSalonReviewSummaries(Pageable pageable);

	@EntityGraph(
			attributePaths = {
					"appointment",
					"appointment.location",
					"appointment.location.studioGroup",
					"appointment.operator",
					"appointment.salonClient",
					"appointment.salonClient.consumerProfile",
					"appointment.consumerProfile",
					"appointment.service"
			})
	List<Review> findByAppointment_Location_StudioGroup_IdOrderByCreatedAtDesc(UUID studioGroupId);

	@EntityGraph(
			attributePaths = {
					"appointment",
					"appointment.location",
					"appointment.location.studioGroup",
					"appointment.operator",
					"appointment.salonClient",
					"appointment.consumerProfile",
					"appointment.service"
			})
	List<Review> findByAppointment_Location_StudioGroup_IdAndAppointment_Operator_IdOrderByCreatedAtDesc(
			UUID studioGroupId,
			UUID operatorId);

	@EntityGraph(
			attributePaths = {
					"appointment",
					"appointment.location",
					"appointment.location.studioGroup",
					"appointment.operator",
					"appointment.salonClient",
					"appointment.consumerProfile",
					"appointment.service"
			})
	List<Review> findByAppointment_Location_IdOrderByCreatedAtDesc(UUID locationId);

	@EntityGraph(
			attributePaths = {
					"appointment",
					"appointment.location",
					"appointment.location.studioGroup",
					"appointment.salonClient",
					"appointment.consumerProfile",
					"appointment.service"
			})
	List<Review> findByAppointment_ConsumerProfile_IdOrderByCreatedAtDesc(UUID consumerProfileId);
}
