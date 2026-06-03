package it.velvet.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "velvet.notifications")
public class VelvetNotificationProperties {

	/**
	 * Se false, non si accoda né si elabora nulla.
	 */
	private boolean enabled = true;

	private String frontendBaseUrl = "http://localhost:5173";

	private String managePath = "/prenotazione/gestisci";

	/** Path sul frontend per aprire il flusso recensione con query `token`. */
	private String reviewPath = "/recensione";

	/** Path pagina «reimposta password» (query {@code token}). Il link viene loggato sul backend. */
	private String passwordResetPath = "/reimposta-password";

	/** Validità del link di reimpostazione (minuti). */
	private int passwordResetTokenTtlMinutes = 60;

	/** Ore dopo la fine appuntamento ({@code endsAt}) per l'invito recensione (in-app + WhatsApp). */
	private int reviewInviteOffsetHours = 2;

	private long pollIntervalMs = 15_000L;

	/**
	 * Se true abilita l'invio WhatsApp via webhook HTTP.
	 */
	private boolean whatsappEnabled = false;

	/**
	 * Endpoint webhook provider WhatsApp (es. Twilio Function / Make / Zapier / backend bridge).
	 */
	private String whatsappWebhookUrl = "";

	/**
	 * Token bearer opzionale per autenticare la chiamata al webhook.
	 */
	private String whatsappBearerToken = "";

	/**
	 * Prefisso paese senza "+" per normalizzare numeri nazionali (es. Italia {@code 39}) quando il numero non è in formato E.164.
	 */
	private String whatsappDefaultCountryCallingCode = "39";

	public boolean isEnabled() {
		return enabled;
	}

	public void setEnabled(boolean enabled) {
		this.enabled = enabled;
	}

	public String getFrontendBaseUrl() {
		return frontendBaseUrl;
	}

	public void setFrontendBaseUrl(String frontendBaseUrl) {
		this.frontendBaseUrl = frontendBaseUrl;
	}

	public String getManagePath() {
		return managePath;
	}

	public void setManagePath(String managePath) {
		this.managePath = managePath;
	}

	public String getReviewPath() {
		return reviewPath;
	}

	public void setReviewPath(String reviewPath) {
		this.reviewPath = reviewPath;
	}

	public String getPasswordResetPath() {
		return passwordResetPath == null || passwordResetPath.isBlank() ? "/reimposta-password" : passwordResetPath;
	}

	public void setPasswordResetPath(String passwordResetPath) {
		this.passwordResetPath = passwordResetPath;
	}

	public int getPasswordResetTokenTtlMinutes() {
		return passwordResetTokenTtlMinutes <= 0 ? 60 : passwordResetTokenTtlMinutes;
	}

	public void setPasswordResetTokenTtlMinutes(int passwordResetTokenTtlMinutes) {
		this.passwordResetTokenTtlMinutes = passwordResetTokenTtlMinutes;
	}

	public int getReviewInviteOffsetHours() {
		return reviewInviteOffsetHours;
	}

	public void setReviewInviteOffsetHours(int reviewInviteOffsetHours) {
		this.reviewInviteOffsetHours = reviewInviteOffsetHours;
	}

	public long getPollIntervalMs() {
		return pollIntervalMs;
	}

	public void setPollIntervalMs(long pollIntervalMs) {
		this.pollIntervalMs = pollIntervalMs;
	}

	public boolean isWhatsappEnabled() {
		return whatsappEnabled;
	}

	public void setWhatsappEnabled(boolean whatsappEnabled) {
		this.whatsappEnabled = whatsappEnabled;
	}

	public String getWhatsappWebhookUrl() {
		return whatsappWebhookUrl;
	}

	public void setWhatsappWebhookUrl(String whatsappWebhookUrl) {
		this.whatsappWebhookUrl = whatsappWebhookUrl;
	}

	public String getWhatsappBearerToken() {
		return whatsappBearerToken;
	}

	public void setWhatsappBearerToken(String whatsappBearerToken) {
		this.whatsappBearerToken = whatsappBearerToken;
	}

	public String getWhatsappDefaultCountryCallingCode() {
		return whatsappDefaultCountryCallingCode == null || whatsappDefaultCountryCallingCode.isBlank()
				? "39"
				: whatsappDefaultCountryCallingCode.trim();
	}

	public void setWhatsappDefaultCountryCallingCode(String whatsappDefaultCountryCallingCode) {
		this.whatsappDefaultCountryCallingCode = whatsappDefaultCountryCallingCode;
	}
}
