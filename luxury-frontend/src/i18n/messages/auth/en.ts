import type { MessageCatalog } from "../it";
import { itAuthMessages } from "./it";

export type AuthMessageCatalog = Pick<MessageCatalog, keyof typeof itAuthMessages>;

export const enAuthMessages: AuthMessageCatalog = {
  "auth.loading": "Signing in…",
  "auth.backAria": "Go back",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.showPassword": "Show password",
  "auth.hidePassword": "Hide password",
  "auth.rememberCredentials": "Save credentials",
  "auth.rememberEmail": "Remember email",
  "auth.forgotPassword": "Forgot password?",
  "auth.submitting": "Signing in…",
  "auth.missingFields": "Enter email and password.",
  "auth.switchToSalonAccount": "Sign in with your salon account to continue…",
  "auth.panelNotice.eyebrow": "Panel access",
  "auth.panelNotice.salonTitle": "Salon profile",
  "auth.panelNotice.salonBody": "This account is the salon profile. It opens on the other address and this page returns to the search home.",
  "auth.panelNotice.staffTitle": "Staff profile",
  "auth.panelNotice.staffBody": "This account is the staff profile. It opens on the other address and this page returns to the search home.",
  "auth.panelNotice.adminTitle": "Super admin",
  "auth.panelNotice.adminBody": "This account is the super admin. It opens on the other address and this page returns to the search home.",
  "auth.panelNotice.goProfile": "Go to your profile",
  "auth.panelNotice.exit": "Exit",
  "auth.error.loginHelp":
    "Email or password not recognized, or the account is not active yet. If you just registered, try again with the same password; if the error persists, check that the backend is reachable.",
  "auth.error.network":
    "The browser cannot reach the Luxury API. 1) Start Spring Boot on the port expected by the proxy (in dev: http://127.0.0.1:8081, see vite.config.ts → /api proxy). 2) If you use a different domain from the backend, set VITE_API_BASE_URL to match the browser origin.",
  "auth.emailLink.invalidKicker": "Email link",
  "auth.emailLink.invalidTitle": "Link no longer valid",
  "auth.emailLink.invalidLead": "This link is invalid or has expired. Go back to the registration page and request a new one.",
  "auth.emailLink.invalidAlready": "If you already opened it, the email may already be confirmed.",
  "auth.emailLink.invalidClose": "You can close this tab",
  "auth.emailLink.resentKicker": "Email sent",
  "auth.emailLink.resentTitle": "Check your inbox",
  "auth.emailLink.resentLead":
    "If this address belongs to an account waiting for confirmation, you will receive an email with the activation link.",
  "auth.emailLink.resentHint": "Also check spam and promotions",
};

export const frAuthMessages: AuthMessageCatalog = {
  ...enAuthMessages,
  "auth.loading": "Connexion en cours…",
  "auth.backAria": "Retour",
  "auth.showPassword": "Afficher le mot de passe",
  "auth.hidePassword": "Masquer le mot de passe",
  "auth.rememberCredentials": "Enregistrer les identifiants",
  "auth.rememberEmail": "Mémoriser l'e-mail",
  "auth.forgotPassword": "Mot de passe oublié ?",
  "auth.submitting": "Connexion…",
  "auth.missingFields": "Saisissez l'e-mail et le mot de passe.",
  "auth.switchToSalonAccount": "Connectez-vous avec le compte du salon pour continuer…",
  "auth.panelNotice.eyebrow": "Accès au panneau",
  "auth.panelNotice.salonTitle": "Profil salon",
  "auth.panelNotice.salonBody": "Ce compte est le profil du salon. Il s'ouvre sur l'autre adresse et cette page revient à l'accueil de recherche.",
  "auth.panelNotice.staffTitle": "Profil employé",
  "auth.panelNotice.staffBody": "Ce compte est le profil employé. Il s'ouvre sur l'autre adresse et cette page revient à l'accueil de recherche.",
  "auth.panelNotice.adminTitle": "Super admin",
  "auth.panelNotice.adminBody": "Ce compte est le super admin. Il s'ouvre sur l'autre adresse et cette page revient à l'accueil de recherche.",
  "auth.panelNotice.goProfile": "Aller à votre profil",
  "auth.panelNotice.exit": "Quitter",
  "auth.error.loginHelp":
    "E-mail ou mot de passe non reconnus, ou compte pas encore actif. Si vous venez de vous inscrire, réessayez avec le même mot de passe ; en cas d'erreur répétée, vérifiez que le backend est accessible.",
  "auth.error.network":
    "Le navigateur ne peut pas joindre l'API Luxury. 1) Démarrez Spring Boot sur le port attendu par le proxy (en dev : http://127.0.0.1:8081, voir vite.config.ts → proxy /api). 2) Si vous utilisez un domaine différent du backend, définissez VITE_API_BASE_URL en cohérence avec l'origine du navigateur.",
  "auth.emailLink.invalidKicker": "Lien e-mail",
  "auth.emailLink.invalidTitle": "Lien plus valide",
  "auth.emailLink.invalidLead":
    "Ce lien n'est pas valide ou a expiré. Revenez à la page d'inscription et demandez un nouvel envoi.",
  "auth.emailLink.invalidAlready": "Si vous l'avez déjà ouvert, l'e-mail est peut-être déjà confirmé.",
  "auth.emailLink.invalidClose": "Vous pouvez fermer cet onglet",
  "auth.emailLink.resentKicker": "E-mail envoyé",
  "auth.emailLink.resentTitle": "Vérifiez la boîte",
  "auth.emailLink.resentLead":
    "Si l'adresse est liée à un compte en attente de confirmation, vous recevrez un e-mail avec le lien d'activation.",
  "auth.emailLink.resentHint": "Vérifiez aussi les spams et les promotions",
};

