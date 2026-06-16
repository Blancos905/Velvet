import 'velvet_free_theme_styles.dart';

/// Bridge JavaScript iniettato nella WebView — piano Free titolare (solo app mobile).
class VelvetFreeWebBridge {
  VelvetFreeWebBridge._();

  /// Lettura immediata JWT/sessionStorage (senza fetch).
  static const readSessionJsonSyncScript = '''
(function() {
  function b64urlDecode(seg) {
    var b64 = seg.replace(/-/g, '+').replace(/_/g, '/');
    var pad = b64.length % 4;
    if (pad === 2) b64 += '==';
    else if (pad === 3) b64 += '=';
    else if (pad === 1) return null;
    return JSON.parse(atob(b64));
  }
  function rolesFromPayload(p) {
    if (!p) return [];
    if (Array.isArray(p.roles)) {
      return p.roles.map(function(r) { return String(r).trim().toUpperCase(); });
    }
    if (p.realm_access && Array.isArray(p.realm_access.roles)) {
      return p.realm_access.roles.map(function(r) { return String(r).trim().toUpperCase(); });
    }
    return [];
  }
  var token = '';
  try { token = sessionStorage.getItem('velvet_access_token') || ''; } catch (e) {}
  var sessionPlanHint = '';
  try { sessionPlanHint = sessionStorage.getItem('velvet_intended_salon_plan') || ''; } catch (e) {}
  var jwtPlanHint = null;
  var roles = [];
  if (token && token.indexOf('.') > 0) {
    try {
      var payload = b64urlDecode(token.split('.')[1]);
      roles = rolesFromPayload(payload);
      jwtPlanHint = payload.plan || payload.organization_plan || null;
    } catch (e) {}
  }
  return JSON.stringify({
    hasToken: !!token,
    roles: roles,
    jwtPlanHint: jwtPlanHint,
    sessionPlanHint: sessionPlanHint,
    apiProvisioned: false,
    apiPlanTier: null
  });
})();
''';

  /// JWT + piano da API (Promise — preferito dopo login titolare).
  static const readSessionJsonScript = '''
(function() {
  function b64urlDecode(seg) {
    var b64 = seg.replace(/-/g, '+').replace(/_/g, '/');
    var pad = b64.length % 4;
    if (pad === 2) b64 += '==';
    else if (pad === 3) b64 += '=';
    else if (pad === 1) return null;
    return JSON.parse(atob(b64));
  }
  function rolesFromPayload(p) {
    if (!p) return [];
    if (Array.isArray(p.roles)) {
      return p.roles.map(function(r) { return String(r).trim().toUpperCase(); });
    }
    if (p.realm_access && Array.isArray(p.realm_access.roles)) {
      return p.realm_access.roles.map(function(r) { return String(r).trim().toUpperCase(); });
    }
    return [];
  }
  var token = '';
  try { token = sessionStorage.getItem('velvet_access_token') || ''; } catch (e) {}
  var sessionPlanHint = '';
  try { sessionPlanHint = sessionStorage.getItem('velvet_intended_salon_plan') || ''; } catch (e) {}
  var jwtPlanHint = null;
  var roles = [];
  if (token && token.indexOf('.') > 0) {
    try {
      var payload = b64urlDecode(token.split('.')[1]);
      roles = rolesFromPayload(payload);
      jwtPlanHint = payload.plan || payload.organization_plan || null;
    } catch (e) {}
  }
  var isOwner = roles.indexOf('OWNER') >= 0;
  var out = {
    hasToken: !!token,
    roles: roles,
    jwtPlanHint: jwtPlanHint,
    sessionPlanHint: sessionPlanHint,
    apiProvisioned: false,
    apiPlanTier: null
  };
  if (!isOwner || !token) {
    return JSON.stringify(out);
  }
  return fetch('/api/v1/me/salon', {
    headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' }
  })
  .then(function(res) {
    if (!res.ok) return out;
    return res.json().then(function(body) {
      if (body && body.provisioned && body.planTier) {
        out.apiProvisioned = true;
        out.apiPlanTier = body.planTier;
      }
      return out;
    });
  })
  .catch(function() { return out; })
  .then(function(final) { return JSON.stringify(final); });
})();
''';

