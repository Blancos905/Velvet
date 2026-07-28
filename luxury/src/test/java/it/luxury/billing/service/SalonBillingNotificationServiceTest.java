package it.luxury.billing.service;

import com.stripe.model.Invoice;
import com.stripe.model.Subscription;
import com.stripe.model.SubscriptionItem;
import com.stripe.model.SubscriptionItemCollection;
import com.stripe.model.checkout.Session;
import it.luxury.billing.domain.BillingAccount;
import it.luxury.billing.domain.BillingAccountRepository;
import it.luxury.billing.domain.BillingPaymentThankYouSent;
import it.luxury.billing.domain.BillingPaymentThankYouSentRepository;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.studio.domain.StudioGroupRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SalonBillingNotificationServiceTest {

	@Mock
	private BillingAccountRepository billingAccountRepository;

	@Mock
	private StudioGroupRepository studioGroupRepository;

	@Mock
	private BillingPaymentThankYouSentRepository paymentThankYouSentRepository;

	@Mock
	private SalonBillingEmailDispatchService emailDispatchService;

	private SalonBillingNotificationService service;

	@BeforeEach
	void setUp() {
		service = new SalonBillingNotificationService(
				billingAccountRepository,
				studioGroupRepository,
				paymentThankYouSentRepository,
				emailDispatchService);
	}

	@Test
	void onSubscriptionEvent_sendsCancellationEmailWhenCancelAtPeriodEndBecomesTrue() {
		UUID studioGroupId = UUID.randomUUID();
		StudioGroup group = new StudioGroup("Salone Test");
		ReflectionTestUtils.setField(group, "id", studioGroupId);
		BillingAccount account = new BillingAccount(group, "cus_test");
		account.setCancelAtPeriodEnd(false);

		Subscription subscription = new Subscription();
		subscription.setId("sub_test");
		subscription.setCancelAtPeriodEnd(true);
		SubscriptionItem item = new SubscriptionItem();
		item.setCurrentPeriodEnd(1_900_000_000L);
		SubscriptionItemCollection items = new SubscriptionItemCollection();
		items.setData(List.of(item));
		subscription.setItems(items);

		when(billingAccountRepository.findByStudioGroup_Id(studioGroupId)).thenReturn(Optional.of(account));
		when(studioGroupRepository.findById(studioGroupId)).thenReturn(Optional.of(group));

		service.onSubscriptionEvent(subscription, studioGroupId);

		verify(emailDispatchService).dispatchSubscriptionCancellationConfirmed(eq(group), any());
	}

	@Test
	void onSubscriptionEvent_skipsWhenAlreadyScheduledForCancellation() {
		UUID studioGroupId = UUID.randomUUID();
		StudioGroup group = new StudioGroup("Salone Test");
		ReflectionTestUtils.setField(group, "id", studioGroupId);
		BillingAccount account = new BillingAccount(group, "cus_test");
		account.setCancelAtPeriodEnd(true);

		Subscription subscription = new Subscription();
		subscription.setId("sub_test");
		subscription.setCancelAtPeriodEnd(true);

		when(billingAccountRepository.findByStudioGroup_Id(studioGroupId)).thenReturn(Optional.of(account));
		when(studioGroupRepository.findById(studioGroupId)).thenReturn(Optional.of(group));

		service.onSubscriptionEvent(subscription, studioGroupId);

		verify(emailDispatchService, never()).dispatchSubscriptionCancellationConfirmed(any(), any());
	}

	@Test
	void onInvoicePaid_sendsPaymentThankYouEmail() {
		UUID studioGroupId = UUID.randomUUID();
		StudioGroup group = new StudioGroup("Salone Test");
		ReflectionTestUtils.setField(group, "id", studioGroupId);
		BillingAccount account = new BillingAccount(group, "cus_test");
		account.setStripeSubscriptionId("sub_test");

		Invoice invoice = new Invoice();
		invoice.setId("in_test");
		invoice.setStatus("paid");
		invoice.setAmountPaid(2900L);
		invoice.setCurrency("eur");

		when(billingAccountRepository.findByStripeSubscriptionId("sub_test")).thenReturn(Optional.of(account));
		when(studioGroupRepository.findById(studioGroupId)).thenReturn(Optional.of(group));
		when(billingAccountRepository.findByStudioGroup_Id(studioGroupId)).thenReturn(Optional.of(account));
		when(paymentThankYouSentRepository.existsByStripeReference("invoice:in_test")).thenReturn(false);

		service.onInvoicePaid(invoice, "sub_test");

		verify(emailDispatchService).dispatchPaymentThankYou(eq(group), eq(2900L), eq("eur"), isNull());
		ArgumentCaptor<BillingPaymentThankYouSent> sent = ArgumentCaptor.forClass(BillingPaymentThankYouSent.class);
		verify(paymentThankYouSentRepository).save(sent.capture());
		assertEquals("invoice:in_test", sent.getValue().getStripeReference());
	}

	@Test
	void onCheckoutSessionCompleted_sendsTrialActivationEmailOnce() {
		UUID studioGroupId = UUID.randomUUID();
		StudioGroup group = new StudioGroup("Salone Test");
		ReflectionTestUtils.setField(group, "id", studioGroupId);
		BillingAccount account = new BillingAccount(group, "cus_test");
		account.setStripeSubscriptionId("sub_test");

		Session session = new Session();
		session.setId("cs_test");
		session.setSubscription("sub_test");
		session.setAmountTotal(0L);

		when(studioGroupRepository.findById(studioGroupId)).thenReturn(Optional.of(group));
		when(billingAccountRepository.findByStudioGroup_Id(studioGroupId)).thenReturn(Optional.of(account));
		when(paymentThankYouSentRepository.existsByStripeReference("checkout:cs_test")).thenReturn(false);

		service.onCheckoutSessionCompleted(session, studioGroupId);

		verify(emailDispatchService).dispatchPaymentThankYou(eq(group), eq(0L), eq("eur"), isNull());
		verify(paymentThankYouSentRepository).save(any(BillingPaymentThankYouSent.class));
	}

	@Test
	void onCheckoutSessionCompleted_skipsDuplicateEmail() {
		UUID studioGroupId = UUID.randomUUID();
		StudioGroup group = new StudioGroup("Salone Test");
		ReflectionTestUtils.setField(group, "id", studioGroupId);
		BillingAccount account = new BillingAccount(group, "cus_test");

		Session session = new Session();
		session.setId("cs_test");
		session.setSubscription("sub_test");
		session.setAmountTotal(0L);

		when(studioGroupRepository.findById(studioGroupId)).thenReturn(Optional.of(group));
		when(billingAccountRepository.findByStudioGroup_Id(studioGroupId)).thenReturn(Optional.of(account));
		when(paymentThankYouSentRepository.existsByStripeReference("checkout:cs_test")).thenReturn(true);

		service.onCheckoutSessionCompleted(session, studioGroupId);

		verify(emailDispatchService, never()).dispatchPaymentThankYou(any(), any(Long.class), any(), any());
	}
}
