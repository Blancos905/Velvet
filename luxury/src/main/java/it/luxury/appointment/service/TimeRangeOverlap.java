package it.luxury.appointment.service;

import java.time.Instant;
import java.util.List;

/** Utility per verificare sovrapposizioni tra intervalli temporali. */
final class TimeRangeOverlap {

	private TimeRangeOverlap() {
	}

	static boolean overlaps(Instant aStart, Instant aEnd, Instant bStart, Instant bEnd) {
		return aStart.isBefore(bEnd) && aEnd.isAfter(bStart);
	}

	static boolean fits(List<? extends InstantRange> blocking, Instant start, Instant end) {
		for (InstantRange item : blocking) {
			if (overlaps(start, end, item.rangeStart(), item.rangeEnd())) {
				return false;
			}
		}
		return true;
	}

	interface InstantRange {
		Instant rangeStart();

		Instant rangeEnd();
	}
}
