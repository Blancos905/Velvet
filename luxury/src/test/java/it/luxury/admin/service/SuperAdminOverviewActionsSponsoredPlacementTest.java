package it.luxury.admin.service;

import it.luxury.common.api.BusinessException;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.LocationRepository;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.studio.domain.StudioGroupRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SuperAdminOverviewActionsSponsoredPlacementTest {

	@Mock
	private StudioGroupRepository studioGroupRepository;
	@Mock
	private LocationRepository locationRepository;

	private SuperAdminOverviewActionsService service;

	@BeforeEach
	void setUp() {
		service = new SuperAdminOverviewActionsService(
				studioGroupRepository,
				locationRepository,
				null,
				null,
				null,
				null,
				null,
				null,
				null,
				null,
				null,
				null,
				null,
				null,
				null,
				null,
				null,
				null,
				null);
	}

	@Test
	void setSponsoredPlacement_marksEveryLocationOfTheStudio() {
		UUID studioGroupId = UUID.randomUUID();
		StudioGroup group = new StudioGroup("Gruppo", "owner@example.com", "PREMIUM", "sub");
		ReflectionTestUtils.setField(group, "id", studioGroupId);
		Location first = new Location(group, "sede-a", "Sede A", "Roma");
		Location second = new Location(group, "sede-b", "Sede B", "Milano");
		when(studioGroupRepository.findById(studioGroupId)).thenReturn(Optional.of(group));
		when(locationRepository.findByStudioGroup_IdOrderByNameAsc(studioGroupId)).thenReturn(List.of(first, second));

		service.setSponsoredPlacement(studioGroupId, true);

		assertThat(first.isSponsoredPlacement()).isTrue();
		assertThat(second.isSponsoredPlacement()).isTrue();

		service.setSponsoredPlacement(studioGroupId, false);

		assertThat(first.isSponsoredPlacement()).isFalse();
		assertThat(second.isSponsoredPlacement()).isFalse();
	}

	@Test
	void setSponsoredPlacement_missingSalon_throwsNotFound() {
		UUID studioGroupId = UUID.randomUUID();
		when(studioGroupRepository.findById(studioGroupId)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.setSponsoredPlacement(studioGroupId, true))
				.isInstanceOf(BusinessException.class)
				.hasMessageContaining("Salone non trovato");
	}
}
