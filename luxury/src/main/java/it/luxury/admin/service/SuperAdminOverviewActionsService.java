package it.luxury.admin.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import it.luxury.admin.dto.SuperAdminOverviewDtos.SuperAdminRecentSalonRow;
import it.luxury.admin.dto.SuperAdminOverviewDtos.SuperAdminSalonStaffRow;
import it.luxury.admin.dto.SuperAdminOverviewDtos.SuperAdminPlatformReviewRow;
import it.luxury.review.dto.SuperAdminSalonReviewSummaryRow;
import it.luxury.billing.domain.BillingAccount;
import it.luxury.billing.domain.BillingAccountRepository;
import it.luxury.billing.domain.SalonSubscriptionBillingCategory;
import it.luxury.appointment.domain.AppointmentRepository;
import it.luxury.catalog.domain.StaffOperator;
import it.luxury.catalog.domain.StaffOperatorRepository;
import it.luxury.common.api.BusinessException;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.consumer.domain.PendingRegistrationRepository;
import it.luxury.consumer.service.ConsumerAccountService;
import it.luxury.consumer.service.SalonOwnerRoleAlignmentService;
import it.luxury.consumer.service.LuxuryAccountRegistrationService;
import it.luxury.config.LuxurySecurityProperties;
import it.luxury.notification.domain.ScheduledNotification;
import it.luxury.notification.domain.ScheduledNotificationRepository;
import it.luxury.security.auth.LuxuryTokenService;
import it.luxury.publicapi.dto.RegistrationSalonLocation;
import it.luxury.publicapi.validation.ConsumerRegistrationValidator;
import it.luxury.review.domain.PlatformReview;
import it.luxury.review.domain.PlatformReviewRepository;
import it.luxury.review.domain.ReviewRepository;
import it.luxury.review.service.ReviewModerationService;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.LocationRepository;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.studio.domain.StudioGroupRepository;
import it.luxury.studio.service.SalonDirectoryProvisioningService;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SuperAdminOverviewActionsService {

	private final StudioGroupRepository studioGroupRepository;
	private final LocationRepository locationRepository;
	private final LuxuryAccountRegistrationService accountRegistrationService;
	private final SalonDirectoryProvisioningService salonDirectoryProvisioningService;
	private final JdbcTemplate jdbcTemplate;
	private final ScheduledNotificationRepository scheduledNotificationRepository;
	private final ConsumerProfileRepository consumerProfileRepository;
	private final SalonOwnerRoleAlignmentService salonOwnerRoleAlignmentService;
	private final LuxuryTokenService luxuryTokenService;
	private final LuxurySecurityProperties securityProperties;
	private final ReviewRepository reviewRepository;
	private final ReviewModerationService reviewModerationService;
	private final PlatformReviewRepository platformReviewRepository;
	private final StaffOperatorRepository staffOperatorRepository;
	private final AppointmentRepository appointmentRepository;
	private final BillingAccountRepository billingAccountRepository;
	private final SuperAdminProfileAccessNotificationService profileAccessNotificationService;
	private final PendingRegistrationRepository pendingRegistrationRepository;
	private final ConsumerAccountService consumerAccountService;

	public SuperAdminOverviewActionsService(
			StudioGroupRepository studioGroupRepository,
			LocationRepository locationRepository,
			LuxuryAccountRegistrationService accountRegistrationService,
			SalonDirectoryProvisioningService salonDirectoryProvisioningService,
			JdbcTemplate jdbcTemplate,
			ScheduledNotificationRepository scheduledNotificationRepository,
			ConsumerProfileRepository consumerProfileRepository,
			SalonOwnerRoleAlignmentService salonOwnerRoleAlignmentService,
			LuxuryTokenService luxuryTokenService,
			LuxurySecurityProperties securityProperties,
			ReviewRepository reviewRepository,
			ReviewModerationService reviewModerationService,
			PlatformReviewRepository platformReviewRepository,
			StaffOperatorRepository staffOperatorRepository,
			AppointmentRepository appointmentRepository,
			BillingAccountRepository billingAccountRepository,
			SuperAdminProfileAccessNotificationService profileAccessNotificationService,
			PendingRegistrationRepository pendingRegistrationRepository,
			ConsumerAccountService consumerAccountService) {
		this.studioGroupRepository = studioGroupRepository;
		this.locationRepository = locationRepository;
		this.accountRegistrationService = accountRegistrationService;
		this.salonDirectoryProvisioningService = salonDirectoryProvisioningService;
		this.jdbcTemplate = jdbcTemplate;
		this.scheduledNotificationRepository = scheduledNotificationRepository;
		this.consumerProfileRepository = consumerProfileRepository;
		this.salonOwnerRoleAlignmentService = salonOwnerRoleAlignmentService;
		this.luxuryTokenService = luxuryTokenService;
		this.securityProperties = securityProperties;
		this.reviewRepository = reviewRepository;
		this.reviewModerationService = reviewModerationService;
		this.platformReviewRepository = platformReviewRepository;
		this.staffOperatorRepository = staffOperatorRepository;
		this.appointmentRepository = appointmentRepository;
		this.billingAccountRepository = billingAccountRepository;
		this.profileAccessNotificationService = profileAccessNotificationService;
		this.pendingRegistrationRepository = pendingRegistrationRepository;
		this.consumerAccountService = consumerAccountService;
	}

	@Transactional(readOnly = true)
	public Page<SuperAdminRecentSalonRow> listSalons(Pageable pageable, String planTier, String subscriptionBilling) {
		SalonSubscriptionBillingCategory billingCategory = SalonSubscriptionBillingCategory.parseFilter(subscriptionBilling);
		Page<StudioGroup> groups;
		if (billingCategory != null) {
			groups = switch (billingCategory) {
				case PAYING -> billingAccountRepository.findPageSubscribedPayingNonProvider(pageable);
				case TRIAL -> billingAccountRepository.findPageSubscribedTrialNonProvider(pageable);
				case CANCELLED -> billingAccountRepository.findPageSubscribedCancelledNonProvider(pageable);
			};
		}
		else {
			groups = planTier != null && !planTier.isBlank()
					? studioGroupRepository.findByPlanTierIgnoreCase(planTier, pageable)
					: studioGroupRepository.findAll(pageable);
		}
		List<UUID> pageIds = groups.getContent().stream().map(StudioGroup::getId).toList();
		Map<UUID, List<SuperAdminSalonStaffRow>> staffByGroup = loadStaffRowsForStudioGroups(pageIds);
		Map<UUID, BillingAccount> billingByGroup = loadBillingAccounts(pageIds);
		return groups.map(g -> toRecentSalonRow(g, staffByGroup.getOrDefault(g.getId(), List.of()), billingByGroup.get(g.getId())));
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

	private Map<UUID, List<SuperAdminSalonStaffRow>> loadStaffRowsForStudioGroups(List<UUID> studioGroupIds) {
		if (studioGroupIds.isEmpty()) {
			return Map.of();
		}
		List<StaffOperator> ops = staffOperatorRepository.findFetchedByStudioGroupIdIn(studioGroupIds);
		return SuperAdminSalonStaffRowMapper.groupByStudioGroupId(ops);
	}

	private SuperAdminRecentSalonRow toRecentSalonRow(
			StudioGroup g, List<SuperAdminSalonStaffRow> staff, BillingAccount billingAccount) {
		List<Location> locations = locationRepository.findByStudioGroup_IdOrderByNameAsc(g.getId());
		Location first = locations.isEmpty() ? null : locations.get(0);
		String city = locations.stream()
				.map(Location::getCity)
				.filter(Objects::nonNull)
				.map(String::trim)
				.filter(s -> !s.isEmpty())
				.findFirst()
				.orElse(first != null ? first.getCity() : null);
		SalonSubscriptionBillingCategory category = g.isProvider()
				? null
				: SalonSubscriptionBillingCategory.fromBillingAccount(billingAccount);
		return new SuperAdminRecentSalonRow(
				g.getId(),
				g.getName(),
				g.getOwnerEmail(),
				g.getPlanTier(),
				first != null ? first.getSlug() : null,
				first != null ? first.getName() : null,
				city,
				g.getCreatedAt(),
				g.isProvider(),
				staff,
				billingAccount != null ? billingAccount.getSubscriptionStatus() : null,
				billingAccount != null ? billingAccount.isCancelAtPeriodEnd() : null,
				billingAccount != null ? billingAccount.getCurrentPeriodEnd() : null,
				category != null ? category.name() : null);
	}

	@Transactional(readOnly = true)
	public List<SuperAdminSalonStaffRow> listSalonStaff(UUID studioGroupId) {
		studioGroupRepository
				.findById(studioGroupId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Salone non trovato."));
		List<StaffOperator> ops = staffOperatorRepository.findFetchedByStudioGroupId(studioGroupId);
		return ops.stream().map(SuperAdminSalonStaffRowMapper::fromOperator).toList();
	}

	/**
	 * Elimina un operatore staff del salone (qualsiasi sede dello studio). Stessa regola del titolare: vietato se
	 * esistono prenotazioni collegate; se c’è account di accesso, viene rimosso anche il {@link ConsumerProfile}.
	 */
	@Transactional
	public void deleteSalonStaff(UUID studioGroupId, UUID operatorId) {
		studioGroupRepository
				.findById(studioGroupId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Salone non trovato."));
		StaffOperator operator = staffOperatorRepository
				.findByIdAndStudioGroupId(operatorId, studioGroupId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Operatore non trovato in questo salone."));
		if (appointmentRepository.countByOperator_Id(operator.getId()) > 0) {
			throw new BusinessException(
					HttpStatus.CONFLICT,
					"STAFF_HAS_APPOINTMENTS",
					"Impossibile eliminare: ci sono prenotazioni associate a questo operatore.");
		}
		ConsumerProfile login = operator.getConsumerProfile();
		staffOperatorRepository.delete(operator);
		if (login != null) {
			consumerProfileRepository.delete(login);
		}
	}

	@Transactional(readOnly = true)
	public Page<SuperAdminSalonReviewSummaryRow> listReviews(Pageable pageable) {
		return reviewRepository.findPageSalonReviewSummaries(
				PageRequest.of(pageable.getPageNumber(), pageable.getPageSize()));
	}

	@Transactional(readOnly = true)
	public Page<SuperAdminPlatformReviewRow> listPlatformReviews(Pageable pageable) {
		Pageable sorted = PageRequest.of(
				pageable.getPageNumber(),
				pageable.getPageSize(),
				Sort.by(Sort.Order.desc("rating"), Sort.Order.desc("createdAt")));
		return platformReviewRepository.findPageWithAuthors(sorted).map(this::toPlatformReviewRow);
	}

	@Transactional
	public void hideSalonReview(UUID reviewId) {
		reviewModerationService.hideSalonReview(reviewId);
	}

	private SuperAdminPlatformReviewRow toPlatformReviewRow(PlatformReview p) {
		String authorKind = p.getAuthorKind().name();
		String who;
		if (p.getConsumerProfile() != null) {
			String em = p.getConsumerProfile().getEmail();
			who = em != null && !em.isBlank() ? em.trim() : "Cliente";
		}
		else if (p.getStudioGroup() != null) {
			who = p.getStudioGroup().getName();
		}
		else {
			who = "—";
		}
		return new SuperAdminPlatformReviewRow(p.getId(), authorKind, who, p.getRating(), p.getComment(), p.getCreatedAt());
	}

	@Transactional
	public void createClient(SuperAdminCreateClientRequest body) {
		String country = body.country() != null && !body.country().isBlank() ? body.country().trim().toUpperCase(Locale.ROOT) : "IT";
		accountRegistrationService.registerBookingClient(
				body.email(),
				body.password(),
				body.firstName(),
				body.lastName(),
				country,
				body.phone(),
				false,
				null);
	}

	@Transactional
	public void createSalon(SuperAdminCreateSalonRequest body) {
		String tier = StudioGroup.canonicalPlanTier(body.planTier());
		RegistrationSalonLocation location = new RegistrationSalonLocation(
				trimToNull(body.salonAddressLine1()),
				trimToNull(body.salonPostalCode()),
				trimToNull(body.salonCity()),
				trimToNull(body.salonProvince()),
				"IT",
				trimToNull(body.salonName()));
		ConsumerRegistrationValidator.requireSalonLocationForFreePlan(tier, location);

		String ownerEmail = body.email().trim().toLowerCase(Locale.ROOT);
		String ownerSub = accountRegistrationService.registerSalonOwnerImmediate(
				body.email(),
				body.password(),
				body.firstName(),
				body.lastName(),
				Objects.toString(body.phone(), ""),
				tier,
				body.legalDocumentVersion(),
				body.dpaDocumentVersion());
		boolean provider = Boolean.TRUE.equals(body.provider());
		salonDirectoryProvisioningService.provisionAfterPartnerRegistration(
				ownerEmail,
				tier,
				body.salonName(),
				location,
				ownerSub,
				null,
				null,
				provider);
	}

	@Transactional
	public void deleteSalon(UUID studioGroupId) {
		StudioGroup group = studioGroupRepository.findById(studioGroupId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Salone non trovato."));
		String ownerEmail = normalizeOwnerEmail(group.getOwnerEmail());
		String ownerSub = trimToNull(group.getOwnerAuthSub());

		jdbcTemplate.update(
				"""
				delete from scheduled_notifications
				where appointment_id in (
					select id from appointments
					where location_id in (select id from locations where studio_group_id = ?)
				)
				""",
				group.getId());
		jdbcTemplate.update("delete from scheduled_notifications where studio_group_id = ?", group.getId());
		jdbcTemplate.update(
				"""
				delete from reviews
				where appointment_id in (
					select id from appointments
					where location_id in (select id from locations where studio_group_id = ?)
				)
				""",
				group.getId());
		jdbcTemplate.update("delete from platform_reviews where studio_group_id = ?", group.getId());
		jdbcTemplate.update(
				"""
				delete from appointments
				where location_id in (select id from locations where studio_group_id = ?)
				""",
				group.getId());
		jdbcTemplate.update(
				"""
				delete from favorite_locations
				where location_id in (select id from locations where studio_group_id = ?)
				""",
				group.getId());
		jdbcTemplate.update(
				"""
				delete from staff_operators
				where location_id in (select id from locations where studio_group_id = ?)
				""",
				group.getId());
		jdbcTemplate.update(
				"""
				delete from salon_services
				where location_id in (select id from locations where studio_group_id = ?)
				""",
				group.getId());
		jdbcTemplate.update(
				"""
				delete from salon_luxury_chat_messages
				where salon_client_id in (
					select id from salon_clients
					where location_id in (select id from locations where studio_group_id = ?)
				)
				""",
				group.getId());
		jdbcTemplate.update(
				"""
				delete from salon_luxury_chat_read_state
				where salon_client_id in (
					select id from salon_clients
					where location_id in (select id from locations where studio_group_id = ?)
				)
				""",
				group.getId());
		jdbcTemplate.update(
				"""
				delete from salon_clients
				where location_id in (select id from locations where studio_group_id = ?)
				""",
				group.getId());
		jdbcTemplate.update("delete from salon_billing_profiles where studio_group_id = ?", group.getId());
		jdbcTemplate.update("delete from billing_accounts where studio_group_id = ?", group.getId());
		jdbcTemplate.update("delete from locations where studio_group_id = ?", group.getId());
		jdbcTemplate.update("delete from studio_groups where id = ?", group.getId());

		if (ownerEmail != null) {
			pendingRegistrationRepository.findByEmailIgnoreCase(ownerEmail).ifPresent(pendingRegistrationRepository::delete);
		}
		removeOwnerAccountAfterSalonDeletion(ownerEmail, ownerSub);
	}

	/**
	 * Chiude l'account titolare collegato al salone eliminato, così la stessa email può registrarsi di nuovo.
	 * Non tocca profili super admin né titolari con un altro studio attivo sulla stessa email.
	 */
	private void removeOwnerAccountAfterSalonDeletion(String ownerEmail, String ownerSub) {
		if (ownerSub != null) {
			consumerProfileRepository.findByAuthSub(ownerSub).ifPresent(this::softDeleteSalonOwnerIfAllowed);
			return;
		}
		if (ownerEmail == null) {
			return;
		}
		consumerProfileRepository
				.findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByCreatedAtDesc(ownerEmail)
				.ifPresent(this::softDeleteSalonOwnerIfAllowed);
	}

	private void softDeleteSalonOwnerIfAllowed(ConsumerProfile profile) {
		if (profile.getDeletedAt() != null) {
			return;
		}
		if (hasAdminRole(profile.getSecurityRoles())) {
			return;
		}
		String email = profile.getEmail();
		if (email != null && !email.isBlank()) {
			String norm = email.trim().toLowerCase(Locale.ROOT);
			if (studioGroupRepository.findByOwnerEmailIgnoreCase(norm).isPresent()) {
				return;
			}
		}
		String sub = profile.getAuthSub();
		if (sub == null || sub.isBlank()) {
			return;
		}
		consumerAccountService.deleteAccount(sub);
	}

	private static boolean hasAdminRole(String securityRolesCsv) {
		if (securityRolesCsv == null || securityRolesCsv.isBlank()) {
			return false;
		}
		for (String part : securityRolesCsv.split("[,;\\s]+")) {
			if ("ADMIN".equalsIgnoreCase(part.trim())) {
				return true;
			}
		}
		return false;
	}

	private static String normalizeOwnerEmail(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		return raw.trim().toLowerCase(Locale.ROOT);
	}

	/**
	 * JWT Luxury per il titolare del salone (stesso formato di {@code POST /api/v1/auth/login}), senza password.
	 * Riservato al super admin autenticato.
	 */
	@Transactional
	public SalonOwnerLuxurySession issueSalonOwnerLuxurySession(UUID studioGroupId) {
		StudioGroup group = studioGroupRepository.findById(studioGroupId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Salone non trovato."));
		String ownerEmail = group.getOwnerEmail();
		if (ownerEmail == null || ownerEmail.isBlank()) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"SALON_OWNER_EMAIL_MISSING",
					"Questo salone non ha un’email titolare: impossibile aprire la sessione titolare.");
		}
		String normEmail = ownerEmail.trim().toLowerCase(Locale.ROOT);
		Optional<StudioGroup> byEmail = studioGroupRepository.findByOwnerEmailIgnoreCase(normEmail);
		if (byEmail.isEmpty() || !byEmail.get().getId().equals(group.getId())) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"SALON_OWNER_MISMATCH",
					"Dati titolare incoerenti per questo salone.");
		}
		ConsumerProfile profile = consumerProfileRepository
				.findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByCreatedAtDesc(normEmail)
				.orElseThrow(() -> new BusinessException(
						HttpStatus.BAD_REQUEST,
						"OWNER_PROFILE_NOT_FOUND",
						"Nessun account Saloni Luxury attivo per l’email titolare del salone. Verifica che il titolare sia registrato con la stessa email."));
		salonOwnerRoleAlignmentService.alignAfterSuccessfulPasswordLogin(profile);
		ConsumerProfile forToken = consumerProfileRepository.findById(profile.getId()).orElse(profile);
		String accessToken = luxuryTokenService.createAccessToken(forToken);
		profileAccessNotificationService.notifySalonProfileAccess(group);
		return new SalonOwnerLuxurySession(accessToken, securityProperties.authJwtTtlHours() * 3600L);
	}

	@Transactional
	public void updateSalon(UUID studioGroupId, SuperAdminUpdateSalonRequest body) {
		StudioGroup group = studioGroupRepository.findById(studioGroupId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Salone non trovato."));

		String newOwnerEmail = trimToNull(body.ownerEmail());
		if (newOwnerEmail != null) {
			group.setOwnerEmail(newOwnerEmail);
		}

		String newSalonName = trimToNull(body.salonName());
		if (newSalonName != null) {
			group.setName(newSalonName);
		}

		String newCity = trimToNull(body.salonCity());
		if (newCity != null) {
			List<Location> locations = locationRepository.findByStudioGroup_IdOrderByNameAsc(group.getId());
			if (!locations.isEmpty()) {
				locations.get(0).setCity(newCity);
			}
		}
	}

	@Transactional
	public SuperAdminSystemNotificationResult sendSystemNotification(SuperAdminSystemNotificationRequest body) {
		validateSystemNotificationBody(body);
		String message = body.message().trim();
		String subjectRaw = body.subject() != null ? body.subject().trim() : "";
		String subject = subjectRaw.isEmpty() ? "Messaggio da Saloni Luxury" : subjectRaw;
		List<UUID> ids = parseStudioGroupIdList(body.studioGroupIds());
		if (ids.size() > 200) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"VALIDATION_ERROR",
					"Massimo 200 saloni per singolo invio.");
		}
		Instant at = Instant.now();
		int delivered = 0;
		for (UUID id : ids) {
			StudioGroup group = studioGroupRepository.findById(id)
					.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Salone non trovato: " + id));
			scheduledNotificationRepository.save(ScheduledNotification.adminPlatformInbox(group, subject, message, at));
			delivered++;
		}
		return new SuperAdminSystemNotificationResult(delivered);
	}

	private static void validateSystemNotificationBody(SuperAdminSystemNotificationRequest body) {
		if (body == null) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Corpo richiesta mancante.");
		}
		if (body.message() == null) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Il testo del messaggio è obbligatorio.");
		}
		String msg = body.message().trim();
		if (msg.isEmpty()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Il testo del messaggio è obbligatorio.");
		}
		if (msg.length() > 4000) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Il messaggio supera i 4000 caratteri.");
		}
		if (body.subject() != null && body.subject().trim().length() > 200) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "L'oggetto supera i 200 caratteri.");
		}
	}

	private static List<UUID> parseStudioGroupIdList(List<String> rawIds) {
		if (rawIds == null || rawIds.isEmpty()) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"VALIDATION_ERROR",
					"Seleziona almeno un salone destinatario (studioGroupIds).");
		}
		List<UUID> out = new ArrayList<>();
		for (String raw : rawIds) {
			if (raw == null) {
				continue;
			}
			String t = raw.trim();
			if (t.isEmpty()) {
				continue;
			}
			try {
				out.add(UUID.fromString(t));
			}
			catch (IllegalArgumentException e) {
				throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Id salone non valido: " + t);
			}
		}
		if (out.isEmpty()) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"VALIDATION_ERROR",
					"Seleziona almeno un salone destinatario (nessun id valido).");
		}
		return out.stream().distinct().toList();
	}

	private static String trimToNull(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}

	public record SuperAdminCreateClientRequest(
			@NotBlank @Email @Size(max = 320) String email,
			@NotBlank @Size(min = 8, max = 200) String password,
			@NotBlank @Size(max = 100) String firstName,
			@NotBlank @Size(max = 100) String lastName,
			@jakarta.validation.constraints.Pattern(regexp = "^[A-Z]{2}$", message = "Paese: usa codice ISO a 2 lettere (es. IT)")
			String country,
			@Size(max = 40) String phone) {
	}

	public record SuperAdminCreateSalonRequest(
			@NotBlank @Email @Size(max = 320) String email,
			@NotBlank @Size(min = 8, max = 200) String password,
			@NotBlank @Size(max = 100) String firstName,
			@NotBlank @Size(max = 100) String lastName,
			@Size(max = 40) String phone,
			@NotBlank @Size(max = 200) String salonName,
			@NotBlank @Pattern(regexp = "BASE|PREMIUM") String planTier,
			@Size(max = 200) String salonAddressLine1,
			@Size(max = 12) String salonPostalCode,
			@Size(max = 100) String salonCity,
			@Size(max = 5) String salonProvince,
			Boolean provider,
			@AssertTrue(message = "Accetta termini e informativa privacy") Boolean acceptedTermsAndPrivacy,
			@Size(max = 40) String legalDocumentVersion,
			@AssertTrue(message = "Accetta l'accordo sul trattamento dati (Art. 28 GDPR)") Boolean acceptedDataProcessingAgreement,
			@Size(max = 40) String dpaDocumentVersion) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record SuperAdminSystemNotificationRequest(
			/** UUID salone come stringhe; validazione lato {@link #sendSystemNotification}. */
			List<String> studioGroupIds,
			String subject,
			String message) {
	}

	public record SuperAdminUpdateSalonRequest(
			@Email @Size(max = 320) String ownerEmail,
			@Size(max = 200) String salonName,
			@Size(max = 100) String salonCity) {
	}

	public record SuperAdminSystemNotificationResult(int deliveredCount) {
	}

	public record SalonOwnerLuxurySession(String accessToken, long expiresInSeconds) {
	}
}
