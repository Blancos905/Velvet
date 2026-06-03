import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

import 'config/velvet_app_config.dart';
import 'shell/velvet_web_shell.dart';

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
  runApp(const VelvetApp());
}

class VelvetApp extends StatelessWidget {
  const VelvetApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SaloniVelvet',
      debugShowCheckedModeBanner: VelvetAppConfig.isLocalDev,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFF97316),
          brightness: Brightness.dark,
          surface: const Color(0xFF1C0A06),
        ),
        useMaterial3: true,
      ),
      home: const VelvetWebShell(),
    );
  }
}
