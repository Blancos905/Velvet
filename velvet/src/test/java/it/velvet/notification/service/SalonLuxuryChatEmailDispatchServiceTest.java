package it.velvet.notification.service;

import it.velvet.catalog.domain.SalonClient;
import it.velvet.catalog.domain.SalonLuxuryChatSender;
import it.velvet.catalog.domain.StaffOperator;
import it.velvet.config.VelvetMailProperties;
import it.velvet.config.VelvetNotificationProperties;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.studio.domain.Location;
import it.velvet.studio.domain.StudioGroup;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mail.javamail.JavaMailSender;

import java.lang.reflect.Field;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SalonLuxuryChatEmailDispatchServiceTest {

	private static final String VALID_TEST_EMAIL = "reviewer@example.org";
	private static final UUID TEST_SALON_CLIENT_ID = UUID.fromString("a1b2c3d4-e5f6-4789-a012-3456789abcde");

	@Mock
	private JavaMailSender javaMailSender;

	@Mock
	private MimeMessage mimeMessage;

	private VelvetMailProperties mailProperties;
	private VelvetNotificationProperties notificationProperties;
	private SalonLuxuryChatEmailDispatchService service;

	@BeforeEach
	void setUp() {
		mailProperties = new VelvetMailProperties();
		mailProperties.setEnabled(true);
		notificationProperties = new VelvetNotificationProperties();
		notificationProperties.setFrontendBaseUrl("https://app.saloniluxury.it");
		service = new SalonLuxuryChatEmailDispatchService(mailProperties, notificationProperties, javaMailSender);
	}

	@Test
	void resolveClientRecipientEmail_prefersConsumerProfile() {
		ConsumerProfile consumer = new ConsumerProfile("sub-1", VALID_TEST_EMAIL, "Cliente");
		SalonClient salonClient = salonClientWith(consumer, "altro@example.org", null);

		assertThat(SalonLuxuryChatEmailDispatchService.resolveClientRecipientEmail(salonClient))
				.isEqualTo(VALID_TEST_EMAIL);
	}

	@Test
	void resolveClientRecipientEmail_fallsBackToSalonClientEmail() {
		SalonClient salonClient = salonClientWith(null, VALID_TEST_EMAIL, null);

		assertThat(SalonLuxuryChatEmailDispatchService.resolveClientRecipientEmail(salonClient))
				.isEqualTo(VALID_TEST_EMAIL);
	}

	@Test
	void resolveClientRecipientEmail_withoutEmail_returnsNull() {
		SalonClient salonClient = salonClientWith(null, null, null);

		assertThat(SalonLuxuryChatEmailDispatchService.resolveClientRecipientEmail(salonClient)).isNull();
	}

	@Test
	void resolveSalonRecipientEmail_ownerThread_usesOwnerEmail() {
		StudioGroup group = new StudioGroup("Salone", VALID_TEST_EMAIL, "PREMIUM");
		Location location = new Location(group, "slug", "Sede", "MI");
		SalonClient salonClient = salonClientWith(null, null, location);

		assertThat(SalonLuxuryChatEmailDispatchService.resolveSalonRecipientEmail(salonClient, null))
				.isEqualTo(VALID_TEST_EMAIL);
	}

	@Test
	void resolveSalonRecipientEmail_staffThread_prefersStaffEmail() {
		StudioGroup group = new StudioGroup("Salone", "owner@example.org", "PREMIUM");
		Location location = new Location(group, "slug", "Sede", "MI");
		SalonClient salonClient = salonClientWith(null, null, location);
		ConsumerProfile staffProfile = new ConsumerProfile("sub-staff", VALID_TEST_EMAIL, "Op");
		StaffOperator operator = new StaffOperator(location, "Operatore");
		operator.setConsumerProfile(staffProfile);

		assertThat(SalonLuxuryChatEmailDispatchService.resolveSalonRecipientEmail(salonClient, operator))
				.isEqualTo(VALID_TEST_EMAIL);
	}

	@Test
	void dispatch_whenNoRecipient_doesNotSend() {
		SalonClient salonClient = salonClientWith(null, null, null);

		service.dispatchNewChatMessage(SalonLuxuryChatSender.OWNER, "Ciao", salonClient, null);

		verify(javaMailSender, never()).createMimeMessage();
	}

	@Test
	void dispatch_skipsTestDomainWithoutCallingSmtp() {
		ConsumerProfile consumer = new ConsumerProfile("sub-1", "cliente@test.com", "Cliente");
		SalonClient salonClient = salonClientWith(consumer, null, null);

		service.dispatchNewChatMessage(SalonLuxuryChatSender.OWNER, "Ciao", salonClient, null);

		verify(javaMailSender, never()).createMimeMessage();
		verify(javaMailSender, never()).send(any(MimeMessage.class));
	}

	@Test
	void dispatch_whenEnabled_sendsPlainTextEmail() throws Exception {
		ConsumerProfile consumer = new ConsumerProfile("sub-1", VALID_TEST_EMAIL, "Cliente");
		SalonClient salonClient = salonClientWith(consumer, null, null);
		when(javaMailSender.createMimeMessage()).thenReturn(mimeMessage);

		service.dispatchNewChatMessage(SalonLuxuryChatSender.OWNER, "Ciao dal salone", salonClient, null);

		verify(javaMailSender).send(mimeMessage);
	}

	@Test
	void dispatch_smtpFailure_doesNotThrow() throws Exception {
		StudioGroup group = new StudioGroup("Salone", VALID_TEST_EMAIL, "PREMIUM");
		Location location = new Location(group, "slug", "Sede", "MI");
		SalonClient salonClient = salonClientWith(null, null, location);
		when(javaMailSender.createMimeMessage()).thenReturn(mimeMessage);
		org.mockito.Mockito.doThrow(new RuntimeException("SMTP down")).when(javaMailSender).send(mimeMessage);

		service.dispatchNewChatMessage(SalonLuxuryChatSender.CLIENT, "Ciao dal cliente", salonClient, null);
	}

	private static SalonClient salonClientWith(ConsumerProfile consumer, String email, Location location) {
		Location loc = location != null ? location : mock(Location.class);
		SalonClient salonClient = new SalonClient(loc, "Anna");
		salonClient.setConsumerProfile(consumer);
		salonClient.setEmail(email);
		assignSalonClientId(salonClient, TEST_SALON_CLIENT_ID);
		return salonClient;
	}

	private static void assignSalonClientId(SalonClient salonClient, UUID id) {
		try {
			Field field = SalonClient.class.getDeclaredField("id");
			field.setAccessible(true);
			field.set(salonClient, id);
		}
		catch (ReflectiveOperationException ex) {
			throw new IllegalStateException("Impossibile impostare id SalonClient nel test", ex);
		}
	}
}
