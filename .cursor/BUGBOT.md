# Bugbot

Invarianti di questo repo. Il dettaglio sta nelle regole `.cursor/rules/`: apri solo il file dell’area toccata dal diff, senza copiarlo nel commento.

- Ruoli, home account e namespace API: `luxury-roles-routing.mdc`.
- Prenotazioni: `luxury-booking-appointments.mdc`. `BOOKED` è in attesa di conferma. Il titolare non riceve il popup Accetta/Rifiuta dell’operatore.
- Cliente e agenda salone restano separati: `luxury-consumer-booking.mdc`. Titolare e staff non prenotano come clienti.
- Piano vendibile `PREMIUM`; `BASE` non è entitled. Il gate è sul backend: `luxury-salon-plans-billing.mdc`.
- Chat Premium, thread e read state: `luxury-luxury-chat.mdc`.
- Catalogo staff di sede con `X-Location-Id`: `luxury-staff-location-access.mdc`.
- Testi UI del frontend: `luxury-i18n.mdc`.
- Super admin: `luxury-super-admin.mdc`.
- Avvio locale: `luxury-dev-docker-only.mdc` (`./scripts/dev-docker.sh`, sito `:8080`, API `:8082`).

Non sostituire i test del comportamento toccato con una build APK.
