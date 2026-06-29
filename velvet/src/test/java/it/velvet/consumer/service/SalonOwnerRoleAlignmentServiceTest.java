package it.velvet.consumer.service;

import it.velvet.catalog.domain.StaffOperator;
import it.velvet.catalog.domain.StaffOperatorRepository;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.studio.domain.StudioGroup;
import it.velvet.studio.domain.StudioGroupRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SalonOwnerRoleAlignmentServiceTest {

	@Mock
	private StudioGroupRepository studioGroupRepository;

	@Mock
	private ConsumerProfileRepository consumerProfileRepository;

	@Mock
	private StaffOperatorRepository staffOperatorRepository;

	@InjectMocks
	private SalonOwnerRoleAlignmentService service;

	@BeforeEach
	void noStaffOperatorUnlessOverridden() {
		lenient().when(staffOperatorRepository.findByConsumerProfile_Id(any())).thenReturn(Optional.empty());
	}

	@Test
	void removesOwnerWhenNoStudioGroupForEmail() {
		ConsumerProfile p = new ConsumerProfile("sub-1", "a@b.c", "X");
		p.setSecurityRoles("CLIENT,OWNER");
		when(studioGroupRepository.findByOwnerEmailIgnoreCase("a@b.c")).thenReturn(Optional.empty());

		service.alignAfterSuccessfulPasswordLogin(p);

		assertThat(p.getSecurityRoles()).isEqualTo("CLIENT");
		verify(consumerProfileRepository).save(p);
	}

	@Test
	void removesOwnerWhenKeycloakSubDoesNotMatchGroup() {
		ConsumerProfile p = new ConsumerProfile("sub-wrong", "a@b.c", "X");
		p.setSecurityRoles("OWNER,CLIENT");
		StudioGroup g = new StudioGroup("S", "a@b.c", "BASE", "sub-right");
		when(studioGroupRepository.findByOwnerEmailIgnoreCase("a@b.c")).thenReturn(Optional.of(g));

		service.alignAfterSuccessfulPasswordLogin(p);

		assertThat(p.getSecurityRoles()).isEqualTo("CLIENT");
		verify(consumerProfileRepository).save(p);
		verify(studioGroupRepository, never()).save(any());
	}

	@Test
	void addsOwnerWhenDirectoryMatchesEmailAndSub() {
		ConsumerProfile p = new ConsumerProfile("sub-ok", "a@b.c", "X");
		p.setSecurityRoles("CLIENT");
		StudioGroup g = new StudioGroup("S", "a@b.c", "BASE", "sub-ok");
		when(studioGroupRepository.findByOwnerEmailIgnoreCase("a@b.c")).thenReturn(Optional.of(g));

		service.alignAfterSuccessfulPasswordLogin(p);

		assertThat(p.getSecurityRoles()).isEqualTo("OWNER");
		verify(consumerProfileRepository).save(p);
	}

	@Test
	void assignsGroupSubWhenUnsetAndAddsOwner() {
		UUID id = UUID.randomUUID();
		ConsumerProfile p = new ConsumerProfile("sub-new", "a@b.c", "X");
		p.setSecurityRoles("CLIENT");
		StudioGroup g = new StudioGroup("S", "a@b.c", "BASE", null);
		when(studioGroupRepository.findByOwnerEmailIgnoreCase("a@b.c")).thenReturn(Optional.of(g));

		service.alignAfterSuccessfulPasswordLogin(p);

		ArgumentCaptor<StudioGroup> grp = ArgumentCaptor.forClass(StudioGroup.class);
		verify(studioGroupRepository).save(grp.capture());
		assertThat(grp.getValue().getOwnerKeycloakSub()).isEqualTo("sub-new");
		assertThat(p.getSecurityRoles()).contains("OWNER");
	}

	@Test
	void staffOperatorLinked_addsStaffWhenRolesMissing() throws Exception {
		UUID profileId = UUID.randomUUID();
		ConsumerProfile p = new ConsumerProfile("sub-op", "op@b.c", "X");
		Field idField = ConsumerProfile.class.getDeclaredField("id");
		idField.setAccessible(true);
		idField.set(p, profileId);
		p.setSecurityRoles("CLIENT");
		when(staffOperatorRepository.findByConsumerProfile_Id(profileId)).thenReturn(Optional.of(mock(StaffOperator.class)));

		service.alignAfterSuccessfulPasswordLogin(p);

		assertThat(p.getSecurityRoles()).isEqualTo("CLIENT,STAFF");
		verify(consumerProfileRepository).save(p);
		verify(studioGroupRepository, never()).findByOwnerEmailIgnoreCase(any());
	}
}
