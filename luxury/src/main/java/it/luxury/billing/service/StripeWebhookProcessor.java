package it.luxury.billing.service;

import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.StripeObject;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import it.luxury.billing.domain.StripeWebhookEvent;
import it.luxury.billing.domain.StripeWebhookEventRepository;
import it.luxury.consumer.service.PendingSalonRegistrationMaterializationService;
import it.luxury.security.audit.SecurityAuditService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import it.luxury.billing.config.ConditionalOnStripeBillingOperational;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Set;
import java.util.UUID;

@Service
@ConditionalOnStripeBillingOperational
public class StripeWebhookProcessor {

	private static final Logger LOG = LoggerFactory.getLogger(StripeWebhookProcessor.class);

	private static final Set<String> HANDLED_TYPES = Set.of(
			"checkout.session.completed",
			"customer.subscription.created",
			"customer.subscription.updated",
			"customer.subscription.deleted",
			"invoice.payment_failed",
			"invoice.paid");

	private final StripeWebhookEventRepository webhookEventRepository;
	private final StripeSubscriptionSyncService subscriptionSyncService;
	private final SalonBillingNotificationService billingNotificationService;
	private final FatturaPaInvoiceService fatturaPaInvoiceService;
	private final SecurityAuditService securityAuditService;
	private final com.stripe.StripeClient stripeClient;
	private final PendingSalonRegistrationMaterializationService materializationService;

	public StripeWebhookProcessor(
			StripeWebhookEventRepository webhookEventRepository,
			StripeSubscriptionSyncService subscriptionSyncService,
			SalonBillingNotificationService billingNotificationService,
			FatturaPaInvoiceService fatturaPaInvoiceService,
			SecurityAuditService securityAuditService,
			com.stripe.StripeClient stripeClient,
			PendingSalonRegistrationMaterializationService materializationService) {
		this.webhookEventRepository = webhookEventRepository;
		this.subscriptionSyncService = subscriptionSyncService;
		this.billingNotificationService = billingNotificationService;
		this.fatturaPaInvoiceService = fatturaPaInvoiceService;
		this.securityAuditService = securityAuditService;
		this.stripeClient = stripeClient;
		this.materializationService = materializationService;
	}

	@Transactional
	public void process(Event event, String rawPayload, HttpServletRequest request) {
		if (webhookEventRepository.existsByStripeEventId(event.getId())) {
			LOG.debug("Stripe webhook duplicato ignorato: {}", event.getId());
			return;
		}
		StripeWebhookEvent row = new StripeWebhookEvent(event.getId(), event.getType(), Boolean.TRUE.equals(event.getLivemode()));
		row.setPayloadHash(sha256Hex(rawPayload));
		webhookEventRepository.save(row);

		if (!HANDLED_TYPES.contains(event.getType())) {
			markSkipped(row, null, request, event);
			return;
		}

		try {
			UUID studioGroupId = dispatch(event, rawPayload);
			row.setStudioGroupId(studioGroupId);
			markProcessed(row, request, event, studioGroupId);
		}
		catch (RuntimeException | StripeException ex) {
			row.setProcessingStatus(StripeWebhookEvent.ProcessingStatus.FAILED);
			row.setProcessedAt(Instant.now());
			webhookEventRepository.save(row);
			securityAuditService.record(
					"STRIPE_WEBHOOK",
					"FAILED",
					event.getId(),
					null,
					request,
					"type=" + event.getType() + ", err=" + safeMessage(ex));
			throw ex instanceof RuntimeException runtime ? runtime : new RuntimeException(ex);
		}
	}

	private UUID dispatch(Event event, String rawPayload) throws StripeException {
		return switch (event.getType()) {
			case "checkout.session.completed" -> handleCheckoutCompleted(event);
			case "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted" ->
					handleSubscriptionEvent(event);
			case "invoice.payment_failed", "invoice.paid" -> handleInvoiceEvent(event, rawPayload);
			default -> null;
		};
	}

	private UUID handleCheckoutCompleted(Event event) throws StripeException {
		Session session = deserialize(event, Session.class);
		if (session == null) {
			return null;
		}
		String pendingRegistrationId = metadata(session, "luxury_pending_registration_id");
		if (pendingRegistrationId != null && !pendingRegistrationId.isBlank()) {
			UUID pendingId = parseUuid(pendingRegistrationId);
			if (pendingId != null) {
				UUID studioGroupId = materializationService.materializePaidPremiumRegistration(
						pendingId,
						session.getCustomer(),
						session.getSubscription());
				billingNotificationService.onCheckoutSessionCompleted(session, studioGroupId);
				return studioGroupId;
			}
		}
		UUID studioGroupId = parseUuid(firstNonBlank(
				session.getClientReferenceId(),
				metadata(session, "luxury_studio_group_id")));
		String subscriptionId = session.getSubscription();
		if (subscriptionId != null && !subscriptionId.isBlank()) {
			subscriptionSyncService.syncFromSubscriptionId(subscriptionId, studioGroupId);
			billingNotificationService.onCheckoutSessionCompleted(session, studioGroupId);
		}
		return studioGroupId;
	}

