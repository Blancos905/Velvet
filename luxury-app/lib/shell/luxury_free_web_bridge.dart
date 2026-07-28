import 'luxury_free_theme_styles.dart';

/// Bridge JavaScript iniettato nella WebView — piano Free titolare (solo app mobile).
class LuxuryFreeWebBridge {
  LuxuryFreeWebBridge._();

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
  try { token = sessionStorage.getItem('luxury_access_token') || ''; } catch (e) {}
  var sessionPlanHint = '';
  try { sessionPlanHint = sessionStorage.getItem('luxury_intended_salon_plan') || ''; } catch (e) {}
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
  try { token = sessionStorage.getItem('luxury_access_token') || ''; } catch (e) {}
  var sessionPlanHint = '';
  try { sessionPlanHint = sessionStorage.getItem('luxury_intended_salon_plan') || ''; } catch (e) {}
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

  /// Attiva vincoli piano Free titolare (nav, paywall, servizi) — stesso tema visivo Premium.
  static String get applyFreeOwnerModeScript => '''
(function() {
  var root = document.documentElement;
  root.classList.add('luxury-native-app-free');
  var id = 'luxury-app-free-owner-functional';
  var existing = document.getElementById(id);
  if (existing) existing.remove();
  var style = document.createElement('style');
  style.id = id;
  style.textContent = ${_jsStringLiteral(luxuryAppFreeOwnerFunctionalCss)};
  document.head.appendChild(style);

  function luxuryAppSyncFreeOwnerUi() {
    if (typeof luxuryAppSetNativePath === 'function') luxuryAppSetNativePath();
    if (typeof window.luxuryAppFilterFreeNav === 'function') window.luxuryAppFilterFreeNav();
    if (typeof window.luxuryAppApplyFreeServizi === 'function') window.luxuryAppApplyFreeServizi();
    if (typeof window.luxuryAppSyncFreeOwnerNavActive === 'function') {
      window.luxuryAppSyncFreeOwnerNavActive();
    }
    if (typeof window.luxuryAppApplyFreeAgendaRestrictions === 'function') {
      window.luxuryAppApplyFreeAgendaRestrictions();
    }
    try {
      if (window.LuxuryProfileMenu && window.LuxuryProfileMenu.postMessage) {
        window.LuxuryProfileMenu.postMessage('sync');
      }
    } catch (e) {}
  }

  window.luxuryAppSyncFreeOwnerUi = luxuryAppSyncFreeOwnerUi;
  luxuryAppSyncFreeOwnerUi();

  if (!window.__luxuryAppFreeOwnerModeWatch) {
    window.__luxuryAppFreeOwnerModeWatch = true;
    var _push = history.pushState;
    var _replace = history.replaceState;
    history.pushState = function() {
      _push.apply(history, arguments);
      luxuryAppSyncFreeOwnerUi();
    };
    history.replaceState = function() {
      _replace.apply(history, arguments);
      luxuryAppSyncFreeOwnerUi();
    };
    window.addEventListener('popstate', luxuryAppSyncFreeOwnerUi);
  }
})();
''';

  static const removeFreeOwnerModeScript = '''
(function() {
  document.documentElement.classList.remove('luxury-native-app-free');
  document.documentElement.classList.remove('luxury-native-app-free-servizi');
  var style = document.getElementById('luxury-app-free-owner-functional');
  if (style) style.remove();
  var premiumLabel = document.getElementById('luxury-app-free-premium-nav-label');
  if (premiumLabel) premiumLabel.remove();
  var premiumNav = document.getElementById('luxury-app-free-premium-nav');
  if (premiumNav) premiumNav.remove();
  var rebuiltNav = document.getElementById('luxury-app-free-owner-nav-scroll');
  if (rebuiltNav) rebuiltNav.remove();
  var legacyHost = document.getElementById('luxury-app-free-owner-nav');
  if (legacyHost) legacyHost.remove();
  document.querySelectorAll('.luxury-account-hub__nav-scroll.luxury-app-free-nav-source-hidden').forEach(function(el) {
    el.classList.remove('luxury-app-free-nav-source-hidden');
  });
  document.querySelectorAll('[data-luxury-app-free-paywall-bound]').forEach(function(el) {
    el.removeAttribute('data-luxury-app-free-paywall-bound');
    el.classList.remove('luxury-app-free-premium-locked');
    el.classList.remove('luxury-app-free-nav-dupe-hidden');
    el.removeAttribute('data-luxury-app-free-feature');
  });
  document.querySelectorAll('a.luxury-app-free-hidden-nav').forEach(function(a) {
    a.classList.remove('luxury-app-free-hidden-nav');
    a.removeAttribute('aria-hidden');
  });
})();
''';

