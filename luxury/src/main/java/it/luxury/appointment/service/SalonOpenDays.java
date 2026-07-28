package it.luxury.appointment.service;

import it.luxury.common.api.BusinessException;
import it.luxury.studio.domain.Location;
import org.springframework.http.HttpStatus;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Giorni di apertura sede (bitmask: lunedì = bit 0 … domenica = bit 6). */
public final class SalonOpenDays {

	public static final int ALL_DAYS_MASK = 0b1111111;

	private static final DayOfWeek[] ORDER = {
			DayOfWeek.MONDAY,
			DayOfWeek.TUESDAY,
			DayOfWeek.WEDNESDAY,
			DayOfWeek.THURSDAY,
			DayOfWeek.FRIDAY,
			DayOfWeek.SATURDAY,
			DayOfWeek.SUNDAY
	};

	private SalonOpenDays() {
	}

	public static boolean isOpenOn(Location location, LocalDate date) {
		return isOpenOn(location, date.getDayOfWeek());
	}

	public static boolean isOpenOn(Location location, DayOfWeek dayOfWeek) {
		int mask = effectiveMask(location.getWorkOpenDaysMask());
		int bit = dayOfWeek.getValue() - 1;
		return (mask & (1 << bit)) != 0;
	}

	public static int effectiveMask(int mask) {
		return mask <= 0 ? ALL_DAYS_MASK : mask;
	}

	public static List<String> toApiList(int mask) {
		int effective = effectiveMask(mask);
		List<String> out = new ArrayList<>();
		for (DayOfWeek day : ORDER) {
			if (isOpenOn(effective, day)) {
				out.add(day.name());
			}
		}
		return out;
	}

	public static int fromApiList(List<String> openDays) {
		if (openDays == null || openDays.isEmpty()) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"VALIDATION_ERROR",
					"Seleziona almeno un giorno di apertura del salone.");
		}
		int mask = 0;
		for (String raw : openDays) {
			if (raw == null || raw.isBlank()) {
				continue;
			}
			DayOfWeek day;
			try {
				day = DayOfWeek.valueOf(raw.trim().toUpperCase(Locale.ROOT));
			}
			catch (IllegalArgumentException ex) {
				throw new BusinessException(
						HttpStatus.BAD_REQUEST,
						"VALIDATION_ERROR",
						"Giorno di apertura non valido: " + raw);
			}
			mask |= 1 << (day.getValue() - 1);
		}
		if (mask == 0) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"VALIDATION_ERROR",
					"Seleziona almeno un giorno di apertura del salone.");
		}
		return mask;
	}

	private static boolean isOpenOn(int mask, DayOfWeek dayOfWeek) {
		int bit = dayOfWeek.getValue() - 1;
		return (mask & (1 << bit)) != 0;
	}
}
