import 'dart:async';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

/// Inizializza Firebase Messaging e espone il token FCM per la WebView.
class VelvetFcmService {
  VelvetFcmService._();

  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  static StreamSubscription<String>? _tokenRefreshSub;
  static String? _currentToken;
  static void Function(String? token)? _onTokenChanged;
  static var _initialized = false;

  static String? get currentToken => _currentToken;

  static Future<void> initialize(void Function(String? token) onTokenChanged) async {
    _onTokenChanged = onTokenChanged;
    if (_initialized) {
      _onTokenChanged?.call(_currentToken);
      return;
    }
    _initialized = true;
    try {
      await Firebase.initializeApp();
    } catch (e, st) {
      debugPrint('VelvetFcmService: Firebase.initializeApp fallito: $e\n$st');
      return;
    }

    await _requestPermissions();

    await _tokenRefreshSub?.cancel();
    _tokenRefreshSub = _messaging.onTokenRefresh.listen((token) {
      _currentToken = token;
      debugPrint('VelvetFcmService: FCM token = $token');
      _onTokenChanged?.call(token);
    });

    await _refreshToken(notify: true);
  }

  static Future<void> dispose() async {
    await _tokenRefreshSub?.cancel();
    _tokenRefreshSub = null;
    _onTokenChanged = null;
  }

  static Future<void> _requestPermissions() async {
    if (Platform.isIOS || Platform.isMacOS) {
      await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
    }
    if (Platform.isAndroid) {
      await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
      await _messaging.setAutoInitEnabled(true);
    }
  }

  static Future<void> _refreshToken({required bool notify}) async {
    try {
      if (Platform.isIOS || Platform.isMacOS) {
        // Su iOS il token FCM richiede APNs; può arrivare qualche secondo dopo il launch.
        for (var attempt = 0; attempt < 8; attempt++) {
          final apns = await _messaging.getAPNSToken();
          if (apns != null && apns.isNotEmpty) break;
          await Future<void>.delayed(const Duration(seconds: 2));
        }
      }
      final token = await _messaging.getToken();
      _currentToken = token;
      if (token != null && token.isNotEmpty) {
        debugPrint('VelvetFcmService: FCM token = $token');
        if (notify) {
          _onTokenChanged?.call(token);
        }
      }
    } catch (e, st) {
      final message = e.toString();
      if (Platform.isIOS && message.contains('apns-token-not-set')) {
        debugPrint(
          'VelvetFcmService: nessun token FCM su iOS — APNs non disponibile. '
          'Con team Apple personale/gratuito le push iOS non sono supportate; '
          'serve Apple Developer Program + ./scripts/enable-ios-push-entitlements.sh '
          '(oppure testa su Android).',
        );
      } else {
        debugPrint('VelvetFcmService: getToken non ancora disponibile: $e');
        debugPrint('$st');
      }
      // onTokenRefresh consegnerà il token quando APNs/FCM saranno pronti.
    }
  }

  /// Richiamato dopo ogni `onPageFinished` per evitare race con il frontend React.
  static void notifyWebViewIfReady() {
    final token = _currentToken;
    if (token != null && token.isNotEmpty) {
      _onTokenChanged?.call(token);
    }
  }
}
