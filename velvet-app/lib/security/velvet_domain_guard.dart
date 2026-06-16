import '../config/velvet_app_config.dart';

/// Host consentiti per navigazione in-app (mitigazione open redirect / phishing).
class VelvetDomainGuard {
  VelvetDomainGuard._();

  static bool isAllowedNavigation(Uri uri, String webBaseUrl) {
    if (!_isHttpOrHttps(uri)) {
      return false;
    }
    final host = uri.host.toLowerCase();
    if (host.isEmpty) {
      return false;
    }
    for (final allowed in allowedHosts(webBaseUrl)) {
      if (host == allowed || host.endsWith('.$allowed')) {
        return true;
      }
    }
    return false;
  }

  static Set<String> allowedHosts(String webBaseUrl) {
    final baseHost = Uri.tryParse(webBaseUrl)?.host.toLowerCase();
    const defaults = {'saloniluxury.it', 'www.saloniluxury.it'};
    if (baseHost == null || baseHost.isEmpty) {
      return defaults;
    }
    if (VelvetAppConfig.isLocalDev) {
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
}
