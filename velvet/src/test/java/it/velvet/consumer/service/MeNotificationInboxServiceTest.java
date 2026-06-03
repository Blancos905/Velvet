package it.velvet.consumer.service;

import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.notification.domain.NotificationType;
import it.velvet.notification.domain.QueuedNotificationStatus;
import it.velvet.notification.domain.ScheduledNotificationRepository;
import it.velvet.bootstrap.SuperAdminConsumerProfileEnsureService;
import it.velvet.security.auth.VelvetUserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MeNotificationInboxServiceTest {

	@Mock
	private ConsumerProfileService consumerProfileService;
	@Mock
	private ConsumerProfileRepository consumerProfileRepository;
	@Mock
	private ScheduledNotificationRepository scheduledNotificationRepository;
	@Mock
	private SuperAdminConsumerProfileEnsureService superAdminConsumerProfileEnsureService;

	private MeNotificationInboxService service;
	private ConsumerProfile profile;
	private UUID profileId;
	private VelvetUserPrincipal principal;

	@BeforeEach
	void setUp() {
		service = new MeNotificationInboxService(
				consumerProfileService,
				consumerProfileRepository,
				scheduledNotificationRepository,
				superAdminConsumerProfileEnsureService);
		profileId = UUID.randomUUID();
		profile = mock(ConsumerProfile.class);
		when(profile.getId()).thenReturn(profileId);
		principal = new VelvetUserPrincipal(profileId, "sub-test", "client@test.com", List.of("CLIENT"));
	}

	@Test
	void resolve_bookingConfirmation_pendingCountExcludesScheduledReminders() {
		when(consumerProfileService.requireActiveProfile(principal)).thenReturn(profile);
		when(scheduledNotificationRepository.countSentByConsumerAndTypesAfter(
						eq(profileId), any(), eq(QueuedNotificationStatus.SENT), any()))
				.thenReturn(2L);
		when(scheduledNotificationRepository.countPendingByConsumerAndTypesAfter(
						eq(profileId),
						eq(List.of(NotificationType.BOOKING_CONFIRMATION)),
						eq(QueuedNotificationStatus.PENDING),
						any()))
				.thenReturn(0L);

		var inbox = service.resolve(principal);
		var row = inbox.types().stream()
				.filter(t -> "BOOKING_CONFIRMATION".equals(t.type()))
				.findFirst()
				.orElseThrow();
		assertThat(row.pending()).isZero();
		assertThat(row.sent()).isEqualTo(2);
	}

}
