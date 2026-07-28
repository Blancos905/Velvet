package it.luxury.billing.domain;

/** Stato documento fiscale generato localmente (invio SDI manuale via portale AdE). */
public enum LuxuryFiscalInvoiceStatus {
	/** XML FatturaPA pronto per caricamento sul portale AdE. */
	READY,
	/** Profilo fatturazione salone incompleto. */
	SKIPPED_INCOMPLETE_PROFILE,
	/** Dati emittente Luxury non configurati. */
	SKIPPED_ISSUER_NOT_CONFIGURED,
	/** Importo zero o mancante. */
	SKIPPED_ZERO_AMOUNT,
	/** Fatturazione elettronica disabilitata. */
	SKIPPED_DISABLED
}
