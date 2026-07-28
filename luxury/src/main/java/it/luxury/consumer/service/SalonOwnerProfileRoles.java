package it.luxury.consumer.service;

import it.luxury.security.auth.LuxuryUserPrincipal;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Ruoli profilo per titolare registrato da salone: {@code OWNER} obbligatorio, {@code CLIENT} escluso
 * (il titolare non è account consumatore B2C).
 */
public final class SalonOwnerProfileRoles {

	private SalonOwnerProfileRoles() {
	}

	/** Aggiorna i ruoli dopo registrazione salone o allineamento directory: rimuove CLIENT, assicura OWNER, mantiene altri (es. ADMIN). */
	public static String applySalonDirectoryTitolare(String securityRoles) {
		Set<String> roles = new LinkedHashSet<>(LuxuryUserPrincipal.parseRoleStrings(securityRoles));
		roles.remove("CLIENT");
		roles.add("OWNER");
		if (roles.isEmpty()) {
			return "OWNER";
		}
		return String.join(",", roles);
	}
}
