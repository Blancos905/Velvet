package it.luxury.dev;

import it.luxury.appointment.domain.Appointment;
import it.luxury.billing.domain.LuxuryFiscalInvoice;
import it.luxury.billing.domain.LuxuryFiscalInvoiceStatus;
import it.luxury.billing.service.SalonBillingEmailDispatchService;
import it.luxury.catalog.domain.SalonClient;
import it.luxury.catalog.domain.SalonLuxuryChatSender;
import it.luxury.catalog.domain.SalonService;
import it.luxury.catalog.domain.StaffOperator;
import it.luxury.config.LuxuryMailProperties;
import it.luxury.config.LuxuryNotificationProperties;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.notification.domain.NotificationType;
import it.luxury.notification.service.AccountLifecycleEmailDispatchService;
import it.luxury.notification.service.PasswordResetEmailDispatchService;
import it.luxury.notification.service.RegistrationEmailAudience;
import it.luxury.notification.service.RegistrationEmailDispatchService;
import it.luxury.notification.service.SalonLuxuryChatEmailDispatchService;
import it.luxury.notification.service.SupportRequestEmailDispatchService;
import it.luxury.notification.service.TransactionalEmailDispatchService;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.StudioGroup;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.lang.Nullable;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/** Anteprima locale di tutte le email transazionali pianificate. */
@Service
public class LocalDevEmailPreviewService {

	private static final Logger log = LoggerFactory.getLogger(LocalDevEmailPreviewService.class);

