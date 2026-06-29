package it.velvet.common.api;

import org.springframework.dao.DataIntegrityViolationException;

import java.util.Locale;
import java.util.Optional;

/** Mappa violazioni di integrità DB in risposte API comprensibili. */
public final class VelvetDataIntegritySupport {

	private VelvetDataIntegritySupport() {
	}

	public static Optional<ApiError> toApiError(DataIntegrityViolationException ex) {
		String detail = rootMessage(ex);
		if (detail == null || detail.isBlank()) {
			return Optional.empty();
		}
		String lower = detail.toLowerCase(Locale.ROOT);
		if (isDuplicateEmail(lower)) {
			return Optional.of(new ApiError(
					"EMAIL_ALREADY_IN_USE",
					"Esiste già una registrazione in corso o un account con questa email.",
					null));
		}
		if (isDuplicateEntry(lower)) {
			return Optional.of(new ApiError(
					"DUPLICATE_ENTRY",
					"Dati già presenti. Verifica i campi inseriti.",
					null));
		}
		return Optional.empty();
	}

	private static boolean isDuplicateEmail(String lower) {
		return lower.contains("email") && isDuplicateEntry(lower);
	}

	private static boolean isDuplicateEntry(String lower) {
		return lower.contains("duplicate")
				|| lower.contains("unique")
				|| lower.contains("1062")
				|| lower.contains("23505");
	}

	private static String rootMessage(Throwable ex) {
		Throwable current = ex;
		while (current != null) {
			String message = current.getMessage();
			if (message != null && !message.isBlank()) {
				return message;
			}
			current = current.getCause();
		}
		return null;
	}
}
