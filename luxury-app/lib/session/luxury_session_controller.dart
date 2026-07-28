import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../auth/salon_plan_tier.dart';
import '../shell/luxury_free_web_bridge.dart';
import 'luxury_salon_session.dart';

/// Sincronizza ruolo e piano salone dalla WebView (JWT + `GET /api/v1/me/salon`).
class LuxurySessionController extends ChangeNotifier {
  LuxurySalonSession _session = LuxurySalonSession.guest;

  LuxurySalonSession get session => _session;

  bool get isFreeSalonOwner => _session.isFreeSalonOwner;

  Future<void> syncFromWebView(WebViewController controller) async {
    Object? raw;
    try {
      raw = await controller.runJavaScriptReturningResult(
        LuxuryFreeWebBridge.readSessionJsonScript,
      );
    } catch (_) {
      try {
        raw = await controller.runJavaScriptReturningResult(
          LuxuryFreeWebBridge.readSessionJsonSyncScript,
        );
      } catch (_) {
        raw = null;
      }
    }
    final next = _parseBridgeResult(raw);
    if (next != _session) {
      _session = next;
      notifyListeners();
    }
  }

  void reset() {
    if (_session != LuxurySalonSession.guest) {
      _session = LuxurySalonSession.guest;
      notifyListeners();
    }
  }

  LuxurySalonSession _parseBridgeResult(Object? raw) {
    try {
      final jsonStr = _unwrapJsString(raw);
      if (jsonStr == null || jsonStr.isEmpty) return LuxurySalonSession.guest;

      final decoded = jsonDecode(jsonStr);
      if (decoded is! Map) return LuxurySalonSession.guest;
      final map = Map<String, dynamic>.from(decoded);

      final hasToken = map['hasToken'] == true;
      if (!hasToken) return LuxurySalonSession.guest;

      final roles = (map['roles'] as List<dynamic>? ?? const [])
          .whereType<String>()
          .map((r) => r.trim().toUpperCase())
          .toList();

      final isOwner = roles.contains('OWNER');
      final isStaff = roles.contains('STAFF') && !isOwner;
      final isAdmin = roles.contains('ADMIN');

      SalonPlanTier? plan;
      final apiPlan = map['apiPlanTier'];
      if (apiPlan is String && map['apiProvisioned'] == true) {
        plan = parseSalonPlanTier(apiPlan);
      }
      plan ??= parseSalonPlanTier(map['jwtPlanHint'] as String?);
      plan ??= parseSalonPlanTier(map['sessionPlanHint'] as String?);
      if (isOwner && plan == null) {
        plan = SalonPlanTier.base;
      }

      return LuxurySalonSession(
        isAuthenticated: true,
        isSalonOwner: isOwner,
        isSalonStaff: isStaff,
        isLuxurySuperAdmin: isAdmin,
        planTier: plan,
      );
    } catch (e, st) {
      if (kDebugMode) {
        debugPrint('LuxurySessionController: parse error $e\n$st');
      }
      return LuxurySalonSession.guest;
    }
  }

  String? _unwrapJsString(Object? raw) {
    if (raw == null) return null;
    final s = raw.toString().trim();
    if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) {
      try {
        return jsonDecode(s) as String;
      } catch (_) {
        return s.substring(1, s.length - 1);
      }
    }
    return s;
  }
}