	private UUID handleSubscriptionEvent(Event event) throws StripeException {
		Subscription subscription = deserialize(event, Subscription.class);
		if (subscription == null) {
			return null;
		}
		UUID studioGroupId = parseUuid(metadata(subscription, "luxury_studio_group_id"));
		billingNotificationService.onSubscriptionEvent(subscription, studioGroupId);
		subscriptionSyncService.syncFromSubscriptionObject(subscription, studioGroupId);
		return studioGroupId != null ? studioGroupId
				: subscriptionSyncService.findByStudioGroupIdFromSubscription(subscription);
	}

	private UUID handleInvoiceEvent(Event event, String rawPayload) throws StripeException {
		com.stripe.model.Invoice invoice = deserialize(event, com.stripe.model.Invoice.class);
		if (invoice == null) {
			return null;
		}
		String subscriptionId = StripeInvoiceSupport.resolveSubscriptionId(invoice, rawPayload, stripeClient);
		if (subscriptionId == null || subscriptionId.isBlank()) {
			return null;
		}
		subscriptionSyncService.syncFromSubscriptionId(subscriptionId, null);
		if ("invoice.paid".equals(event.getType())) {
			billingNotificationService.onInvoicePaid(invoice, subscriptionId);
			billingNotificationService.findStudioGroupIdForSubscription(subscriptionId)
					.ifPresent(studioGroupId -> fatturaPaInvoiceService.issueFromStripeInvoice(invoice, studioGroupId));
		}
		return billingNotificationService.findStudioGroupIdForSubscription(subscriptionId).orElse(null);
	}

	private void markProcessed(StripeWebhookEvent row, HttpServletRequest request, Event event, UUID studioGroupId) {
		row.setProcessingStatus(StripeWebhookEvent.ProcessingStatus.PROCESSED);
		row.setProcessedAt(Instant.now());
		webhookEventRepository.save(row);
		securityAuditService.record(
				"STRIPE_WEBHOOK",
				"OK",
				event.getId(),
				null,
				request,
				"type=" + event.getType() + ", livemode=" + event.getLivemode()
						+ (studioGroupId != null ? ", studioGroupId=" + studioGroupId : ""));
	}

	private void markSkipped(StripeWebhookEvent row, UUID studioGroupId, HttpServletRequest request, Event event) {
		row.setStudioGroupId(studioGroupId);
		row.setProcessingStatus(StripeWebhookEvent.ProcessingStatus.SKIPPED);
		row.setProcessedAt(Instant.now());
		webhookEventRepository.save(row);
		securityAuditService.record(
				"STRIPE_WEBHOOK",
				"SKIP",
				event.getId(),
				null,
				request,
				"type=" + event.getType());
	}

	private static <T extends StripeObject> T deserialize(Event event, Class<T> type) {
		EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();
		if (deserializer.getObject().isPresent()) {
			StripeObject obj = deserializer.getObject().get();
			if (type.isInstance(obj)) {
				return type.cast(obj);
			}
		}
		return null;
	}

	private static String metadata(StripeObject object, String key) {
		if (object instanceof Session session) {
			return session.getMetadata() != null ? session.getMetadata().get(key) : null;
		}
		if (object instanceof Subscription subscription) {
			return subscription.getMetadata() != null ? subscription.getMetadata().get(key) : null;
		}
		return null;
	}

	private static String firstNonBlank(String... values) {
		for (String value : values) {
			if (value != null && !value.isBlank()) {
				return value.trim();
			}
		}
		return null;
	}

	private static UUID parseUuid(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		try {
			return UUID.fromString(raw.trim());
		}
		catch (IllegalArgumentException ex) {
			return null;
		}
	}

	private static String sha256Hex(String payload) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			byte[] hash = digest.digest(payload.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(hash);
		}
		catch (NoSuchAlgorithmException ex) {
			return null;
		}
	}

	private static String safeMessage(Throwable ex) {
		String msg = ex.getMessage();
		if (msg == null || msg.isBlank()) {
			return ex.getClass().getSimpleName();
		}
		return msg.length() > 120 ? msg.substring(0, 120) : msg;
	}
}