export const deAuthMessages: AuthMessageCatalog = {
  ...enAuthMessages,
  "auth.loading": "Anmeldung läuft…",
  "auth.backAria": "Zurück",
  "auth.showPassword": "Passwort anzeigen",
  "auth.hidePassword": "Passwort ausblenden",
  "auth.rememberCredentials": "Anmeldedaten speichern",
  "auth.rememberEmail": "E-Mail merken",
  "auth.forgotPassword": "Passwort vergessen?",
  "auth.submitting": "Anmeldung…",
  "auth.missingFields": "E-Mail und Passwort eingeben.",
  "auth.switchToSalonAccount": "Melden Sie sich mit dem Salon-Konto an, um fortzufahren…",
  "auth.panelNotice.eyebrow": "Zugang zum Bereich",
  "auth.panelNotice.salonTitle": "Salonprofil",
  "auth.panelNotice.salonBody": "Dieses Konto ist das Salonprofil. Es öffnet sich unter der anderen Adresse und diese Seite kehrt zur Suche zurück.",
  "auth.panelNotice.staffTitle": "Mitarbeiterprofil",
  "auth.panelNotice.staffBody": "Dieses Konto ist das Mitarbeiterprofil. Es öffnet sich unter der anderen Adresse und diese Seite kehrt zur Suche zurück.",
  "auth.panelNotice.adminTitle": "Super-Admin",
  "auth.panelNotice.adminBody": "Dieses Konto ist der Super-Admin. Es öffnet sich unter der anderen Adresse und diese Seite kehrt zur Suche zurück.",
  "auth.panelNotice.goProfile": "Zu deinem Profil",
  "auth.panelNotice.exit": "Verlassen",
  "auth.error.loginHelp":
    "E-Mail oder Passwort nicht erkannt, oder Konto noch nicht aktiv. Wenn Sie sich gerade registriert haben, versuchen Sie es erneut mit demselben Passwort; bei wiederholten Fehlern prüfen Sie, ob das Backend erreichbar ist.",
  "auth.error.network":
    "Der Browser kann die Luxury-API nicht erreichen. 1) Starten Sie Spring Boot auf dem vom Proxy erwarteten Port (in dev: http://127.0.0.1:8081, siehe vite.config.ts → /api-Proxy). 2) Wenn Sie eine andere Domain als das Backend nutzen, setzen Sie VITE_API_BASE_URL passend zur Browser-Origin.",
  "auth.emailLink.invalidKicker": "E-Mail-Link",
  "auth.emailLink.invalidTitle": "Link nicht mehr gültig",
  "auth.emailLink.invalidLead":
    "Dieser Link ist ungültig oder abgelaufen. Gehen Sie zurück zur Registrierung und fordern Sie einen neuen Versand an.",
  "auth.emailLink.invalidAlready": "Wenn Sie ihn schon geöffnet haben, ist die E-Mail vielleicht schon bestätigt.",
  "auth.emailLink.invalidClose": "Sie können diesen Tab schließen",
  "auth.emailLink.resentKicker": "E-Mail gesendet",
  "auth.emailLink.resentTitle": "Postfach prüfen",
  "auth.emailLink.resentLead":
    "Wenn die Adresse zu einem Konto gehört, das auf Bestätigung wartet, erhalten Sie eine E-Mail mit dem Aktivierungslink.",
  "auth.emailLink.resentHint": "Prüfen Sie auch Spam und Werbung",
};

