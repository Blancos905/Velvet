package it.luxury.billing.domain;

import it.luxury.studio.domain.StudioGroup;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BillingAccountRepository extends JpaRepository<BillingAccount, UUID> {

	Optional<BillingAccount> findByStudioGroup_Id(UUID studioGroupId);

	List<BillingAccount> findByStudioGroup_IdIn(Collection<UUID> studioGroupIds);

	Optional<BillingAccount> findByStripeCustomerId(String stripeCustomerId);

	Optional<BillingAccount> findByStripeSubscriptionId(String stripeSubscriptionId);

	@Query("""
			select count(b) from BillingAccount b
			join b.studioGroup g
			where g.provider = false
			and b.cancelAtPeriodEnd = false
			and lower(b.subscriptionStatus) in ('active', 'past_due')
			""")
	long countSubscribedPayingNonProvider();

	@Query("""
			select count(b) from BillingAccount b
			join b.studioGroup g
			where g.provider = false
			and b.cancelAtPeriodEnd = false
			and lower(b.subscriptionStatus) = 'trialing'
			""")
	long countSubscribedTrialNonProvider();

	@Query("""
			select count(b) from BillingAccount b
			join b.studioGroup g
			where g.provider = false
			and (b.cancelAtPeriodEnd = true
				or lower(b.subscriptionStatus) in ('canceled', 'unpaid', 'incomplete_expired'))
			""")
	long countSubscribedCancelledNonProvider();

	@Query("""
			select g from StudioGroup g
			inner join BillingAccount b on b.studioGroup = g
			where g.provider = false
			and b.cancelAtPeriodEnd = false
			and lower(b.subscriptionStatus) in ('active', 'past_due')
			""")
	Page<StudioGroup> findPageSubscribedPayingNonProvider(Pageable pageable);

	@Query("""
			select g from StudioGroup g
			inner join BillingAccount b on b.studioGroup = g
			where g.provider = false
			and b.cancelAtPeriodEnd = false
			and lower(b.subscriptionStatus) = 'trialing'
			""")
	Page<StudioGroup> findPageSubscribedTrialNonProvider(Pageable pageable);

	@Query("""
			select g from StudioGroup g
			inner join BillingAccount b on b.studioGroup = g
			where g.provider = false
			and (b.cancelAtPeriodEnd = true
				or lower(b.subscriptionStatus) in ('canceled', 'unpaid', 'incomplete_expired'))
			""")
	Page<StudioGroup> findPageSubscribedCancelledNonProvider(Pageable pageable);

	@Query("""
			select b from BillingAccount b
			join fetch b.studioGroup g
			where g.provider = false
			and b.subscriptionCancelRequestedAt is not null
			and b.currentPeriodEnd is not null
			and b.currentPeriodEnd <= :periodEndCutoff
			""")
	List<BillingAccount> findPendingCancellationWithPeriodEnded(
			@org.springframework.data.repository.query.Param("periodEndCutoff") Instant periodEndCutoff);

	@Query("""
			select b from BillingAccount b
			join fetch b.studioGroup g
			where g.provider = false
			and b.cancelAtPeriodEnd = false
			and lower(b.subscriptionStatus) in ('active', 'trialing', 'past_due')
			and b.currentPeriodEnd is not null
			and b.currentPeriodEnd > :fromInclusive
			and b.currentPeriodEnd <= :toInclusive
			""")
	List<BillingAccount> findUpcomingRenewals(
			@org.springframework.data.repository.query.Param("fromInclusive") Instant fromInclusive,
			@org.springframework.data.repository.query.Param("toInclusive") Instant toInclusive);

	@Query("""
			select b from BillingAccount b
			join fetch b.studioGroup g
			where g.provider = false
			and b.subscriptionCancelRequestedAt is not null
			and b.currentPeriodEnd is not null
			""")
	List<BillingAccount> findAllPendingCancellationWithPeriodEnd();
}