  /// Mostra pulsanti Premium e intercetta i click su funzioni bloccate (solo piano Free in app).
  static const filterNavigationScript = '''
window.luxuryAppShowFreePremiumPaywallMessage = function luxuryAppShowFreePremiumPaywallMessage(featureTitle) {
  var title = String(featureTitle || '').replace(/\\s+/g, ' ').trim();
  var payload = JSON.stringify({ feature: title });
  try {
    if (window.LuxuryPaywall && typeof window.LuxuryPaywall.postMessage === 'function') {
      window.LuxuryPaywall.postMessage(payload);
      return;
    }
  } catch (e) {}
  try {
    if (typeof LuxuryPaywall !== 'undefined' && typeof LuxuryPaywall.postMessage === 'function') {
      LuxuryPaywall.postMessage(payload);
    }
  } catch (e2) {}
};

window.luxuryAppFreeNavButtonTitle = function luxuryAppFreeNavButtonTitle(link) {
  var text = (link.innerText || link.textContent || '').replace(/\\s+/g, ' ').trim();
  text = text.replace(/\\s*\\d\\++\\s*\$/g, '').trim();
  return text || 'questa funzione';
};

window.luxuryAppBindFreePremiumPaywall = function luxuryAppBindFreePremiumPaywall(el, featureTitle) {
  if (!el) return;
  el.classList.add('luxury-app-free-premium-locked');
  if (featureTitle) {
    el.setAttribute('data-luxury-app-free-feature', featureTitle);
  } else {
    el.removeAttribute('data-luxury-app-free-feature');
  }
};

/** Navigazione SPA (React Router) — evita reload WebView che blocca l'hub Free. */
window.luxuryAppNavigateFreeOwnerSpa = function luxuryAppNavigateFreeOwnerSpa(href) {
  var target = String(href || '').trim();
  if (!target) return;
  var helper = window.__luxurySubscriptionGuards;
  if (helper) {
    target = helper.normalizePath(target);
    if (!helper.isNativeFreeOwnerPathAllowed(target)) return;
  }
  if (window.history && window.history.pushState) {
    window.history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
    try { window.scrollTo(0, 0); } catch (e) {}
    if (typeof window.luxuryAppSyncFreeOwnerUi === 'function') {
      window.luxuryAppSyncFreeOwnerUi();
    }
  } else {
    window.location.assign(target);
  }
};

if (!window.__luxuryAppFreeOwnerSpaNavDelegate) {
  window.__luxuryAppFreeOwnerSpaNavDelegate = true;
  document.addEventListener('click', function(e) {
    if (!document.documentElement.classList.contains('luxury-native-app-free')) return;
    var link = e.target && e.target.closest
      ? e.target.closest('#luxury-app-free-owner-nav-scroll a[data-luxury-app-free-nav-item="free"][href]')
      : null;
    if (!link) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    luxuryAppNavigateFreeOwnerSpa(link.getAttribute('href') || '');
    return false;
  }, true);
}

if (!window.__luxuryAppFreeNavPaywallDelegate) {
  window.__luxuryAppFreeNavPaywallDelegate = true;
  document.addEventListener('click', function(e) {
    if (!document.documentElement.classList.contains('luxury-native-app-free')) return;
    var target = e.target;
    var link = target && target.closest ? target.closest('a.luxury-app-free-premium-locked[href]') : null;
    if (!link) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    var customTitle = link.getAttribute('data-luxury-app-free-feature') || '';
    luxuryAppShowFreePremiumPaywallMessage(customTitle || luxuryAppFreeNavButtonTitle(link));
    return false;
  }, true);
}

window.luxuryAppRebuildFreeOwnerNav = function luxuryAppRebuildFreeOwnerNav() {
  if (!document.documentElement.classList.contains('luxury-native-app-free')) return;
  var nav = document.querySelector('.luxury-account-hub__nav');
  if (!nav) return;

  var items = [
    { href: '/account/salone/servizi', label: 'Aggiungi servizi', allowed: true },
    { href: '/account/prenotazioni', label: 'Agenda', allowed: true },
    { href: '/account/notifiche', label: 'Notifiche', allowed: true },
    { href: '/account/info-privacy', label: 'Info e privacy', allowed: true },
    { href: '/account/assistenza', label: 'Assistenza', allowed: true },
    { href: '/account/profilo', label: 'Profilo', allowed: true },
    { href: '/account/salone/tuo-salone', label: 'Crea il tuo sito', allowed: false },
    { href: '/account/salone/brand', label: 'Brand e vetrina', allowed: false },
    { href: '/account/salone/posizione', label: 'Posizione del salone', allowed: false },
    { href: '/account/salone/staff', label: 'Staff', allowed: false },
    { href: '/account/salone/statistiche', label: 'Statistiche', allowed: false, extra: 'luxury-account-hub__btn--salon-statistiche' },
    { href: '/account/salone/panoramica', label: 'Panoramica', allowed: true }
  ];

  Array.from(nav.children).forEach(function(el) {
    if (el.id === 'luxury-app-free-owner-nav-scroll') return;
    if (
      el.classList.contains('luxury-account-hub__nav-label') ||
      el.classList.contains('luxury-account-hub__nav-scroll') ||
      el.id === 'luxury-app-free-owner-nav'
    ) {
      el.classList.add('luxury-app-free-nav-source-hidden');
    }
  });

  var scroll = document.getElementById('luxury-app-free-owner-nav-scroll');
  if (!scroll) {
    scroll = document.createElement('div');
    scroll.id = 'luxury-app-free-owner-nav-scroll';
    scroll.className = 'luxury-account-hub__nav-scroll luxury-account-hub__nav-scroll--consumer-grid';
    scroll.setAttribute('aria-label', 'Menu account salone');
    nav.appendChild(scroll);
  }
  scroll.classList.remove('luxury-app-free-nav-source-hidden');
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
    luxuryAppSyncFreeOwnerNavActive();
    return;
  }

  scroll.innerHTML = '';
  items.forEach(function(item) {
    var a = document.createElement('a');
    a.className = 'luxury-account-hub__btn' + (item.extra ? ' ' + item.extra : '');
    a.href = item.href;
    a.setAttribute('data-router-link', 'true');
    a.setAttribute('data-luxury-app-free-nav-item', item.allowed ? 'free' : 'premium');
    a.textContent = item.label;
    if (!item.allowed) {
      luxuryAppBindFreePremiumPaywall(a, item.label);
    }
    scroll.appendChild(a);
  });

  luxuryAppSyncFreeOwnerNavActive();
};

window.luxuryAppSyncFreeOwnerNavActive = function luxuryAppSyncFreeOwnerNavActive() {
  var helper = window.__luxurySubscriptionGuards;
  if (!helper) return;
  var path = document.documentElement.getAttribute('data-luxury-path') || '';
  if (!path) {
    path = (window.location.pathname || '').replace(/\\/+\$/, '') || '/';
  }
  path = helper.normalizePath(path);
  document.querySelectorAll('#luxury-app-free-owner-nav-scroll a[href]').forEach(function(a) {
    var href = a.getAttribute('href') || '';
    var linkPath = helper.normalizePath(href);
    var active = false;
    if (linkPath === '/account/salone/panoramica') {
      active = path === '/account/salone/panoramica';
    } else if (linkPath === '/account/salone') {
      active = path === '/account/salone';
    } else if (linkPath === '/account/prenotazioni') {
      active = path === '/account/prenotazioni' || path.indexOf('/account/prenotazioni/') === 0;
    } else {
      active = path === linkPath || path.indexOf(linkPath + '/') === 0;
    }
    a.classList.toggle('luxury-account-hub__btn--active', active);
  });
};

window.luxuryAppInstallFreeNavObserver = function luxuryAppInstallFreeNavObserver() {
  if (window.__luxuryAppFreeNavObserver) return;
  window.__luxuryAppFreeNavObserver = true;
  var rebuilding = false;
  function scheduleRebuild() {
    if (rebuilding) return;
    window.clearTimeout(window.__luxuryAppFreeNavRebuildTimer);
    window.__luxuryAppFreeNavRebuildTimer = window.setTimeout(function() {
      rebuilding = true;
      try {
        if (typeof window.luxuryAppFilterFreeNav === 'function') {
          window.luxuryAppFilterFreeNav();
        }
      } finally {
        rebuilding = false;
      }
    }, 120);
  }
  function attach() {
    var nav = document.querySelector('.luxury-account-hub__nav');
    if (!nav || nav.__luxuryAppFreeNavObserving) return;
    nav.__luxuryAppFreeNavObserving = true;
    new MutationObserver(scheduleRebuild).observe(nav, { childList: true, subtree: true });
  }
  attach();
  window.setInterval(attach, 2000);
};
window.luxuryAppInstallFreeNavObserver();

window.luxuryAppInjectFreeOwnerPremiumNav = luxuryAppRebuildFreeOwnerNav;

window.luxuryAppAlignFreeNavWithPremium = function luxuryAppAlignFreeNavWithPremium() {};

window.luxuryAppFilterFreeNav = function luxuryAppFilterFreeNav() {
  if (!document.documentElement.classList.contains('luxury-native-app-free')) return;
  var guards = window.__LUXURY_SUBSCRIPTION_GUARDS__;
  var helper = window.__luxurySubscriptionGuards;
  if (!guards || !helper) {
    window.clearTimeout(window.__luxuryAppFreeNavRetryTimer);
    window.__luxuryAppFreeNavRetryTimer = window.setTimeout(luxuryAppFilterFreeNav, 400);
    return;
  }

  luxuryAppInjectFreeOwnerPremiumNav();
  luxuryAppAlignFreeNavWithPremium();

  document.querySelectorAll('#luxury-app-free-owner-nav-scroll a[data-luxury-app-free-nav-item="free"]').forEach(function(a) {
    a.classList.remove('luxury-app-free-premium-locked');
    a.removeAttribute('data-luxury-app-free-feature');
  });
};
window.luxuryAppFilterFreeNav();
''';

