package it.luxury.admin.service;

import it.luxury.admin.dto.SuperAdminOverviewDtos.SuperAdminCounts;
import it.luxury.admin.dto.SuperAdminOverviewDtos.SuperAdminOverviewResponse;
import it.luxury.admin.dto.SuperAdminOverviewDtos.SuperAdminRecentSalonClientRow;
import it.luxury.admin.dto.SuperAdminOverviewDtos.SuperAdminRecentSalonRow;
import it.luxury.admin.dto.SuperAdminOverviewDtos.SuperAdminSalonStaffRow;
import it.luxury.admin.dto.SuperAdminOverviewDtos.SuperAdminRecentUserRow;
import it.luxury.billing.domain.BillingAccount;
import it.luxury.billing.domain.BillingAccountRepository;
import it.luxury.billing.domain.SalonSubscriptionBillingCategory;
import it.luxury.appointment.domain.AppointmentRepository;
import it.luxury.appointment.domain.AppointmentStatus;
import it.luxury.catalog.domain.SalonClient;
import it.luxury.catalog.domain.SalonClientRepository;
import it.luxury.catalog.domain.SalonServiceRepository;
import it.luxury.catalog.domain.StaffOperator;
import it.luxury.catalog.domain.StaffOperatorRepository;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.consumer.domain.FavoriteLocationRepository;
import it.luxury.review.domain.PlatformReviewRepository;
import it.luxury.review.domain.ReviewRepository;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.LocationRepository;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.security.auth.LuxuryUserPrincipal;
import it.luxury.studio.domain.StudioGroupRepository;
import it.luxury.studio.dto.MeSalonNotificationMessageDto;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class SuperAdminOverviewService {

	private static final int RECENT_LIMIT = 28;

	private final ConsumerProfileRepository consumerProfileRepository;
	private final StudioGroupRepository studioGroupRepository;
	private final LocationRepository locationRepository;
	private final SalonClientRepository salonClientRepository;
	private final AppointmentRepository appointmentRepository;
	private final SalonServiceRepository salonServiceRepository;
	private final StaffOperatorRepository staffOperatorRepository;
	private final ReviewRepository reviewRepository;
	private final PlatformReviewRepository platformReviewRepository;
	private final FavoriteLocationRepository favoriteLocationRepository;
	private final BillingAccountRepository billingAccountRepository;
	private final SuperAdminMeProfileService superAdminMeProfileService;
	private final SuperAdminSupportInboxService superAdminSupportInboxService;
	private final SuperAdminPlatformInsightsService superAdminPlatformInsightsService;

	public SuperAdminOverviewService(
			ConsumerProfileRepository consumerProfileRepository,
			StudioGroupRepository studioGroupRepository,
			LocationRepository locationRepository,
			SalonClientRepository salonClientRepository,
			AppointmentRepository appointmentRepository,
			SalonServiceRepository salonServiceRepository,
			StaffOperatorRepository staffOperatorRepository,
			ReviewRepository reviewRepository,
			PlatformReviewRepository platformReviewRepository,
			FavoriteLocationRepository favoriteLocationRepository,
			BillingAccountRepository billingAccountRepository,
			SuperAdminMeProfileService superAdminMeProfileService,
			SuperAdminSupportInboxService superAdminSupportInboxService,
			SuperAdminPlatformInsightsService superAdminPlatformInsightsService) {
		this.consumerProfileRepository = consumerProfileRepository;
		this.studioGroupRepository = studioGroupRepository;
		this.locationRepository = locationRepository;
		this.salonClientRepository = salonClientRepository;
		this.appointmentRepository = appointmentRepository;
		this.salonServiceRepository = salonServiceRepository;
		this.staffOperatorRepository = staffOperatorRepository;
		this.reviewRepository = reviewRepository;
		this.platformReviewRepository = platformReviewRepository;
		this.favoriteLocationRepository = favoriteLocationRepository;
		this.billingAccountRepository = billingAccountRepository;
		this.superAdminMeProfileService = superAdminMeProfileService;
		this.superAdminSupportInboxService = superAdminSupportInboxService;
		this.superAdminPlatformInsightsService = superAdminPlatformInsightsService;
	}

	@Transactional(readOnly = true)
	public SuperAdminOverviewResponse build(
			LuxuryUserPrincipal principal, boolean includeSupportInbox, boolean supportInboxFromSalonsOnly) {
		Instant now = Instant.now();
		SuperAdminCounts counts = new SuperAdminCounts(
				consumerProfileRepository.count(),
				consumerProfileRepository.countByDeletedAtIsNull(),
				consumerProfileRepository.countActiveWithRole("OWNER"),
				studioGroupRepository.count(),
				locationRepository.count(),
				salonClientRepository.count(),
				appointmentRepository.count(),
				appointmentRepository.countByStartsAtAfterAndStatusNot(now, AppointmentStatus.CANCELLED),
				salonServiceRepository.count(),
				staffOperatorRepository.count(),
				reviewRepository.count(),
				platformReviewRepository.count(),
				favoriteLocationRepository.count(),
				studioGroupRepository.countByProviderTrue(),
				studioGroupRepository.countByProviderFalse(),
				studioGroupRepository.countPayingSalonsOnPremiumPlan(),
				studioGroupRepository.countPayingSalonsOnBasePlan(),
				billingAccountRepository.countSubscribedPayingNonProvider(),
				billingAccountRepository.countSubscribedTrialNonProvider(),
				billingAccountRepository.countSubscribedCancelledNonProvider());
		var sortUsers = Sort.by(Sort.Order.desc("createdAt").nullsLast()).and(Sort.by(Sort.Order.desc("id")));
		List<ConsumerProfile> users = consumerProfileRepository.findAll(PageRequest.of(0, RECENT_LIMIT, sortUsers)).getContent();
		List<SuperAdminRecentUserRow> recentUsers = users.stream()
				.map(c -> new SuperAdminRecentUserRow(
						c.getId(),
						c.getEmail(),
						c.getDisplayName(),
						c.getSecurityRoles(),
						c.getPlanTier(),
						c.getCreatedAt(),
						c.getDeletedAt()))
				.toList();

		var sortSalons = Sort.by(Sort.Order.desc("createdAt").nullsLast()).and(Sort.by(Sort.Order.desc("id")));
		List<StudioGroup> salons = studioGroupRepository.findAll(PageRequest.of(0, RECENT_LIMIT, sortSalons)).getContent();
		List<UUID> salonIds = salons.stream().map(StudioGroup::getId).toList();
		List<StaffOperator> recentStaff = salonIds.isEmpty()
				? List.of()
				: staffOperatorRepository.findFetchedByStudioGroupIdIn(salonIds);
		Map<UUID, List<SuperAdminSalonStaffRow>> staffByGroup = SuperAdminSalonStaffRowMapper.groupByStudioGroupId(recentStaff);
		Map<UUID, BillingAccount> billingByGroup = loadBillingAccounts(salonIds);
		List<SuperAdminRecentSalonRow> recentSalons = new ArrayList<>();
		for (StudioGroup g : salons) {
			List<Location> locs = locationRepository.findByStudioGroup_IdOrderByNameAsc(g.getId());
			Location first = locs.isEmpty() ? null : locs.get(0);
			BillingAccount billingAccount = billingByGroup.get(g.getId());
			SalonSubscriptionBillingCategory category = g.isProvider()
					? null
					: SalonSubscriptionBillingCategory.fromBillingAccount(billingAccount);
			recentSalons.add(new SuperAdminRecentSalonRow(
					g.getId(),
					g.getName(),
					g.getOwnerEmail(),
					g.getPlanTier(),
					first != null ? first.getSlug() : null,
					first != null ? first.getName() : null,
					first != null ? first.getCity() : null,
					g.getCreatedAt(),
					g.isProvider(),
					staffByGroup.getOrDefault(g.getId(), List.of()),
					billingAccount != null ? billingAccount.getSubscriptionStatus() : null,
					billingAccount != null ? billingAccount.isCancelAtPeriodEnd() : null,
					billingAccount != null ? billingAccount.getCurrentPeriodEnd() : null,
					category != null ? category.name() : null,
					locs.stream().anyMatch(Location::isSponsoredPlacement)));
		}

		var sortClients = Sort.by(Sort.Order.desc("createdAt").nullsLast()).and(Sort.by(Sort.Order.desc("id")));
		List<SalonClient> clients = salonClientRepository.findAll(PageRequest.of(0, RECENT_LIMIT, sortClients)).getContent();
		List<SuperAdminRecentSalonClientRow> recentSalonClients = clients.stream().map(sc -> {
			Location loc = sc.getLocation();
			StudioGroup sg = loc.getStudioGroup();
			return new SuperAdminRecentSalonClientRow(
					sc.getId(),
					sc.getDisplayName(),
					loc.getName(),
					sg.getName(),
					loc.getSlug(),
					sc.getCreatedAt());
		}).toList();

		var profile = superAdminMeProfileService.resolve(principal);
		long supportInboxSalonUnreadCount = superAdminSupportInboxService.countUnreadSalonSupportRequests();
		List<MeSalonNotificationMessageDto> supportInboxMessages = includeSupportInbox
				? superAdminSupportInboxService.listMessages(supportInboxFromSalonsOnly)
				: List.of();
		var platformInsights = superAdminPlatformInsightsService.build(counts.appointmentsUpcoming());
		return new SuperAdminOverviewResponse(
				now,
				counts,
				recentUsers,
				recentSalons,
				recentSalonClients,
				profile,
				supportInboxSalonUnreadCount,
				supportInboxMessages,
				platformInsights);
	}

	private Map<UUID, BillingAccount> loadBillingAccounts(List<UUID> studioGroupIds) {
		if (studioGroupIds.isEmpty()) {
			return Map.of();
		}
		Map<UUID, BillingAccount> out = new HashMap<>();
		for (BillingAccount account : billingAccountRepository.findByStudioGroup_IdIn(studioGroupIds)) {
			out.put(account.getStudioGroupId(), account);
		}
		return out;
	}
}
