package it.luxury.consumer.service;

import it.luxury.consumer.domain.PendingRegistration;
import it.luxury.consumer.domain.PendingRegistrationKind;
import it.luxury.consumer.domain.PendingRegistrationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PendingRegistrationEmailTypoSupportTest {

	@Mock
	private PendingRegistrationRepository repository;

	@Test
	void findsGamilWhenUserCorrectsToGmail() {
		PendingRegistration pending = new PendingRegistration(
				"mario@gamil.com", "hash", PendingRegistrationKind.SALON_OWNER, "{}", "Mario");
		when(repository.findByEmailIgnoreCase("mario@gamil.com")).thenReturn(Optional.of(pending));

		assertThat(PendingRegistrationEmailTypoSupport.findTypoMatch(repository, "mario@gmail.com"))
				.contains(pending);
	}

	@Test
	void findsSimilarLocalPartWhenOneCharDiffers() {
		PendingRegistration pending = new PendingRegistration(
				"costatinomichele358@gmail.com", "hash", PendingRegistrationKind.SALON_OWNER, "{}", "Mario");
		when(repository.findByEmailDomainIgnoreCase("gmail.com")).thenReturn(List.of(pending));

		assertThat(PendingRegistrationEmailTypoSupport.findSimilarLocalPart(repository, "costantinomichele358@gmail.com"))
				.contains(pending);
	}
}
