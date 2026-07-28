package it.luxury.admin.dto;

import it.luxury.admin.service.SuperAdminMeProfileService.SuperAdminMeProfileDto;
import it.luxury.studio.dto.MeSalonNotificationMessageDto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class SuperAdminOverviewDtos {

	private SuperAdminOverviewDtos() {
	}

	public record SuperAdminOverviewResponse(
			Instant generatedAt,
			SuperAdminCounts counts,
			List<SuperAdminRecentUserRow> recentUsers,
			List<SuperAdminRecentSalonRow> recentSalons,
			List<SuperAdminRecentSalonClientRow> recentSalonClients,
			SuperAdminMeProfileDto superAdminProfile,
			/** Richieste assistenza dai saloni non ancora «viste» nel pannello (badge Messaggi). */
			long supportInboxSalonUnreadCount,
			List<MeSalonNotificationMessageDto> supportInboxMessages,
			SuperAdminPlatformInsights platformInsights) {
	}

	public record SuperAdminCounts(
			long consumerProfilesTotal,
			long consumerProfilesActive,
			long consumerOwners,
			long studioGroups,
			long locations,
			long salonClients,
			long appointmentsTotal,
			long appointmentsUpcoming,
			long salonServices,
			long staffOperators,
			long reviews,
			long platformReviews,
			long favorites,
			/** Saloni partner/provider: nessun pagamento abbonamento a Luxury. */
			long studioGroupsProvider,
			/** Saloni non provider: unici che possono generare ricavi da abbonamento. */
			long studioGroupsPaying,
			long studioGroupsPayingPremium,
			long studioGroupsPayingBase,
			/** Abbonamento Stripe attivo a pagamento (non provider, non in prova, non disdetta). */
			long studioGroupsSubscribedPaying,
			/** Abbonamento Stripe in periodo di prova. */
			long studioGroupsSubscribedTrial,
			/** Disdetta registrata o abbonamento terminato. */
			long studioGroupsSubscribedCancelled) {
	}

	public record SuperAdminRecentUserRow(
			UUID id,
			String email,
			String displayName,
			String securityRoles,
			String planTier,
			Instant createdAt,
			Instant deletedAt) {
	}

	public record SuperAdminRecentSalonRow(
			UUID studioGroupId,
			String name,
			String ownerEmail,
			String planTier,
			String primaryLocationSlug,
			String primaryLocationName,
			String primaryLocationCity,
			Instant createdAt,
			boolean provider,
			List<SuperAdminSalonStaffRow> staff,
			String subscriptionStatus,
			Boolean cancelAtPeriodEnd,
			Instant subscriptionCurrentPeriodEnd,
			/** {@code PAYING}, {@code TRIAL}, {@code CANCELLED} o null se nessun abbonamento Stripe. */
			String subscriptionBillingCategory) {
	}

	/** Operatori staff (tutte le sedi) per un salone; usato dal pannello super admin. */
	public record SuperAdminSalonStaffRow(
			UUID operatorId,
			String displayName,
			String role,
			String locationName,
			String staffEmail,
			boolean accountLinked) {
	}

	public record SuperAdminRecentSalonClientRow(
			UUID id,
			String displayName,
			String locationName,
			String studioName,
			String slug,
			Instant createdAt) {
	}

	public record SuperAdminPlatformReviewRow(
			UUID id,
			String authorKind,
			String authorEmailOrSalon,
			int rating,
			String comment,
			Instant createdAt) {
	}

	public record SuperAdminPlatformInsights(
			SuperAdminSupportInsights support,
			SuperAdminAppointmentInsights appointments,
			SuperAdminSalonActivationInsights salonActivation,
			SuperAdminReviewInsights reviews,
			List<SuperAdminCityCountRow> topCities,
			List<SuperAdminTopSalonActivityRow> topSalons,
			SuperAdminB2cInsights b2c,
			SuperAdminRevenueInsights revenue,
			SuperAdminEngagementInsights engagement,
			/** Ultimi 5 mesi calendario (UTC), conteggi reali su tutta la piattaforma. */
			List<SuperAdminMonthlyTrendRow> monthlyTrend) {
	}

	/** Serie mensile per grafici super admin (non campione). */
	public record SuperAdminMonthlyTrendRow(
			String monthKey,
			long consumersCreated,
			long salonsCreated,
			long salonClientsCreated,
			long appointmentsStarted) {
	}

	public record SuperAdminSupportInsights(long unreadFromSalons, long totalRequestsFromSalons) {
	}

	public record SuperAdminAppointmentInsights(
			long thisMonth,
			long cancelled,
			long completed,
			long noShow,
			long upcomingNonCancelled) {
	}

	public record SuperAdminSalonActivationInsights(
			long salonsTotal,
			long withCatalogService,
			long withStaff,
			long withBooking,
			long fullyActive) {
	}

	public record SuperAdminReviewInsights(
			Double postVisitAverageRating,
			long postVisitCount,
			long postVisitThisMonth,
			Double platformAverageRating,
			long platformCount,
			long platformThisMonth,
			List<SuperAdminStarCountRow> postVisitStars) {
	}

	public record SuperAdminStarCountRow(int stars, long count) {
	}

	public record SuperAdminCityCountRow(String city, long salonCount) {
	}

	public record SuperAdminTopSalonActivityRow(
			UUID studioGroupId,
			String name,
			boolean provider,
			String primaryCity,
			long appointmentCount,
			long reviewCount,
			long salonClientCount) {
	}

	public record SuperAdminB2cInsights(long consumersRegisteredThisMonth, long salonClientsCreatedThisMonth) {
	}

	public record SuperAdminRevenueInsights(
			boolean paymentsIntegrated,
			long estimatedMrrCents,
			long premiumMonthlyPriceCents,
			long payingSalonsInactive90Days) {
	}

	public record SuperAdminEngagementInsights(long adminPlatformMessagesSent, long locationsPublished) {
	}
}
