package it.velvet.studio.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface StudioGroupRepository extends JpaRepository<StudioGroup, UUID> {

	Optional<StudioGroup> findByOwnerEmailIgnoreCase(String ownerEmail);

	Optional<StudioGroup> findByOwnerKeycloakSub(String ownerKeycloakSub);

	/** Keycloak può variare il casing del claim {@code sub} rispetto al valore salvato in Admin API. */
	@Query("select g from StudioGroup g where g.ownerKeycloakSub is not null and lower(g.ownerKeycloakSub) = lower(:sub)")
	Optional<StudioGroup> findByOwnerKeycloakSubIgnoreCase(@Param("sub") String sub);

	Page<StudioGroup> findByPlanTierIgnoreCase(String planTier, Pageable pageable);

	long countByProviderTrue();

	long countByProviderFalse();

	@Query(
			"""
			select count(g) from StudioGroup g
			where g.provider = false and upper(g.planTier) in ('PREMIUM', 'STANDARD', 'FULL')
			""")
	long countPayingSalonsOnPremiumPlan();

	@Query("select count(g) from StudioGroup g where g.provider = false and upper(g.planTier) = 'BASE'")
	long countPayingSalonsOnBasePlan();

	@Query("""
			select count(distinct g.id) from StudioGroup g
			where exists (select 1 from SalonService s join s.location l where l.studioGroup = g)
			""")
	long countWithAtLeastOneService();

	@Query("""
			select count(distinct g.id) from StudioGroup g
			where exists (select 1 from StaffOperator o join o.location l where l.studioGroup = g)
			""")
	long countWithAtLeastOneStaff();

	@Query("""
			select count(distinct g.id) from StudioGroup g
			where exists (select 1 from Appointment a join a.location l where l.studioGroup = g)
			""")
	long countWithAtLeastOneAppointment();

	@Query("""
			select count(distinct g.id) from StudioGroup g
			where exists (select 1 from SalonService s join s.location l where l.studioGroup = g)
			and exists (select 1 from StaffOperator o join o.location l where l.studioGroup = g)
			and exists (select 1 from Appointment a join a.location l where l.studioGroup = g)
			""")
	long countFullyActive();

	@Query("""
			select count(g) from StudioGroup g
			where g.provider = false
			and not exists (
				select 1 from Appointment a join a.location l
				where l.studioGroup = g and a.startsAt >= :since and a.status <> :notCancelled
			)
			""")
	long countPayingSalonsWithoutAppointmentSince(
			@Param("since") java.time.Instant since,
			@Param("notCancelled") it.velvet.appointment.domain.AppointmentStatus notCancelled);
}
