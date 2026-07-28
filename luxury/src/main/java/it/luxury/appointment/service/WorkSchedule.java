package it.luxury.appointment.service;

import it.luxury.catalog.domain.StaffOperator;
import it.luxury.studio.domain.Location;

import java.util.ArrayList;
import java.util.List;

/** Finestre orarie prenotabili (minuti da mezzanotte locale) con supporto pausa pranzo. */
public final class WorkSchedule {

	private WorkSchedule() {
	}

	public record MinuteWindow(int startMinute, int endMinute) {
		public boolean contains(int start, int end) {
			return start >= startMinute && end <= endMinute;
		}
	}

	public static List<MinuteWindow> windowsForLocation(Location location) {
		return splitWindows(
				location.getWorkStartMinuteOfDay(),
				location.getWorkEndMinuteOfDay(),
				location.getWorkMorningEndMinuteOfDay(),
				location.getWorkAfternoonStartMinuteOfDay());
	}

	public static List<MinuteWindow> windowsForOperator(StaffOperator operator, Location location) {
		if (operatorHasCustomSchedule(operator)) {
			return splitWindows(
					operator.getWorkMorningStartMinuteOfDay(),
					operator.getWorkAfternoonEndMinuteOfDay(),
					operator.getWorkMorningEndMinuteOfDay(),
					operator.getWorkAfternoonStartMinuteOfDay());
		}
		return windowsForLocation(location);
	}

	public static boolean operatorHasCustomSchedule(StaffOperator operator) {
		return operator.getWorkMorningStartMinuteOfDay() != null
				&& operator.getWorkMorningEndMinuteOfDay() != null
				&& operator.getWorkAfternoonStartMinuteOfDay() != null
				&& operator.getWorkAfternoonEndMinuteOfDay() != null;
	}

	public static boolean fitsAnyWindow(List<MinuteWindow> windows, int startMinute, int endMinute) {
		for (MinuteWindow window : windows) {
			if (window.contains(startMinute, endMinute)) {
				return true;
			}
		}
		return false;
	}

	private static List<MinuteWindow> splitWindows(
			int dayStart,
			int dayEnd,
			Integer morningEnd,
			Integer afternoonStart) {
		if (dayStart >= dayEnd) {
			return List.of();
		}
		if (morningEnd == null || afternoonStart == null) {
			return List.of(new MinuteWindow(dayStart, dayEnd));
		}
		if (morningEnd <= dayStart || afternoonStart >= dayEnd || morningEnd >= afternoonStart) {
			return List.of(new MinuteWindow(dayStart, dayEnd));
		}
		List<MinuteWindow> windows = new ArrayList<>(2);
		windows.add(new MinuteWindow(dayStart, morningEnd));
		windows.add(new MinuteWindow(afternoonStart, dayEnd));
		return windows;
	}
}
