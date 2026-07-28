package it.luxury.consumer.service;

import it.luxury.billing.service.BillingRegistrationPlanPolicy;
import it.luxury.catalog.domain.StaffOperator;
import it.luxury.catalog.domain.StaffOperatorRepository;
import it.luxury.common.api.BusinessException;
import it.luxury.config.LuxuryRegistrationProperties;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.studio.domain.StudioGroupRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LuxuryAccountRegistrationServiceStaffTest {

	@Mock
	private ConsumerProfileRepository consumerProfileRepository;

	@Mock
	private LuxuryRegistrationCompletionService registrationCompletionService;

	@Mock
	private LuxuryPendingRegistrationService pendingRegistrationService;

	@Mock
	private PasswordEncoder passwordEncoder;

	@Mock
	private BillingRegistrationPlanPolicy billingRegistrationPlanPolicy;

	@Mock
	private StaffOperatorRepository staffOperatorRepository;

	@Mock
	private StudioGroupRepository studioGroupRepository;

	private LuxuryAccountRegistrationService service;

	@BeforeEach
	void setUp() {
		service = new LuxuryAccountRegistrationService(
				consumerProfileRepository,
				new LuxuryRegistrationProperties(),
				registrationCompletionService,
				pendingRegistrationService,
				passwordEncoder,
				billingRegistrationPlanPolicy,
				staffOperatorRepository,
				studioGroupRepository);
		lenient().when(passwordEncoder.encode(any())).thenReturn("encoded-password");
	}

	@Test
	void registerSalonStaffMember_reusesExistingVerifiedClient() throws Exception {
		String email = "client@example.com";
		ConsumerProfile existing = profileWithId(email, "CLIENT");
		existing.setEmailVerifiedAt(Instant.now());
		when(consumerProfileRepository.findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByCreatedAtDesc(email))
				.thenReturn(Optional.of(existing));
		when(staffOperatorRepository.findByConsumerProfile_Id(existing.getId())).thenReturn(Optional.empty());
		when(consumerProfileRepository.save(existing)).thenAnswer(inv -> inv.getArgument(0));

		ConsumerProfile saved = service.registerSalonStaffMember(email, "password12", "Mario", "Rossi");

		assertThat(saved.getSecurityRoles()).isEqualTo("CLIENT,STAFF");
		assertThat(saved.getEmailVerifiedAt()).isNotNull();
		assertThat(saved.getPasswordHash()).isEqualTo("encoded-password");
		assertThat(saved.getDisplayName()).isEqualTo("Mario Rossi");
		verify(consumerProfileRepository).flush();
	}

	@Test
	void registerSalonStaffMember_reusesExistingUnverifiedClientAndMarksVerified() throws Exception {
		String email = "pending@example.com";
		ConsumerProfile existing = profileWithId(email, "CLIENT");
		existing.setEmailVerifiedAt(null);
		when(consumerProfileRepository.findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByCreatedAtDesc(email))
				.thenReturn(Optional.of(existing));
		when(staffOperatorRepository.findByConsumerProfile_Id(existing.getId())).thenReturn(Optional.empty());
		when(consumerProfileRepository.save(existing)).thenAnswer(inv -> inv.getArgument(0));

		ConsumerProfile saved = service.registerSalonStaffMember(email, "password12", "Luigi", "Verdi");

		assertThat(saved.getSecurityRoles()).contains("STAFF");
		assertThat(saved.getEmailVerifiedAt()).isNotNull();
	}

	@Test
	void registerSalonStaffMember_rejectsExistingSalonOwner() throws Exception {
		String email = "owner@example.com";
		ConsumerProfile existing = profileWithId(email, "OWNER");
		when(consumerProfileRepository.findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByCreatedAtDesc(email))
				.thenReturn(Optional.of(existing));
		when(studioGroupRepository.findByOwnerEmailIgnoreCase(email))
				.thenReturn(Optional.of(new StudioGroup("S", email, "BASE", existing.getAuthSub())));

		assertThatThrownBy(() -> service.registerSalonStaffMember(email, "password12", "Anna", "Bianchi"))
				.isInstanceOf(BusinessException.class)
				.extracting(ex -> ((BusinessException) ex).getCode())
				.isEqualTo("SALON_OWNER_REGISTRATION_FORBIDDEN");
	}

	@Test
	void registerSalonStaffMember_rejectsAlreadyLinkedStaffAccount() throws Exception {
		String email = "staff@example.com";
		ConsumerProfile existing = profileWithId(email, "STAFF");
		when(consumerProfileRepository.findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByCreatedAtDesc(email))
				.thenReturn(Optional.of(existing));
		when(staffOperatorRepository.findByConsumerProfile_Id(existing.getId()))
				.thenReturn(Optional.of(new StaffOperator(null, "A", "B", "Staff", null)));

		assertThatThrownBy(() -> service.registerSalonStaffMember(email, "password12", "Paolo", "Neri"))
				.isInstanceOf(BusinessException.class)
				.extracting(ex -> ((BusinessException) ex).getCode())
				.isEqualTo("EMAIL_ALREADY_REGISTERED");
	}

	@Test
	void registerSalonStaffMember_createsNewProfileWhenEmailIsFree() {
		String email = "new@example.com";
		when(consumerProfileRepository.findFirstByEmailIgnoreCaseAndDeletedAtIsNullOrderByCreatedAtDesc(email))
				.thenReturn(Optional.empty());
		ArgumentCaptor<ConsumerProfile> captor = ArgumentCaptor.forClass(ConsumerProfile.class);
		when(consumerProfileRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

		assertThatCode(() -> service.registerSalonStaffMember(email, "password12", "Nuovo", "Staff"))
				.doesNotThrowAnyException();

		ConsumerProfile created = captor.getValue();
		assertThat(created.getSecurityRoles()).isEqualTo("STAFF");
		assertThat(created.getEmailVerifiedAt()).isNotNull();
	}

	private static ConsumerProfile profileWithId(String email, String roles) throws Exception {
		ConsumerProfile profile = new ConsumerProfile(UUID.randomUUID().toString(), email, "Existing");
		profile.setSecurityRoles(roles);
		Field idField = ConsumerProfile.class.getDeclaredField("id");
		idField.setAccessible(true);
		idField.set(profile, UUID.randomUUID());
		return profile;
	}
}
