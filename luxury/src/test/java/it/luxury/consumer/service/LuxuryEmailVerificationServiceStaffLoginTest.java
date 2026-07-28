package it.luxury.consumer.service;

import it.luxury.billing.service.BillingRegistrationPlanPolicy;
import it.luxury.catalog.domain.StaffOperator;
import it.luxury.catalog.domain.StaffOperatorRepository;
import it.luxury.common.api.BusinessException;
import it.luxury.config.LuxuryRegistrationProperties;
import it.luxury.config.LuxurySecurityProperties;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.security.auth.LuxuryRefreshTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LuxuryEmailVerificationServiceStaffLoginTest {

	@Mock
	private LuxuryPendingRegistrationService pendingRegistrationService;

	@Mock
	private ConsumerProfileRepository consumerProfileRepository;

	@Mock
	private SalonOwnerRoleAlignmentService salonOwnerRoleAlignmentService;

	@Mock
	private LuxuryRefreshTokenService luxuryRefreshTokenService;

	@Mock
	private LuxurySecurityProperties securityProperties;

	@Mock
	private BillingRegistrationPlanPolicy billingRegistrationPlanPolicy;

	@Mock
	private StaffOperatorRepository staffOperatorRepository;

	private LuxuryRegistrationProperties registrationProperties;
	private LuxuryEmailVerificationService service;

	@BeforeEach
	void setUp() {
		registrationProperties = new LuxuryRegistrationProperties();
		registrationProperties.setEmailVerificationRequired(true);
		service = new LuxuryEmailVerificationService(
				pendingRegistrationService,
				registrationProperties,
				consumerProfileRepository,
				salonOwnerRoleAlignmentService,
				luxuryRefreshTokenService,
				securityProperties,
				billingRegistrationPlanPolicy,
				staffOperatorRepository);
	}

	@Test
	void assertMayLogin_allowsStaffWithoutVerifiedEmail() {
		ConsumerProfile profile = new ConsumerProfile("sub", "staff@example.com", "Staff");
		profile.setSecurityRoles("STAFF");
		profile.setEmailVerifiedAt(null);

		assertThatCode(() -> service.assertMayLogin(profile)).doesNotThrowAnyException();
	}

	@Test
	void assertMayLogin_allowsOperatorLinkedProfileWithoutVerifiedEmail() throws Exception {
		UUID profileId = UUID.randomUUID();
		ConsumerProfile profile = profileWithId(profileId, "CLIENT");
		profile.setEmailVerifiedAt(null);
		when(staffOperatorRepository.findByConsumerProfile_Id(profileId))
				.thenReturn(Optional.of(new StaffOperator(null, "A", "B", "Staff", null)));

		assertThatCode(() -> service.assertMayLogin(profile)).doesNotThrowAnyException();
	}

	@Test
	void assertMayLogin_blocksUnverifiedClient() {
		ConsumerProfile profile = new ConsumerProfile("sub", "client@example.com", "Client");
		profile.setSecurityRoles("CLIENT");
		profile.setEmailVerifiedAt(null);

		assertThatThrownBy(() -> service.assertMayLogin(profile))
				.isInstanceOf(BusinessException.class)
				.extracting(ex -> ((BusinessException) ex).getCode())
				.isEqualTo("EMAIL_NOT_VERIFIED");
	}

	private static ConsumerProfile profileWithId(UUID profileId, String roles) throws Exception {
		ConsumerProfile profile = new ConsumerProfile("sub", "op@example.com", "Op");
		profile.setSecurityRoles(roles);
		Field idField = ConsumerProfile.class.getDeclaredField("id");
		idField.setAccessible(true);
		idField.set(profile, profileId);
		return profile;
	}
}
