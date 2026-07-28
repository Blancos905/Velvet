package it.luxury.consumer.service;

import it.luxury.common.api.BusinessException;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.studio.domain.StudioGroupRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LuxuryRegistrationCompletionServiceSalonUpgradeTest {

	@Mock
	private ConsumerProfileRepository consumerProfileRepository;

	@Mock
	private StudioGroupRepository studioGroupRepository;

	private LuxuryRegistrationCompletionService service;

	@BeforeEach
	void setUp() {
		service = new LuxuryRegistrationCompletionService(
				consumerProfileRepository,
				null,
				null,
				null,
				studioGroupRepository,
				null);
	}

	@Test
	void assertMayPromote_allowsVerifiedClientWithoutSalon() {
		String email = "client@example.com";
		ConsumerProfile profile = verifiedProfile(email, "CLIENT");
		when(consumerProfileRepository.findByEmailIgnoreCase(email)).thenReturn(Optional.of(profile));

		assertThatCode(() -> service.assertMayPromoteVerifiedProfileToSalonOwner(email)).doesNotThrowAnyException();
	}

	@Test
	void assertMayPromote_rejectsExistingSalonOwner() {
		String email = "owner@example.com";
		ConsumerProfile profile = verifiedProfile(email, "OWNER");
		when(consumerProfileRepository.findByEmailIgnoreCase(email)).thenReturn(Optional.of(profile));
		when(studioGroupRepository.findByOwnerEmailIgnoreCase(email)).thenReturn(Optional.of(new StudioGroup("S", email, "BASE", profile.getAuthSub())));

		assertThatThrownBy(() -> service.assertMayPromoteVerifiedProfileToSalonOwner(email))
				.isInstanceOf(BusinessException.class)
				.extracting(ex -> ((BusinessException) ex).getCode())
				.isEqualTo("SALON_ALREADY_REGISTERED");
	}

	@Test
	void assertMayPromote_rejectsUnverifiedProfile() {
		String email = "pending@example.com";
		ConsumerProfile profile = verifiedProfile(email, "CLIENT");
		profile.setEmailVerifiedAt(null);
		when(consumerProfileRepository.findByEmailIgnoreCase(email)).thenReturn(Optional.of(profile));

		assertThatThrownBy(() -> service.assertMayPromoteVerifiedProfileToSalonOwner(email))
				.isInstanceOf(BusinessException.class)
				.extracting(ex -> ((BusinessException) ex).getCode())
				.isEqualTo("EMAIL_NOT_VERIFIED");
	}

	private static ConsumerProfile verifiedProfile(String email, String roles) {
		ConsumerProfile profile = new ConsumerProfile(UUID.randomUUID().toString(), email, "Test User");
		profile.setSecurityRoles(roles);
		profile.setEmailVerifiedAt(Instant.now());
		return profile;
	}
}
