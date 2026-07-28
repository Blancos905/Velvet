import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:luxury_app/auth/salon_plan_tier.dart';
import 'package:luxury_app/auth/luxury_jwt.dart';

void main() {
  test('decodeLuxuryJwtPayload estrae ruoli e piano BASE', () {
    final payload = base64Url.encode(utf8.encode(jsonEncode({
      'roles': ['OWNER'],
      'plan': 'BASE',
    })));
    final token = 'hdr.$payload.sig';

    final decoded = decodeLuxuryJwtPayload(token);
    expect(decoded, isNotNull);
    expect(luxuryRealmRolesFromPayload(decoded), contains('OWNER'));
    expect(luxurySalonPlanHintFromPayload(decoded), SalonPlanTier.base);
  });

  test('parseSalonPlanTier normalizza legacy PREMIUM', () {
    expect(parseSalonPlanTier('STANDARD'), SalonPlanTier.premium);
    expect(parseSalonPlanTier('FULL'), SalonPlanTier.premium);
  });
}
