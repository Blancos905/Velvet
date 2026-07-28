package it.luxury.notification.service;

import org.springframework.lang.Nullable;

/**
 * Guscio HTML condiviso per tutte le email transazionali Saloni Luxury.
 * Logo inline: {@code cid:luxury-logo} (allegato dal servizio di dispatch).
 */
public final class LuxuryEmailHtml {

	public static final String LOGO_CONTENT_ID = "luxury-logo";

	private LuxuryEmailHtml() {
	}

	/**
	 * @param headline titolo principale (escaped)
	 * @param bodyHtml corpo introduttivo (HTML sicuro, non escaped)
	 * @param detailsBoxHtml blocco dettagli opzionale (HTML sicuro)
	 * @param ctaUrl URL pulsante (escaped); {@code null} per omettere CTA
	 * @param ctaLabel etichetta pulsante (escaped)
	 * @param footerHtml footer opzionale (HTML sicuro)
	 * @param fallbackLinkUrl link di fallback sotto il CTA (escaped); {@code null} per omettere
	 */
	public static String build(
			String headline,
			String bodyHtml,
			@Nullable String detailsBoxHtml,
			@Nullable String ctaUrl,
			@Nullable String ctaLabel,
			@Nullable String footerHtml,
			@Nullable String fallbackLinkUrl,
			@Nullable String preCtaHtml) {
		StringBuilder card = new StringBuilder();
		card.append(logoRow());
		card.append(brandLabelRow());
		card.append(headlineRow(escapeHtml(headline)));
		card.append(bodyRow(bodyHtml));
		if (detailsBoxHtml != null && !detailsBoxHtml.isBlank()) {
			card.append(detailsBoxHtml);
		}
		if (preCtaHtml != null && !preCtaHtml.isBlank()) {
			card.append(preCtaHtml);
		}
		if (ctaUrl != null && !ctaUrl.isBlank() && ctaLabel != null && !ctaLabel.isBlank()) {
			card.append(ctaRow(escapeHrefAttribute(ctaUrl), escapeHtml(ctaLabel)));
		}
		if (fallbackLinkUrl != null && !fallbackLinkUrl.isBlank()) {
			card.append(fallbackLinkBox(escapeHrefAttribute(fallbackLinkUrl)));
		}
		if (footerHtml != null && !footerHtml.isBlank()) {
			card.append(footerRow(footerHtml));
		}
		return wrap(card.toString());
	}

	/** Compatibilità chiamate esistenti senza blocco pre-CTA. */
	public static String build(
			String headline,
			String bodyHtml,
			@Nullable String detailsBoxHtml,
			@Nullable String ctaUrl,
			@Nullable String ctaLabel,
			@Nullable String footerHtml,
			@Nullable String fallbackLinkUrl) {
		return build(headline, bodyHtml, detailsBoxHtml, ctaUrl, ctaLabel, footerHtml, fallbackLinkUrl, null);
	}

	public static String detailsBox(String rowsHtml) {
		return """
				<tr><td style="padding:16px 24px;">
				  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#2a2420;border-radius:8px;">
				    <tr><td style="padding:16px;font-size:15px;line-height:1.7;color:#e8dfd0;">
				      %s
				    </td></tr>
				  </table>
				</td></tr>
				"""
				.formatted(rowsHtml);
	}

	public static String detailRow(String label, String value) {
		return "<strong>" + escapeHtml(label) + ":</strong> " + escapeHtml(value) + "<br>";
	}

	static String detailRowHtml(String label, String valueHtml) {
		return "<strong>" + escapeHtml(label) + ":</strong> " + valueHtml + "<br>";
	}

	static String quotePreviewBox(String preview) {
		return detailsBox(
				"<em>&laquo;" + escapeHtml(preview) + "&raquo;</em>");
	}

	static String supportFooter() {
		return "Per assistenza scrivi a supporto@saloniluxury.it";
	}

	static String disclaimerFooter(String text) {
		return escapeHtml(text);
	}

	static String escapeHtml(String raw) {
		if (raw == null) {
			return "";
		}
		return raw
				.replace("&", "&amp;")
				.replace("<", "&lt;")
				.replace(">", "&gt;")
				.replace("\"", "&quot;");
	}

	/**
	 * Escaping per attributi {@code href}: molti client email (Gmail, iOS Mail) rompono link con {@code &amp;}
	 * nelle query string — si lascia {@code &} letterale.
	 */
	static String escapeHrefAttribute(String raw) {
		if (raw == null) {
			return "";
		}
		return raw
				.replace("\"", "%22")
				.replace("'", "%27")
				.replace("<", "%3C")
				.replace(">", "%3E");
	}