	private static final UUID SAMPLE_APPOINTMENT_ID = UUID.fromString("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
	private static final UUID SAMPLE_SALON_CLIENT_ID = UUID.fromString("11111111-2222-3333-4444-555555555555");
	private static final UUID SAMPLE_OPERATOR_ID = UUID.fromString("66666666-7777-8888-9999-aaaaaaaaaaaa");

	private final RegistrationEmailDispatchService registrationEmailDispatchService;
	private final PasswordResetEmailDispatchService passwordResetEmailDispatchService;
	private final AccountLifecycleEmailDispatchService accountLifecycleEmailDispatchService;
	private final TransactionalEmailDispatchService transactionalEmailDispatchService;
	private final SalonBillingEmailDispatchService billingEmailDispatchService;
	private final SalonLuxuryChatEmailDispatchService chatEmailDispatchService;
	private final SupportRequestEmailDispatchService supportRequestEmailDispatchService;
	private final LuxuryNotificationProperties notificationProperties;
	private final LuxuryMailProperties mailProperties;
	@Nullable
	private final JavaMailSender javaMailSender;

	public LocalDevEmailPreviewService(
			RegistrationEmailDispatchService registrationEmailDispatchService,
			PasswordResetEmailDispatchService passwordResetEmailDispatchService,
			AccountLifecycleEmailDispatchService accountLifecycleEmailDispatchService,
			TransactionalEmailDispatchService transactionalEmailDispatchService,
			SalonBillingEmailDispatchService billingEmailDispatchService,
			SalonLuxuryChatEmailDispatchService chatEmailDispatchService,
			SupportRequestEmailDispatchService supportRequestEmailDispatchService,
			LuxuryNotificationProperties notificationProperties,
			LuxuryMailProperties mailProperties,
			@Nullable JavaMailSender javaMailSender) {
		this.registrationEmailDispatchService = registrationEmailDispatchService;
		this.passwordResetEmailDispatchService = passwordResetEmailDispatchService;
		this.accountLifecycleEmailDispatchService = accountLifecycleEmailDispatchService;
		this.transactionalEmailDispatchService = transactionalEmailDispatchService;
		this.billingEmailDispatchService = billingEmailDispatchService;
		this.chatEmailDispatchService = chatEmailDispatchService;
		this.supportRequestEmailDispatchService = supportRequestEmailDispatchService;
		this.notificationProperties = notificationProperties;
		this.mailProperties = mailProperties;
		this.javaMailSender = javaMailSender;
	}

	public List<String> sendAllSamples(String to) {
		String recipient = normalizeRecipient(to);
		if (recipient == null) {
			throw new IllegalArgumentException("Indirizzo email non valido.");
		}
		if (!mailProperties.isEnabled() || javaMailSender == null) {
			throw new IllegalStateException(
					"SMTP non configurato: imposta LUXURY_MAIL_ENABLED=true e SPRING_MAIL_* in spring-dev.local.env.");
		}

		List<String> sent = new ArrayList<>();
		String baseUrl = notificationProperties.getFrontendBaseUrl().replaceAll("/+$", "");
		String greeting = "Michele";

		registrationEmailDispatchService.dispatchEmailVerification(
				recipient, greeting, baseUrl + "/conferma-email?token=preview-client", RegistrationEmailAudience.CLIENT);
		sent.add("1. Conferma email cliente (registrazione)");

		registrationEmailDispatchService.dispatchEmailVerification(
				recipient,
				greeting,
				baseUrl + "/conferma-email?token=preview-owner",
				RegistrationEmailAudience.SALON_OWNER);
		sent.add("2. Conferma email titolare salone (registrazione)");

		registrationEmailDispatchService.dispatchPremiumCheckoutContinuation(
				recipient, greeting, baseUrl + "/account/billing/checkout?token=preview");
		sent.add("3. Completa pagamento Premium (recupero post-verifica)");

		passwordResetEmailDispatchService.dispatchPasswordReset(
				recipient, greeting, baseUrl + "/reimposta-password?token=preview");
		sent.add("4. Reimposta password");

		accountLifecycleEmailDispatchService.dispatchWelcome(recipient, greeting, false);
		sent.add("5. Benvenuto");

		accountLifecycleEmailDispatchService.dispatchPasswordChanged(recipient, greeting);
		sent.add("6. Password aggiornata");

		accountLifecycleEmailDispatchService.dispatchAccountDeleted(recipient, greeting);
		sent.add("7. Account eliminato");

		accountLifecycleEmailDispatchService.dispatchStaffInvite(
				recipient, greeting, "Hair Jassa Demo", recipient);
		sent.add("8. Accesso staff creato");

		accountLifecycleEmailDispatchService.dispatchNewDeviceLogin(
				recipient, greeting, "Chrome · macOS", "203.0.113.10");
		sent.add("9. Nuovo accesso / dispositivo");

		Appointment appointment = sampleAppointment(recipient);
		for (NotificationType type : List.of(
				NotificationType.BOOKING_CONFIRMATION,
				NotificationType.BOOKING_UPDATED,
				NotificationType.BOOKING_CANCELLED_BY_CONSUMER,
				NotificationType.BOOKING_CANCELLED_BY_SALON,
				NotificationType.BOOKING_REQUEST_REJECTED,
				NotificationType.REMINDER_24H,
				NotificationType.REMINDER_1H,
				NotificationType.REVIEW_INVITE)) {
			transactionalEmailDispatchService.dispatchConsumerAppointmentEmail(type, appointment);
			sent.add(bookingEmailLabel(type));
		}

		StudioGroup group = sampleStudioGroup(recipient);
		billingEmailDispatchService.dispatchPaymentThankYou(
				group, 2900L, "eur", Instant.parse("2026-09-23T22:00:00Z"));
		sent.add("18. Pagamento / attivazione Premium (thank-you)");

		billingEmailDispatchService.dispatchPaymentReceiptPdf(
				group, 2900L, "eur", Instant.parse("2026-08-23T10:00:00Z"), "in_preview_demo123");
		sent.add("19. Ricevuta PDF Premium (titolare)");

		billingEmailDispatchService.dispatchPaymentFailed(group, 2900L, "eur");
		sent.add("20. Pagamento Premium non riuscito");

		billingEmailDispatchService.dispatchRenewalReminder(
				group, Instant.parse("2026-09-23T22:00:00Z"), 2900L, "eur");
		sent.add("21. Prossimo rinnovo Premium");

		billingEmailDispatchService.dispatchSubscriptionCancellationConfirmed(
				group, Instant.parse("2026-09-23T22:00:00Z"));
		sent.add("22. Disdetta Premium");

		billingEmailDispatchService.dispatchSalonDeletionWarning(
				group, Instant.parse("2026-10-23T22:00:00Z"));
		sent.add("23. Avviso cancellazione salone (post-disdetta)");

		SalonClient salonClient = sampleSalonClient(recipient);
		chatEmailDispatchService.dispatchNewChatMessage(
				SalonLuxuryChatSender.CLIENT,
				"Ciao, vorrei spostare l'appuntamento di giovedì. È possibile?",
				salonClient,
				null);
		sent.add("24. Chat — nuovo messaggio");

		/* Anteprima: inviata al destinatario di test (in prod va a assistenza@). */
		supportRequestEmailDispatchService.dispatchSupportRequest(
				"Problema con una prenotazione",
				"Non riesco a vedere l'appuntamento di giovedì nell'agenda.",
				greeting,
				recipient,
				"ROLE_CLIENT",
				false,
				recipient);
		sent.add("25. Assistenza — nuova richiesta");

		sendFatturaPaPreview(recipient);
		sent.add("26. FatturaPA — XML pronto per portale AdE (solo admin)");

		log.info("[Luxury dev email] inviate {} anteprime → {}", sent.size(), recipient);
		return sent;
	}

	private static String bookingEmailLabel(NotificationType type) {
		return switch (type) {
			case BOOKING_CONFIRMATION -> "10. Conferma prenotazione (cliente)";
			case BOOKING_UPDATED -> "11. Prenotazione aggiornata (cliente)";
			case BOOKING_CANCELLED_BY_CONSUMER -> "12. Prenotazione annullata dal cliente";
			case BOOKING_CANCELLED_BY_SALON -> "13. Prenotazione annullata dal salone";
			case BOOKING_REQUEST_REJECTED -> "14. Richiesta prenotazione non confermata";
			case REMINDER_24H -> "15. Promemoria appuntamento (24 ore)";
			case REMINDER_1H -> "16. Promemoria appuntamento (2 ore)";
			case REVIEW_INVITE -> "17. Invito recensione";
			default -> type.name();
		};
	}

	private Appointment sampleAppointment(String recipientEmail) {
		StudioGroup group = sampleStudioGroup(recipientEmail);
		Location location = new Location(group, "hair-jassa-demo", "Hair Jassa Milano", "Milano");
		location.setTimeZone("Europe/Rome");
		SalonService service = new SalonService(location, "Barba", 30, 2500);
		StaffOperator operator = new StaffOperator(location, "Marco Rossi");
		setEntityId(operator, SAMPLE_OPERATOR_ID);
		SalonClient salonClient = new SalonClient(location, "Michele Demo");
		salonClient.setEmail(recipientEmail);
		ConsumerProfile consumer = new ConsumerProfile("preview-client-sub", recipientEmail, "Michele");
		salonClient.setConsumerProfile(consumer);
		Instant start = Instant.parse("2026-08-25T07:30:00Z");
		Appointment appointment =
				new Appointment(location, service, operator, salonClient, start, start.plusSeconds(1800));
		appointment.setConsumerProfile(consumer);
		setEntityId(appointment, SAMPLE_APPOINTMENT_ID);
		return appointment;
	}

	private SalonClient sampleSalonClient(String recipientEmail) {
		StudioGroup group = sampleStudioGroup(recipientEmail);
		Location location = new Location(group, "hair-jassa-demo", "Hair Jassa Milano", "Milano");
		SalonClient salonClient = new SalonClient(location, "Michele Demo");
		salonClient.setEmail(recipientEmail);
		salonClient.setConsumerProfile(new ConsumerProfile("preview-chat-client", recipientEmail, "Michele"));
		setEntityId(salonClient, SAMPLE_SALON_CLIENT_ID);
		return salonClient;
	}

	private static StudioGroup sampleStudioGroup(String ownerEmail) {
		StudioGroup group = new StudioGroup("Hair Jassa Demo");
		group.setOwnerEmail(ownerEmail);
		return group;
	}

	private void sendFatturaPaPreview(String to) {
		LuxuryFiscalInvoice invoice = new LuxuryFiscalInvoice("in_preview_stripe_inv");
		invoice.setInvoiceNumber("SLX/2026/00042");
		invoice.setInvoiceDate(LocalDate.of(2026, 8, 22));
		invoice.setAmountCents(2900L);
		invoice.setCurrency("EUR");
		invoice.setRecipientLegalName("Hair Jassa Demo S.r.l.");
		invoice.setStatus(LuxuryFiscalInvoiceStatus.READY);
		invoice.setXmlContent("<?xml version=\"1.0\" encoding=\"UTF-8\"?><FatturaElettronica><!-- anteprima dev --></FatturaElettronica>");
		invoice.setXmlFilename("IT01234567890_SLX202600042.xml");

		String subject = "Fattura elettronica pronta — " + invoice.getInvoiceNumber();
		String plainBody = """
				È stata generata una fattura elettronica FatturaPA per un pagamento abbonamento Premium.

				Numero fattura: %s
				Data: %s
				Importo: %s %s
				Cliente: %s
				Stripe invoice: %s

				In allegato trovi il file XML da caricare gratuitamente sul portale Fatture e Corrispettivi dell'Agenzia delle Entrate (SPID/CIE):
				https://ivaservizi.agenziaentrate.gov.it/portale/web/guest/home

				Dopo l'invio allo SDI, conserva la ricevuta di consegna del Sistema di Interscambio.
				"""
				.formatted(
						invoice.getInvoiceNumber(),
						invoice.getInvoiceDate(),
						formatEuro(invoice.getAmountCents()),
						invoice.getCurrency(),
						invoice.getRecipientLegalName(),
						invoice.getStripeInvoiceId());

		try {
			MimeMessage message = javaMailSender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
			helper.setFrom(mailProperties.getFrom(), mailProperties.getFromDisplayName());
			helper.setTo(to);
			helper.setSubject(subject);
			helper.setText(plainBody, false);
			helper.addAttachment(
					invoice.getXmlFilename(),
					new ByteArrayResource(invoice.getXmlContent().getBytes(StandardCharsets.UTF_8)),
					"application/xml");
			javaMailSender.send(message);
		}
		catch (Exception ex) {
			log.warn("Anteprima email FatturaPA fallita to={}: {}", to, ex.getMessage());
		}
	}

	private static String normalizeRecipient(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		String trimmed = raw.trim().toLowerCase(Locale.ROOT);
		if (!trimmed.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
			return null;
		}
		return trimmed;
	}

	private static String formatEuro(long amountCents) {
		return String.format(Locale.ITALIAN, "€ %.2f", amountCents / 100.0);
	}

	private static void setEntityId(Object entity, UUID id) {
		try {
			Field idField = entity.getClass().getDeclaredField("id");
			idField.setAccessible(true);
			idField.set(entity, id);
		}
		catch (ReflectiveOperationException ex) {
			throw new IllegalStateException("Impossibile impostare id anteprima su " + entity.getClass().getSimpleName(), ex);
		}
	}
}
