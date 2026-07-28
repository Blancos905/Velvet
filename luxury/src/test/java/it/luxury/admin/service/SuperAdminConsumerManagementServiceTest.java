package it.luxury.admin.service;

import it.luxury.common.api.BusinessException;
import it.luxury.config.LuxurySecurityProperties;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.security.auth.LuxuryTokenService;
import it.luxury.studio.domain.StudioGroupRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SuperAdminConsumerManagementServiceTest {

	@Mock
	private ConsumerProfileRepository consumerProfileRepository;

	@Mock
	private StudioGroupRepository studioGroupRepository;

	@Mock
	private LuxuryTokenService luxuryTokenService;

	@Mock
	private LuxurySecurityProperties securityProperties;

	@Mock
	private SuperAdminProfileAccessNotificationService profileAccessNotificationService;

	@InjectMocks
	private SuperAdminConsumerManagementService service;

	@Test
	void issueConsumerLuxurySession_rejectsLegacyRoleAdminPrefix() {
		UUID id = UUID.randomUUID();
		ConsumerProfile admin = new ConsumerProfile("sub-admin", "admin@test.com", "Admin");
		admin.setSecurityRoles("ROLE_ADMIN,CLIENT");

		when(consumerProfileRepository.findById(id)).thenReturn(Optional.of(admin));

		assertThatThrownBy(() -> service.issueConsumerLuxurySession(id))
				.isInstanceOf(BusinessException.class)
				.satisfies(ex -> assertThat(((BusinessException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
	}

	@Test
	void issueConsumerLuxurySession_issuesTokenForPureClient() {
		UUID id = UUID.randomUUID();
		ConsumerProfile client = new ConsumerProfile("sub-client", "client@test.com", "Cliente");
		client.setSecurityRoles("CLIENT");

		when(consumerProfileRepository.findById(id)).thenReturn(Optional.of(client), Optional.of(client));
		when(luxuryTokenService.createAccessToken(client)).thenReturn("jwt-client");
		when(securityProperties.authJwtTtlHours()).thenReturn(8);

		var session = service.issueConsumerLuxurySession(id);

		assertThat(session.accessToken()).isEqualTo("jwt-client");
	}
}
