package it.velvet.notification.service;

/**
 * Template HTML per email di conferma registrazione (stesso stile delle email prenotazione).
 * Logo inline: {@code cid:velvet-logo}.
 */
final class RegistrationEmailHtml {

	private RegistrationEmailHtml() {
	}

	static String buildVerificationEmail(String greetingName, String verificationUrl) {
		return """
				<!DOCTYPE html>
				<html lang="it">
				<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
				<body style="margin:0;padding:0;background:#f6f3ee;font-family:Georgia,'Times New Roman',serif;color:#f5ead8;">
				  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#f6f3ee;padding:24px 12px;">
				    <tr><td align="center">
				      <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#1c1814;border:1px solid #2a2420;border-radius:12px;overflow:hidden;">
				        <tr><td align="center" style="padding:28px 24px 12px;">
				          <img src="cid:%s" alt="Saloni Luxury" width="96" height="96" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;border-radius:50%%;" />
				        </td></tr>
				        <tr><td style="padding:0 24px 8px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#c4b5a0;">Saloni Luxury</td></tr>
				        <tr><td style="padding:0 24px 12px;font-size:22px;line-height:1.35;color:#f5ead8;">Conferma la tua email</td></tr>
				        <tr><td style="padding:0 24px 16px;font-size:15px;line-height:1.65;color:#e8dfd0;">
				          %s,<br><br>
				          Grazie per esserti registrato su Saloni Luxury.<br>
				          Per attivare l&apos;account e accedere, conferma il tuo indirizzo email con il pulsante qui sotto.
				        </td></tr>
				        <tr><td style="padding:8px 24px 20px;" align="center">
				          <a href="%s" style="display:inline-block;padding:14px 32px;background:#f5ead8;color:#1c1814;text-decoration:none;border-radius:999px;font-size:15px;font-weight:600;letter-spacing:0.02em;">Conferma email</a>
				        </td></tr>
				        <tr><td style="padding:0 24px 20px;">
				          <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#2a2420;border-radius:8px;">
				            <tr><td style="padding:14px 16px;font-size:13px;line-height:1.6;color:#c4b5a0;">
				              Se il pulsante non funziona, copia e incolla questo link nel browser:<br>
				              <a href="%s" style="color:#f5ead8;word-break:break-all;">%s</a>
				            </td></tr>
				          </table>
				        </td></tr>
				        <tr><td style="padding:0 24px 28px;font-size:13px;line-height:1.55;color:#9a8f7e;">
				          Se non hai richiesto la registrazione, ignora questo messaggio.
				        </td></tr>
				      </table>
				    </td></tr>
				  </table>
				</body>
				</html>
				"""
				.formatted(
						TransactionalBookingEmailHtml.LOGO_CONTENT_ID,
						escapeHtml(greetingName),
						escapeHtml(verificationUrl),
						escapeHtml(verificationUrl),
						escapeHtml(verificationUrl));
	}

	private static String escapeHtml(String raw) {
		if (raw == null) {
			return "";
		}
		return raw
				.replace("&", "&amp;")
				.replace("<", "&lt;")
				.replace(">", "&gt;")
				.replace("\"", "&quot;");
	}
}
