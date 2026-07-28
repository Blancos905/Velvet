import 'dart:convert';

import 'salon_plan_tier.dart';

/// Decodifica solo il payload JWT (nessuna verifica firma) — uso UX shell mobile.
Map<String, dynamic>? decodeLuxuryJwtPayload(String accessToken) {
  final parts = accessToken.split('.');
  if (parts.length < 2) return null;
  try {
    var b64 = parts[1].replaceAll('-', '+').replaceAll('_', '/');
    switch (b64.length % 4) {
      case 2:
        b64 += '==';
      case 3:
        b64 += '=';
      case 1:
        return null;
    }
    final json = utf8.decode(base64.decode(b64));
    final decoded = jsonDecode(json);
    if (decoded is Map<String, dynamic>) return decoded;
    if (decoded is Map) return Map<String, dynamic>.from(decoded);
    return null;
  } catch (_) {
    return null;
  }
}

List<String> luxuryRealmRolesFromPayload(Map<String, dynamic>? payload) {
  if (payload == null) return const [];

  final direct = payload['roles'];
  if (direct is List) {
    return direct
        .whereType<String>()
        .map((r) => r.trim().toUpperCase())
        .where((r) => r.isNotEmpty)
        .toList();
  }

  final realmAccess = payload['realm_access'];
  if (realmAccess is Map) {
    final nested = realmAccess['roles'];
    if (nested is List) {
      return nested
          .whereType<String>()
          .map((r) => r.trim().toUpperCase())
          .where((r) => r.isNotEmpty)
          .toList();
    }
  }

  return const [];
}

SalonPlanTier? luxurySalonPlanHintFromPayload(Map<String, dynamic>? payload) {
  if (payload == null) return null;
  final planRaw = payload['plan'] ?? payload['organization_plan'];
  if (planRaw is String) return parseSalonPlanTier(planRaw);
  return null;
}
