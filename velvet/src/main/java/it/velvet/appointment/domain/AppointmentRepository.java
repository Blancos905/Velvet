package it.velvet.appointment.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {

	@Query("""
			select case when count(a) > 0 then true else false end from Appointment a
			where a.operator.id = :operatorId
			and a.status <> AppointmentStatus.CANCELLED
			and a.startsAt < :end and a.endsAt > :start
			and (:skipExclude = true or a.id <> :excludeId)
			""")
	boolean existsOverlapping(
			@Param("operatorId") UUID operatorId,
			@Param("start") Instant start,
			@Param("end") Instant end,
			@Param("skipExclude") boolean skipExclude,
			@Param("excludeId") UUID excludeId);

	@Query("""
			select distinct a from Appointment a
			join fetch a.location
			join fetch a.service
			join fetch a.operator
			join fetch a.salonClient
			where a.location.id = :locationId
			and a.startsAt >= :dayStart and a.startsAt < :dayEnd
			order by a.startsAt
			""")
	List<Appointment> findForLocationDay(
			@Param("locationId") UUID locationId,
			@Param("dayStart") Instant dayStart,
			@Param("dayEnd") Instant dayEnd);

	@Query("""
			select distinct a from Appointment a
			join fetch a.location
			join fetch a.service
			join fetch a.operator
			join fetch a.salonClient
			where a.location.id = :locationId
			and a.startsAt < :rangeEnd and a.endsAt > :rangeStart
			order by a.startsAt
			""")
	List<Appointment> findForLocationInRange(
			@Param("locationId") UUID locationId,
			@Param("rangeStart") Instant rangeStart,
			@Param("rangeEnd") Instant rangeEnd);

	@Query("""
			select distinct a from Appointment a
			join fetch a.location
			join fetch a.service
			join fetch a.operator
			join fetch a.salonClient
			where a.consumerProfile.id = :consumerId
			and a.startsAt >= :now
			and a.status <> AppointmentStatus.CANCELLED
			order by a.startsAt
			""")
	List<Appointment> findUpcomingForConsumer(@Param("consumerId") UUID consumerId, @Param("now") Instant now);

	@Query("""
			select distinct a from Appointment a
			join fetch a.location
			join fetch a.service
			join fetch a.operator
			join fetch a.salonClient
			where a.consumerProfile.id = :consumerId
			and (a.startsAt < :now or a.status = AppointmentStatus.CANCELLED)
			order by a.startsAt desc
			""")
	List<Appointment> findPastForConsumer(@Param("consumerId") UUID consumerId, @Param("now") Instant now);

	@Query("""
			select distinct a from Appointment a
			join fetch a.location
			join fetch a.service
			join fetch a.operator
			join fetch a.salonClient
			where a.consumerProfile.id = :consumerId
			and a.status not in (AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW)
			and a.endsAt <= :readyAt
			and not exists (select 1 from Review r where r.appointment = a)
			order by a.endsAt desc
			""")
	List<Appointment> findPendingReviewInvitesForConsumer(@Param("consumerId") UUID consumerId, @Param("readyAt") Instant readyAt);

	@Query("""
			select distinct a from Appointment a
			join fetch a.location
			join fetch a.service
			join fetch a.operator
			join fetch a.salonClient
			left join fetch a.consumerProfile
			where a.id = :id
			""")
	java.util.Optional<Appointment> findByIdWithGraph(@Param("id") UUID id);

	@Query("""
			select a from Appointment a
			where a.location.id = :locationId
			and a.operator.id = :operatorId
			and a.status <> AppointmentStatus.CANCELLED
			and a.startsAt < :rangeEnd and a.endsAt > :rangeStart
			order by a.startsAt
			""")
	List<Appointment> findBlockingInRangeForOperator(
			@Param("locationId") UUID locationId,
			@Param("operatorId") UUID operatorId,
			@Param("rangeStart") Instant rangeStart,
			@Param("rangeEnd") Instant rangeEnd);

	long countByStartsAtAfterAndStatusNot(Instant startsAfter, AppointmentStatus status);

	long countByStatus(AppointmentStatus status);

	@Query("""
			select count(a) from Appointment a
			where a.startsAt >= :fromInclusive and a.startsAt < :toExclusive
			""")
	long countStartingBetween(
			@Param("fromInclusive") Instant fromInclusive, @Param("toExclusive") Instant toExclusive);

	long countByOperator_Id(UUID operatorId);

	@Query("""
			select distinct a from Appointment a
			join fetch a.location
			join fetch a.service
			join fetch a.operator
			join fetch a.salonClient
			where a.operator.id = :operatorId
			and a.startsAt < :rangeEnd and a.endsAt > :rangeStart
			order by a.startsAt
			""")
	List<Appointment> findForOperatorInRange(
			@Param("operatorId") UUID operatorId,
			@Param("rangeStart") Instant rangeStart,
			@Param("rangeEnd") Instant rangeEnd);

	long countBySalonClient_Id(UUID salonClientId);

	@Query("select max(a.endsAt) from Appointment a where a.salonClient.id = :salonClientId")
	Instant findMaxEndsAtBySalonClientId(@Param("salonClientId") UUID salonClientId);

	@Query("""
			select case when count(a) > 0 then true else false end from Appointment a
			where a.salonClient.id = :salonClientId
			and a.startsAt >= :now
			and a.status <> AppointmentStatus.CANCELLED
			""")
	boolean existsUpcomingNonCancelledForSalonClient(@Param("salonClientId") UUID salonClientId, @Param("now") Instant now);

	boolean existsByLocation_IdAndOperator_IdAndSalonClient_Id(UUID locationId, UUID operatorId, UUID salonClientId);

	@Query("""
			select distinct sc.id from Appointment a
			join a.salonClient sc
			where a.location.id = :locationId and a.operator.id = :operatorId
			""")
	List<UUID> findDistinctSalonClientIdsByLocationIdAndOperatorId(
			@Param("locationId") UUID locationId,
			@Param("operatorId") UUID operatorId);
}
