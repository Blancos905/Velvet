package it.luxury.publicapi.dto;

import it.luxury.publicapi.dto.PublicDtos.SiblingLocationDto;
import it.luxury.publicapi.dto.SalonSiblingLocations.Candidate;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SalonSiblingLocationsTest {

	@Test
	void singleLocationSalonHasNoSiblings() {
		UUID current = UUID.randomUUID();
		List<SiblingLocationDto> others = SalonSiblingLocations.others(
				current,
				List.of(new Candidate(current, "solo", "Salone", "Milano", "Via Roma 1")));
		assertTrue(others.isEmpty());
	}

	@Test
	void returnsEveryOtherLocationOfTheSameSalon() {
		UUID current = UUID.randomUUID();
		UUID second = UUID.randomUUID();
		UUID third = UUID.randomUUID();
		List<SiblingLocationDto> others = SalonSiblingLocations.others(
				current,
				List.of(
						new Candidate(third, "  sede-cosenza  ", "Imagin Hair", "Cosenza", "Via Macallè,  30"),
						new Candidate(current, "sede-lago", "Imagin Hair", "Piano Lago", "SP241"),
						new Candidate(second, "sede-aprigliano", "Imagin Hair", "Aprigliano", "Via Calvelli 52"),
						new Candidate(UUID.randomUUID(), "   ", "Senza slug", "Roma", "Via X")));

		assertEquals(2, others.size());
		assertEquals("sede-aprigliano", others.get(0).slug());
		assertEquals("Aprigliano", others.get(0).city());
		assertEquals("sede-cosenza", others.get(1).slug());
		assertEquals("Via Macallè, 30", others.get(1).addressLine());
	}

	@Test
	void nullCurrentOrEmptyGroupYieldsNoCards() {
		assertTrue(SalonSiblingLocations.others(null, List.of(new Candidate(UUID.randomUUID(), "a", "A", "A", "A"))).isEmpty());
		assertTrue(SalonSiblingLocations.others(UUID.randomUUID(), List.of()).isEmpty());
		assertTrue(SalonSiblingLocations.others(UUID.randomUUID(), null).isEmpty());
	}
}
