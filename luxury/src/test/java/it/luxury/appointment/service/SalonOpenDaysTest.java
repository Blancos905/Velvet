package it.luxury.appointment.service;

import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.StudioGroup;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SalonOpenDaysTest {

	@Test
	void defaultMaskOpensAllDays() {
		Location loc = location(SalonOpenDays.ALL_DAYS_MASK);
		assertTrue(SalonOpenDays.isOpenOn(loc, DayOfWeek.MONDAY));
		assertTrue(SalonOpenDays.isOpenOn(loc, DayOfWeek.SUNDAY));
	}

	@Test
	void closedMondayMask() {
		int mask = SalonOpenDays.ALL_DAYS_MASK & ~(1 << (DayOfWeek.MONDAY.getValue() - 1));
		Location loc = location(mask);
		assertFalse(SalonOpenDays.isOpenOn(loc, LocalDate.of(2026, 7, 6)));
		assertTrue(SalonOpenDays.isOpenOn(loc, LocalDate.of(2026, 7, 7)));
	}

	@Test
	void apiListRoundTrip() {
		int mask = SalonOpenDays.fromApiList(List.of("TUESDAY", "FRIDAY"));
		assertEquals(List.of("TUESDAY", "FRIDAY"), SalonOpenDays.toApiList(mask));
	}

	private static Location location(int mask) {
		StudioGroup group = new StudioGroup("Salone test");
		Location loc = new Location(group, "salone-open-days", "Salone test", "Roma");
		loc.setWorkOpenDaysMask(mask);
		return loc;
	}
}
