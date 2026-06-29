package it.velvet.catalog.domain;

import it.velvet.common.api.BusinessException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/** Regole condivise per operatori abilitati su un servizio. */
public final class SalonServiceOperators {

	private SalonServiceOperators() {
	}

	public static boolean hasExplicitLinks(SalonService service) {
		return service != null && service.getOperators() != null && !service.getOperators().isEmpty();
	}

	public static List<StaffOperator> filterForBooking(SalonService service, List<StaffOperator> atLocation) {
		if (!hasExplicitLinks(service)) {
			return atLocation;
		}
		Set<UUID> allowed = service.getOperators().stream().map(StaffOperator::getId).collect(Collectors.toSet());
		return atLocation.stream().filter(o -> allowed.contains(o.getId())).toList();
	}

	public static void assertCanPerform(SalonService service, StaffOperator operator) {
		if (!hasExplicitLinks(service)) {
			return;
		}
		boolean ok = service.getOperators().stream().anyMatch(o -> o.getId().equals(operator.getId()));
		if (!ok) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"VALIDATION_ERROR",
					"Questo operatore non è abilitato per il servizio selezionato.");
		}
	}
}
