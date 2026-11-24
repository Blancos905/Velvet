package it.luxury.notification.service;

import org.springframework.lang.Nullable;

/** Template HTML richiesta assistenza (form area account) → casella assistenza. */
final class SupportRequestEmailHtml {

	private SupportRequestEmailHtml() {
	}

	static String build(
			String subject,
			String messageBody,
			String requesterName,
			String requesterEmail,
			@Nullable String roles,
			boolean fromSalonSide) {
		String audience = fromSalonSide ? "Titolare / staff salone" : "Cliente";
		String details = LuxuryEmailHtml.detailsBox(
				LuxuryEmailHtml.detailRow("Oggetto", subject)
						+ LuxuryEmailHtml.detailRow("Richiedente", requesterName)
						+ LuxuryEmailHtml.detailRow("Email", requesterEmail)
						+ LuxuryEmailHtml.detailRow("Tipo account", audience)
						+ (roles != null && !roles.isBlank()
								? LuxuryEmailHtml.detailRow("Ruoli", roles)
								: ""));
		String bodyHtml = "Nuova richiesta dal form Assistenza dell&apos;area account.";
		String quote = LuxuryEmailHtml.quotePreviewBox(messageBody);
		return LuxuryEmailHtml.build(
				"Richiesta assistenza",
				bodyHtml,
				details,
				null,
				null,
				"Rispondi direttamente a questa email per contattare il richiedente (Reply-To).",
				null,
				quote);
	}
}
