package it.luxury.billing.service;

import it.luxury.billing.domain.LuxuryFiscalInvoice;
import it.luxury.notification.service.LuxuryEmailHtml;

/** Template HTML per email notifica FatturaPA admin. */
final class FatturaPaEmailHtml {

	private FatturaPaEmailHtml() {
	}

	static String build(LuxuryFiscalInvoice invoice) {
		String bodyHtml = "È stata generata una fattura elettronica FatturaPA per un pagamento abbonamento Premium.";
		String details = LuxuryEmailHtml.detailsBox(
				LuxuryEmailHtml.detailRow("Numero fattura", invoice.getInvoiceNumber())
						+ LuxuryEmailHtml.detailRow("Data", String.valueOf(invoice.getInvoiceDate()))
						+ LuxuryEmailHtml.detailRow(
								"Importo",
								FatturaPaXmlBuilder.formatMoney(invoice.getAmountCents()) + " " + invoice.getCurrency())
						+ LuxuryEmailHtml.detailRow("Cliente", invoice.getRecipientLegalName())
						+ LuxuryEmailHtml.detailRow("Stripe invoice", invoice.getStripeInvoiceId()));
		String footer = """
				In allegato trovi il file XML da caricare gratuitamente sul portale Fatture e Corrispettivi dell&apos;Agenzia delle Entrate.<br>
				Dopo l&apos;invio allo SDI, conserva la ricevuta di consegna del Sistema di Interscambio.
				""";
		return LuxuryEmailHtml.build(
				"Fattura elettronica pronta",
				bodyHtml,
				details,
				"https://ivaservizi.agenziaentrate.gov.it/portale/web/guest/home",
				"Portale Fatture e Corrispettivi",
				footer,
				null);
	}
}
