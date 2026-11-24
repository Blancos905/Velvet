/** Form accesso e messaggi auth (IT = sorgente). */
export const itAuthMessages = {
  "auth.loading": "Accesso in corso…",
  "auth.backAria": "Torna indietro",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.showPassword": "Mostra password",
  "auth.hidePassword": "Nascondi password",
  "auth.rememberCredentials": "Salva credenziali",
  "auth.rememberEmail": "Ricorda email",
  "auth.forgotPassword": "Password dimenticata?",
  "auth.submitting": "Accesso…",
  "auth.missingFields": "Inserisci email e password.",
  "auth.switchToSalonAccount": "Accedi con l'account del salone per continuare…",
  "auth.panelNotice.eyebrow": "Accesso al pannello",
  "auth.panelNotice.salonTitle": "Profilo salone",
  "auth.panelNotice.salonBody": "Questo account è il profilo del salone. Si apre sull'altro indirizzo e questa pagina torna alla home di ricerca.",
  "auth.panelNotice.staffTitle": "Profilo dipendente",
  "auth.panelNotice.staffBody": "Questo account è il profilo dipendente. Si apre sull'altro indirizzo e questa pagina torna alla home di ricerca.",
  "auth.panelNotice.adminTitle": "Super admin",
  "auth.panelNotice.adminBody": "Questo account è il super admin. Si apre sull'altro indirizzo e questa pagina torna alla home di ricerca.",
  "auth.panelNotice.goProfile": "Vai al tuo profilo",
  "auth.panelNotice.exit": "Esci",
  "auth.error.loginHelp":
    "Email o password non riconosciute, oppure l'account non è ancora attivo. Se ti sei appena registrato, riprova con la stessa password; in caso di errore ripetuto controlla che il backend sia raggiungibile.",
  "auth.error.network":
    "Il browser non riesce a contattare l'API Luxury. 1) Avvia Spring Boot sulla porta attesa dal proxy (in dev: http://127.0.0.1:8081, vedi vite.config.ts → proxy /api). 2) Se usi un dominio diverso da quello del backend, imposta VITE_API_BASE_URL coerente con l'origine del browser.",
  "auth.emailLink.invalidKicker": "Link email",
  "auth.emailLink.invalidTitle": "Link non più valido",
  "auth.emailLink.invalidLead":
    "Questo link non è valido o è scaduto. Torna alla pagina di registrazione e chiedi un nuovo invio.",
  "auth.emailLink.invalidAlready": "Se l'hai già aperto, l'email potrebbe essere già confermata.",
  "auth.emailLink.invalidClose": "Puoi chiudere questa scheda",
  "auth.emailLink.resentKicker": "Email inviata",
  "auth.emailLink.resentTitle": "Controlla la casella",
  "auth.emailLink.resentLead":
    "Se l’indirizzo è associato a un account in attesa di conferma, riceverai un’email con il link di attivazione.",
  "auth.emailLink.resentHint": "Controlla anche spam e promozioni",
} as const;
