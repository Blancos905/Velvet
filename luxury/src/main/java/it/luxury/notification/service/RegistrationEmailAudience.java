package it.luxury.notification.service;

/** Destinatario dell'email di conferma registrazione. */
public enum RegistrationEmailAudience {
	CLIENT,
	SALON_OWNER;

	public static RegistrationEmailAudience forPendingKind(it.luxury.consumer.domain.PendingRegistrationKind kind) {
		return kind == it.luxury.consumer.domain.PendingRegistrationKind.SALON_OWNER ? SALON_OWNER : CLIENT;
	}
}
