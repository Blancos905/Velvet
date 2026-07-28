package it.luxury.appointment.service;

import it.luxury.catalog.domain.StaffOperator;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.StudioGroup;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WorkScheduleTest {

	@Test
	void locationWithoutBreakUsesSingleWindow() {
		Location loc = location(510, 1140, null, null);
		List<WorkSchedule.MinuteWindow> windows = WorkSchedule.windowsForLocation(loc);
		assertEquals(1, windows.size());
		assertEquals(510, windows.get(0).startMinute());
		assertEquals(1140, windows.get(0).endMinute());
	}

	@Test
	void locationWithLunchBreakSplitsWindows() {
		Location loc = location(510, 1140, 780, 870);
		List<WorkSchedule.MinuteWindow> windows = WorkSchedule.windowsForLocation(loc);
		assertEquals(2, windows.size());
		assertEquals(510, windows.get(0).startMinute());
		assertEquals(780, windows.get(0).endMinute());
		assertEquals(870, windows.get(1).startMinute());
		assertEquals(1140, windows.get(1).endMinute());
		assertFalse(WorkSchedule.fitsAnyWindow(windows, 800, 830));
		assertTrue(WorkSchedule.fitsAnyWindow(windows, 720, 750));
		assertTrue(WorkSchedule.fitsAnyWindow(windows, 900, 930));
	}

	@Test
	void operatorCustomScheduleOverridesLocation() {
		Location loc = location(510, 1140, null, null);
		StaffOperator op = new StaffOperator(loc, "Mario", "Rossi", "Stylist", null);
		op.updateWorkSchedule(540, 750, 840, 1080);
		List<WorkSchedule.MinuteWindow> windows = WorkSchedule.windowsForOperator(op, loc);
		assertEquals(2, windows.size());
		assertEquals(540, windows.get(0).startMinute());
		assertEquals(1080, windows.get(1).endMinute());
	}

	private static Location location(int open, int close, Integer morningEnd, Integer afternoonStart) {
		StudioGroup group = new StudioGroup("Salone test");
		Location loc = new Location(group, "salone-test", "Salone test", "Roma");
		loc.setWorkStartMinuteOfDay(open);
		loc.setWorkEndMinuteOfDay(close);
		loc.setWorkMorningEndMinuteOfDay(morningEnd);
		loc.setWorkAfternoonStartMinuteOfDay(afternoonStart);
		return loc;
	}
}
