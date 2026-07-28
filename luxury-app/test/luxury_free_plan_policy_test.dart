import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:luxury_app/config/luxury_subscription_guards.dart';
import 'package:luxury_app/free/luxury_free_plan_policy.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    final jsonFile = File('assets/luxury_subscription_guards.json');
    final snapshot = jsonDecode(await jsonFile.readAsString()) as Map<String, dynamic>;
    LuxurySubscriptionGuards.useSnapshotForTests(snapshot);
  });

  group('LuxuryFreePlanPolicy', () {
    test('consente sezioni Free del titolare', () {
      expect(LuxuryFreePlanPolicy.isPathAllowed('/account/prenotazioni'), isTrue);
      expect(LuxuryFreePlanPolicy.isPathAllowed('/account/prenotazioni/abc'), isTrue);
      expect(LuxuryFreePlanPolicy.isPathAllowed('/account/info-privacy'), isTrue);
      expect(LuxuryFreePlanPolicy.isPathAllowed('/account/assistenza'), isTrue);
      expect(LuxuryFreePlanPolicy.isPathAllowed('/account/profilo'), isTrue);
      expect(LuxuryFreePlanPolicy.isPathAllowed('/account/salone/servizi'), isTrue);
    });

    test('consente notifiche e panoramica salone', () {
      expect(LuxuryFreePlanPolicy.isPathAllowed('/account/notifiche'), isTrue);
      expect(LuxuryFreePlanPolicy.isPathAllowed('/account/salone'), isTrue);
      expect(LuxuryFreePlanPolicy.isPathAllowed('/account/salone/panoramica'), isTrue);
    });

    test('messaggio paywall Premium', () {
      expect(
        LuxuryFreePlanPolicy.premiumPaywallMessage('Staff'),
        'Passa a Premium',
      );
      expect(
        LuxuryFreePlanPolicy.paywallFeatureTitleForPath('/account/salone/brand'),
        'Brand e vetrina',
      );
    });

    test('tema blu profilo solo sotto /account', () {
      expect(LuxuryFreePlanPolicy.usesAccountProfileTheme('/account'), isTrue);
      expect(LuxuryFreePlanPolicy.usesAccountProfileTheme('/account/profilo'), isTrue);
      expect(LuxuryFreePlanPolicy.usesAccountProfileTheme('/'), isFalse);
      expect(LuxuryFreePlanPolicy.usesAccountProfileTheme('/search'), isFalse);
      expect(LuxuryFreePlanPolicy.usesAccountProfileTheme('/s/salone-1'), isFalse);
    });

    test('blocca funzioni Premium', () {
      expect(LuxuryFreePlanPolicy.isPathAllowed('/account/salone/staff'), isFalse);
      expect(LuxuryFreePlanPolicy.isPathAllowed('/account/feedback-luxury'), isFalse);
      expect(LuxuryFreePlanPolicy.isPathAllowed('/account/salone/statistiche'), isFalse);
      expect(LuxuryFreePlanPolicy.isPathAllowed('/account/salone/brand'), isFalse);
      expect(LuxuryFreePlanPolicy.isPathAllowed('/account/chat'), isFalse);
      expect(LuxuryFreePlanPolicy.isPathAllowed('/admin/dashboard'), isFalse);
      expect(LuxuryFreePlanPolicy.isPathAllowed('/account/billing/checkout'), isTrue);
    });
  });
}
