package it.luxury.admin.service;

import it.luxury.admin.dto.SuperAdminOverviewDtos.SuperAdminAppointmentInsights;
import it.luxury.admin.dto.SuperAdminOverviewDtos.SuperAdminB2cInsights;
import it.luxury.admin.dto.SuperAdminOverviewDtos.SuperAdminCityCountRow;
import it.luxury.admin.dto.SuperAdminOverviewDtos.SuperAdminEngagementInsights;
import it.luxury.admin.dto.SuperAdminOverviewDtos.SuperAdminMonthlyTrendRow;
import it.luxury.admin.dto.SuperAdminOverviewDtos.SuperAdminPlatformInsights;
import it.luxury.admin.dto.SuperAdminOverviewDtos.SuperAdminRevenueInsights;
import it.luxury.admin.dto.SuperAdminOverviewDtos.SuperAdminReviewInsights;
import it.luxury.admin.dto.SuperAdminOverviewDtos.SuperAdminSalonActivationInsights;
import it.luxury.admin.dto.SuperAdminOverviewDtos.SuperAdminStarCountRow;
import it.luxury.admin.dto.SuperAdminOverviewDtos.SuperAdminSupportInsights;
import it.luxury.admin.dto.SuperAdminOverviewDtos.SuperAdminTopSalonActivityRow;
import it.luxury.appointment.domain.AppointmentRepository;
import it.luxury.appointment.domain.AppointmentStatus;
import it.luxury.catalog.domain.SalonClientRepository;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.notification.domain.NotificationType;
import it.luxury.notification.domain.QueuedNotificationStatus;
import it.luxury.notification.domain.ScheduledNotificationRepository;
import it.luxury.review.domain.PlatformReviewRepository;
import it.luxury.review.domain.ReviewRepository;
import it.luxury.studio.domain.LocationRepository;
import it.luxury.studio.domain.StudioGroupRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class SuperAdminPlatformInsightsService {

	private static final int INACTIVITY_DAYS = 90;

	private final SuperAdminSupportInboxService superAdminSupportInboxService;
	private final AppointmentRepository appointmentRepository;
	private final StudioGroupRepository studioGroupRepository;
	private final ReviewRepository reviewRepository;
	private final PlatformReviewRepository platformReviewRepository;
	private final LocationRepository locationRepository;
	private final ConsumerProfileRepository consumerProfileRepository;
	private final SalonClientRepository salonClientRepository;
	private final ScheduledNotificationRepository scheduledNotificationRepository;
	private final JdbcTemplate jdbcTemplate;

	@Value("${luxury.admin.stats.premium-monthly-price-cents:0}")
	private long premiumMonthlyPriceCents;

	public SuperAdminPlatformInsightsService(
			SuperAdminSupportInboxService superAdminSupportInboxService,
			AppointmentRepository appointmentRepository,
			StudioGroupRepository studioGroupRepository,
			ReviewRepository reviewRepository,
			PlatformReviewRepository platformReviewRepository,
			LocationRepository locationRepository,
			ConsumerProfileRepository consumerProfileRepository,
			SalonClientRepository salonClientRepository,
			ScheduledNotificationRepository scheduledNotificationRepository,
			JdbcTemplate jdbcTemplate) {
		this.superAdminSupportInboxService = superAdminSupportInboxService;
		this.appointmentRepository = appointmentRepository;
		this.studioGroupRepository = studioGroupRepository;
		this.reviewRepository = reviewRepository;
		this.platformReviewRepository = platformReviewRepository;
		this.locationRepository = locationRepository;
		this.consumerProfileRepository = consumerProfileRepository;
		this.salonClientRepository = salonClientRepository;
		this.scheduledNotificationRepository = scheduledNotificationRepository;
		this.jdbcTemplate = jdbcTemplate;
	}

	@Transactional(readOnly = true)
	public SuperAdminPlatformInsights build(long appointmentsUpcoming) {
		Instant monthStart = monthStartUtc();
		Instant monthEnd = monthEndUtc();
		Instant inactivitySince = Instant.now().minus(INACTIVITY_DAYS, ChronoUnit.DAYS);

		long supportUnread = superAdminSupportInboxService.countUnreadSalonSupportRequests();
		long supportTotal = scheduledNotificationRepository.countByTypeStatusAndSupportFromSalon(
				NotificationType.SUPPORT_REQUEST_TO_LUXURY, QueuedNotificationStatus.SENT);

		var appointments = new SuperAdminAppointmentInsights(
				appointmentRepository.countStartingBetween(monthStart, monthEnd),
				appointmentRepository.countByStatus(AppointmentStatus.CANCELLED),
				appointmentRepository.countByStatus(AppointmentStatus.COMPLETED),
				appointmentRepository.countByStatus(AppointmentStatus.NO_SHOW),
				appointmentsUpcoming);

		long salonsTotal = studioGroupRepository.count();
		var salonActivation = new SuperAdminSalonActivationInsights(
				salonsTotal,
				studioGroupRepository.countWithAtLeastOneService(),
				studioGroupRepository.countWithAtLeastOneStaff(),
				studioGroupRepository.countWithAtLeastOneAppointment(),
				studioGroupRepository.countFullyActive());

		var reviews = buildReviewInsights(monthStart);

		List<SuperAdminCityCountRow> topCities = locationRepository.findTopCitiesBySalonCount().stream()
				.map(row -> new SuperAdminCityCountRow(stringCell(row[0]), longCell(row[1])))
				.toList();

		List<SuperAdminTopSalonActivityRow> topSalons = loadTopSalonsByActivity();

		var b2c = new SuperAdminB2cInsights(
				consumerProfileRepository.countActiveCreatedSince(monthStart),
				salonClientRepository.countByCreatedAtGreaterThanEqual(monthStart));

		long payingPremium = studioGroupRepository.countPayingSalonsOnPremiumPlan();
		boolean paymentsIntegrated = premiumMonthlyPriceCents > 0;
		long estimatedMrr = paymentsIntegrated ? payingPremium * premiumMonthlyPriceCents : 0L;

		var revenue = new SuperAdminRevenueInsights(
				paymentsIntegrated,
				estimatedMrr,
				premiumMonthlyPriceCents,
				studioGroupRepository.countPayingSalonsWithoutAppointmentSince(
						inactivitySince, AppointmentStatus.CANCELLED));

		long adminMessages = scheduledNotificationRepository.countByTypeAndStatus(
				NotificationType.ADMIN_PLATFORM_MESSAGE, QueuedNotificationStatus.SENT);

		var engagement = new SuperAdminEngagementInsights(adminMessages, locationRepository.count());

		List<SuperAdminMonthlyTrendRow> monthlyTrend = buildMonthlyTrend();

		return new SuperAdminPlatformInsights(
				new SuperAdminSupportInsights(supportUnread, supportTotal),
				appointments,
				salonActivation,
				reviews,
				topCities,
				topSalons,
				b2c,
				revenue,
				engagement,
				monthlyTrend);
	}

	private List<SuperAdminMonthlyTrendRow> buildMonthlyTrend() {
		ZonedDateTime anchor = ZonedDateTime.now(ZoneOffset.UTC).withDayOfMonth(1).truncatedTo(ChronoUnit.DAYS);
		List<SuperAdminMonthlyTrendRow> rows = new ArrayList<>();
		for (int offset = -4; offset <= 0; offset += 1) {
			ZonedDateTime monthStart = anchor.plusMonths(offset);
			ZonedDateTime monthEnd = monthStart.plusMonths(1);
			Instant from = monthStart.toInstant();
			Instant to = monthEnd.toInstant();
			String monthKey = String.format("%04d-%02d", monthStart.getYear(), monthStart.getMonthValue());
			rows.add(new SuperAdminMonthlyTrendRow(
					monthKey,
					consumerProfileRepository.countActiveCreatedBetween(from, to),
					studioGroupRepository.countCreatedBetween(from, to),
					salonClientRepository.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(from, to),
					appointmentRepository.countStartingBetween(from, to)));
		}
		return rows;
	}

	private SuperAdminReviewInsights buildReviewInsights(Instant monthStart) {
		Double postAvg = reviewRepository.averageRating().orElse(null);
		long postCount = reviewRepository.count();
		long postMonth = reviewRepository.countCreatedSince(monthStart);

		Double platformAvg = platformReviewRepository.averageRating().orElse(null);
		long platformCount = platformReviewRepository.count();
		long platformMonth = platformReviewRepository.countByCreatedAtGreaterThanEqual(monthStart);

		Map<Integer, Long> starMap = new HashMap<>();
		for (int s = 1; s <= 5; s++) {
			starMap.put(s, 0L);
		}
		for (Object[] row : reviewRepository.countGroupByRating()) {
			int stars = ((Number) row[0]).intValue();
			long cnt = ((Number) row[1]).longValue();
			if (stars >= 1 && stars <= 5) {
				starMap.put(stars, cnt);
			}
		}
		List<SuperAdminStarCountRow> stars = new ArrayList<>();
		for (int s = 5; s >= 1; s--) {
			stars.add(new SuperAdminStarCountRow(s, starMap.getOrDefault(s, 0L)));
		}

		return new SuperAdminReviewInsights(
				postAvg, postCount, postMonth, platformAvg, platformCount, platformMonth, stars);
	}

	private List<SuperAdminTopSalonActivityRow> loadTopSalonsByActivity() {
		return jdbcTemplate.query(
				"""
				SELECT sg.id, sg.name, sg.provider,
				       COALESCE(MAX(NULLIF(TRIM(l.city), '')), '') AS city,
				       COUNT(DISTINCT a.id) AS appts,
				       COUNT(DISTINCT r.id) AS revs,
				       COUNT(DISTINCT sc.id) AS clients
				FROM studio_groups sg
				LEFT JOIN locations l ON l.studio_group_id = sg.id
				LEFT JOIN appointments a ON a.location_id = l.id
				LEFT JOIN reviews r ON r.appointment_id = a.id
				LEFT JOIN salon_clients sc ON sc.location_id = l.id
				GROUP BY sg.id, sg.name, sg.provider
				ORDER BY appts DESC, revs DESC, clients DESC
				LIMIT 10
				""",
				(rs, rowNum) ->
						new SuperAdminTopSalonActivityRow(
								readUuid(rs, "id"),
								rs.getString("name"),
								rs.getBoolean("provider"),
								rs.getString("city"),
								rs.getLong("appts"),
								rs.getLong("revs"),
								rs.getLong("clients")));
	}

	private static UUID readUuid(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
		Object raw = rs.getObject(column);
		if (raw == null) {
			throw new java.sql.SQLException("Missing UUID column: " + column);
		}
		if (raw instanceof UUID uuid) {
			return uuid;
		}
		if (raw instanceof byte[] bytes && bytes.length == 16) {
			long msb = 0;
			long lsb = 0;
			for (int i = 0; i < 8; i++) {
				msb = (msb << 8) | (bytes[i] & 0xff);
			}
			for (int i = 8; i < 16; i++) {
				lsb = (lsb << 8) | (bytes[i] & 0xff);
			}
			return new UUID(msb, lsb);
		}
		return UUID.fromString(raw.toString());
	}

	private static Instant monthStartUtc() {
		return ZonedDateTime.now(ZoneOffset.UTC)
				.withDayOfMonth(1)
				.truncatedTo(ChronoUnit.DAYS)
				.toInstant();
	}

	private static Instant monthEndUtc() {
		return ZonedDateTime.now(ZoneOffset.UTC)
				.plusMonths(1)
				.withDayOfMonth(1)
				.truncatedTo(ChronoUnit.DAYS)
				.toInstant();
	}

	private static String stringCell(Object o) {
		return o != null ? o.toString().trim() : "";
	}

	private static long longCell(Object o) {
		return o instanceof Number n ? n.longValue() : 0L;
	}
}
