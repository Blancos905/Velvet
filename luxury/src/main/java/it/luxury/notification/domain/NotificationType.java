package it.luxury.notification.domain;

public enum NotificationType {
	/** Nuova prenotazione creata da cliente: avviso per titolare/salone. */
	BOOKING_CREATED_FOR_SALON,
	/** Cliente ha cambiato orario: nuova conferma richiesta al titolare/operatore. */
	BOOKING_RESCHEDULED_BY_CONSUMER,
	/** Prima conferma dopo prenotazione (email / log). */
	BOOKING_CONFIRMATION,
	/** Dopo riprogrammazione: nuovo riepilogo con link gestione. */
	BOOKING_UPDATED,
	/** Annullamento da parte del consumatore. */
	BOOKING_CANCELLED_BY_CONSUMER,
	/** Richiesta cliente rifiutata dall'operatore assegnato (inbox titolare). */
	BOOKING_REJECTED_BY_OPERATOR,
	/** Cliente: richiesta prenotazione BOOKED rifiutata da salone/operatore (distinta da annullamento post-conferma). */
	BOOKING_REQUEST_REJECTED,
	/** Annullamento da parte del salone (staff). */
	BOOKING_CANCELLED_BY_SALON,
	REMINDER_24H,
	REMINDER_1H,
	/** Dopo servizio completato: invito a recensire (default invio T+24h da fine appuntamento). */
	REVIEW_INVITE,
	/** Recensione post-visita inviata dal cliente: avviso titolare/operatore in inbox salone. */
	REVIEW_RECEIVED_FOR_SALON,
	/** Messaggio in-app per il titolare (centro notifiche salone), creato dal super admin — nessuna email. */
	ADMIN_PLATFORM_MESSAGE,
	/** Richiesta dal form Assistenza in area account: inbox in-app del profilo super admin — nessuna email automatica. */
	SUPPORT_REQUEST_TO_LUXURY,
}