	/** Link testuale cliccabile nel corpo (fallback se il pulsante non risponde nel client email). */
	static String inlineActionLink(String url, String label) {
		if (url == null || url.isBlank() || label == null || label.isBlank()) {
			return "";
		}
		return "<a href=\""
				+ escapeHrefAttribute(url)
				+ "\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color:#f5ead8;text-decoration:underline;font-weight:600;\">"
				+ escapeHtml(label)
				+ "</a>";
	}

	/** URL in chiaro da copiare (Gmail desktop spesso disabilita i click su localhost/IP). */
	static String plainTextCopyBox(String url, String leadHtml) {
		if (url == null || url.isBlank()) {
			return "";
		}
		return """
				<tr><td style="padding:0 24px 12px;">
				  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#2a2420;border-radius:8px;">
				    <tr><td style="padding:14px 16px;font-size:13px;line-height:1.6;color:#c4b5a0;">
				      %s<br>
				      <span style="color:#f5ead8;word-break:break-all;font-family:Menlo,Monaco,Consolas,monospace;font-size:12px;">%s</span>
				    </td></tr>
				  </table>
				</td></tr>
				"""
				.formatted(leadHtml, escapeHtml(url));
	}

	private static String wrap(String cardInnerRows) {
		return """
				<!DOCTYPE html>
				<html lang="it">
				<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
				<body style="margin:0;padding:0;background:#f6f3ee;font-family:Georgia,'Times New Roman',serif;color:#f5ead8;">
				  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#f6f3ee;padding:24px 12px;">
				    <tr><td align="center">
				      <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#1c1814;border:1px solid #2a2420;border-radius:12px;">
				        %s
				      </table>
				    </td></tr>
				  </table>
				</body>
				</html>
				"""
				.formatted(cardInnerRows);
	}

	private static String logoRow() {
		return """
				<tr><td align="center" style="padding:28px 24px 12px;">
				  <img src="cid:%s" alt="Saloni Luxury" width="96" height="96" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;border-radius:50%%;" />
				</td></tr>
				"""
				.formatted(LOGO_CONTENT_ID);
	}

	private static String brandLabelRow() {
		return """
				<tr><td style="padding:0 24px 8px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#c4b5a0;">Saloni Luxury</td></tr>
				""";
	}

	private static String headlineRow(String headline) {
		return """
				<tr><td style="padding:0 24px 16px;font-size:22px;line-height:1.35;color:#f5ead8;">%s</td></tr>
				"""
				.formatted(headline);
	}

	private static String bodyRow(String bodyHtml) {
		return """
				<tr><td style="padding:0 24px 8px;font-size:15px;line-height:1.6;color:#e8dfd0;">
				  %s
				</td></tr>
				"""
				.formatted(bodyHtml);
	}

	private static String ctaRow(String url, String label) {
		return """
				<tr><td style="padding:8px 24px 28px;" align="center">
				  <!--[if mso]>
				  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="%1$s" style="height:46px;v-text-anchor:middle;width:220px;" arcsize="50%%" stroke="f" fillcolor="#f5ead8">
				    <w:anchorlock/>
				    <center style="color:#1c1814;font-family:Georgia,serif;font-size:15px;font-weight:600;">%2$s</center>
				  </v:roundrect>
				  <![endif]-->
				  <!--[if !mso]><!-->
				  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
				    <tr>
				      <td align="center" bgcolor="#f5ead8" style="background:#f5ead8;border-radius:999px;mso-padding-alt:14px 28px;">
				        <a href="%1$s" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:15px;font-weight:600;color:#1c1814;text-decoration:none;border-radius:999px;border:1px solid #f5ead8;">%2$s</a>
				      </td>
				    </tr>
				  </table>
				  <!--<![endif]-->
				</td></tr>
				"""
				.formatted(url, label);
	}

	private static String fallbackLinkBox(String url) {
		return """
				<tr><td style="padding:0 24px 20px;">
				  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#2a2420;border-radius:8px;">
				    <tr><td style="padding:14px 16px;font-size:13px;line-height:1.6;color:#c4b5a0;">
				      Se il pulsante non funziona, copia e incolla questo link nel browser:<br>
				      <a href="%s" style="color:#f5ead8;word-break:break-all;">%s</a>
				    </td></tr>
				  </table>
				</td></tr>
				"""
				.formatted(url, url);
	}

	private static String footerRow(String footerHtml) {
		return """
				<tr><td style="padding:0 24px 24px;font-size:13px;line-height:1.5;color:#9a8f82;text-align:center;">
				  %s
				</td></tr>
				"""
				.formatted(footerHtml);
	}
}
