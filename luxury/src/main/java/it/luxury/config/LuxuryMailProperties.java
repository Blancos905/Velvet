package it.luxury.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "luxury.mail")
public class LuxuryMailProperties {

	/**
	 * Invio SMTP transazionale (conferma prenotazione, promemoria). Richiede anche {@code spring.mail.host}.
	 */
	private boolean enabled = false;

	private String from = "noreply@saloniluxury.it";

	private String fromDisplayName = "Saloni Luxury";

	public boolean isEnabled() {
		return enabled;
	}

	public void setEnabled(boolean enabled) {
		this.enabled = enabled;
	}

	public String getFrom() {
		return from == null || from.isBlank() ? "noreply@saloniluxury.it" : from.trim();
	}

	public void setFrom(String from) {
		this.from = from;
	}

	public String getFromDisplayName() {
		return fromDisplayName == null || fromDisplayName.isBlank() ? "Saloni Luxury" : fromDisplayName.trim();
	}

	public void setFromDisplayName(String fromDisplayName) {
		this.fromDisplayName = fromDisplayName;
	}
}
