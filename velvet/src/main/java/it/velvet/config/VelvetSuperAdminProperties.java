package it.velvet.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "velvet.super-admin")
public record VelvetSuperAdminProperties(
		String username,
		String password,
		String passwordHash,
		String setupToken,
		String profileDisplayName,
		String profilePhone) {

	public VelvetSuperAdminProperties {
		if (username == null) {
			username = "";
		}
		if (password == null) {
			password = "";
		}
		if (passwordHash == null) {
			passwordHash = "";
		}
		if (setupToken == null) {
			setupToken = "";
		}
		if (profileDisplayName == null) {
			profileDisplayName = "";
		}
		if (profilePhone == null) {
			profilePhone = "";
		}
	}

	public boolean configured() {
		if (username.trim().isBlank()) {
			return false;
		}
		return !passwordHash.trim().isBlank() || !password.trim().isBlank();
	}

	/** Token monouso per {@code POST /api/v1/admin/auth/register} (prima installazione). Vuoto = registrazione UI disattivata. */
	public boolean setupTokenConfigured() {
		return !setupToken.trim().isBlank();
	}
}
