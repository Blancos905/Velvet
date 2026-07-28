package it.luxury.notification.service;

/** Template HTML per email notifica chat luxury. */
final class SalonLuxuryChatEmailHtml {

	private SalonLuxuryChatEmailHtml() {
	}

	static String build(String preview, String chatUrl) {
		return LuxuryEmailHtml.build(
				"Nuovo messaggio in chat",
				"Hai ricevuto un nuovo messaggio in chat su Saloni Luxury.",
				LuxuryEmailHtml.quotePreviewBox(preview),
				chatUrl,
				"Apri la conversazione",
				null,
				null);
	}
}
