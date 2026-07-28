package it.luxury.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "luxury.logging")
public class LuxuryLoggingProperties {

	/** Giorni di conservazione log di sicurezza/sessione (informativa privacy e policy interna). */
	private int retentionDays = 180;

	public int getRetentionDays() {
		return retentionDays;
	}

	public void setRetentionDays(int retentionDays) {
		this.retentionDays = retentionDays;
	}
}