export const esAuthMessages: AuthMessageCatalog = {
  ...enAuthMessages,
  "auth.loading": "Iniciando sesión…",
  "auth.backAria": "Volver",
  "auth.showPassword": "Mostrar contraseña",
  "auth.hidePassword": "Ocultar contraseña",
  "auth.rememberCredentials": "Guardar credenciales",
  "auth.rememberEmail": "Recordar email",
  "auth.forgotPassword": "¿Olvidaste la contraseña?",
  "auth.submitting": "Iniciando sesión…",
  "auth.missingFields": "Introduce email y contraseña.",
  "auth.switchToSalonAccount": "Inicia sesión con la cuenta del salón para continuar…",
  "auth.panelNotice.eyebrow": "Acceso al panel",
  "auth.panelNotice.salonTitle": "Perfil del salón",
  "auth.panelNotice.salonBody": "Esta cuenta es el perfil del salón. Se abre en la otra dirección y esta página vuelve al inicio de búsqueda.",
  "auth.panelNotice.staffTitle": "Perfil de empleado",
  "auth.panelNotice.staffBody": "Esta cuenta es el perfil de empleado. Se abre en la otra dirección y esta página vuelve al inicio de búsqueda.",
  "auth.panelNotice.adminTitle": "Super admin",
  "auth.panelNotice.adminBody": "Esta cuenta es el super admin. Se abre en la otra dirección y esta página vuelve al inicio de búsqueda.",
  "auth.panelNotice.goProfile": "Ir a tu perfil",
  "auth.panelNotice.exit": "Salir",
  "auth.error.loginHelp":
    "Email o contraseña no reconocidos, o la cuenta aún no está activa. Si acabas de registrarte, inténtalo de nuevo con la misma contraseña; si el error persiste, comprueba que el backend sea accesible.",
  "auth.error.network":
    "El navegador no puede contactar con la API Luxury. 1) Inicia Spring Boot en el puerto esperado por el proxy (en dev: http://127.0.0.1:8081, ver vite.config.ts → proxy /api). 2) Si usas un dominio distinto al backend, configura VITE_API_BASE_URL acorde al origen del navegador.",
  "auth.emailLink.invalidKicker": "Enlace del email",
  "auth.emailLink.invalidTitle": "Enlace ya no válido",
  "auth.emailLink.invalidLead":
    "Este enlace no es válido o ha caducado. Vuelve a la página de registro y pide un nuevo envío.",
  "auth.emailLink.invalidAlready": "Si ya lo abriste, el email podría estar ya confirmado.",
  "auth.emailLink.invalidClose": "Puedes cerrar esta pestaña",
  "auth.emailLink.resentKicker": "Email enviado",
  "auth.emailLink.resentTitle": "Revisa la bandeja",
  "auth.emailLink.resentLead":
    "Si la dirección está asociada a una cuenta pendiente de confirmación, recibirás un email con el enlace de activación.",
  "auth.emailLink.resentHint": "Revisa también spam y promociones",
};

export const ptAuthMessages: AuthMessageCatalog = {
  ...enAuthMessages,
  "auth.loading": "A iniciar sessão…",
  "auth.backAria": "Voltar",
  "auth.showPassword": "Mostrar palavra-passe",
  "auth.hidePassword": "Ocultar palavra-passe",
  "auth.rememberCredentials": "Guardar credenciais",
  "auth.rememberEmail": "Lembrar email",
  "auth.forgotPassword": "Esqueceu a palavra-passe?",
  "auth.submitting": "A iniciar sessão…",
  "auth.missingFields": "Introduza email e palavra-passe.",
  "auth.switchToSalonAccount": "Inicie sessão com a conta do salão para continuar…",
  "auth.panelNotice.eyebrow": "Acesso ao painel",
  "auth.panelNotice.salonTitle": "Perfil do salão",
  "auth.panelNotice.salonBody": "Esta conta é o perfil do salão. Abre-se no outro endereço e esta página volta ao início da pesquisa.",
  "auth.panelNotice.staffTitle": "Perfil de colaborador",
  "auth.panelNotice.staffBody": "Esta conta é o perfil de colaborador. Abre-se no outro endereço e esta página volta ao início da pesquisa.",
  "auth.panelNotice.adminTitle": "Super admin",
  "auth.panelNotice.adminBody": "Esta conta é o super admin. Abre-se no outro endereço e esta página volta ao início da pesquisa.",
  "auth.panelNotice.goProfile": "Ir para o teu perfil",
  "auth.panelNotice.exit": "Sair",
  "auth.error.loginHelp":
    "Email ou palavra-passe não reconhecidos, ou conta ainda não ativa. Se acabou de se registar, tente novamente com a mesma palavra-passe; se o erro persistir, verifique se o backend está acessível.",
  "auth.error.network":
    "O browser não consegue contactar a API Luxury. 1) Inicie o Spring Boot na porta esperada pelo proxy (em dev: http://127.0.0.1:8081, ver vite.config.ts → proxy /api). 2) Se usar um domínio diferente do backend, defina VITE_API_BASE_URL de acordo com a origem do browser.",
  "auth.emailLink.invalidKicker": "Ligação do email",
  "auth.emailLink.invalidTitle": "Ligação já não válida",
  "auth.emailLink.invalidLead":
    "Esta ligação não é válida ou expirou. Volte à página de registo e peça um novo envio.",
  "auth.emailLink.invalidAlready": "Se já a abriu, o email pode já estar confirmado.",
  "auth.emailLink.invalidClose": "Pode fechar este separador",
  "auth.emailLink.resentKicker": "Email enviado",
  "auth.emailLink.resentTitle": "Veja a caixa de entrada",
  "auth.emailLink.resentLead":
    "Se o endereço estiver associado a uma conta à espera de confirmação, receberá um email com a ligação de ativação.",
  "auth.emailLink.resentHint": "Veja também o spam e as promoções",
};