  /// Agenda Free: blocca link «Gestione staff» dentro la pagina prenotazioni.
  static const applyFreeAgendaRestrictionsScript = '''
window.luxuryAppApplyFreeAgendaRestrictions = function luxuryAppApplyFreeAgendaRestrictions() {
  if (!document.documentElement.classList.contains('luxury-native-app-free')) return;
  var path = window.location.pathname || '';
  if (path.indexOf('/account/prenotazioni') !== 0) return;
  document.querySelectorAll('a[href*="/account/salone/staff"]').forEach(function(a) {
    luxuryAppBindFreePremiumPaywall(a, 'Gestione staff');
  });
};
window.luxuryAppApplyFreeAgendaRestrictions();
''';

  /// Pagina servizi: niente upload foto (solo piano Free in app).
  static const applyFreeServiziNoPhotoScript = '''
window.luxuryAppApplyFreeServizi = function luxuryAppApplyFreeServizi() {
  if (!document.documentElement.classList.contains('luxury-native-app-free')) return;
  var path = window.location.pathname || '';
  var onServizi = path.indexOf('/account/salone/servizi') === 0;
  document.documentElement.classList.toggle('luxury-native-app-free-servizi', onServizi);
  if (!onServizi) return;
  document.querySelectorAll('input.luxury-salon-services-hidden-file').forEach(function(input) {
    input.disabled = true;
    input.setAttribute('aria-hidden', 'true');
  });
};
window.luxuryAppApplyFreeServizi();
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