  /// Marca piano Free, inietta tema blu su `/account` e aggiorna nav/servizi.
  static String get applyFreeVisualThemeScript => '''
(function() {
  var root = document.documentElement;
  root.classList.add('velvet-native-app-free');
  var id = 'velvet-app-free-theme';
  var existing = document.getElementById(id);
  if (existing) existing.remove();
  var style = document.createElement('style');
  style.id = id;
  style.textContent = ${_jsStringLiteral(velvetAppFreeThemeCss)};
  document.head.appendChild(style);

  function velvetAppIsAccountProfilePath(path) {
    return path === '/account' || path.indexOf('/account/') === 0;
  }

  function velvetAppSyncFreeOwnerUi() {
    if (typeof velvetAppSetNativePath === 'function') velvetAppSetNativePath();
    var path = document.documentElement.getAttribute('data-velvet-path') || '';
    if (!path) {
      path = (window.location.pathname || '').replace(/\\/+\$/, '') || '/';
    }
    var onAccount = document.documentElement.classList.contains('velvet-native-app-free') &&
      velvetAppIsAccountProfilePath(path);
    document.documentElement.classList.toggle('velvet-native-app-free-profile', onAccount);
    if (typeof window.velvetAppFilterFreeNav === 'function') window.velvetAppFilterFreeNav();
    if (typeof window.velvetAppApplyFreeServizi === 'function') window.velvetAppApplyFreeServizi();
    if (typeof window.velvetAppSyncFreeOwnerNavActive === 'function') {
      window.velvetAppSyncFreeOwnerNavActive();
    }
    if (typeof window.velvetAppApplyFreeAgendaRestrictions === 'function') {
      window.velvetAppApplyFreeAgendaRestrictions();
    }
    try {
      if (window.VelvetProfileMenu && window.VelvetProfileMenu.postMessage) {
        window.VelvetProfileMenu.postMessage('sync');
      }
    } catch (e) {}
  }

  window.velvetAppSyncFreeOwnerUi = velvetAppSyncFreeOwnerUi;
  velvetAppSyncFreeOwnerUi();

  if (!window.__velvetAppFreeThemeWatch) {
    window.__velvetAppFreeThemeWatch = true;
    var _push = history.pushState;
    var _replace = history.replaceState;
    history.pushState = function() {
      _push.apply(history, arguments);
      velvetAppSyncFreeOwnerUi();
    };
    history.replaceState = function() {
      _replace.apply(history, arguments);
      velvetAppSyncFreeOwnerUi();
    };
    window.addEventListener('popstate', velvetAppSyncFreeOwnerUi);
  }
})();
''';

  static const removeFreeVisualThemeScript = '''
(function() {
  document.documentElement.classList.remove('velvet-native-app-free');
  document.documentElement.classList.remove('velvet-native-app-free-profile');
  document.documentElement.classList.remove('velvet-native-app-free-servizi');
  var style = document.getElementById('velvet-app-free-theme');
  if (style) style.remove();
  var premiumLabel = document.getElementById('velvet-app-free-premium-nav-label');
  if (premiumLabel) premiumLabel.remove();
  var premiumNav = document.getElementById('velvet-app-free-premium-nav');
  if (premiumNav) premiumNav.remove();
  var rebuiltNav = document.getElementById('velvet-app-free-owner-nav-scroll');
  if (rebuiltNav) rebuiltNav.remove();
  var legacyHost = document.getElementById('velvet-app-free-owner-nav');
  if (legacyHost) legacyHost.remove();
  document.querySelectorAll('.velvet-account-hub__nav-scroll.velvet-app-free-nav-source-hidden').forEach(function(el) {
    el.classList.remove('velvet-app-free-nav-source-hidden');
  });
  document.querySelectorAll('[data-velvet-app-free-paywall-bound]').forEach(function(el) {
    el.removeAttribute('data-velvet-app-free-paywall-bound');
    el.classList.remove('velvet-app-free-premium-locked');
    el.classList.remove('velvet-app-free-nav-dupe-hidden');
    el.removeAttribute('data-velvet-app-free-feature');
  });
  document.querySelectorAll('a.velvet-app-free-hidden-nav').forEach(function(a) {
    a.classList.remove('velvet-app-free-hidden-nav');
    a.removeAttribute('aria-hidden');
  });
})();
''';

