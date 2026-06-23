package it.velvet.notification.service;

/**
 * Template HTML per email transazionali (prenotazione, abbonamento Premium, …).
 * Logo inline: {@code cid:velvet-logo} (allegato dal servizio di dispatch).
 */
public final class TransactionalBookingEmailHtml {

	public static final String LOGO_CONTENT_ID = "velvet-logo";

	private TransactionalBookingEmailHtml() {
	}

	static String buildManageBookingEmail(
			String introLine,
			String salon,
			String service,
			String weekday,
			String when,
			String manageUrl,
			String buttonLabel) {
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
				        <tr><td style="padding:0 24px 16px;font-size:22px;line-height:1.35;color:#f5ead8;">%s</td></tr>
				        <tr><td style="padding:0 24px 8px;font-size:15px;line-height:1.6;color:#e8dfd0;">
				          Grazie per aver prenotato con SaloniLuxury.<br>
				          Un ringraziamento anche da parte di <strong>%s</strong>.
				        </td></tr>
				        <tr><td style="padding:16px 24px;">
				          <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#2a2420;border-radius:8px;">
				            <tr><td style="padding:16px;font-size:15px;line-height:1.7;color:#e8dfd0;">
				              <strong>Servizio:</strong> %s<br>
				              <strong>Giorno:</strong> %s<br>
				              <strong>Data e ora:</strong> %s<br>
				              <strong>Sede:</strong> %s
				            </td></tr>
				          </table>
				        </td></tr>
				        <tr><td style="padding:8px 24px 28px;" align="center">
				          <a href="%s" style="display:inline-block;padding:14px 28px;background:#f5ead8;color:#1c1814;text-decoration:none;border-radius:999px;font-size:15px;font-weight:600;letter-spacing:0.02em;">%s</a>
				        </td></tr>
				      </table>
				    </td></tr>
				  </table>
				</body>
				</html>
				"""
				.formatted(
						LOGO_CONTENT_ID,
						escapeHtml(introLine),
						escapeHtml(salon),
						escapeHtml(service),
						escapeHtml(weekday),
						escapeHtml(when),
						escapeHtml(salon),
						escapeHtml(manageUrl),
						escapeHtml(buttonLabel));
	}

	public static String buildPremiumSubscriptionThankYouEmail(
			String introLine,
			String salonName,
			String amountDetail,
			String periodDetail,
			String profileUrl,
			String buttonLabel) {
		String amountRow = amountDetail != null && !amountDetail.isBlank()
				? "<strong>Importo addebitato:</strong> " + escapeHtml(amountDetail) + "<br>"
				: "";
		String periodRow = periodDetail != null && !periodDetail.isBlank()
				? "<strong>Prossimo rinnovo:</strong> " + escapeHtml(periodDetail) + "<br>"
				: "";
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
				        <tr><td style="padding:0 24px 16px;font-size:22px;line-height:1.35;color:#f5ead8;">%s</td></tr>
				        <tr><td style="padding:0 24px 8px;font-size:15px;line-height:1.6;color:#e8dfd0;">
				          Grazie per aver scelto l'abbonamento Premium Saloni Luxury.
				        </td></tr>
				        <tr><td style="padding:16px 24px;">
				          <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#2a2420;border-radius:8px;">
				            <tr><td style="padding:16px;font-size:15px;line-height:1.7;color:#e8dfd0;">
				              <strong>Salone:</strong> %s<br>
				              %s%s<strong>Piano:</strong> Premium — tutte le funzionalità attive
				            </td></tr>
				          </table>
				        </td></tr>
				        <tr><td style="padding:8px 24px 28px;" align="center">
				          <a href="%s" style="display:inline-block;padding:14px 28px;background:#f5ead8;color:#1c1814;text-decoration:none;border-radius:999px;font-size:15px;font-weight:600;letter-spacing:0.02em;">%s</a>
				        </td></tr>
				        <tr><td style="padding:0 24px 24px;font-size:13px;line-height:1.5;color:#9a8f82;text-align:center;">
				          Per assistenza scrivi a supporto@saloniluxury.it
				        </td></tr>
				      </table>
				    </td></tr>
				  </table>
				</body>
				</html>
				"""
				.formatted(
						LOGO_CONTENT_ID,
						escapeHtml(introLine),
						escapeHtml(salonName),
						amountRow,
						periodRow,
						escapeHtml(profileUrl),
						escapeHtml(buttonLabel));
	}

	public static String buildPremiumSubscriptionCancellationEmail(
			String introLine,
			String salonName,
			String accessDetail,
			String planDetail,
			String profileUrl,
			String buttonLabel) {
		String accessRow = accessDetail != null && !accessDetail.isBlank()
				? "<strong>Accesso Premium:</strong> " + escapeHtml(accessDetail) + "<br>"
				: "";
		String planRow = planDetail != null && !planDetail.isBlank()
				? "<strong>" + escapeHtml(planDetail) + "</strong><br>"
				: "";
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
				        <tr><td style="padding:0 24px 16px;font-size:22px;line-height:1.35;color:#f5ead8;">%s</td></tr>
				        <tr><td style="padding:0 24px 8px;font-size:15px;line-height:1.6;color:#e8dfd0;">
				          Abbiamo registrato la disdetta del tuo abbonamento Premium Saloni Luxury.
				        </td></tr>
				        <tr><td style="padding:16px 24px;">
				          <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#2a2420;border-radius:8px;">
				            <tr><td style="padding:16px;font-size:15px;line-height:1.7;color:#e8dfd0;">
				              <strong>Salone:</strong> %s<br>
				              %s%s
				            </td></tr>
				          </table>
				        </td></tr>
				        <tr><td style="padding:8px 24px 28px;" align="center">
				          <a href="%s" style="display:inline-block;padding:14px 28px;background:#f5ead8;color:#1c1814;text-decoration:none;border-radius:999px;font-size:15px;font-weight:600;letter-spacing:0.02em;">%s</a>
				        </td></tr>
				        <tr><td style="padding:0 24px 24px;font-size:13px;line-height:1.5;color:#9a8f82;text-align:center;">
				          Per assistenza scrivi a supporto@saloniluxury.it
				        </td></tr>
				      </table>
				    </td></tr>
				  </table>
				</body>
				</html>
				"""
				.formatted(
						LOGO_CONTENT_ID,
						escapeHtml(introLine),
						escapeHtml(salonName),
						accessRow,
						planRow,
						escapeHtml(profileUrl),
						escapeHtml(buttonLabel));
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
