import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// iOS: evita che WKWebView chiuda la tastiera quando l'utente scrolla la pagina.
class LuxuryIosWebViewKeyboard {
  LuxuryIosWebViewKeyboard._();

  static const _channel = MethodChannel(
    'it.saloniluxury.luxury_app/webview_keyboard',
  );

  static Future<void> keepVisibleOnScroll() async {
    if (!Platform.isIOS) return;
    try {
      await _channel.invokeMethod<void>('keepVisibleOnScroll');
    } catch (e, st) {
      debugPrint('LuxuryIosWebViewKeyboard: $e\n$st');
    }
  }
}
