import '../config/luxury_app_config.dart';

/// Host consentiti per navigazione in-app (mitigazione open redirect / phishing).
class LuxuryDomainGuard {
  LuxuryDomainGuard._();

  static bool isAllowedNavigation(Uri uri, String webBaseUrl) {
    if (!_isHttpOrHttps(uri)) {
      return false;
    }
    if (isStripeNavigation(uri)) {
      return true;
    }
    if (isGoogleMapsEmbedNavigation(uri)) {
      return true;
    }
    final host = uri.host.toLowerCase();
    if (host.isEmpty) {
      return false;
    }
    // Dev LAN: link email può usare un 192.168.x.x diverso da LUXURY_WEB_BASE_URL.
    if (LuxuryAppConfig.isLocalDev && isPrivateLanHost(host)) {
      return true;
    }
    for (final allowed in allowedHosts(webBaseUrl)) {
      if (host == allowed || host.endsWith('.$allowed')) {
        return true;
      }
    }
    return false;
  }

  /// Host privati usati in dev (simulatore, emulatore, iPhone su Wi‑Fi).
  static bool isPrivateLanHost(String host) {
    final normalized = host.toLowerCase();
    if (normalized == 'localhost' ||
        normalized == '127.0.0.1' ||
        normalized == '10.0.2.2') {
      return true;
    }
    final parts = normalized.split('.');
    if (parts.length != 4) {
      return false;
    }
    final octets = parts.map(int.tryParse).toList();
    if (octets.any((o) => o == null)) {
      return false;
    }
    final a = octets[0]!;
    final b = octets[1]!;
    if (a == 192 && b == 168) {
      return true;
    }
    if (a == 10) {
      return true;
    }
    return a == 172 && b >= 16 && b <= 31;
  }

  static Set<String> allowedHosts(String webBaseUrl) {
    final baseHost = Uri.tryParse(webBaseUrl)?.host.toLowerCase();
    const defaults = {'saloniluxury.it', 'www.saloniluxury.it'};
    if (baseHost == null || baseHost.isEmpty) {
      return defaults;
    }
    if (LuxuryAppConfig.isLocalDev) {
      return {
        baseHost,
        'localhost',
        '127.0.0.1',
        '10.0.2.2',
      };
    }
    return {...defaults, baseHost};
  }

  static bool _isHttpOrHttps(Uri uri) {
    final scheme = uri.scheme.toLowerCase();
    return scheme == 'http' || scheme == 'https';
  }

  /// Embed Google Maps (iframe anteprima mappa in area salone / ricerca).
  static bool isGoogleMapsEmbedNavigation(Uri uri) {
    if (!_isHttpOrHttps(uri)) {
      return false;
    }
    final host = uri.host.toLowerCase();
    final path = uri.path.toLowerCase();
    if (host == 'maps.google.com') {
      return true;
    }
    if (host == 'www.google.com' || host == 'google.com') {
      return path.startsWith('/maps/');
    }
    if (host == 'maps.googleapis.com') {
      return path.contains('/maps/api/');
    }
    return false;
  }

  /// Link «Apri in Google Maps» (scheda esterna, non iframe).
  static bool isGoogleMapsExternalNavigation(Uri uri) {
    if (!_isHttpOrHttps(uri)) {
      return false;
    }
    final host = uri.host.toLowerCase();
    return host == 'maps.google.com' ||
        host == 'www.google.com' ||
        host == 'google.com';
  }

  /// Stripe Checkout / Customer Portal (hosted) durante il flusso abbonamento.
  static bool isStripeNavigation(Uri uri) {
    final host = uri.host.toLowerCase();
    if (host.isEmpty) {
      return false;
    }
    return host == 'stripe.com' || host.endsWith('.stripe.com');
  }
}
