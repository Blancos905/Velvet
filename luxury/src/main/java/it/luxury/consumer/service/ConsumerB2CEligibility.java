package it.luxury.consumer.service;

import it.luxury.common.api.BusinessException;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.security.auth.LuxuryUserPrincipal;
import org.springframework.http.HttpStatus;

/**
 * Azioni riservate al profilo cliente B2C (prenotazione online, «Diventa cliente»): esclusi titolare e staff salone.
 */
public final class ConsumerB2CEligibility {

	private ConsumerB2CEligibility() {
	}

	public static void assertMayActAsConsumer(ConsumerProfile consumer) {
		var roles = LuxuryUserPrincipal.parseRoleStrings(consumer.getSecurityRoles());
		if (!roles.contains("CLIENT") || roles.contains("OWNER") || roles.contains("STAFF")) {
			throw new BusinessException(
					HttpStatus.FORBIDDEN,
					"FORBIDDEN",
					"Solo gli account cliente possono prenotare online.");
		}
	}
}
