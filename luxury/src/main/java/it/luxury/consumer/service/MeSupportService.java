package it.luxury.consumer.service;

import it.luxury.bootstrap.SuperAdminConsumerBootstrap;
import it.luxury.bootstrap.SuperAdminConsumerProfileEnsureService;
import it.luxury.common.api.BusinessException;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.notification.domain.ScheduledNotification;
import it.luxury.notification.domain.ScheduledNotificationRepository;
import it.luxury.security.auth.LuxuryUserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.stream.Collectors;

@Service
public class MeSupportService {

	private static final String DEFAULT_SUPPORT_EMAIL = "assistenza@saloniluxury.it";

	private final ConsumerProfileRepository consumerProfileRepository;
	private final ConsumerProfileService consumerProfileService;
	private final ScheduledNotificationRepository scheduledNotificationRepository;
	private final SuperAdminConsumerProfileEnsureService superAdminConsumerProfileEnsureService;

	public MeSupportService(
			ConsumerProfileRepository consumerProfileRepository,
			ConsumerProfileService consumerProfileService,
			ScheduledNotificationRepository scheduledNotificationRepository,
			SuperAdminConsumerProfileEnsureService superAdminConsumerProfileEnsureService) {
		this.consumerProfileRepository = consumerProfileRepository;
		this.consumerProfileService = consumerProfileService;
		this.scheduledNotificationRepository = scheduledNotificationRepository;
		this.superAdminConsumerProfileEnsureService = superAdminConsumerProfileEnsureService;
	}

	public SupportInfo resolveSupportInfo() {
		var superAdmin = consumerProfileRepository.findByAuthSub(SuperAdminConsumerBootstrap.SUPER_ADMIN_AUTH_SUB)
				.orElse(null);
		String supportEmail = superAdmin != null && superAdmin.getEmail() != null && !superAdmin.getEmail().isBlank()
				? superAdmin.getEmail().trim()
				: DEFAULT_SUPPORT_EMAIL;
		String supportPhone = superAdmin != null && superAdmin.getPhone() != null && !superAdmin.getPhone().isBlank()
				? superAdmin.getPhone().trim()
				: null;
		return new SupportInfo(
				"https://luxury.example/help",
				"https://luxury.example/contact",
				"",
				supportEmail,
				supportPhone);
	}

	@Transactional
	public void createSupportRequest(LuxuryUserPrincipal principal, String subject, String message) {
		ConsumerProfile profile = consumerProfileService.requireActiveProfile(principal);
		superAdminConsumerProfileEnsureService.ensureSuperAdminConsumerProfileExists();
		ConsumerProfile superAdmin = consumerProfileRepository
				.findByAuthSub(SuperAdminConsumerBootstrap.SUPER_ADMIN_AUTH_SUB)
				.orElseThrow(() -> new BusinessException(
						HttpStatus.SERVICE_UNAVAILABLE,
						"SUPPORT_UNAVAILABLE",
						"Assistenza non disponibile al momento."));
		String cleanSubject = subject == null || subject.isBlank() ? "Richiesta assistenza da area account" : subject.trim();
		String cleanMessage = message == null ? "" : message.trim();
		String requesterEmail = profile.getEmail() != null && !profile.getEmail().isBlank() ? profile.getEmail().trim() : principal.getEmail();
		String requesterName = profile.getDisplayName() != null && !profile.getDisplayName().isBlank()
				? profile.getDisplayName().trim()
				: requesterEmail;
		String roles = principal.getAuthorities().stream()
				.map(a -> a.getAuthority())
				.sorted()
				.collect(Collectors.joining(", "));
		String nowIso = DateTimeFormatter.ISO_INSTANT.withZone(ZoneOffset.UTC).format(Instant.now());

		String body = """
				%s

				---
				Richiedente: %s (%s)
				Profilo ID: %s
				JWT Subject: %s
				Ruoli: %s
				Timestamp UTC: %s
				"""
				.formatted(
						cleanMessage,
						requesterName == null || requesterName.isBlank() ? "n/d" : requesterName,
						requesterEmail == null || requesterEmail.isBlank() ? "n/d" : requesterEmail,
						profile.getId(),
						principal.getSubject(),
						roles.isBlank() ? "n/d" : roles,
						nowIso);
		boolean fromSalonSide = principal.hasAppRole("OWNER") || principal.hasAppRole("STAFF");
		Instant at = Instant.now();
		scheduledNotificationRepository.save(
				ScheduledNotification.supportRequestToLuxuryInbox(superAdmin, cleanSubject, body, at, fromSalonSide));
	}

	public record SupportInfo(
			String faqUrl,
			String contactUrl,
			String message,
			String supportEmail,
			String supportPhone) {
	}
}
