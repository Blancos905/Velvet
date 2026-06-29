package it.velvet.admin.service;

import it.velvet.admin.dto.SuperAdminOverviewDtos.SuperAdminCounts;
import it.velvet.admin.dto.SuperAdminOverviewDtos.SuperAdminOverviewResponse;
import it.velvet.admin.dto.SuperAdminOverviewDtos.SuperAdminRecentSalonClientRow;
import it.velvet.admin.dto.SuperAdminOverviewDtos.SuperAdminRecentSalonRow;
import it.velvet.admin.dto.SuperAdminOverviewDtos.SuperAdminSalonStaffRow;
import it.velvet.admin.dto.SuperAdminOverviewDtos.SuperAdminRecentUserRow;
import it.velvet.billing.domain.BillingAccount;
import it.velvet.billing.domain.BillingAccountRepository;
import it.velvet.billing.domain.SalonSubscriptionBillingCategory;
import it.velvet.appointment.domain.AppointmentRepository;
import it.velvet.appointment.domain.AppointmentStatus;
import it.velvet.catalog.domain.SalonClient;
import it.velvet.catalog.domain.SalonClientRepository;
import it.velvet.catalog.domain.SalonServiceRepository;
import it.velvet.catalog.domain.StaffOperator;
import it.velvet.catalog.domain.StaffOperatorRepository;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.consumer.domain.FavoriteLocationRepository;
import it.velvet.review.domain.PlatformReviewRepository;
import it.velvet.review.domain.ReviewRepository;
import it.velvet.studio.domain.Location;
import it.velvet.studio.domain.LocationRepository;
import it.velvet.studio.domain.StudioGroup;
import it.velvet.security.auth.VelvetUserPrincipal;
import it.velvet.studio.domain.StudioGroupRepository;
import it.velvet.studio.dto.MeSalonNotificationMessageDto;
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
			VelvetUserPrincipal principal, boolean includeSupportInbox, boolean supportInboxFromSalonsOnly) {
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
					category != null ? category.name() : null));
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
