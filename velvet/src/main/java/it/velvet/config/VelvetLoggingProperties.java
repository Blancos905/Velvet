package it.velvet.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "velvet.logging")
public class VelvetLoggingProperties {

	/** Giorni di conservazione log di sicurezza/sessione (informativa privacy e policy interna). */
	private int retentionDays = 180;

	public int getRetentionDays() {
		return retentionDays;
	}

	public void setRetentionDays(int retentionDays) {
		this.retentionDays = retentionDays;
	}
}
