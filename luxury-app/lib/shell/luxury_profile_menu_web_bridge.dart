import '../session/luxury_salon_session.dart';
import 'luxury_profile_menu_item.dart';

/// Intercetta il tap su «Profilo» e apre il menu nativo Flutter (evita conflitti con React).
class LuxuryProfileMenuWebBridge {
  LuxuryProfileMenuWebBridge._();

  static const channelName = 'LuxuryProfileMenu';

  static List<LuxuryProfileMenuItem> itemsForSession(LuxurySalonSession session) {
    if (!session.isAuthenticated) return const [];

    if (session.isLuxurySuperAdmin) {
      return const [
        LuxuryProfileMenuItem(label: 'Gestione piattaforma', href: '/admin/dashboard'),
        LuxuryProfileMenuItem(label: 'Logout', logout: true),
      ];
    }

    if (session.isSalonOwner) {
      return _ownerItems();
    }

    if (session.isSalonStaff) {
      return const [
        LuxuryProfileMenuItem(label: 'La mia agenda', href: '/account/staff'),
        LuxuryProfileMenuItem(label: 'Profilo', href: '/account/profilo'),
        LuxuryProfileMenuItem(label: 'Recensioni', href: '/account/feedback-luxury'),
        LuxuryProfileMenuItem(label: 'Notifiche', href: '/account/notifiche'),
        LuxuryProfileMenuItem(label: 'Assistenza', href: '/account/assistenza'),
        LuxuryProfileMenuItem(label: 'Logout', logout: true),
      ];
    }

    return _consumerItems();
  }

  static List<LuxuryProfileMenuItem> _consumerItems() {
    return const [
      LuxuryProfileMenuItem(label: 'Informazioni', href: '/account/profilo'),
      LuxuryProfileMenuItem(label: 'Prenotazioni', href: '/account/prenotazioni'),
      LuxuryProfileMenuItem(label: 'Chat', href: '/account/chat'),
      LuxuryProfileMenuItem(label: 'Notifiche', href: '/account/notifiche'),
      LuxuryProfileMenuItem(label: 'Saloni di fiducia', href: '/account/saloni-di-fiducia'),
      LuxuryProfileMenuItem(label: 'Recensioni', href: '/recensione'),
      LuxuryProfileMenuItem(label: 'Logout', logout: true),
    ];
  }

  /// Nell'app mobile tutti usano il menu a tendina React (nessun bottom sheet Flutter).
  static bool usesNativeProfileSheet(LuxurySalonSession session) => false;

  static List<LuxuryProfileMenuItem> _ownerItems() {
    return const [
      LuxuryProfileMenuItem(label: 'Il mio salone', href: '/salone'),
      LuxuryProfileMenuItem(label: 'Agenda', href: '/account/prenotazioni'),
      LuxuryProfileMenuItem(label: 'Notifiche', href: '/account/notifiche'),
      LuxuryProfileMenuItem(label: 'Profilo', href: '/account/profilo'),
      LuxuryProfileMenuItem(label: 'Chat', href: '/account/chat'),
      LuxuryProfileMenuItem(label: 'Clienti', href: '/salone/clienti'),
      LuxuryProfileMenuItem(label: 'Staff', href: '/salone/staff'),
      LuxuryProfileMenuItem(label: 'Statistiche', href: '/salone/statistiche'),
      LuxuryProfileMenuItem(label: 'Assistenza', href: '/account/assistenza'),
      LuxuryProfileMenuItem(label: 'Logout', logout: true),
    ];
  }

  /// Rimuove il bridge titolare/staff e lascia il dropdown React per i clienti.
  static const enableConsumerWebDropdownScript = '''
(function() {
  try {
    document.documentElement.classList.add('luxury-native-app');
  } catch (e) {}
  var style = document.getElementById('luxury-app-profile-menu-native');
  if (style) style.remove();
  document.querySelectorAll('.luxury-app-owner-profile-trigger').forEach(function(btn) {
    if (btn.__luxuryOwnerProfileReplaced && btn.__luxuryOwnerProfileReplaced.parentNode) {
      btn.replaceWith(btn.__luxuryOwnerProfileReplaced);
      return;
    }
    btn.__luxuryNativeProfileBound = false;
    btn.classList.remove('luxury-app-owner-profile-trigger');
  });
  if (window.__luxuryAppProfileMenuObserver) {
    try { window.__luxuryAppProfileMenuObserver.disconnect(); } catch (e) {}
    window.__luxuryAppProfileMenuObserver = null;
  }
})();
''';

  static String installScript({required bool installOwnerTrigger}) {
    const channel = channelName;
    return '''
(function() {
  try {
    document.documentElement.classList.add('luxury-native-app');
  } catch (e) {}

  if (!window.__luxuryAppProfileMenuStyle) {
    window.__luxuryAppProfileMenuStyle = true;
    var style = document.createElement('style');
    style.id = 'luxury-app-profile-menu-native';
    style.textContent = `
      .luxury-app-owner-profile-trigger {
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
    `;
    document.head.appendChild(style);
  }

  function postOpen() {
    try {
      if (window.$channel && window.$channel.postMessage) {
        window.$channel.postMessage('open');
      }
    } catch (e) {}
  }

  function bindOpenMenu() {
    document.querySelectorAll('.luxury-app-owner-profile-trigger').forEach(function(btn) {
      if (btn.__luxuryNativeProfileBound) return;
      btn.__luxuryNativeProfileBound = true;
      var open = function(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
        postOpen();
      };
      btn.addEventListener('pointerdown', open, true);
      btn.addEventListener('click', open, true);
    });
  }

  function installOwnerTrigger() {
    if (document.querySelector('.luxury-app-owner-profile-trigger')) {
      bindOpenMenu();
      return;
    }
    var anchor =
      document.querySelector('.luxury-header-nav a[href="/salone"]') ||
      document.querySelector('.luxury-header-nav a[href^="/salone"]') ||
      document.querySelector('.luxury-header-nav a[href="/admin/dashboard"]') ||
      document.querySelector('.luxury-header-nav a.luxury-header-btn-primary[href]');
    if (!anchor) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'luxury-header-cta-pill luxury-header-profile-trigger luxury-app-owner-profile-trigger';
    btn.setAttribute('aria-haspopup', 'menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML =
      'Profilo<span aria-hidden class="luxury-header-profile-caret"> ▾</span>';
    btn.__luxuryOwnerProfileReplaced = anchor;
    anchor.replaceWith(btn);
    bindOpenMenu();
  }

  window.__luxuryAppProfileMenuSetup = function(ownerMode) {
    if (ownerMode) installOwnerTrigger();
    bindOpenMenu();
  };

  if (!window.__luxuryAppProfileMenuObserver) {
    window.__luxuryAppProfileMenuObserver = new MutationObserver(function() {
      bindOpenMenu();
    });
    var header = document.querySelector('.luxury-site-header');
    if (header) {
      window.__luxuryAppProfileMenuObserver.observe(header, { childList: true, subtree: true });
    }
  }

  window.__luxuryAppProfileMenuSetup(${installOwnerTrigger ? 'true' : 'false'});
  bindOpenMenu();
})();
''';
  }
}