  /// Mostra pulsanti Premium e intercetta i click su funzioni bloccate (solo piano Free in app).
  static const filterNavigationScript = '''
window.velvetAppShowFreePremiumPaywallMessage = function velvetAppShowFreePremiumPaywallMessage(featureTitle) {
  var title = String(featureTitle || '').replace(/\\s+/g, ' ').trim();
  var payload = JSON.stringify({ feature: title });
  try {
    if (window.VelvetPaywall && typeof window.VelvetPaywall.postMessage === 'function') {
      window.VelvetPaywall.postMessage(payload);
      return;
    }
  } catch (e) {}
  try {
    if (typeof VelvetPaywall !== 'undefined' && typeof VelvetPaywall.postMessage === 'function') {
      VelvetPaywall.postMessage(payload);
    }
  } catch (e2) {}
};

window.velvetAppFreeNavButtonTitle = function velvetAppFreeNavButtonTitle(link) {
  var text = (link.innerText || link.textContent || '').replace(/\\s+/g, ' ').trim();
  text = text.replace(/\\s*\\d\\++\\s*\$/g, '').trim();
  return text || 'questa funzione';
};

window.velvetAppBindFreePremiumPaywall = function velvetAppBindFreePremiumPaywall(el, featureTitle) {
  if (!el) return;
  el.classList.add('velvet-app-free-premium-locked');
  if (featureTitle) {
    el.setAttribute('data-velvet-app-free-feature', featureTitle);
  } else {
    el.removeAttribute('data-velvet-app-free-feature');
  }
};

if (!window.__velvetAppFreeNavPaywallDelegate) {
  window.__velvetAppFreeNavPaywallDelegate = true;
  document.addEventListener('click', function(e) {
    if (!document.documentElement.classList.contains('velvet-native-app-free')) return;
    var target = e.target;
    var link = target && target.closest ? target.closest('a.velvet-app-free-premium-locked[href]') : null;
    if (!link) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    var customTitle = link.getAttribute('data-velvet-app-free-feature') || '';
    velvetAppShowFreePremiumPaywallMessage(customTitle || velvetAppFreeNavButtonTitle(link));
    return false;
  }, true);
}

window.velvetAppRebuildFreeOwnerNav = function velvetAppRebuildFreeOwnerNav() {
  if (!document.documentElement.classList.contains('velvet-native-app-free')) return;
  var nav = document.querySelector('.velvet-account-hub__nav');
  if (!nav) return;

  var items = [
    { href: '/account/salone/servizi', label: 'Aggiungi servizi', allowed: true },
    { href: '/account/prenotazioni', label: 'Agenda', allowed: true },
    { href: '/account/assistenza', label: 'Assistenza', allowed: true },
    { href: '/account/info-privacy', label: 'Info e privacy', allowed: true },
    { href: '/account/profilo', label: 'Profilo', allowed: true },
    { href: '/account/salone/tuo-salone', label: 'Crea il tuo sito', allowed: false },
    { href: '/account/salone/brand', label: 'Brand e vetrina', allowed: false },
    { href: '/account/salone/posizione', label: 'Posizione del salone', allowed: false },
    { href: '/account/salone/staff', label: 'Staff', allowed: false },
    { href: '/account/salone/statistiche', label: 'Statistiche', allowed: false, extra: 'velvet-account-hub__btn--salon-statistiche' },
    { href: '/account/salone', label: 'Panoramica', allowed: false }
  ];

  Array.from(nav.children).forEach(function(el) {
    if (el.id === 'velvet-app-free-owner-nav-scroll') return;
    if (
      el.classList.contains('velvet-account-hub__nav-label') ||
      el.classList.contains('velvet-account-hub__nav-scroll') ||
      el.id === 'velvet-app-free-owner-nav'
    ) {
      el.classList.add('velvet-app-free-nav-source-hidden');
    }
  });

  var scroll = document.getElementById('velvet-app-free-owner-nav-scroll');
  if (!scroll) {
    scroll = document.createElement('div');
    scroll.id = 'velvet-app-free-owner-nav-scroll';
    scroll.className = 'velvet-account-hub__nav-scroll velvet-account-hub__nav-scroll--consumer-grid';
    scroll.setAttribute('aria-label', 'Menu account salone');
    nav.appendChild(scroll);
  }
  scroll.classList.remove('velvet-app-free-nav-source-hidden');
  scroll.style.display = 'grid';
  scroll.style.visibility = 'visible';

  var existing = scroll.querySelectorAll('a[href]');
  var needsRebuild = existing.length !== items.length;
  if (!needsRebuild) {
    for (var i = 0; i < items.length; i++) {
      var link = existing[i];
      if (!link) { needsRebuild = true; break; }
      if ((link.getAttribute('href') || '') !== items[i].href) { needsRebuild = true; break; }
      if ((link.textContent || '').replace(/\\s+/g, ' ').trim() !== items[i].label) { needsRebuild = true; break; }
    }
  }

  if (!needsRebuild) {
    velvetAppSyncFreeOwnerNavActive();
    return;
  }

  scroll.innerHTML = '';
  items.forEach(function(item) {
    var a = document.createElement('a');
    a.className = 'velvet-account-hub__btn' + (item.extra ? ' ' + item.extra : '');
    a.href = item.href;
    a.setAttribute('data-router-link', 'true');
    a.setAttribute('data-velvet-app-free-nav-item', item.allowed ? 'free' : 'premium');
    a.textContent = item.label;
    a.style.color = '#0a1628';
    a.style.webkitTextFillColor = '#0a1628';
    a.style.visibility = 'visible';
    if (!item.allowed) {
      velvetAppBindFreePremiumPaywall(a, item.label);
    }
    scroll.appendChild(a);
  });

  velvetAppSyncFreeOwnerNavActive();
};

window.velvetAppSyncFreeOwnerNavActive = function velvetAppSyncFreeOwnerNavActive() {
  var helper = window.__velvetSubscriptionGuards;
  if (!helper) return;
  var path = document.documentElement.getAttribute('data-velvet-path') || '';
  if (!path) {
    path = (window.location.pathname || '').replace(/\\/+\$/, '') || '/';
  }
  path = helper.normalizePath(path);
  document.querySelectorAll('#velvet-app-free-owner-nav-scroll a[href]').forEach(function(a) {
    var href = a.getAttribute('href') || '';
    var linkPath = helper.normalizePath(href);
    var active = false;
    if (linkPath === '/account/salone') {
      active = path === '/account/salone';
    } else if (linkPath === '/account/prenotazioni') {
      active = path === '/account/prenotazioni' || path.indexOf('/account/prenotazioni/') === 0;
    } else {
      active = path === linkPath || path.indexOf(linkPath + '/') === 0;
    }
    a.classList.toggle('velvet-account-hub__btn--active', active);
  });
};

window.velvetAppInstallFreeNavObserver = function velvetAppInstallFreeNavObserver() {
  if (window.__velvetAppFreeNavObserver) return;
  window.__velvetAppFreeNavObserver = true;
  var rebuilding = false;
  function scheduleRebuild() {
    if (rebuilding) return;
    window.clearTimeout(window.__velvetAppFreeNavRebuildTimer);
    window.__velvetAppFreeNavRebuildTimer = window.setTimeout(function() {
      rebuilding = true;
      try {
        if (typeof window.velvetAppFilterFreeNav === 'function') {
          window.velvetAppFilterFreeNav();
        }
      } finally {
        rebuilding = false;
      }
    }, 120);
  }
  function attach() {
    var nav = document.querySelector('.velvet-account-hub__nav');
    if (!nav || nav.__velvetAppFreeNavObserving) return;
    nav.__velvetAppFreeNavObserving = true;
    new MutationObserver(scheduleRebuild).observe(nav, { childList: true, subtree: true });
  }
  attach();
  window.setInterval(attach, 2000);
};
window.velvetAppInstallFreeNavObserver();

window.velvetAppInjectFreeOwnerPremiumNav = velvetAppRebuildFreeOwnerNav;

window.velvetAppAlignFreeNavWithPremium = function velvetAppAlignFreeNavWithPremium() {};

window.velvetAppFilterFreeNav = function velvetAppFilterFreeNav() {
  if (!document.documentElement.classList.contains('velvet-native-app-free')) return;
  var guards = window.__VELVET_SUBSCRIPTION_GUARDS__;
  var helper = window.__velvetSubscriptionGuards;
  if (!guards || !helper) {
    window.clearTimeout(window.__velvetAppFreeNavRetryTimer);
    window.__velvetAppFreeNavRetryTimer = window.setTimeout(velvetAppFilterFreeNav, 400);
    return;
  }

  velvetAppInjectFreeOwnerPremiumNav();
  velvetAppAlignFreeNavWithPremium();

  document.querySelectorAll('#velvet-app-free-owner-nav-scroll a[data-velvet-app-free-nav-item="free"]').forEach(function(a) {
    a.classList.remove('velvet-app-free-premium-locked');
    a.removeAttribute('data-velvet-app-free-feature');
  });
};
window.velvetAppFilterFreeNav();
''';

