package it.luxury.appointment.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface OperatorTimeBlockRepository extends JpaRepository<OperatorTimeBlock, UUID> {

	@Query("""
			select b from OperatorTimeBlock b
			where b.operator.id = :operatorId
			and b.startsAt < :rangeEnd and b.endsAt > :rangeStart
			order by b.startsAt
			""")
	List<OperatorTimeBlock> findInRangeForOperator(
			@Param("operatorId") UUID operatorId,
			@Param("rangeStart") Instant rangeStart,
			@Param("rangeEnd") Instant rangeEnd);

	@Query("""
			select case when count(b) > 0 then true else false end from OperatorTimeBlock b
			where b.operator.id = :operatorId
			and b.startsAt < :end and b.endsAt > :start
			and (:skipExclude = true or b.id <> :excludeId)
			""")
	boolean existsOverlapping(
			@Param("operatorId") UUID operatorId,
			@Param("start") Instant start,
			@Param("end") Instant end,
			@Param("skipExclude") boolean skipExclude,
			@Param("excludeId") UUID excludeId);
}
