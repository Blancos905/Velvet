package it.velvet.consumer.service;

import it.velvet.security.auth.VelvetUserPrincipal;

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
		Set<String> roles = new LinkedHashSet<>(VelvetUserPrincipal.parseRoleStrings(securityRoles));
		roles.remove("CLIENT");
		roles.add("OWNER");
		if (roles.isEmpty()) {
			return "OWNER";
		}
		return String.join(",", roles);
	}
}
