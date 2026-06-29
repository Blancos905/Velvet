package it.velvet.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "velvet.notifications")
public class VelvetNotificationProperties {

	/**
	 * Se false, non si accoda né si elabora nulla.
	 */
	private boolean enabled = true;

	private String frontendBaseUrl = "http://localhost:5173";

	/** Base path frontend area prenotazioni consumatore (link email: path + /{appointmentId}). */
	private String consumerAppointmentsPath = "/account/prenotazioni";

	/** Path sul frontend per aprire il flusso recensione con query `token`. */
	private String reviewPath = "/recensione";

	/** Path pagina «reimposta password» (query {@code token}). Il link viene loggato sul backend. */
	private String passwordResetPath = "/reimposta-password";

	/** Validità del link di reimpostazione (minuti). */
	private int passwordResetTokenTtlMinutes = 60;

	/** Path pagina conferma email registrazione (query {@code token}). */
	private String emailVerificationPath = "/conferma-email";

	/** Validità del link di conferma email (minuti). */
	private int emailVerificationTokenTtlMinutes = 1440;

	/** Ore dopo la fine appuntamento ({@code endsAt}) per l'invito recensione in-app. */
	private int reviewInviteOffsetHours = 2;

	private long pollIntervalMs = 15_000L;

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

	public String getConsumerAppointmentsPath() {
		return consumerAppointmentsPath;
	}

	public void setConsumerAppointmentsPath(String consumerAppointmentsPath) {
		this.consumerAppointmentsPath = consumerAppointmentsPath;
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

	public String getEmailVerificationPath() {
		return emailVerificationPath == null || emailVerificationPath.isBlank()
				? "/conferma-email"
				: emailVerificationPath;
	}

	public void setEmailVerificationPath(String emailVerificationPath) {
		this.emailVerificationPath = emailVerificationPath;
	}

	public int getEmailVerificationTokenTtlMinutes() {
		return emailVerificationTokenTtlMinutes <= 0 ? 1440 : emailVerificationTokenTtlMinutes;
	}

	public void setEmailVerificationTokenTtlMinutes(int emailVerificationTokenTtlMinutes) {
		this.emailVerificationTokenTtlMinutes = emailVerificationTokenTtlMinutes;
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
}
