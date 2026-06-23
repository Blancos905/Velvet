import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:velvet_app/config/velvet_subscription_guards.dart';
import 'package:velvet_app/free/velvet_free_plan_policy.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    final jsonFile = File('assets/velvet_subscription_guards.json');
    final snapshot = jsonDecode(await jsonFile.readAsString()) as Map<String, dynamic>;
    VelvetSubscriptionGuards.useSnapshotForTests(snapshot);
  });

  group('VelvetFreePlanPolicy', () {
    test('consente sezioni Free del titolare', () {
      expect(VelvetFreePlanPolicy.isPathAllowed('/account/prenotazioni'), isTrue);
      expect(VelvetFreePlanPolicy.isPathAllowed('/account/prenotazioni/abc'), isTrue);
      expect(VelvetFreePlanPolicy.isPathAllowed('/account/info-privacy'), isTrue);
      expect(VelvetFreePlanPolicy.isPathAllowed('/account/assistenza'), isTrue);
      expect(VelvetFreePlanPolicy.isPathAllowed('/account/profilo'), isTrue);
      expect(VelvetFreePlanPolicy.isPathAllowed('/account/salone/servizi'), isTrue);
    });

    test('consente notifiche e panoramica salone', () {
      expect(VelvetFreePlanPolicy.isPathAllowed('/account/notifiche'), isTrue);
      expect(VelvetFreePlanPolicy.isPathAllowed('/account/salone'), isTrue);
    });

    test('messaggio paywall Premium', () {
      expect(
        VelvetFreePlanPolicy.premiumPaywallMessage('Staff'),
        'Passa a premium per utilizzare Staff',
      );
      expect(
        VelvetFreePlanPolicy.paywallFeatureTitleForPath('/account/salone/brand'),
        'Brand e vetrina',
      );
    });

    test('tema blu profilo solo sotto /account', () {
      expect(VelvetFreePlanPolicy.usesAccountProfileTheme('/account'), isTrue);
      expect(VelvetFreePlanPolicy.usesAccountProfileTheme('/account/profilo'), isTrue);
      expect(VelvetFreePlanPolicy.usesAccountProfileTheme('/'), isFalse);
      expect(VelvetFreePlanPolicy.usesAccountProfileTheme('/search'), isFalse);
      expect(VelvetFreePlanPolicy.usesAccountProfileTheme('/s/salone-1'), isFalse);
    });

    test('blocca funzioni Premium', () {
      expect(VelvetFreePlanPolicy.isPathAllowed('/account/salone/staff'), isFalse);
      expect(VelvetFreePlanPolicy.isPathAllowed('/account/feedback-velvet'), isFalse);
      expect(VelvetFreePlanPolicy.isPathAllowed('/account/salone/statistiche'), isFalse);
      expect(VelvetFreePlanPolicy.isPathAllowed('/account/salone/brand'), isFalse);
      expect(VelvetFreePlanPolicy.isPathAllowed('/account/chat'), isFalse);
      expect(VelvetFreePlanPolicy.isPathAllowed('/admin/dashboard'), isFalse);
    });
  });
}
