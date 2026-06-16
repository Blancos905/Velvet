import '../session/velvet_salon_session.dart';
import 'velvet_profile_menu_item.dart';

/// Intercetta il tap su «Profilo» e apre il menu nativo Flutter (evita conflitti con React).
class VelvetProfileMenuWebBridge {
  VelvetProfileMenuWebBridge._();

  static const channelName = 'VelvetProfileMenu';

  static List<VelvetProfileMenuItem> itemsForSession(VelvetSalonSession session) {
    if (!session.isAuthenticated) return const [];

    if (session.isVelvetSuperAdmin) {
      return const [
        VelvetProfileMenuItem(label: 'Gestione piattaforma', href: '/admin/dashboard'),
        VelvetProfileMenuItem(label: 'Logout', logout: true),
      ];
    }

    if (session.isSalonOwner) {
      return _ownerItems(session.isFreeSalonOwner);
    }

    if (session.isSalonStaff) {
      return const [
        VelvetProfileMenuItem(label: 'La mia agenda', href: '/account/prenotazioni'),
        VelvetProfileMenuItem(label: 'Profilo', href: '/account/profilo'),
        VelvetProfileMenuItem(label: 'Notifiche', href: '/account/notifiche'),
        VelvetProfileMenuItem(label: 'Assistenza', href: '/account/assistenza'),
        VelvetProfileMenuItem(label: 'Logout', logout: true),
      ];
    }

    return _consumerItems();
  }

  static List<VelvetProfileMenuItem> _consumerItems() {
    return const [
      VelvetProfileMenuItem(label: 'Informazioni', href: '/account/profilo'),
      VelvetProfileMenuItem(label: 'Prenotazioni', href: '/account/prenotazioni'),
      VelvetProfileMenuItem(label: 'Chat', href: '/account/chat'),
      VelvetProfileMenuItem(label: 'Notifiche', href: '/account/notifiche'),
      VelvetProfileMenuItem(label: 'Saloni di fiducia', href: '/account/saloni-di-fiducia'),
      VelvetProfileMenuItem(label: 'Recensioni', href: '/recensione'),
      VelvetProfileMenuItem(label: 'Logout', logout: true),
    ];
  }

  /// Nell'app mobile tutti usano il menu a tendina React (nessun bottom sheet Flutter).
  static bool usesNativeProfileSheet(VelvetSalonSession session) => false;

  static List<VelvetProfileMenuItem> _ownerItems(bool isFree) {
    if (isFree) {
      return const [
        VelvetProfileMenuItem(label: 'Agenda', href: '/account/prenotazioni'),
        VelvetProfileMenuItem(label: 'Notifiche', href: '/account/notifiche'),
        VelvetProfileMenuItem(label: 'Profilo', href: '/account/profilo'),
        VelvetProfileMenuItem(label: 'Info e privacy', href: '/account/info-privacy'),
        VelvetProfileMenuItem(label: 'Assistenza', href: '/account/assistenza'),
        VelvetProfileMenuItem(label: 'Logout', logout: true),
      ];
    }
    return const [
      VelvetProfileMenuItem(label: 'Il mio salone', href: '/account/salone'),
      VelvetProfileMenuItem(label: 'Agenda', href: '/account/prenotazioni'),
      VelvetProfileMenuItem(label: 'Notifiche', href: '/account/notifiche'),
      VelvetProfileMenuItem(label: 'Profilo', href: '/account/profilo'),
      VelvetProfileMenuItem(label: 'Chat', href: '/account/chat'),
      VelvetProfileMenuItem(label: 'Clienti', href: '/account/salone/clienti'),
      VelvetProfileMenuItem(label: 'Staff', href: '/account/salone/staff'),
      VelvetProfileMenuItem(label: 'Statistiche', href: '/account/salone/statistiche'),
      VelvetProfileMenuItem(label: 'Assistenza', href: '/account/assistenza'),
      VelvetProfileMenuItem(label: 'Logout', logout: true),
    ];
  }

  /// Rimuove il bridge titolare/staff e lascia il dropdown React per i clienti.
  static const enableConsumerWebDropdownScript = '''
(function() {
  try {
    document.documentElement.classList.add('velvet-native-app');
  } catch (e) {}
  var style = document.getElementById('velvet-app-profile-menu-native');
  if (style) style.remove();
  document.querySelectorAll('.velvet-app-owner-profile-trigger').forEach(function(btn) {
    if (btn.__velvetOwnerProfileReplaced && btn.__velvetOwnerProfileReplaced.parentNode) {
      btn.replaceWith(btn.__velvetOwnerProfileReplaced);
      return;
    }
    btn.__velvetNativeProfileBound = false;
    btn.classList.remove('velvet-app-owner-profile-trigger');
  });
  if (window.__velvetAppProfileMenuObserver) {
    try { window.__velvetAppProfileMenuObserver.disconnect(); } catch (e) {}
    window.__velvetAppProfileMenuObserver = null;
  }
})();
''';

  static String installScript({required bool installOwnerTrigger}) {
    const channel = channelName;
    return '''
(function() {
  try {
    document.documentElement.classList.add('velvet-native-app');
  } catch (e) {}

  if (!window.__velvetAppProfileMenuStyle) {
    window.__velvetAppProfileMenuStyle = true;
    var style = document.createElement('style');
    style.id = 'velvet-app-profile-menu-native';
    style.textContent = `
      .velvet-app-owner-profile-trigger {
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
    document.querySelectorAll('.velvet-app-owner-profile-trigger').forEach(function(btn) {
      if (btn.__velvetNativeProfileBound) return;
      btn.__velvetNativeProfileBound = true;
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
    if (document.querySelector('.velvet-app-owner-profile-trigger')) {
      bindOpenMenu();
      return;
    }
    var anchor =
      document.querySelector('.velvet-header-nav a[href="/account/salone"]') ||
      document.querySelector('.velvet-header-nav a[href^="/account/salone"]') ||
      document.querySelector('.velvet-header-nav a[href="/admin/dashboard"]') ||
      document.querySelector('.velvet-header-nav a.velvet-header-btn-primary[href]');
    if (!anchor) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'velvet-header-cta-pill velvet-header-profile-trigger velvet-app-owner-profile-trigger';
    btn.setAttribute('aria-haspopup', 'menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML =
      'Profilo<span aria-hidden class="velvet-header-profile-caret"> ▾</span>';
    btn.__velvetOwnerProfileReplaced = anchor;
    anchor.replaceWith(btn);
    bindOpenMenu();
  }

  window.__velvetAppProfileMenuSetup = function(ownerMode) {
    if (ownerMode) installOwnerTrigger();
    bindOpenMenu();
  };

  if (!window.__velvetAppProfileMenuObserver) {
    window.__velvetAppProfileMenuObserver = new MutationObserver(function() {
      bindOpenMenu();
    });
    var header = document.querySelector('.velvet-site-header');
    if (header) {
      window.__velvetAppProfileMenuObserver.observe(header, { childList: true, subtree: true });
    }
  }

  window.__velvetAppProfileMenuSetup(${installOwnerTrigger ? 'true' : 'false'});
  bindOpenMenu();
})();
''';
  }
}
