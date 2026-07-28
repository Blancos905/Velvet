import 'dart:convert';

import 'package:flutter/services.dart';

/// Policy subscription condivisa con `luxury-frontend/src/lib/subscription-guards.ts`.
/// Asset JSON allineato al campo `SUBSCRIPTION_GUARDS_SNAPSHOT` della SPA.
class LuxurySubscriptionGuards {
  LuxurySubscriptionGuards._();

  static Map<String, dynamic>? _snapshot;
  static Map<String, dynamic>? _freeOwnerNative;

  static Future<void> load() async {
    if (_snapshot != null) return;
    final raw = await rootBundle.loadString('assets/luxury_subscription_guards.json');
    _snapshot = jsonDecode(raw) as Map<String, dynamic>;
    _freeOwnerNative = _snapshot!['freeOwnerNative'] as Map<String, dynamic>;
  }

  static void useSnapshotForTests(Map<String, dynamic> snapshot) {
    _snapshot = snapshot;
    _freeOwnerNative = snapshot['freeOwnerNative'] as Map<String, dynamic>;
  }

  static Map<String, dynamic> get freeOwnerNative {
    final native = _freeOwnerNative;
    if (native == null) {
      throw StateError('LuxurySubscriptionGuards.load() non chiamato.');
    }
    return native;
  }

  static Set<String> get allowedNavLabels =>
      _stringSet(freeOwnerNative['allowedNavLabels'] as List<dynamic>?);

  static Set<String> get blockedNavLabels =>
      _stringSet(freeOwnerNative['blockedNavLabels'] as List<dynamic>?);

  static String get paywallBannerMessage =>
      freeOwnerNative['paywallBannerMessage'] as String? ?? '';

  static String get premiumPaywallMessageTemplate =>
      freeOwnerNative['premiumPaywallMessage'] as String? ??
      'Passa a premium per utilizzare {feature}';

  static String premiumPaywallMessage(String featureTitle) {
    final title = featureTitle.trim();
    if (title.isEmpty) {
      return premiumPaywallMessageTemplate.replaceAll('{feature}', 'questa funzione');
    }
    return premiumPaywallMessageTemplate.replaceAll('{feature}', title);
  }

  /// Titolo leggibile per overlay paywall da path account.
  static String paywallFeatureTitleForPath(String path) {
    final normalized = normalizePath(path);
    const exact = {
      '/account/notifiche': 'Notifiche',
      '/account/salone': 'Il mio salone',
      '/account/salone/panoramica': 'Panoramica',
      '/account/salone/staff': 'Staff',
      '/account/salone/clienti': 'Clienti',
      '/account/salone/brand': 'Brand e vetrina',
      '/account/salone/tuo-salone': 'Crea il tuo sito',
      '/account/salone/posizione': 'Posizione del salone',
      '/account/salone/statistiche': 'Statistiche',
      '/account/salone/strumenti': 'Notifiche salone',
      '/account/feedback-luxury': 'Recensioni',
      '/account/chat': 'Chat',
    };
    if (exact.containsKey(normalized)) {
      return exact[normalized]!;
    }
    if (normalized.startsWith('/account/prenotazioni/staff')) {
      return 'Gestione staff';
    }
    if (normalized.startsWith('/account/salone/')) {
      final segment = normalized.split('/').where((s) => s.isNotEmpty).last;
      if (segment.isNotEmpty) {
        return segment[0].toUpperCase() + segment.substring(1);
      }
    }
    final segments = normalized.split('/').where((s) => s.isNotEmpty).toList();
    if (segments.isEmpty) return 'questa funzione';
    final last = segments.last;
    return last[0].toUpperCase() + last.substring(1).replaceAll('-', ' ');
  }

  static bool isPathAllowed(String path) {
    final normalized = normalizePath(path);
    final policy = freeOwnerNative;

    if (normalized == '/account' || normalized == '/account/') {
      return true;
    }

    if (_matchesAnyPrefix(normalized, _stringList(policy['alwaysAllowedPrefixes']))) {
      return true;
    }

    if (_stringList(policy['publicExactPaths']).contains(normalized)) {
      return true;
    }

    if (_matchesAnyPrefix(normalized, _stringList(policy['publicPrefixes']))) {
      return true;
    }

    if (_matchesAnyPrefix(normalized, _stringList(policy['blockedPathPrefixes']))) {
      return false;
    }

    if (_stringList(policy['accountAllowedExactPaths']).contains(normalized)) {
      return true;
    }

    if (_matchesAnyPrefix(normalized, _stringList(policy['accountAllowedPrefixes']))) {
      return true;
    }

    return false;
  }

