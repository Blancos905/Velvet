/// UI web da nascondere o adattare solo nell'app mobile (WebView).
class VelvetNativeAppWebBridge {
  VelvetNativeAppWebBridge._();

  /// Nasconde blocchi non necessari in app (legal nav, checklist panoramica Premium).
  static const installScript = '''
(function() {
  try {
    document.documentElement.classList.add('luxury-native-app');
    var vp = document.querySelector('meta[name="viewport"]');
    if (vp) {
      vp.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, viewport-fit=cover'
      );
    }
  } catch (e) {}
  if (window.__velvetAppNativeUiStyle) return;
  window.__velvetAppNativeUiStyle = true;
  var style = document.createElement('style');
  style.id = 'luxury-app-native-ui';
  style.textContent = `
    .luxury-legal-public__nav {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      pointer-events: none !important;
    }
    .salon-premium-panorama,
    .salon-premium-panorama section[aria-label="Checklist attivazione salone"],
    .salon-premium-panorama__progress-track,
    .salon-premium-panorama__step-wrap,
    .salon-premium-panorama__toast {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      pointer-events: none !important;
    }

    /* /account/salone — niente hero duplicato (masthead hub già visibile); piano Free resta visibile */
    html.luxury-native-app[data-luxury-path="/account/salone"] .luxury-account-page-shell--salon-panorama {
      display: none !important;
    }

    /* /piani — card Free: WebView iOS a volte azzera il gradiente del <button> */
    .luxury-plan-card[data-tier="BASE"] .luxury-plan-cta {
      -webkit-appearance: none;
      appearance: none;
      color: #0a0a0a !important;
      background-color: #fb923c !important;
      background-image: linear-gradient(180deg, #fdba74, #fb923c) !important;
      border: 1px solid rgba(0, 0, 0, 0.65) !important;
      box-shadow:
        0 2px 0 rgba(0, 0, 0, 0.35),
        0 8px 24px rgba(243, 112, 33, 0.35) !important;
    }
    .luxury-plan-card[data-tier="BASE"] .luxury-plan-cta .luxury-plan-card__cta-lead,
    .luxury-plan-card[data-tier="BASE"] .luxury-plan-cta .luxury-plan-card__cta-mid,
    .luxury-plan-card[data-tier="BASE"] .luxury-plan-cta .luxury-plan-card__cta-plan {
      color: #0a0a0a !important;
    }
    .luxury-plan-card[data-tier="BASE"] .luxury-plan-card__cta-plan {
      background: rgba(0, 0, 0, 0.14) !important;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.22),
        0 1px 2px rgba(0, 0, 0, 0.2) !important;
      text-shadow: 0 1px 0 rgba(255, 255, 255, 0.28) !important;
    }

  `;
  (document.head || document.documentElement).appendChild(style);

  function velvetAppSetNativePath() {
    try {
      var p = (window.location.pathname || '').replace(/\\/+\$/, '') || '/';
      document.documentElement.setAttribute('data-luxury-path', p);
    } catch (e) {}
  }

  function velvetAppScrollToTop() {
    try {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch (e) {}
  }

  var velvetAppLastPathname = (window.location.pathname || '/');

  function velvetAppApplyPanoramaAccountPage() {
    if (!document.documentElement.classList.contains('luxury-native-app')) return;
    velvetAppSetNativePath();
    var path = document.documentElement.getAttribute('data-luxury-path') || '';
    if (path !== '/account/salone') {
      var old = document.getElementById('luxury-app-native-panorama-shortcuts');
      if (old) old.remove();
      return;
    }

    if (document.documentElement.classList.contains('luxury-native-app-free')) {
      var freeOld = document.getElementById('luxury-app-native-panorama-shortcuts');
      if (freeOld) freeOld.remove();
      return;
    }

    var overlayTitle = document.querySelector('.luxury-native-account-overlay__title');
    if (overlayTitle) overlayTitle.textContent = 'Panoramica';

    if (document.getElementById('luxury-app-native-panorama-shortcuts')) return;

    var links = [
      { to: '/account/salone/tuo-salone', title: 'Crea il tuo sito', desc: 'Testi, gallery e pagina pubblica del salone.' },
      { to: '/account/salone/brand', title: 'Brand e vetrina', desc: 'Logo, carousel e layout dal catalogo.' },
      { to: '/account/salone/posizione', title: 'Posizione del salone', desc: 'Indirizzo e visibilità in ricerca.' },
      { to: '/account/salone/staff', title: 'Staff', desc: 'Operatori e link alle agende.' },
      { to: '/account/salone/statistiche', title: 'Statistiche', desc: 'Trend, KPI e report PDF.' }
    ];

    var host = document.createElement('div');
    host.id = 'luxury-app-native-panorama-shortcuts';
    host.className = 'luxury-salon-services-page luxury-salon-panorama-account';
    host.setAttribute('aria-label', 'Collegamenti rapidi salone');

    var stack = document.createElement('div');
    stack.className = 'luxury-salon-panorama-account__stack';

    var grid = document.createElement('div');
    grid.className = 'luxury-salon-panorama-account__link-grid';

    links.forEach(function(item) {
      var a = document.createElement('a');
      a.className = 'luxury-surface-card luxury-salon-services-form-card luxury-salon-panorama-account__link-tile';
      a.href = item.to;
      a.setAttribute('data-router-link', 'true');

      var h = document.createElement('span');
      h.className = 'luxury-card-title';
      h.textContent = item.title;

      var d = document.createElement('span');
      d.className = 'luxury-salon-panorama-account__link-desc';
      d.textContent = item.desc;

      a.appendChild(h);
      a.appendChild(d);
      grid.appendChild(a);
    });

    stack.appendChild(grid);
    host.appendChild(stack);

    var mount =
      document.querySelector('.luxury-native-account-overlay__body') ||
      document.querySelector('.luxury-layout-main') ||
      document.body;
    mount.insertBefore(host, mount.firstChild);
  }

  velvetAppSetNativePath();
  velvetAppApplyPanoramaAccountPage();

  function velvetAppOnSpaNavigation() {
    var path = window.location.pathname || '/';
    if (path !== velvetAppLastPathname) {
      velvetAppLastPathname = path;
      velvetAppScrollToTop();
    }
    velvetAppSetNativePath();
    velvetAppApplyPanoramaAccountPage();
  }

  if (!window.__velvetAppPanoramaPageWatch) {
    window.__velvetAppPanoramaPageWatch = true;
    var _push = history.pushState;
    var _replace = history.replaceState;
    history.pushState = function() {
      _push.apply(history, arguments);
      velvetAppOnSpaNavigation();
    };
    history.replaceState = function() {
      _replace.apply(history, arguments);
      velvetAppOnSpaNavigation();
    };
    window.addEventListener('popstate', velvetAppOnSpaNavigation);
  }
})();
''';

  /// Richiama layout panoramica account (senza card Premium) dopo navigazione SPA.
  static const applyPanoramaAccountPageScript = '''
(function() {
  if (typeof velvetAppSetNativePath === 'function') velvetAppSetNativePath();
  if (typeof velvetAppApplyPanoramaAccountPage === 'function') velvetAppApplyPanoramaAccountPage();
})();
''';

}
