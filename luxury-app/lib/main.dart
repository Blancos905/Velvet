import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

import 'config/luxury_subscription_guards.dart';
import 'shell/free_account_wrapper.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (WebViewPlatform.instance == null) {
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        WebViewPlatform.instance = AndroidWebViewPlatform();
      case TargetPlatform.iOS:
      case TargetPlatform.macOS:
        WebViewPlatform.instance = WebKitWebViewPlatform();
      default:
        break;
    }
  }

  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  await LuxurySubscriptionGuards.load();
  runApp(const LuxuryApp());
}

/// Entry point: [FreeAccountWrapper] — tema Premium unificato; vincoli piano Free solo in WebView.
class LuxuryApp extends StatelessWidget {
  const LuxuryApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const FreeAccountWrapper();
  }
}
