import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:velvet_app/auth/salon_plan_tier.dart';
import 'package:velvet_app/auth/velvet_jwt.dart';

void main() {
  test('decodeVelvetJwtPayload estrae ruoli e piano BASE', () {
    final payload = base64Url.encode(utf8.encode(jsonEncode({
      'roles': ['OWNER'],
      'plan': 'BASE',
    })));
    final token = 'hdr.$payload.sig';

    final decoded = decodeVelvetJwtPayload(token);
    expect(decoded, isNotNull);
    expect(velvetRealmRolesFromPayload(decoded), contains('OWNER'));
    expect(velvetSalonPlanHintFromPayload(decoded), SalonPlanTier.base);
  });

  test('parseSalonPlanTier normalizza legacy PREMIUM', () {
    expect(parseSalonPlanTier('STANDARD'), SalonPlanTier.premium);
    expect(parseSalonPlanTier('FULL'), SalonPlanTier.premium);
  });
}