  static bool usesAccountProfileTheme(String path) {
    final normalized = normalizePath(path);
    return normalized == '/account' || normalized.startsWith('/account/');
  }

  static String normalizePath(String path) {
    var normalized = path.trim();
    if (normalized.isEmpty) return '/';
    final queryIndex = normalized.indexOf('?');
    if (queryIndex >= 0) normalized = normalized.substring(0, queryIndex);
    final hashIndex = normalized.indexOf('#');
    if (hashIndex >= 0) normalized = normalized.substring(0, hashIndex);
    if (!normalized.startsWith('/')) normalized = '/$normalized';
    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.substring(0, normalized.length - 1);
    }
    return normalized;
  }

  static bool _matchesAnyPrefix(String path, List<String> prefixes) {
    for (final prefix in prefixes) {
      if (path == prefix || path.startsWith('$prefix/')) {
        return true;
      }
    }
    return false;
  }

  static List<String> _stringList(Object? value) {
    if (value is! List) return const [];
    return value.map((item) => item.toString()).toList(growable: false);
  }

  static Set<String> _stringSet(List<dynamic>? value) {
    if (value == null) return {};
    return value.map((item) => item.toString()).toSet();
  }

  /// Inietta policy dall'asset app nella WebView (autoritativa rispetto alla SPA).
  static String get installNativeWebViewGuardsScript {
    final snapshot = _snapshot;
    if (snapshot == null) {
      throw StateError('LuxurySubscriptionGuards.load() non chiamato.');
    }
    final guardsJson = jsonEncode(snapshot);
    return '''
(function() {
  var guards = $guardsJson;
  window.__LUXURY_SUBSCRIPTION_GUARDS__ = guards;
  function normalizePath(path) {
    var normalized = String(path || '').trim();
    if (!normalized) return '/';
    var queryIndex = normalized.indexOf('?');
    if (queryIndex >= 0) normalized = normalized.substring(0, queryIndex);
    var hashIndex = normalized.indexOf('#');
    if (hashIndex >= 0) normalized = normalized.substring(0, hashIndex);
    if (normalized.charAt(0) !== '/') normalized = '/' + normalized;
    if (normalized.length > 1 && normalized.charAt(normalized.length - 1) === '/') {
      normalized = normalized.substring(0, normalized.length - 1);
    }
    return normalized;
  }
  function pathMatchesPrefix(path, prefix) {
    return path === prefix || path.indexOf(prefix + '/') === 0;
  }
  function pathMatchesAnyPrefix(path, prefixes) {
    for (var i = 0; i < prefixes.length; i++) {
      if (pathMatchesPrefix(path, prefixes[i])) return true;
    }
    return false;
  }
  function isNativeFreeOwnerPathAllowed(path) {
    var normalized = normalizePath(path);
    var policy = guards.freeOwnerNative || {};
    if (normalized === '/account' || normalized === '/account/') return true;
    if (pathMatchesAnyPrefix(normalized, policy.alwaysAllowedPrefixes || [])) return true;
    if ((policy.publicExactPaths || []).indexOf(normalized) >= 0) return true;
    if (pathMatchesAnyPrefix(normalized, policy.publicPrefixes || [])) return true;
    if (pathMatchesAnyPrefix(normalized, policy.blockedPathPrefixes || [])) return false;
    if ((policy.accountAllowedExactPaths || []).indexOf(normalized) >= 0) return true;
    if (pathMatchesAnyPrefix(normalized, policy.accountAllowedPrefixes || [])) return true;
    return false;
  }
  window.__luxurySubscriptionGuards = {
    isNativeFreeOwnerPathAllowed: isNativeFreeOwnerPathAllowed,
    normalizePath: normalizePath,
    usesNativeFreeAccountProfileTheme: function(path) {
      var normalized = normalizePath(path);
      return normalized === '/account' || normalized.indexOf('/account/') === 0;
    }
  };
})();
''';
  }
}
