package it.luxury.sponsor.service;

import it.luxury.common.api.BusinessException;
import it.luxury.sponsor.PlacementSponsorSlots;
import it.luxury.sponsor.api.PlacementSponsorView;
import it.luxury.sponsor.api.PlacementSponsorWrite;
import it.luxury.sponsor.domain.PlacementSponsor;
import it.luxury.sponsor.domain.PlacementSponsorRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlacementSponsorServiceTest {

	@Mock
	private PlacementSponsorRepository repository;

	private PlacementSponsorService service;

	@BeforeEach
	void setUp() {
		service = new PlacementSponsorService(repository);
	}

	@Test
	void publicAgendaReturnsAtMostFiveActiveInOrder() {
		List<PlacementSponsor> rows = new ArrayList<>();
		for (int i = 0; i < 6; i++) {
			rows.add(row(i, true));
		}
		rows.add(1, row(50, false));
		when(repository.findByPlacementOrderBySortOrderAscCreatedAtAsc(PlacementSponsorSlots.CLIENT_BOOKINGS))
				.thenReturn(rows);

		List<PlacementSponsorView> visible = service.listPublic(PlacementSponsorSlots.CLIENT_BOOKINGS);

		assertThat(visible).hasSize(PlacementSponsorSlots.AGENDA_CAROUSEL_SIZE);
		assertThat(visible).allMatch(PlacementSponsorView::active);
		assertThat(visible.get(0).sortOrder()).isZero();
	}

	@Test
	void unknownPlacementIsEmptyOnThePublicSite() {
		assertThat(service.listPublic("header")).isEmpty();
	}

	@Test
	void seedWritesFiveDemosOnlyWhenAgendaIsEmpty() {
		when(repository.countByPlacement(PlacementSponsorSlots.CLIENT_BOOKINGS)).thenReturn(0L);
		when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

		service.seedAgendaIfEmpty();

		ArgumentCaptor<PlacementSponsor> saved = ArgumentCaptor.forClass(PlacementSponsor.class);
		verify(repository, times(5)).save(saved.capture());
		assertThat(saved.getAllValues()).extracting(PlacementSponsor::getBrandName)
				.containsExactly("Noir Silk", "Velvet Bloom", "Aqua Mirage", "Amber Brush", "Echo Scent");
		assertThat(saved.getAllValues()).allMatch(row -> PlacementSponsorSlots.CLIENT_BOOKINGS.equals(row.getPlacement()));
	}

	@Test
	void seedSkipsWhenAgendaAlreadyHasSponsors() {
		when(repository.countByPlacement(PlacementSponsorSlots.CLIENT_BOOKINGS)).thenReturn(2L);

		service.seedAgendaIfEmpty();

		verify(repository, never()).save(any());
	}

	@Test
	void rejectsALinkThatIsNotHttpOrSitePath() {
		PlacementSponsorWrite write = new PlacementSponsorWrite(
				PlacementSponsorSlots.CLIENT_BOOKINGS,
				"Maison",
				"Una riga",
				"Scopri",
				"javascript:alert(1)",
				"/ads/demo-client-noir-silk.svg",
				0,
				true);

		assertThatThrownBy(() -> service.create(write)).isInstanceOf(BusinessException.class);
	}

	private static PlacementSponsor row(int order, boolean active) {
		PlacementSponsor row = new PlacementSponsor();
		row.setId(UUID.randomUUID());
		row.setPlacement(PlacementSponsorSlots.CLIENT_BOOKINGS);
		row.setBrandName("Brand " + order);
		row.setHeadline("Headline " + order);
		row.setCtaLabel("Scopri");
		row.setHref("https://example.com/" + order);
		row.setImageSrc("/ads/demo-client-noir-silk.svg");
		row.setSortOrder(order);
		row.setActive(active);
		row.setCreatedAt(Instant.parse("2026-01-01T00:00:00Z").plusSeconds(order));
		return row;
	}
}
