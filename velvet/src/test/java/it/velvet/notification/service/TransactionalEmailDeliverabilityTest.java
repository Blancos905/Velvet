package it.velvet.notification.service;

import jakarta.mail.SendFailedException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TransactionalEmailDeliverabilityTest {

	@Test
	void shouldSkipBeforeSmtp_blocksSeedDomains() {
		assertThat(TransactionalEmailDeliverability.shouldSkipBeforeSmtp("cliente1@test.com")).isTrue();
		assertThat(TransactionalEmailDeliverability.shouldSkipBeforeSmtp("a@example.com")).isTrue();
	}

	@Test
	void shouldSkipBeforeSmtp_allowsRealDomains() {
		assertThat(TransactionalEmailDeliverability.shouldSkipBeforeSmtp("mario.rossi@gmail.com")).isFalse();
		assertThat(TransactionalEmailDeliverability.shouldSkipBeforeSmtp("cliente@saloniluxury.it")).isFalse();
	}

	@Test
	void isRecipientRejection_detectsSmtpAddressFailures() {
		Exception ex = new SendFailedException("Invalid Addresses", new Exception("556 invalid destination domain"));
		assertThat(TransactionalEmailDeliverability.isRecipientRejection(ex)).isTrue();
	}

	@Test
	void isRecipientRejection_ignoresGenericFailures() {
		assertThat(TransactionalEmailDeliverability.isRecipientRejection(new RuntimeException("connection timed out")))
				.isFalse();
	}
}
