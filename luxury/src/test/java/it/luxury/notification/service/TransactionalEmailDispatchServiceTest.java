package it.luxury.notification.service;

import it.luxury.appointment.domain.Appointment;
import it.luxury.catalog.domain.SalonClient;
import it.luxury.config.LuxuryMailProperties;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.config.LuxuryNotificationProperties;
import it.luxury.notification.domain.NotificationType;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TransactionalEmailDispatchServiceTest {

	@Mock
	private JavaMailSender javaMailSender;

	@Mock
	private MimeMessage mimeMessage;

	private LuxuryMailProperties mailProperties;
	private LuxuryNotificationProperties notificationProperties;
	private TransactionalEmailDispatchService service;

	@BeforeEach
	void setUp() {
		mailProperties = new LuxuryMailProperties();
		mailProperties.setEnabled(true);
		mailProperties.setFrom("noreply@saloniluxury.it");
		mailProperties.setFromDisplayName("Saloni Luxury");
		notificationProperties = new LuxuryNotificationProperties();
		service = new TransactionalEmailDispatchService(
				mailProperties, notificationProperties, null, javaMailSender);
	}

	@Test
	void resolveRecipientEmail_confirmation_prefersConsumerProfile() {
		ConsumerProfile consumer = new ConsumerProfile("sub-1", "cliente@saloniluxury.it", "Cliente");
		SalonClient salonClient = mock(SalonClient.class);
		when(salonClient.getEmail()).thenReturn("altro@example.org");
		Appointment appointment = appointmentWith(consumer, salonClient);

		assertThat(TransactionalEmailDispatchService.resolveRecipientEmail(
						NotificationType.BOOKING_CONFIRMATION, appointment))
				.isEqualTo("cliente@saloniluxury.it");
	}

	@Test
	void resolveRecipientEmail_confirmation_fallsBackToSalonClient() {
		Appointment appointment = appointmentWith(null, salonClientWithEmail("cliente.salone@example.org"));

		assertThat(TransactionalEmailDispatchService.resolveRecipientEmail(
						NotificationType.BOOKING_CONFIRMATION, appointment))
				.isEqualTo("cliente.salone@example.org");
	}

	@Test
	void resolveRecipientEmail_reminder_usesOnlyConsumerProfile() {
		ConsumerProfile consumer = new ConsumerProfile("sub-1", "cliente@saloniluxury.it", "Cliente");
		Appointment appointment = appointmentWith(consumer, null);

		assertThat(TransactionalEmailDispatchService.resolveRecipientEmail(NotificationType.REMINDER_24H, appointment))
				.isEqualTo("cliente@saloniluxury.it");
	}

	@Test
	void resolveRecipientEmail_reminder_withoutConsumer_returnsNull() {
		Appointment appointment = appointmentWith(null, salonClientWithEmail("altro@example.org"));

		assertThat(TransactionalEmailDispatchService.resolveRecipientEmail(NotificationType.REMINDER_1H, appointment))
				.isNull();
	}

	@Test
	void dispatch_whenDisabled_doesNotSend() {
		mailProperties.setEnabled(false);
		ConsumerProfile consumer = new ConsumerProfile("sub-1", "cliente@saloniluxury.it", "Cliente");
		Appointment appointment = appointmentWith(consumer, null);

		service.dispatchForBookingNotification(
				NotificationType.BOOKING_CONFIRMATION, appointment, "Oggetto", "Corpo");

		verify(javaMailSender, never()).send(any(MimeMessage.class));
	}

	@Test
	void dispatch_skipsSeedDomainWithoutCallingSmtp() {
		ConsumerProfile consumer = new ConsumerProfile("sub-1", "cliente1@test.com", "Cliente");
		Appointment appointment = appointmentWith(consumer, null);

		service.dispatchForBookingNotification(
				NotificationType.BOOKING_CONFIRMATION, appointment, "Conferma", "Testo messaggio");

		verify(javaMailSender, never()).createMimeMessage();
		verify(javaMailSender, never()).send(any(MimeMessage.class));
	}

	@Test
	void dispatch_whenEnabled_sendsPlainTextEmail() throws Exception {
		ConsumerProfile consumer = new ConsumerProfile("sub-1", "cliente@saloniluxury.it", "Cliente");
		Appointment appointment = appointmentWith(consumer, null);
		when(javaMailSender.createMimeMessage()).thenReturn(mimeMessage);

		service.dispatchForBookingNotification(
				NotificationType.BOOKING_CONFIRMATION, appointment, "Conferma", "Testo messaggio");

		verify(javaMailSender).send(mimeMessage);
	}

	@Test
	void resolveRecipientEmail_updated_usesConsumerProfile() {
		ConsumerProfile consumer = new ConsumerProfile("sub-1", "cliente@saloniluxury.it", "Cliente");
		Appointment appointment = appointmentWith(consumer, null);

		assertThat(TransactionalEmailDispatchService.resolveRecipientEmail(
						NotificationType.BOOKING_UPDATED, appointment))
				.isEqualTo("cliente@saloniluxury.it");
	}

	@Test
	void dispatch_whenEnabled_sendsUpdatedBookingEmail() throws Exception {
		ConsumerProfile consumer = new ConsumerProfile("sub-1", "cliente@saloniluxury.it", "Cliente");
		Appointment appointment = appointmentWith(consumer, null);
		when(javaMailSender.createMimeMessage()).thenReturn(mimeMessage);

		service.dispatchForBookingNotification(
				NotificationType.BOOKING_UPDATED, appointment, "Aggiornamento", "Testo", "<p>html</p>");

		verify(javaMailSender).send(mimeMessage);
	}

	@Test
	void dispatch_ignoresUnsupportedNotificationTypes() {
		ConsumerProfile consumer = new ConsumerProfile("sub-1", "cliente@saloniluxury.it", "Cliente");
		Appointment appointment = appointmentWith(consumer, null);

		service.dispatchForBookingNotification(
				NotificationType.BOOKING_CREATED_FOR_SALON, appointment, "Aggiornamento", "Testo");

		verify(javaMailSender, never()).createMimeMessage();
	}

	private static SalonClient salonClientWithEmail(String email) {
		SalonClient salonClient = mock(SalonClient.class);
		when(salonClient.getEmail()).thenReturn(email);
		return salonClient;
	}

	private static Appointment appointmentWith(ConsumerProfile consumer, SalonClient salonClient) {
		Appointment appointment = mock(Appointment.class);
		when(appointment.getId()).thenReturn(UUID.randomUUID());
		when(appointment.getConsumerProfile()).thenReturn(consumer);
		when(appointment.getSalonClient()).thenReturn(salonClient);
		return appointment;
	}
}
