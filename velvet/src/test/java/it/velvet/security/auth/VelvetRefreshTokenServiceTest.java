package it.velvet.security.auth;

import it.velvet.config.VelvetSecurityProperties;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.security.audit.SecurityAuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VelvetRefreshTokenServiceTest {

	@Mock
	private ConsumerProfileRepository consumerProfileRepository;

	@Mock
	private VelvetTokenService velvetTokenService;

	@Mock
	private SecurityAuditService securityAuditService;

	private InMemoryRefreshTokenStore refreshTokenStore;
	private VelvetRefreshTokenService service;

	@BeforeEach
	void setUp() {
		refreshTokenStore = new InMemoryRefreshTokenStore();
		VelvetSecurityProperties properties = new VelvetSecurityProperties(
				"secret", "secret", 24, 15, 30, false, 30, 30);
		service = new VelvetRefreshTokenService(
				refreshTokenStore,
				consumerProfileRepository,
				velvetTokenService,
				properties,
				securityAuditService);
	}

	@Test
	void rotate_reusedToken_revokesEntireFamily() {
		UUID profileId = UUID.randomUUID();
		ConsumerProfile profile = profile(profileId);
		when(consumerProfileRepository.findById(profileId)).thenReturn(Optional.of(profile));
		when(velvetTokenService.createAccessToken(profile)).thenReturn("access-1", "access-2");

		var issued = service.issueForProfile(profile, null);
		var rotated = service.rotate(issued.refreshToken(), null);

		assertThatThrownBy(() -> service.rotate(issued.refreshToken(), null))
				.hasMessageContaining("Sessione scaduta");

		assertThatThrownBy(() -> service.rotate(rotated.refreshToken(), null))
				.hasMessageContaining("Sessione scaduta");

		verify(securityAuditService).record(
				eq("AUTH_REFRESH_REUSE"),
				eq("BLOCK"),
				any(),
				any(),
				any(),
				any());
	}

	private static ConsumerProfile profile(UUID profileId) {
		ConsumerProfile profile = mock(ConsumerProfile.class);
		when(profile.getId()).thenReturn(profileId);
		when(profile.getDeletedAt()).thenReturn(null);
		when(profile.getKeycloakSub()).thenReturn("sub-1");
		return profile;
	}
}
