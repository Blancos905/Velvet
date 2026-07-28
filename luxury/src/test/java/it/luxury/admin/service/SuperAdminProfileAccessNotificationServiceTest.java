package it.luxury.admin.service;

import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.notification.domain.NotificationType;
import it.luxury.notification.domain.ScheduledNotification;
import it.luxury.notification.domain.ScheduledNotificationRepository;
import it.luxury.studio.domain.StudioGroup;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class SuperAdminProfileAccessNotificationServiceTest {

	@Mock
	private ScheduledNotificationRepository scheduledNotificationRepository;

	private SuperAdminProfileAccessNotificationService service;

	@BeforeEach
	void setUp() {
		service = new SuperAdminProfileAccessNotificationService(scheduledNotificationRepository);
	}

	@Test
	void notifySalonProfileAccess_createsAdminPlatformInboxForStudioGroup() {
		StudioGroup group = new StudioGroup("Salone Demo");

		service.notifySalonProfileAccess(group);

		ArgumentCaptor<ScheduledNotification> captor = ArgumentCaptor.forClass(ScheduledNotification.class);
		verify(scheduledNotificationRepository).save(captor.capture());
		ScheduledNotification saved = captor.getValue();
		assertThat(saved.getType()).isEqualTo(NotificationType.ADMIN_PLATFORM_MESSAGE);
		assertThat(saved.getStudioGroup()).isSameAs(group);
		assertThat(saved.getPlatformMessageSubject()).isEqualTo("Accesso al profilo da Saloni Luxury");
		assertThat(saved.getPlatformMessageBody()).contains("Salone Demo");
	}

	@Test
	void notifyConsumerProfileAccess_createsAdminPlatformInboxForConsumer() {
		ConsumerProfile profile = new ConsumerProfile(UUID.randomUUID().toString(), "client@test.com", "Mario Rossi");

		service.notifyConsumerProfileAccess(profile);

		ArgumentCaptor<ScheduledNotification> captor = ArgumentCaptor.forClass(ScheduledNotification.class);
		verify(scheduledNotificationRepository).save(captor.capture());
		ScheduledNotification saved = captor.getValue();
		assertThat(saved.getType()).isEqualTo(NotificationType.ADMIN_PLATFORM_MESSAGE);
		assertThat(saved.getRecipientConsumer()).isSameAs(profile);
		assertThat(saved.getAppointment()).isNull();
		assertThat(saved.getPlatformMessageSubject()).isEqualTo("Accesso al profilo da Saloni Luxury");
		assertThat(saved.getPlatformMessageBody()).contains("Mario Rossi");
	}
}