  /// Agenda Free: blocca link «Gestione staff» dentro la pagina prenotazioni.
  static const applyFreeAgendaRestrictionsScript = '''
window.velvetAppApplyFreeAgendaRestrictions = function velvetAppApplyFreeAgendaRestrictions() {
  if (!document.documentElement.classList.contains('velvet-native-app-free')) return;
  var path = window.location.pathname || '';
  if (path.indexOf('/account/prenotazioni') !== 0) return;
  document.querySelectorAll('a[href*="/account/salone/staff"]').forEach(function(a) {
    velvetAppBindFreePremiumPaywall(a, 'Gestione staff');
  });
};
window.velvetAppApplyFreeAgendaRestrictions();
''';

  /// Pagina servizi: niente upload foto (solo piano Free in app).
  static const applyFreeServiziNoPhotoScript = '''
window.velvetAppApplyFreeServizi = function velvetAppApplyFreeServizi() {
  if (!document.documentElement.classList.contains('velvet-native-app-free')) return;
  var path = window.location.pathname || '';
  var onServizi = path.indexOf('/account/salone/servizi') === 0;
  document.documentElement.classList.toggle('velvet-native-app-free-servizi', onServizi);
  if (!onServizi) return;
  document.querySelectorAll('input.velvet-salon-services-hidden-file').forEach(function(input) {
    input.disabled = true;
    input.setAttribute('aria-hidden', 'true');
  });
};
window.velvetAppApplyFreeServizi();
''';

  static String _jsStringLiteral(String css) {
    final escaped = css
        .replaceAll(r'\', r'\\')
        .replaceAll("'", r"\'")
        .replaceAll('\n', r'\n')
        .replaceAll('\r', '');
    return "'$escaped'";
  }
}
