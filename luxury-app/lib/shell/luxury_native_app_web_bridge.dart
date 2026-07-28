/// UI web da nascondere o adattare solo nell'app mobile (WebView).
class LuxuryNativeAppWebBridge {
  LuxuryNativeAppWebBridge._();

  /// Nasconde blocchi non necessari in app (legal nav, checklist panoramica Premium).
  static const installScript = '''
(function() {
  try {
    document.documentElement.classList.add('luxury-native-app');
    var vp = document.querySelector('meta[name="viewport"]');
    if (vp) {
      vp.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover'
      );
    }
  } catch (e) {}
  if (window.__luxuryAppNativeUiStyle) return;
  window.__luxuryAppNativeUiStyle = true;
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
    /* Area account (sotto-pagine): nascondi checklist panoramica duplicata; su /account/salone resta visibile. */
    html.luxury-native-app[data-luxury-path="/account"] .salon-premium-panorama,
    html.luxury-native-app[data-luxury-path^="/account/"]:not([data-luxury-path="/account/salone"]) .salon-premium-panorama,
    html.luxury-native-app[data-luxury-path="/account"] .salon-premium-panorama section[aria-label="Checklist attivazione salone"],
    html.luxury-native-app[data-luxury-path^="/account/"]:not([data-luxury-path="/account/salone"]) .salon-premium-panorama section[aria-label="Checklist attivazione salone"],
    html.luxury-native-app[data-luxury-path="/account"] .salon-premium-panorama__progress-track,
    html.luxury-native-app[data-luxury-path^="/account/"]:not([data-luxury-path="/account/salone"]) .salon-premium-panorama__progress-track,
    html.luxury-native-app[data-luxury-path="/account"] .salon-premium-panorama__step-wrap,
    html.luxury-native-app[data-luxury-path^="/account/"]:not([data-luxury-path="/account/salone"]) .salon-premium-panorama__step-wrap,
    html.luxury-native-app[data-luxury-path="/account"] .salon-premium-panorama__toast,
    html.luxury-native-app[data-luxury-path^="/account/"]:not([data-luxury-path="/account/salone"]) .salon-premium-panorama__toast {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      pointer-events: none !important;
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

    /* /piani — card Premium: stesso fix visibilità CTA su WebView iOS */
    .luxury-plan-card[data-tier="PREMIUM"] .luxury-plan-cta {
      -webkit-appearance: none;
      appearance: none;
      color: #fff7ed !important;
      background-color: #c2410c !important;
      background-image: linear-gradient(180deg, #ea580c, #c2410c) !important;
      border: 1px solid rgba(0, 0, 0, 0.55) !important;
    }

    /* Evita zoom iOS al focus su input con font-size < 16px */
    html.luxury-native-app input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]),
    html.luxury-native-app select,
    html.luxury-native-app textarea {
      font-size: 16px !important;
    }

  `;
  (document.head || document.documentElement).appendChild(style);

  function luxuryAppSetNativePath() {
    try {
      var p = (window.location.pathname || '').replace(/\\/+\$/, '') || '/';
      document.documentElement.setAttribute('data-luxury-path', p);
    } catch (e) {}
  }

  function luxuryAppScrollToTop() {
    try {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch (e) {}
  }

  var luxuryAppLastPathname = (window.location.pathname || '/');

  function luxuryAppApplyPanoramaAccountPage() {
    if (!document.documentElement.classList.contains('luxury-native-app')) return;
    luxuryAppSetNativePath();
    var old = document.getElementById('luxury-app-native-panorama-shortcuts');
    if (old) old.remove();
  }

  luxuryAppSetNativePath();
  luxuryAppApplyPanoramaAccountPage();

  function luxuryAppOnSpaNavigation() {
    var path = window.location.pathname || '/';
    if (path !== luxuryAppLastPathname) {
      luxuryAppLastPathname = path;
      luxuryAppScrollToTop();
    }
    luxuryAppSetNativePath();
    luxuryAppApplyPanoramaAccountPage();
  }

  if (!window.__luxuryAppPanoramaPageWatch) {
    window.__luxuryAppPanoramaPageWatch = true;
    var _push = history.pushState;
    var _replace = history.replaceState;
    history.pushState = function() {
      _push.apply(history, arguments);
      luxuryAppOnSpaNavigation();
    };
    history.replaceState = function() {
      _replace.apply(history, arguments);
      luxuryAppOnSpaNavigation();
    };
    window.addEventListener('popstate', luxuryAppOnSpaNavigation);
  }
})();
''';

  /// Aggiorna path nativo e rimuove eventuali shortcut legacy iniettate in versioni precedenti.
  static const applyPanoramaAccountPageScript = '''
(function() {
  if (typeof luxuryAppSetNativePath === 'function') luxuryAppSetNativePath();
  if (typeof luxuryAppApplyPanoramaAccountPage === 'function') luxuryAppApplyPanoramaAccountPage();
})();
''';

}
